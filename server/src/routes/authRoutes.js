import { Router } from 'express';
import { body } from 'express-validator';
import { login, me, register, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your name.'),
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Use at least 8 characters.')
      .matches(/\d/)
      .withMessage('Include at least one number.'),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Enter your password.'),
  ],
  validate,
  login
);

router.get('/me', protect, me);

router.patch(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('newPassword').optional().isLength({ min: 8 }).withMessage('Use at least 8 characters.'),
  ],
  validate,
  updateProfile
);

export default router;
