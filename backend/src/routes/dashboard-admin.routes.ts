import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';
import { getAdminDashboardKpisHandler, getAdminPerformanceHandler } from '../controllers/dashboard-admin.controller';

const router = Router();

router.get(
  '/kpi',
  authenticate,
  authorize('admin', 'super_admin'),
  getAdminDashboardKpisHandler
);

router.get(
  '/performance',
  authenticate,
  authorize('admin', 'super_admin'),
  query('termId').optional().isUUID(),
  query('classId').optional().custom((value) => value === 'all' || /^[0-9a-fA-F-]{36}$/.test(value)),
  validateRequest,
  getAdminPerformanceHandler
);

export default router;
