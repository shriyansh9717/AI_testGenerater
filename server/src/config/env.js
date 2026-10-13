import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 15),
  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    baseUrl: process.env.AI_BASE_URL || '',
    maxRetries: num(process.env.AI_MAX_RETRIES, 2),
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 90000),
  },
  ocr: {
    languages: process.env.OCR_LANGUAGES || 'eng',
  },
};

/**
 * Fails fast on boot when secrets that the whole app depends on are missing.
 * The AI key is checked lazily instead, so the app still runs for auth/history
 * work when no AI provider is configured yet.
 */
export function assertCoreConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
    );
  }
  if (config.jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters long.');
  }
}
