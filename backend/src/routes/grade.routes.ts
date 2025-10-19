import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  // Evaluations
  createEvaluationHandler,
  getTeacherEvaluationsHandler,
  getEvaluationDetailsHandler,
  updateEvaluationHandler,
  deleteEvaluationHandler,
  // Notes
  createOrUpdateGradesHandler,
  updateGradeHandler,
  deleteGradeHandler,
  getGradeHistoryHandler,
  // Consultation élève
  getStudentGradesHandler,
  getStudentAveragesHandler,
  // Responsable
  getChildrenGradesHandler,
  // Cours
  getCourseGradesHandler,
  // Statistiques
  getClassAveragesHandler,
} from '../controllers/grade.controller';

const router = Router();

// =========================
// Validation Schemas
// =========================

const createEvaluationValidation = [
  body('courseId')
    .isUUID()
    .withMessage('ID de cours invalide'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est requis')
    .isLength({ max: 200 })
    .withMessage('Le titre ne doit pas dépasser 200 caractères'),
  body('type')
    .isIn(['controle', 'devoir', 'participation', 'examen'])
    .withMessage('Type d\'évaluation invalide'),
  body('coefficient')
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Le coefficient doit être entre 0.5 et 10'),
  body('maxScale')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Le barème doit être entre 1 et 100'),
  body('evalDate')
    .isISO8601()
    .withMessage('Date d\'évaluation invalide'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La description ne doit pas dépasser 1000 caractères'),
];

const updateEvaluationValidation = [
  param('id').isUUID().withMessage('ID invalide'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le titre ne peut pas être vide')
    .isLength({ max: 200 })
    .withMessage('Le titre ne doit pas dépasser 200 caractères'),
  body('type')
    .optional()
    .isIn(['controle', 'devoir', 'participation', 'examen'])
    .withMessage('Type d\'évaluation invalide'),
  body('coefficient')
    .optional()
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Le coefficient doit être entre 0.5 et 10'),
  body('maxScale')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Le barème doit être entre 1 et 100'),
  body('evalDate')
    .optional()
    .isISO8601()
    .withMessage('Date d\'évaluation invalide'),
];

const createGradesValidation = [
  body('evaluationId')
    .isUUID()
    .withMessage('ID d\'évaluation invalide'),
  body('grades')
    .isArray({ min: 1 })
    .withMessage('Au moins une note est requise'),
  body('grades.*.studentId')
    .isUUID()
    .withMessage('ID d\'élève invalide'),
  body('grades.*.value')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La note doit être entre 0 et 100'),
  body('grades.*.absent')
    .optional()
    .isBoolean()
    .withMessage('Le statut absent doit être un booléen'),
  body('grades.*.comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Le commentaire ne doit pas dépasser 500 caractères'),
];

const updateGradeValidation = [
  param('id').isUUID().withMessage('ID invalide'),
  body('value')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La note doit être entre 0 et 100'),
  body('absent')
    .optional()
    .isBoolean()
    .withMessage('Le statut absent doit être un booléen'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Le commentaire ne doit pas dépasser 500 caractères'),
];

// =========================
// ROUTES EVALUATIONS (Professeurs)
// =========================

/**
 * POST /api/grades/evaluations
 * Créer une évaluation
 */
router.post(
  '/evaluations',
  authenticate,
  authorize('teacher', 'admin'),
  createEvaluationValidation,
  validateRequest,
  createEvaluationHandler
);

/**
 * GET /api/grades/evaluations
 * Liste des évaluations (selon rôle)
 */
router.get(
  '/evaluations',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  getTeacherEvaluationsHandler
);

/**
 * GET /api/grades/evaluations/:id
 * Détails d'une évaluation avec notes
 */
router.get(
  '/evaluations/:id',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  param('id').isUUID(),
  validateRequest,
  getEvaluationDetailsHandler
);

/**
 * PUT /api/grades/evaluations/:id
 * Modifier une évaluation
 */
router.put(
  '/evaluations/:id',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  updateEvaluationValidation,
  validateRequest,
  updateEvaluationHandler
);

/**
 * DELETE /api/grades/evaluations/:id
 * Supprimer une évaluation
 */
router.delete(
  '/evaluations/:id',
  authenticate,
  authorize('teacher', 'admin'),
  param('id').isUUID(),
  validateRequest,
  deleteEvaluationHandler
);

// =========================
// ROUTES NOTES - Saisie/Modification
// =========================

/**
 * POST /api/grades
 * Saisir/modifier des notes en batch
 */
router.post(
  '/',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  createGradesValidation,
  validateRequest,
  createOrUpdateGradesHandler
);

/**
 * PUT /api/grades/:id
 * Modifier une note individuelle
 */
router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  updateGradeValidation,
  validateRequest,
  updateGradeHandler
);

/**
 * DELETE /api/grades/:id
 * Supprimer une note
 */
router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  param('id').isUUID(),
  validateRequest,
  deleteGradeHandler
);

/**
 * GET /api/grades/:id/history
 * Historique d'une note
 */
router.get(
  '/:id/history',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  param('id').isUUID(),
  validateRequest,
  getGradeHistoryHandler
);

// =========================
// ROUTES NOTES - Consultation Élève
// =========================

/**
 * GET /api/grades/student/:studentId
 * Notes d'un élève
 */
router.get(
  '/student/:studentId',
  authenticate,
  param('studentId').isUUID(),
  query('termId').optional().isUUID(),
  query('courseId').optional().isUUID(),
  validateRequest,
  getStudentGradesHandler
);

/**
 * GET /api/grades/student/:studentId/averages
 * Moyennes d'un élève
 */
router.get(
  '/student/:studentId/averages',
  authenticate,
  param('studentId').isUUID(),
  query('termId').optional().isUUID(),
  validateRequest,
  getStudentAveragesHandler
);

// =========================
// ROUTES NOTES - Responsables
// =========================

/**
 * GET /api/grades/children
 * Notes des enfants d'un responsable
 */
router.get(
  '/children',
  authenticate,
  authorize('responsable'),
  query('termId').optional().isUUID(),
  query('studentId').optional().isUUID(),
  validateRequest,
  getChildrenGradesHandler
);

// =========================
// ROUTES NOTES - Par Cours
// =========================

/**
 * GET /api/grades/course/:courseId
 * Notes d'un cours
 */
router.get(
  '/course/:courseId',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  param('courseId').isUUID(),
  query('evaluationId').optional().isUUID(),
  validateRequest,
  getCourseGradesHandler
);

// =========================
// ROUTES STATISTIQUES
// =========================

/**
 * GET /api/grades/class/:classId/averages
 * Moyennes d'une classe
 */
router.get(
  '/class/:classId/averages',
  authenticate,
  authorize('teacher', 'admin', 'responsable'),
  param('classId').isUUID(),
  query('termId').optional().isUUID(),
  validateRequest,
  getClassAveragesHandler
);

export default router;