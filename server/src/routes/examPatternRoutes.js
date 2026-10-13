import { Router } from 'express';
import { body } from 'express-validator';
import { createPattern, deletePattern, listPatterns } from '../controllers/examPatternController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/', listPatterns);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name this pattern.'),
    body('totalQuestions').isInt({ min: 1, max: 200 }),
    body('durationMinutes').isInt({ min: 1, max: 360 }),
    body('marksPerQuestion').isFloat({ min: 0.25, max: 10 }),
    body('negativeMarking').isFloat({ min: 0, max: 5 }),
    body('optionsPerQuestion').isInt({ min: 2, max: 6 }),
  ],
  validate,
  createPattern
);

router.delete('/:id', deletePattern);

export default router;
