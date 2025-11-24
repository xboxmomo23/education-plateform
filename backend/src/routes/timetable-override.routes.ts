import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createOverrideHandler,
  getOverridesForWeekHandler,
  updateOverrideHandler,
  deleteOverrideHandler,
} from '../controllers/timetable-override.controller';

const router = Router();

/**
 * POST /api/timetable/overrides
 * Créer une exception
 */
router.post(
  '/',
  authenticate,
  authorize('staff', 'admin'),
  body('template_entry_id').isUUID().withMessage('ID invalide'),
  body('override_date').isDate().withMessage('Date invalide (format: YYYY-MM-DD)'),
  body('override_type')
    .isIn(['cancel', 'modify_time', 'modify_room', 'replace_course', 'replace_teacher'])
    .withMessage('Type d\'exception invalide'),
  validateRequest,
  createOverrideHandler
);

/**
 * GET /api/timetable/overrides/class/:classId/week/:weekStartDate
 * Récupérer les overrides d'une semaine
 */
router.get(
  '/class/:classId/week/:weekStartDate',
  authenticate,
  param('classId').isUUID(),
  param('weekStartDate').isDate(),
  validateRequest,
  getOverridesForWeekHandler
);

/**
 * PUT /api/timetable/overrides/:id
 * Modifier un override
 */
router.put(
  '/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID(),
  validateRequest,
  updateOverrideHandler
);

/**
 * DELETE /api/timetable/overrides/:id
 * Supprimer un override
 */
router.delete(
  '/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID(),
  validateRequest,
  deleteOverrideHandler
);

export default router;