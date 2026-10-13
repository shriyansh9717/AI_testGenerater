import mongoose from 'mongoose';

// The pattern is copied onto the test so that later edits to a pattern never
// change the rules of a test that has already been taken.
const patternSnapshotSchema = new mongoose.Schema(
  {
    name: String,
    totalQuestions: Number,
    durationMinutes: Number,
    marksPerQuestion: Number,
    negativeMarking: Number,
    optionsPerQuestion: Number,
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    examPatternId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamPattern', default: null },
    patternSnapshot: { type: patternSnapshotSchema, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }],
    // Per-test option order, so every attempt of one test sees the same paper.
    optionOrder: { type: Map, of: [String], default: () => new Map() },
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    subject: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Test', testSchema);
