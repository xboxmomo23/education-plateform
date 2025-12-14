import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';
import { getAuditLogsHandler, exportAuditLogsCsvHandler } from '../controllers/audit.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  validateRequest,
  getAuditLogsHandler
);

router.get(
  '/export.csv',
  authenticate,
  authorize('admin', 'super_admin'),
  query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  validateRequest,
  exportAuditLogsCsvHandler
);

export default router;
