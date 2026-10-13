import ExamPattern from '../models/ExamPattern.js';
import Question from '../models/Question.js';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { shuffle } from '../utils/text.js';
import { scoreAttempt } from '../utils/scoring.js';

/** Strips answers so a live paper never carries the key to the browser. */
function toExamQuestion(question, optionOrder) {
  const order = optionOrder?.get?.(String(question._id)) || null;
  const options = order && order.length === question.options.length ? order : question.options;
  return {
    _id: question._id,
    question: question.question,
    options,
    difficulty: question.difficulty,
    topic: question.topic,
    questionType: question.questionType,
  };
}

/** POST /api/tests — build a paper from already-generated questions. */
export const createTest = asyncHandler(async (req, res) => {
  const {
    title,
    questionIds = [],
    examPatternId = null,
    customPattern = null,
    documentId = null,
    shuffleQuestions = true,
    shuffleOptions = false,
  } = req.body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw ApiError.badRequest('Select at least one question for this test.');
  }

  let pattern = null;
  if (examPatternId) {
    pattern = await ExamPattern.findOne({
      _id: examPatternId,
      $or: [{ isPreset: true }, { createdBy: req.user._id }],
    });
    if (!pattern) throw ApiError.notFound('That exam pattern is not available to you.');
  }

  const snapshot = pattern
    ? {
        name: pattern.name,
        totalQuestions: pattern.totalQuestions,
        durationMinutes: pattern.durationMinutes,
        marksPerQuestion: pattern.marksPerQuestion,
        negativeMarking: pattern.negativeMarking,
        optionsPerQuestion: pattern.optionsPerQuestion,
      }
    : {
        name: customPattern?.name || 'Custom pattern',
        totalQuestions: Number(customPattern?.totalQuestions) || questionIds.length,
        durationMinutes: Number(customPattern?.durationMinutes) || 20,
        marksPerQuestion: Number(customPattern?.marksPerQuestion) || 1,
        negativeMarking: Number(customPattern?.negativeMarking) || 0,
        optionsPerQuestion: Number(customPattern?.optionsPerQuestion) || 4,
      };

  const questions = await Question.find({ _id: { $in: questionIds }, userId: req.user._id });
  if (questions.length !== questionIds.length) {
    throw ApiError.badRequest('Some of those questions are not in your library.');
  }

  const ordered = shuffleQuestions ? shuffle(questions) : questions;
  const selected = ordered.slice(0, snapshot.totalQuestions);
  snapshot.totalQuestions = selected.length;

  const optionOrder = new Map();
  if (shuffleOptions) {
    selected.forEach((question) => {
      optionOrder.set(String(question._id), shuffle(question.options));
    });
  }

  const test = await Test.create({
    userId: req.user._id,
    title: title?.trim() || `${snapshot.name} mock test`,
    examPatternId: pattern?._id || null,
    patternSnapshot: snapshot,
    documentId,
    questions: selected.map((q) => q._id),
    optionOrder,
    durationMinutes: snapshot.durationMinutes,
    totalMarks: Number((selected.length * snapshot.marksPerQuestion).toFixed(2)),
    subject: selected[0]?.subject || '',
  });

  res.status(201).json({ success: true, data: { test } });
});

/** GET /api/tests — history list with the latest attempt for each test. */
export const listTests = asyncHandler(async (req, res) => {
  const tests = await Test.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  const attempts = await TestAttempt.find({
    userId: req.user._id,
    testId: { $in: tests.map((t) => t._id) },
  })
    .sort({ createdAt: -1 })
    .lean();

  const latestByTest = new Map();
  attempts.forEach((attempt) => {
    const key = String(attempt.testId);
    if (!latestByTest.has(key)) latestByTest.set(key, attempt);
  });

  const data = tests.map((test) => {
    const attempt = latestByTest.get(String(test._id)) || null;
    const isExpired = attempt && attempt.status === 'in_progress' && new Date(attempt.expiresAt) < new Date();
    return {
      _id: test._id,
      title: test.title,
      createdAt: test.createdAt,
      questionCount: test.questions.length,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      patternName: test.patternSnapshot?.name,
      status: !attempt ? 'not_started' : attempt.status === 'submitted' ? 'completed' : isExpired ? 'expired' : 'in_progress',
      lastAttempt: attempt
        ? {
            _id: attempt._id,
            score: attempt.score,
            maxScore: attempt.maxScore,
            accuracy: attempt.accuracy,
            percentage: attempt.percentage,
            submittedAt: attempt.submittedAt,
            status: attempt.status,
          }
        : null,
    };
  });

  res.json({ success: true, data: { tests: data } });
});

export const getTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, userId: req.user._id }).populate('questions');
  if (!test) throw ApiError.notFound('That test does not exist.');

  res.json({
    success: true,
    data: {
      test: {
        _id: test._id,
        title: test.title,
        patternSnapshot: test.patternSnapshot,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        createdAt: test.createdAt,
        questionCount: test.questions.length,
      },
    },
  });
});

