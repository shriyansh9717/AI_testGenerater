import Document from '../models/Document.js';
import Question from '../models/Question.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateQuestions } from '../services/ai/questionGenerator.js';
import { isAiConfigured } from '../services/ai/index.js';

/** POST /api/questions/generate */
export const generate = asyncHandler(async (req, res) => {
  const {
    documentId = null,
    topic = '',
    subject = '',
    count = 10,
    difficulty = 'mixed',
    questionType = 'mcq',
    optionsPerQuestion = 4,
  } = req.body;

  if (!isAiConfigured()) {
    throw ApiError.serviceUnavailable(
      'Question generation is not available yet: the server has no AI_API_KEY configured.'
    );
  }

  let document = null;
  if (documentId) {
    document = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!document) throw ApiError.notFound('That document is not in your library.');
  }

  const sourceText = document?.extractedText || '';
  const resolvedTopic = topic || document?.topic || '';
  const resolvedSubject = subject || document?.subject || '';

  if (!sourceText && !resolvedTopic) {
    throw ApiError.badRequest('Choose a document or enter a topic first.');
  }

  // Questions the user already has for this source, so re-generation adds new ones.
  const previous = await Question.find(
    documentId ? { userId: req.user._id, documentId } : { userId: req.user._id, topic: resolvedTopic }
  )
    .select('question fingerprint')
    .sort({ createdAt: -1 })
    .limit(60);

  const result = await generateQuestions({
    sourceText,
    topic: resolvedTopic,
    subject: resolvedSubject,
    count: Number(count),
    difficulty,
    questionType,
    optionsPerQuestion: Number(optionsPerQuestion),
    existingQuestions: previous.map((q) => q.question),
  });

  const existingFingerprints = new Set(previous.map((q) => q.fingerprint));
  const fresh = result.questions.filter((q) => !existingFingerprints.has(q.fingerprint));

  if (!fresh.length) {
    throw ApiError.unprocessable(
      'Every question the AI returned duplicates one you already have. Try a different topic or more source material.'
    );
  }

  const saved = await Question.insertMany(
    fresh.map((question) => ({
      ...question,
      userId: req.user._id,
      documentId: document?._id || null,
      subject: resolvedSubject,
    }))
  );

  res.status(201).json({
    success: true,
    data: {
      questions: saved,
      requested: result.requested,
      produced: saved.length,
      skipped: result.rejections.slice(0, 10),
    },
  });
});

export const listQuestions = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.documentId) filter.documentId = req.query.documentId;
  const questions = await Question.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: { questions } });
});

export const getQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOne({ _id: req.params.id, userId: req.user._id });
  if (!question) throw ApiError.notFound('That question does not exist.');
  res.json({ success: true, data: { question } });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!question) throw ApiError.notFound('That question does not exist.');
  res.json({ success: true, data: { id: req.params.id } });
});
