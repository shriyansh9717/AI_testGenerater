import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDocument,
  listDocuments,
  processText,
  uploadDocument,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.post('/upload', upload.array('files', 10), uploadDocument);
router.post(
  '/process',
  [
    body('text').optional().isString(),
    body('topic').optional().isString().trim().isLength({ max: 160 }),
  ],
  validate,
  processText
);
router.get('/', listDocuments);
router.get('/:id', getDocument);

export default router;
