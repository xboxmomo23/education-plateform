import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getTeacherAssignmentsHandler,
  createAssignmentHandler,
  updateAssignmentHandler,
  deleteAssignmentHandler,
  getStudentAssignmentsHandler,
  getStudentAssignmentByIdHandler,
} from '../controllers/assignment.controller';

const router = Router();

// ============================================
// ROUTES - ENSEIGNANTS (staff, admin, teacher)
// ============================================

/**
 * GET /api/assignments/teacher
 * Récupérer les devoirs de l'enseignant connecté
 * 
 * Query params optionnels:
 * - courseId: UUID du cours
 * - classId: UUID de la classe
 * - status: 'draft' | 'published'
 * - fromDueAt: Date ISO (ex: 2025-12-01)
 * - toDueAt: Date ISO
 */
router.get(
  '/teacher',
  authenticate,
  authorize('staff', 'admin', 'teacher'),
  query('courseId').optional().isUUID().withMessage('courseId doit être un UUID valide'),
  query('classId').optional().isUUID().withMessage('classId doit être un UUID valide'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('status invalide'),
  query('fromDueAt').optional().isISO8601().withMessage('fromDueAt doit être une date valide'),
  query('toDueAt').optional().isISO8601().withMessage('toDueAt doit être une date valide'),
  validateRequest,
  getTeacherAssignmentsHandler
);

/**
 * POST /api/assignments/teacher
 * Créer un nouveau devoir
 * 
 * Body:
 * - course_id: UUID (obligatoire)
 * - title: string (obligatoire)
 * - due_at: Date ISO avec timezone (obligatoire)
 * - description: string (optionnel)
 * - status: 'draft' | 'published' (défaut: 'draft')
 * - resource_url: string URL (optionnel)
 * - max_points: number (optionnel)
 */
router.post(
  '/teacher',
  authenticate,
  authorize('staff', 'admin', 'teacher'),
  body('course_id')
    .isUUID()
    .withMessage('course_id doit être un UUID valide'),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('title est obligatoire (max 200 caractères)'),
  body('due_at')
    .isISO8601()
    .withMessage('due_at doit être une date ISO valide'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('description trop longue (max 5000 caractères)'),
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('status doit être "draft" ou "published"'),
  body('resource_url')
    .optional()
    .isURL()
    .withMessage('resource_url doit être une URL valide'),
  body('max_points')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('max_points doit être un nombre entre 0 et 999.99'),
  validateRequest,
  createAssignmentHandler
);

/**
 * PATCH /api/assignments/teacher/:id
 * Modifier un devoir existant
 * 
 * Body (tous optionnels):
 * - title, description, due_at, status, resource_url, max_points, course_id
 */
router.patch(
  '/teacher/:id',
  authenticate,
  authorize('staff', 'admin', 'teacher'),
  param('id').isUUID().withMessage('id doit être un UUID valide'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('title invalide (max 200 caractères)'),
  body('due_at')
    .optional()
    .isISO8601()
    .withMessage('due_at doit être une date ISO valide'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('description trop longue'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('status invalide'),
  body('resource_url')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      // Valider comme URL si non null/vide
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        throw new Error('resource_url doit être une URL valide');
      }
      return true;
    }),
  body('max_points')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 999.99) {
        throw new Error('max_points doit être entre 0 et 999.99');
      }
      return true;
    }),
  body('course_id')
    .optional()
    .isUUID()
    .withMessage('course_id doit être un UUID valide'),
  validateRequest,
  updateAssignmentHandler
);

/**
 * DELETE /api/assignments/teacher/:id
 * Supprimer (archiver) un devoir
 */
router.delete(
  '/teacher/:id',
  authenticate,
  authorize('staff', 'admin', 'teacher'),
  param('id').isUUID().withMessage('id doit être un UUID valide'),
  validateRequest,
  deleteAssignmentHandler
);

// ============================================
// ROUTES - ÉLÈVES (students)
// ============================================

/**
 * GET /api/assignments/student
 * Récupérer les devoirs de l'élève connecté
 * 
 * Query params optionnels:
 * - subjectId: UUID de la matière
 * - fromDueAt: Date ISO
 * - toDueAt: Date ISO
 */
router.get(
  '/student',
  authenticate,
  authorize('student'),
  query('subjectId').optional().isUUID().withMessage('subjectId doit être un UUID valide'),
  query('fromDueAt').optional().isISO8601().withMessage('fromDueAt doit être une date valide'),
  query('toDueAt').optional().isISO8601().withMessage('toDueAt doit être une date valide'),
  validateRequest,
  getStudentAssignmentsHandler
);

/**
 * GET /api/assignments/student/:id
 * Récupérer un devoir spécifique
 */
router.get(
  '/student/:id',
  authenticate,
  authorize('student'),
  param('id').isUUID().withMessage('id doit être un UUID valide'),
  validateRequest,
  getStudentAssignmentByIdHandler
);

export default router;
