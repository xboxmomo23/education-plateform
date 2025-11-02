import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { getGradeByIdHandler } from '../controllers/grade.controller'; // Ajouter cet import en haut
import {
  getCourseStudentsWithGrades, // ✅ Ajouter
} from '../controllers/grade.controller';

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
  // staff
  getChildrenGradesHandler,
  // Cours
  getCourseGradesHandler,
  // Statistiques
  getClassAveragesHandler,
  getStaffManagedStudentsGradesHandler,
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
    .optional({ nullable: true })  // ✅ Permet null ET undefined
    .custom((value, { req, path }) => {
      // Extraire l'index du grade depuis le path (ex: "grades[0].value")
      const match = path.match(/grades\[(\d+)\]\.value/)
      if (!match) return true
      
      const index = parseInt(match[1])
      const grade = req.body.grades[index]
      
      // Si absent = true, value peut être null
      if (grade && grade.absent === true) {
        return true
      }
      
      // Sinon, value doit être un nombre valide
      if (value !== null && value !== undefined) {
        const num = parseFloat(value)
        if (isNaN(num) || num < 0 || num > 100) {
          throw new Error('La note doit être entre 0 et 100')
        }
      }
      
      return true
    }),
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
    .optional({ nullable: true })  // ✅ Permet null
    .custom((value, { req }) => {
      // Si absent = true, value peut être null
      if (req.body.absent === true) {
        return true;
      }
      // Si absent = false, value doit être un nombre valide
      if (value !== null && value !== undefined) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0 || num > 100) {
          throw new Error('La note doit être entre 0 et 100');
        }
      }
      return true;
    }),
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
  authorize('teacher', 'admin', 'staff', 'parent'),
  getTeacherEvaluationsHandler
);

/**
 * GET /api/grades/evaluations/:id
 * Détails d'une évaluation avec notes
 */
router.get(
  '/evaluations/:id',
  authenticate,
  authorize('teacher', 'admin', 'staff', 'parent'),
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
  authorize('teacher', 'admin', 'staff', 'parent'),
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
  authorize('teacher', 'admin', 'staff', 'parent'),
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
  authorize('teacher', 'admin', 'staff', 'parent'),
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


// ============================================
// IMPORTANT : Ordre des routes
// Cette route doit être placée APRÈS les routes d'évaluations
// mais AVANT la route /:id/history pour éviter les conflits
// ============================================

// Placer cette route vers la ligne 200, après les routes d'évaluations






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
// ROUTES NOTES - responsables
// =========================

/**
 * GET /api/grades/children
 * Notes des enfants d'un staff
 */
router.get(
  '/children',
  authenticate,
  authorize('staff'),
  query('termId').optional().isUUID(),
  query('studentId').optional().isUUID(),
  validateRequest,
  getChildrenGradesHandler
);



// Après la ligne (route /children)

/**
 * GET /api/grades/managed-students
 * Notes des élèves gérés par le staff
 */
router.get(
  '/managed-students',
  authenticate,
  authorize('staff'),
  query('termId').optional().isUUID(),
  query('courseId').optional().isUUID(),
  query('classId').optional().isUUID(),
  validateRequest,
  getStaffManagedStudentsGradesHandler
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
  authorize('teacher', 'admin', 'staff'),
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
  authorize('teacher', 'admin', 'staff'),
  param('classId').isUUID(),
  query('termId').optional().isUUID(),
  validateRequest,
  getClassAveragesHandler
);


/**
 * GET /api/grades/course/:courseId/students
 * Liste des élèves d'un cours avec leurs notes
 */
  router.get(
    '/course/:courseId/students',
    authenticate,
    authorize('teacher', 'admin'),
    param('courseId').isUUID(),
    query('evaluationId').optional().isUUID(),
    validateRequest,
    getCourseStudentsWithGrades
  );


/**
 * GET /api/grades/:id
 * Récupère les détails complets d'une note
 * IMPORTANT : Cette route doit être AVANT /:id/history
 */
router.get(
  '/:id',
  authenticate,
  authorize('teacher', 'admin', 'staff', 'student', 'parent'),
  param('id').isUUID().withMessage('ID de note invalide'),
  validateRequest,
  getGradeByIdHandler
);


/**
 * GET /api/grades/:id/history
 * Historique d'une note
 */
router.get(
  '/:id/history',
  authenticate,
  authorize('teacher', 'admin', 'staff'),
  param('id').isUUID(),
  validateRequest,
  getGradeHistoryHandler
);


export default router;