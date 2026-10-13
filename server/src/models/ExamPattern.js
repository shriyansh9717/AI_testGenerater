import mongoose from 'mongoose';

const examPatternSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    totalQuestions: { type: Number, required: true, min: 1, max: 200 },
    durationMinutes: { type: Number, required: true, min: 1, max: 360 },
    marksPerQuestion: { type: Number, required: true, min: 0.25, max: 10 },
    negativeMarking: { type: Number, required: true, min: 0, max: 5 },
    optionsPerQuestion: { type: Number, required: true, min: 2, max: 6 },
    // Presets shipped with the app are shared; a user-made pattern belongs to its author.
    isPreset: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

examPatternSchema.index({ slug: 1, createdBy: 1 }, { unique: true });

export default mongoose.model('ExamPattern', examPatternSchema);
