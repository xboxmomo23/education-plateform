import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getStaffAbsenceHistoryHandler,
  exportStaffAbsencesCsvHandler,
  exportStaffAbsencesPdfHandler,
} from '../controllers/staff-absences.controller';

const router = Router();

const historyValidations = [
  query('q').optional().isString().isLength({ max: 200 }),
  query('classId').optional().isUUID().withMessage('classId invalide'),
  query('status')
    .optional()
    .isIn(['absent', 'late', 'excused', 'all'])
    .withMessage('status invalide'),
  query('justified')
    .optional()
    .isIn(['true', 'false', 'all'])
    .withMessage('justified invalide'),
  query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('from invalide'),
  query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('to invalide'),
  query('page').optional().isInt({ min: 1 }).withMessage('page invalide'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit invalide'),
  query('sort')
    .optional()
    .isIn(['date_desc', 'date_asc', 'student_asc', 'class_asc'])
    .withMessage('sort invalide'),
];

router.get(
  '/history',
  authenticate,
  authorize('staff'),
  historyValidations,
  validateRequest,
  getStaffAbsenceHistoryHandler
);

router.get(
  '/export.csv',
  authenticate,
  authorize('staff'),
  historyValidations,
  validateRequest,
  exportStaffAbsencesCsvHandler
);

router.get(
  '/export.pdf',
  authenticate,
  authorize('staff'),
  historyValidations,
  validateRequest,
  exportStaffAbsencesPdfHandler
);

export default router;
