"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const assignment_controller_1 = require("../controllers/assignment.controller");
const router = (0, express_1.Router)();
// ============================================
// ROUTES - ENSEIGNANTS (staff, admin, teacher)
// ============================================
/**
 * GET /api/assignments/teacher/courses
 * Récupérer les cours du professeur connecté
 * (Pour la création de devoirs)
 */
router.get('/teacher/courses', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), assignment_controller_1.getTeacherCoursesHandler);
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
router.get('/teacher', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin', 'teacher'), (0, express_validator_1.query)('courseId').optional().isUUID().withMessage('courseId doit être un UUID valide'), (0, express_validator_1.query)('classId').optional().isUUID().withMessage('classId doit être un UUID valide'), (0, express_validator_1.query)('status').optional().isIn(['draft', 'published', 'archived']).withMessage('status invalide'), (0, express_validator_1.query)('fromDueAt').optional().isISO8601().withMessage('fromDueAt doit être une date valide'), (0, express_validator_1.query)('toDueAt').optional().isISO8601().withMessage('toDueAt doit être une date valide'), validation_middleware_1.validateRequest, assignment_controller_1.getTeacherAssignmentsHandler);
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
router.post('/teacher', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin', 'teacher'), (0, express_validator_1.body)('course_id')
    .isUUID()
    .withMessage('course_id doit être un UUID valide'), (0, express_validator_1.body)('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('title est obligatoire (max 200 caractères)'), (0, express_validator_1.body)('due_at')
    .isISO8601()
    .withMessage('due_at doit être une date ISO valide'), (0, express_validator_1.body)('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('description trop longue (max 5000 caractères)'), (0, express_validator_1.body)('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('status doit être "draft" ou "published"'), (0, express_validator_1.body)('resource_url')
    .optional()
    .isURL()
    .withMessage('resource_url doit être une URL valide'), (0, express_validator_1.body)('max_points')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('max_points doit être un nombre entre 0 et 999.99'), validation_middleware_1.validateRequest, assignment_controller_1.createAssignmentHandler);
/**
 * PATCH /api/assignments/teacher/:id
 * Modifier un devoir existant
 *
 * Body (tous optionnels):
 * - title, description, due_at, status, resource_url, max_points, course_id
 */
router.patch('/teacher/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin', 'teacher'), (0, express_validator_1.param)('id').isUUID().withMessage('id doit être un UUID valide'), (0, express_validator_1.body)('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('title invalide (max 200 caractères)'), (0, express_validator_1.body)('due_at')
    .optional()
    .isISO8601()
    .withMessage('due_at doit être une date ISO valide'), (0, express_validator_1.body)('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('description trop longue'), (0, express_validator_1.body)('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('status invalide'), (0, express_validator_1.body)('resource_url')
    .optional({ nullable: true })
    .custom((value) => {
    if (value === null || value === '')
        return true;
    // Valider comme URL si non null/vide
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(value)) {
        throw new Error('resource_url doit être une URL valide');
    }
    return true;
}), (0, express_validator_1.body)('max_points')
    .optional({ nullable: true })
    .custom((value) => {
    if (value === null)
        return true;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 999.99) {
        throw new Error('max_points doit être entre 0 et 999.99');
    }
    return true;
}), (0, express_validator_1.body)('course_id')
    .optional()
    .isUUID()
    .withMessage('course_id doit être un UUID valide'), validation_middleware_1.validateRequest, assignment_controller_1.updateAssignmentHandler);
/**
 * DELETE /api/assignments/teacher/:id
 * Supprimer (archiver) un devoir
 */
router.delete('/teacher/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin', 'teacher'), (0, express_validator_1.param)('id').isUUID().withMessage('id doit être un UUID valide'), validation_middleware_1.validateRequest, assignment_controller_1.deleteAssignmentHandler);
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
router.get('/student', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('student'), (0, express_validator_1.query)('subjectId').optional().isUUID().withMessage('subjectId doit être un UUID valide'), (0, express_validator_1.query)('fromDueAt').optional().isISO8601().withMessage('fromDueAt doit être une date valide'), (0, express_validator_1.query)('toDueAt').optional().isISO8601().withMessage('toDueAt doit être une date valide'), validation_middleware_1.validateRequest, assignment_controller_1.getStudentAssignmentsHandler);
/**
 * GET /api/assignments/student/:id
 * Récupérer un devoir spécifique
 */
router.get('/student/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('student'), (0, express_validator_1.param)('id').isUUID().withMessage('id doit être un UUID valide'), validation_middleware_1.validateRequest, assignment_controller_1.getStudentAssignmentByIdHandler);
exports.default = router;
//# sourceMappingURL=assignment.routes.js.map