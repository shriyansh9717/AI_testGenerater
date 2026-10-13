import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOption: { type: String, default: null },
    status: {
      type: String,
      enum: ['not_visited', 'visited', 'answered', 'marked', 'answered_marked'],
      default: 'not_visited',
    },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const bucketSchema = new mongoose.Schema(
  {
    label: String,
    total: Number,
    correct: Number,
    wrong: Number,
    unattempted: Number,
    accuracy: Number,
  },
  { _id: false }
);

const testAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', index: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    topicAnalysis: { type: [bucketSchema], default: [] },
    difficultyAnalysis: { type: [bucketSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

testAttemptSchema.index({ userId: 1, testId: 1, status: 1 });

export default mongoose.model('TestAttempt', testAttemptSchema);
