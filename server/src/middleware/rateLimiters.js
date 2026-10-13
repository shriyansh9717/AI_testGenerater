import rateLimit from 'express-rate-limit';

const message = (text) => ({ success: false, message: text });

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests. Wait a few minutes and try again.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: message('Too many sign-in attempts. Try again in 15 minutes.'),
});

// AI calls cost money and time, so they get their own tighter budget.
const isProduction = process.env.NODE_ENV === 'production';

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: message('Question generation limit reached for this hour.'),
});
