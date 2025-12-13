import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { requireParentAccessToStudent } from '../middleware/parentAccess';
import { getParentStudentAttendanceHandler } from '../controllers/parent-attendance.controller';

const router = Router();

router.use(authenticate, authorize('parent'));

router.get(
  '/students/:studentId/attendance',
  param('studentId').isUUID().withMessage('studentId doit être un UUID valide'),
  validateRequest,
  requireParentAccessToStudent(),
  getParentStudentAttendanceHandler
);

export default router;
