import ExamPattern from '../models/ExamPattern.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Presets plus whatever the signed-in user has configured themselves. */
export const listPatterns = asyncHandler(async (req, res) => {
  const patterns = await ExamPattern.find({
    $or: [{ isPreset: true }, { createdBy: req.user._id }],
  }).sort({ isPreset: -1, name: 1 });
  res.json({ success: true, data: { patterns } });
});

export const createPattern = asyncHandler(async (req, res) => {
  const {
    name,
    totalQuestions,
    durationMinutes,
    marksPerQuestion,
    negativeMarking,
    optionsPerQuestion,
    description = '',
  } = req.body;

  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const pattern = await ExamPattern.create({
    name,
    slug,
    description,
    totalQuestions,
    durationMinutes,
    marksPerQuestion,
    negativeMarking,
    optionsPerQuestion,
    isPreset: false,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: { pattern } });
});

export const deletePattern = asyncHandler(async (req, res) => {
  const pattern = await ExamPattern.findOne({ _id: req.params.id });
  if (!pattern) throw ApiError.notFound('That exam pattern does not exist.');
  if (pattern.isPreset) throw ApiError.forbidden('Built-in patterns cannot be deleted.');
  if (String(pattern.createdBy) !== String(req.user._id)) {
    throw ApiError.forbidden('That pattern belongs to another account.');
  }
  await pattern.deleteOne();
  res.json({ success: true, data: { id: req.params.id } });
});
