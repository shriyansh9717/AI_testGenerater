import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTest,
  deleteTest,
  getTest,
  listTests,
  saveProgress,
  startTest,
  submitTest,
} from '../controllers/testController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.post(
  '/',
  [
    body('title').optional().isString().trim().isLength({ max: 120 }),
    body('questionIds').isArray({ min: 1 }).withMessage('Select at least one question.'),
    body('questionIds.*').isMongoId(),
    body('examPatternId').optional({ nullable: true }).isMongoId(),
  ],
  validate,
  createTest
);

router.get('/', listTests);
router.get('/:id', getTest);
router.delete('/:id', deleteTest);

router.post('/:id/start', startTest);
router.patch('/:id/attempts/:attemptId', saveProgress);
router.post(
  '/:id/submit',
  [body('attemptId').isMongoId().withMessage('That attempt id is not valid.'), body('answers').isArray()],
  validate,
  submitTest
);

export default router;
