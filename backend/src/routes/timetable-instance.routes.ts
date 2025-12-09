import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getInstancesForWeekHandler,
  createInstanceHandler,
  generateFromTemplateHandler,
  generateFromTemplateBulkHandler,  // ✨ NOUVEAU HANDLER
  copyWeekHandler,
  updateInstanceHandler,
  deleteInstanceHandler,
} from '../controllers/timetable-instance.controller';

const router = Router();

/**
 * GET /api/timetable/instances/class/:classId/week/:weekStartDate
 * Récupérer les instances d'une semaine
 */
router.get(
  '/class/:classId/week/:weekStartDate',
  authenticate,
  param('classId').isUUID(),
  param('weekStartDate').isDate(),
  validateRequest,
  getInstancesForWeekHandler
);

/**
 * POST /api/timetable/instances
 * Créer une instance
 */
router.post(
  '/',
  authenticate,
  authorize('staff', 'admin'),
  body('class_id').isUUID(),
  body('course_id').isUUID(),
  body('week_start_date').isDate(),
  body('day_of_week').isInt({ min: 1, max: 7 }),
  body('start_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  validateRequest,
  createInstanceHandler
);

/**
 * POST /api/timetable/instances/generate-from-template
 * Générer depuis template (UNE SEULE SEMAINE)
 */
router.post(
  '/generate-from-template',
  authenticate,
  authorize('staff', 'admin'),
  body('class_id').isUUID(),
  body('source_week_start').isDate(),
  body('target_week_start').isDate(),
  validateRequest,
  generateFromTemplateHandler
);

/**
 * ✨ NOUVEAU : POST /api/timetable/instances/generate-bulk
 * Générer depuis template (PLUSIEURS SEMAINES)
 */
router.post(
  '/generate-bulk',
  authenticate,
  authorize('staff', 'admin'),
  body('class_id').isUUID().withMessage('ID de classe invalide'),
  body('source_week_start').isDate().withMessage('source_week_start invalide'),
  body('target_weeks')
    .isArray({ min: 1 })
    .withMessage('target_weeks doit être un tableau non vide'),
  body('target_weeks.*')
    .isDate()
    .withMessage('Chaque date doit être au format valide (YYYY-MM-DD)'),
  validateRequest,
  generateFromTemplateBulkHandler
);

/**
 * POST /api/timetable/instances/copy-week
 * Copier une semaine
 */
router.post(
  '/copy-week',
  authenticate,
  authorize('staff', 'admin'),
  body('class_id').isUUID(),
  body('source_week').isDate(),
  body('target_week').isDate(),
  validateRequest,
  copyWeekHandler
);

/**
 * PUT /api/timetable/instances/:id
 * Modifier une instance
 */
router.put(
  '/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID(),
  validateRequest,
  updateInstanceHandler
);

/**
 * DELETE /api/timetable/instances/:id
 * Supprimer une instance
 */
router.delete(
  '/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID(),
  validateRequest,
  deleteInstanceHandler
);

export default router;
