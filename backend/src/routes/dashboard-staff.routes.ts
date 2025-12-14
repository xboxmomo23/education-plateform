import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getStaffKpiHandler,
  getStaffPendingAbsencesHandler,
  getStaffClassesSummaryHandler,
} from '../controllers/dashboard-staff.controller';

const router = Router();

router.get(
  '/kpi',
  authenticate,
  authorize('staff'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date doit être au format YYYY-MM-DD'),
  validateRequest,
  getStaffKpiHandler
);

router.get(
  '/pending-absences',
  authenticate,
  authorize('staff'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date doit être au format YYYY-MM-DD'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit doit être entre 1 et 50'),
  validateRequest,
  getStaffPendingAbsencesHandler
);

router.get(
  '/classes/summary',
  authenticate,
  authorize('staff'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date doit être au format YYYY-MM-DD'),
  validateRequest,
  getStaffClassesSummaryHandler
);

export default router;
