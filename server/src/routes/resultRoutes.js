import { Router } from 'express';
import { getResult, listResults } from '../controllers/resultController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', listResults);
router.get('/:id', getResult);

export default router;