export const deleteTest = asyncHandler(async (req, res) => {
  const test = await Test.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!test) throw ApiError.notFound('That test does not exist.');
  await TestAttempt.deleteMany({ testId: test._id, userId: req.user._id });
  res.json({ success: true, data: { id: req.params.id } });
});

/**
 * POST /api/tests/:id/start
 * Resumes a live attempt when one exists, so a refresh never restarts the clock.
 * `restart: true` abandons the live attempt and begins a fresh one (retake).
 */
export const startTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, userId: req.user._id }).populate('questions');
  if (!test) throw ApiError.notFound('That test does not exist.');
  if (!test.questions.length) throw ApiError.badRequest('This test has no questions.');

  const now = new Date();
  let attempt = await TestAttempt.findOne({
    userId: req.user._id,
    testId: test._id,
    status: 'in_progress',
  });

  if (attempt && req.body?.restart) {
    await attempt.deleteOne();
    attempt = null;
  }

  // A live attempt whose clock already ran out is graded immediately.
  if (attempt && attempt.expiresAt <= now) {
    const graded = await finalizeAttempt({ attempt, test, answers: attempt.answers, autoSubmitted: true });
    return res.json({ success: true, data: { attempt: graded, expired: true } });
  }

  if (!attempt) {
    attempt = await TestAttempt.create({
      userId: req.user._id,
      testId: test._id,
      maxScore: test.totalMarks,
      startedAt: now,
      expiresAt: new Date(now.getTime() + test.durationMinutes * 60 * 1000),
      answers: test.questions.map((q) => ({ questionId: q._id, selectedOption: null, status: 'not_visited' })),
    });
  }

  res.json({
    success: true,
    data: {
      attempt: {
        _id: attempt._id,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        remainingSeconds: Math.max(0, Math.floor((attempt.expiresAt - now) / 1000)),
        answers: attempt.answers.map((a) => ({
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          status: a.status,
          timeSpentSeconds: a.timeSpentSeconds,
        })),
      },
      test: {
        _id: test._id,
        title: test.title,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        patternSnapshot: test.patternSnapshot,
        questions: test.questions.map((q) => toExamQuestion(q, test.optionOrder)),
      },
    },
  });
});

/** Saves progress so an interrupted attempt can be resumed with answers intact. */
export const saveProgress = asyncHandler(async (req, res) => {
  const { answers = [] } = req.body;
  const attempt = await TestAttempt.findOne({
    _id: req.params.attemptId,
    userId: req.user._id,
    status: 'in_progress',
  });
  if (!attempt) throw ApiError.notFound('There is no attempt in progress to save.');

  const byQuestion = new Map(answers.map((a) => [String(a.questionId), a]));
  attempt.answers = attempt.answers.map((existing) => {
    const incoming = byQuestion.get(String(existing.questionId));
    if (!incoming) return existing;
    existing.selectedOption = incoming.selectedOption ?? null;
    existing.status = incoming.status || existing.status;
    existing.timeSpentSeconds = Math.max(0, Math.round(Number(incoming.timeSpentSeconds) || 0));
    return existing;
  });
  await attempt.save();

  res.json({
    success: true,
    data: { remainingSeconds: Math.max(0, Math.floor((attempt.expiresAt - new Date()) / 1000)) },
  });
});

/** Shared grading path used by both manual submission and expiry. */
async function finalizeAttempt({ attempt, test, answers, autoSubmitted }) {
  const questions = await Question.find({ _id: { $in: test.questions } });
  const questionOrder = new Map(questions.map((q) => [String(q._id), q]));
  const orderedQuestions = test.questions.map((id) => questionOrder.get(String(id))).filter(Boolean);

  const cappedEnd = new Date(Math.min(Date.now(), new Date(attempt.expiresAt).getTime()));
  const timeTakenSeconds = Math.max(0, Math.floor((cappedEnd - new Date(attempt.startedAt)) / 1000));

  const result = scoreAttempt({
    questions: orderedQuestions,
    answers,
    pattern: test.patternSnapshot,
    timeTakenSeconds,
  });

  attempt.set({
    ...result,
    status: 'submitted',
    submittedAt: new Date(),
    autoSubmitted: Boolean(autoSubmitted),
  });
  await attempt.save();
  return attempt;
}

/** POST /api/tests/:id/submit — the only place a score is ever produced. */
export const submitTest = asyncHandler(async (req, res) => {
  const { attemptId, answers = [], autoSubmitted = false } = req.body;

  const test = await Test.findOne({ _id: req.params.id, userId: req.user._id });
  if (!test) throw ApiError.notFound('That test does not exist.');

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    testId: test._id,
    userId: req.user._id,
  });
  if (!attempt) throw ApiError.notFound('That attempt does not exist.');
  if (attempt.status === 'submitted') {
    throw ApiError.conflict('This attempt has already been submitted.');
  }

  const expired = new Date(attempt.expiresAt) <= new Date();
  const graded = await finalizeAttempt({
    attempt,
    test,
    answers,
    autoSubmitted: autoSubmitted || expired,
  });

  res.json({ success: true, data: { attemptId: graded._id, resultUrl: `/results/${graded._id}` } });
});

