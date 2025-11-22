import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getSessionsHandler,
  getSessionStudentsHandler,
  bulkCreateRecordsHandler,
  updateRecordHandler,
  getStudentRecordsHandler,
  getStudentStatsHandler,
  getStaffClassesHandler,
} from '../controllers/attendance.controller';
import { sseStreamHandler } from '../services/attendance.sse';

const router = Router();

// =========================
// VALIDATIONS
// =========================

const bulkCreateValidation = [
  param('id').isUUID().withMessage('ID de session invalide'),
  body('records')
    .isArray({ min: 1 })
    .withMessage('Au moins un enregistrement est requis'),
  body('records.*.student_id')
    .isUUID()
    .withMessage('ID étudiant invalide'),
  body('records.*.status')
    .isIn(['present', 'absent', 'late', 'excused', 'remote', 'excluded'])
    .withMessage('Statut invalide'),
  body('records.*.late_minutes')
    .optional()
    .isInt({ min: 0, max: 1440 })
    .withMessage('Le retard doit être entre 0 et 1440 minutes'),
  body('records.*.justification')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La justification ne doit pas dépasser 500 caractères'),
];

const updateRecordValidation = [
  param('id').isUUID().withMessage('ID invalide'),
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'excused', 'remote', 'excluded'])
    .withMessage('Statut invalide'),
  body('late_minutes')
    .optional()
    .isInt({ min: 0, max: 1440 })
    .withMessage('Le retard doit être entre 0 et 1440 minutes'),
  body('justification')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La justification ne doit pas dépasser 500 caractères'),
];

// =========================
// ROUTES SESSIONS
// =========================

/**
 * GET /api/attendance/sessions
 * Liste des sessions du jour (professeur ou staff)
 */
router.get(
  '/sessions',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  query('date').optional().isISO8601().withMessage('Date invalide'),
  validateRequest,
  getSessionsHandler
);

/**
 * GET /api/attendance/sessions/:id
 * Détails d'une session avec les élèves
 */
router.get(
  '/sessions/:id',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('id').isUUID().withMessage('ID invalide'),
  validateRequest,
  getSessionStudentsHandler
);

/**
 * GET /api/attendance/sessions/:id/stream
 * Stream SSE pour les mises à jour en temps réel
 */
router.get(
  '/sessions/:id/stream',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('id').isUUID().withMessage('ID invalide'),
  validateRequest,
  sseStreamHandler
);

// =========================
// ROUTES RECORDS
// =========================

/**
 * POST /api/attendance/sessions/:id/records/bulk
 * Enregistrer/modifier l'appel complet
 */
router.post(
  '/sessions/:id/records/bulk',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  bulkCreateValidation,
  validateRequest,
  bulkCreateRecordsHandler
);

/**
 * PUT /api/attendance/records/:id
 * Modifier une présence individuelle
 */
router.put(
  '/records/:id',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  updateRecordValidation,
  validateRequest,
  updateRecordHandler
);



export default router;