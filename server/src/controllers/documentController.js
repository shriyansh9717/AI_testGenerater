import fs from 'fs/promises';
import path from 'path';
import Document from '../models/Document.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { extractTextFromPdf } from '../services/document/pdfService.js';
import { extractTextFromImages } from '../services/ocr/index.js';
import { cleanText } from '../utils/text.js';

const cleanupFiles = async (files = []) => {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
};

/** POST /api/documents/upload — PDF or page images in, extracted text out. */
export const uploadDocument = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('Attach at least one PDF or image.');

  const { subject = '', topic = '' } = req.body;
  const isPdf = files[0].mimetype === 'application/pdf';

  if (isPdf && files.length > 1) {
    await cleanupFiles(files);
    throw ApiError.badRequest('Upload one PDF at a time.');
  }
  if (!isPdf && files.some((file) => file.mimetype === 'application/pdf')) {
    await cleanupFiles(files);
    throw ApiError.badRequest('Mix of PDF and images is not supported. Upload one kind at a time.');
  }

  try {
    const extraction = isPdf
      ? await extractTextFromPdf(files[0].path)
      : await extractTextFromImages(files.map((file) => file.path));

    const document = await Document.create({
      userId: req.user._id,
      fileName: isPdf ? files[0].originalname : `${files.length} page image(s)`,
      fileType: isPdf ? 'pdf' : 'image',
      fileUrl: files.map((file) => `/${path.basename(path.dirname(file.path))}/${path.basename(file.path)}`).join(','),
      extractedText: extraction.text,
      subject,
      topic,
      source: 'upload',
    });

    res.status(201).json({
      success: true,
      data: {
        document: {
          _id: document._id,
          fileName: document.fileName,
          fileType: document.fileType,
          charCount: document.charCount,
          subject: document.subject,
          topic: document.topic,
          preview: document.extractedText.slice(0, 1200),
          createdAt: document.createdAt,
        },
      },
    });
  } catch (error) {
    await cleanupFiles(files);
    throw error;
  }
});

/** POST /api/documents/process — store pasted study material or a plain topic. */
export const processText = asyncHandler(async (req, res) => {
  const { text = '', subject = '', topic = '' } = req.body;
  const cleaned = cleanText(text);

  if (!cleaned && !topic.trim()) {
    throw ApiError.badRequest('Enter a topic or paste some study material.');
  }
  if (cleaned && cleaned.length < 120) {
    throw ApiError.badRequest('That material is too short to build questions from. Paste at least a paragraph.');
  }

  const document = await Document.create({
    userId: req.user._id,
    fileName: topic || 'Pasted material',
    fileType: 'text',
    extractedText: cleaned,
    subject,
    topic,
    source: 'topic',
  });

  res.status(201).json({
    success: true,
    data: {
      document: {
        _id: document._id,
        fileName: document.fileName,
        fileType: document.fileType,
        charCount: document.charCount,
        subject: document.subject,
        topic: document.topic,
        preview: document.extractedText.slice(0, 1200),
        createdAt: document.createdAt,
      },
    },
  });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ userId: req.user._id })
    .select('-extractedText')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, data: { documents } });
});

export const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) throw ApiError.notFound('That document is not in your library.');
  res.json({ success: true, data: { document } });
});
