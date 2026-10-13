import { Router } from 'express';
import { body } from 'express-validator';
import {
  deleteQuestion,
  generate,
  getQuestion,
  listQuestions,
} from '../controllers/questionController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = Router();
router.use(protect);

router.post(
  '/generate',
  aiLimiter,
  [
    body('count').isInt({ min: 1, max: 50 }).withMessage('Choose between 1 and 50 questions.'),
    body('difficulty').isIn(['easy', 'medium', 'hard', 'mixed']).withMessage('Choose a difficulty.'),
    body('questionType').isIn(['mcq', 'true_false', 'multiple_choice']).withMessage('Choose a question type.'),
    body('optionsPerQuestion').optional().isInt({ min: 2, max: 6 }),
    body('documentId').optional({ nullable: true }).isMongoId().withMessage('That document id is not valid.'),
    body('topic').optional().isString().trim().isLength({ max: 160 }),
  ],
  validate,
  generate
);

router.get('/', listQuestions);
router.get('/:id', getQuestion);
router.delete('/:id', deleteQuestion);

export default router;
