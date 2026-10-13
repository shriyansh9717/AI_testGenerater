import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'image', 'text'], required: true },
    fileUrl: { type: String, default: '' },
    extractedText: { type: String, default: '' },
    charCount: { type: Number, default: 0 },
    subject: { type: String, default: '', trim: true },
    topic: { type: String, default: '', trim: true },
    source: { type: String, enum: ['upload', 'topic'], default: 'upload' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

documentSchema.pre('save', function setCharCount(next) {
  this.charCount = this.extractedText ? this.extractedText.length : 0;
  next();
});

export default mongoose.model('Document', documentSchema);
