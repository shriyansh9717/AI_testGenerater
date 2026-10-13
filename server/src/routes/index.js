import { Router } from 'express';
import authRoutes from './authRoutes.js';
import documentRoutes from './documentRoutes.js';
import questionRoutes from './questionRoutes.js';
import examPatternRoutes from './examPatternRoutes.js';
import testRoutes from './testRoutes.js';
import resultRoutes from './resultRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import { isAiConfigured } from '../services/ai/index.js';
import { config } from '../config/env.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      aiConfigured: isAiConfigured(),
      aiProvider: config.ai.provider,
      time: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/questions', questionRoutes);
router.use('/exam-patterns', examPatternRoutes);
router.use('/tests', testRoutes);
router.use('/results', resultRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
