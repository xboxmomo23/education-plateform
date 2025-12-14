import { Router } from 'express';
import { param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { exportClassTimetablePdfHandler } from '../controllers/timetable.controller';

const router = Router();

router.get(
  '/timetable/classes/:classId/print',
  authenticate,
  authorize('staff'),
  param('classId').isUUID().withMessage('ID de classe invalide'),
  query('weekStart')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide (format YYYY-MM-DD)'),
  query('format')
    .optional()
    .isIn(['carnet', 'full'])
    .withMessage('format doit être "carnet" ou "full"'),
  query('theme')
    .optional()
    .isIn(['color', 'gray'])
    .withMessage('theme doit être "color" ou "gray"'),
  query('color')
    .optional()
    .isIn(['0', '1'])
    .withMessage('color doit être "0" ou "1"'),
  validateRequest,
  exportClassTimetablePdfHandler
);

export default router;
