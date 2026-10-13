import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null, index: true },
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length >= 2, 'A question needs at least two options'],
    },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium', index: true },
    topic: { type: String, default: 'General', trim: true, index: true },
    subject: { type: String, default: '', trim: true },
    questionType: { type: String, enum: ['mcq', 'true_false', 'multiple_choice'], default: 'mcq' },
    sourceReference: { type: String, default: '' },
    fingerprint: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

questionSchema.index({ userId: 1, fingerprint: 1 });

export default mongoose.model('Question', questionSchema);
