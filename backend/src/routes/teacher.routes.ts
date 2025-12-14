import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getTeacherClassesSummaryHandler } from '../controllers/teacher.controller';

const router = Router();

router.get(
  '/classes/summary',
  authenticate,
  authorize('teacher'),
  getTeacherClassesSummaryHandler
);

export default router;
