import { createWorker } from 'tesseract.js';
import { config } from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';
import { cleanText } from '../../utils/text.js';

/**
 * Reads text from page images. One worker handles the whole batch; it is always
 * terminated so a failed page cannot leak a process.
 */
export async function extractTextFromImages(filePaths = []) {
  if (!filePaths.length) throw ApiError.badRequest('No images were supplied.');

  let worker;
  try {
    worker = await createWorker(config.ocr.languages);
  } catch (error) {
    throw ApiError.serviceUnavailable(
      'The OCR engine could not start. Check that the server can download Tesseract language data.',
      error.message
    );
  }

  const pages = [];
  try {
    for (const filePath of filePaths) {
      const { data } = await worker.recognize(filePath);
      pages.push({ filePath, text: cleanText(data.text || ''), confidence: data.confidence ?? null });
    }
  } catch (error) {
    throw ApiError.unprocessable('One of the images could not be read.', error.message);
  } finally {
    await worker.terminate().catch(() => {});
  }

  const text = cleanText(pages.map((page) => page.text).join('\n\n'));
  if (text.length < 120) {
    throw ApiError.unprocessable(
      'Not enough readable text was found in these images. Retake the photo straight on, in good light, with the text filling the frame.'
    );
  }

  return { text, pages };
}
