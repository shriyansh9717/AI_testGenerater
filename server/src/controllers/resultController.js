import Question from '../models/Question.js';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/results */
export const listResults = asyncHandler(async (req, res) => {
  const attempts = await TestAttempt.find({ userId: req.user._id, status: 'submitted' })
    .sort({ submittedAt: -1 })
    .populate('testId', 'title patternSnapshot durationMinutes')
    .lean();

  res.json({
    success: true,
    data: {
      results: attempts.map((attempt) => ({
        _id: attempt._id,
        testId: attempt.testId?._id,
        title: attempt.testId?.title || 'Deleted test',
        patternName: attempt.testId?.patternSnapshot?.name || '',
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        accuracy: attempt.accuracy,
        correct: attempt.correct,
        wrong: attempt.wrong,
        unattempted: attempt.unattempted,
        timeTakenSeconds: attempt.timeTakenSeconds,
        submittedAt: attempt.submittedAt,
      })),
    },
  });
});

/** GET /api/results/:id — full result with per-question review. */
export const getResult = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!attempt) throw ApiError.notFound('That result does not exist.');
  if (attempt.status !== 'submitted') throw ApiError.badRequest('That attempt has not been submitted yet.');

  const test = await Test.findById(attempt.testId).lean();
  const questions = await Question.find({ _id: { $in: attempt.answers.map((a) => a.questionId) } }).lean();
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  const review = attempt.answers.map((answer, index) => {
    const question = byId.get(String(answer.questionId));
    return {
      number: index + 1,
      questionId: answer.questionId,
      question: question?.question || 'This question has been deleted.',
      options: question?.options || [],
      correctAnswer: question?.correctAnswer || '',
      explanation: question?.explanation || '',
      difficulty: question?.difficulty || 'medium',
      topic: question?.topic || 'General',
      sourceReference: question?.sourceReference || '',
      selectedOption: answer.selectedOption,
      isCorrect: answer.isCorrect,
      marksAwarded: answer.marksAwarded,
      timeSpentSeconds: answer.timeSpentSeconds,
    };
  });

  const attemptedCount = attempt.correct + attempt.wrong;
  const totalQuestions = attempt.answers.length || 1;

  res.json({
    success: true,
    data: {
      result: {
        _id: attempt._id,
        testId: attempt.testId,
        title: test?.title || 'Deleted test',
        patternName: test?.patternSnapshot?.name || '',
        marksPerQuestion: test?.patternSnapshot?.marksPerQuestion ?? null,
        negativeMarking: test?.patternSnapshot?.negativeMarking ?? null,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        correct: attempt.correct,
        wrong: attempt.wrong,
        unattempted: attempt.unattempted,
        accuracy: attempt.accuracy,
        timeTakenSeconds: attempt.timeTakenSeconds,
        averageSecondsPerQuestion: Number((attempt.timeTakenSeconds / totalQuestions).toFixed(1)),
        attemptedCount,
        autoSubmitted: attempt.autoSubmitted,
        submittedAt: attempt.submittedAt,
        topicAnalysis: attempt.topicAnalysis,
        difficultyAnalysis: attempt.difficultyAnalysis,
        review,
      },
    },
  });
});
