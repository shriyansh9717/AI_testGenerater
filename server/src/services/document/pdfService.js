import fs from 'fs/promises';
import { createRequire } from 'module';
import ApiError from '../../utils/ApiError.js';
import { cleanText } from '../../utils/text.js';

// pdf-parse ships as CommonJS and runs demo code when imported via its index,
// so the library entry point is required directly.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export async function extractTextFromPdf(filePath) {
  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    throw ApiError.badRequest('The uploaded PDF could not be read.');
  }

  let result;
  try {
    result = await pdfParse(buffer);
  } catch (error) {
    throw ApiError.unprocessable(
      'This PDF could not be read. It may be corrupted or password protected.',
      error.message
    );
  }

  const text = cleanText(result.text || '');
  if (text.length < 120) {
    throw ApiError.unprocessable(
      'Almost no text was found in this PDF. If the pages are scans, upload them as images so they can be read with OCR.'
    );
  }

  return { text, pages: result.numpages || 0 };
}
