import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { requireParentAccessToStudent } from '../middleware/parentAccess';
import { getParentStudentDashboardHandler } from '../controllers/parent-dashboard.controller';

const router = Router();

router.use(authenticate, authorize('parent'));

router.get(
  '/students/:studentId/dashboard',
  param('studentId').isUUID().withMessage('studentId doit être un UUID valide'),
  validateRequest,
  requireParentAccessToStudent(),
  getParentStudentDashboardHandler
);

export default router;
