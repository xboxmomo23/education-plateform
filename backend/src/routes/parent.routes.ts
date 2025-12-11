import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { getParentChildrenHandler, checkParentChildAccessHandler } from '../controllers/parent.controller';
import { requireParentAccessToStudent } from '../middleware/parentAccess';

const router = Router();

router.use(authenticate, authorize('parent'));

router.get('/children', getParentChildrenHandler);

router.get(
  '/children/:studentId/check',
  param('studentId').isUUID().withMessage('studentId doit être un UUID valide'),
  validateRequest,
  requireParentAccessToStudent(),
  checkParentChildAccessHandler
);

export default router;
