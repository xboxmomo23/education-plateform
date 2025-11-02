"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const grade_controller_1 = require("../controllers/grade.controller"); // Ajouter cet import en haut
const grade_controller_2 = require("../controllers/grade.controller");
const grade_controller_3 = require("../controllers/grade.controller");
const router = (0, express_1.Router)();
// =========================
// Validation Schemas
// =========================
const createEvaluationValidation = [
    (0, express_validator_1.body)('courseId')
        .isUUID()
        .withMessage('ID de cours invalide'),
    (0, express_validator_1.body)('title')
        .trim()
        .notEmpty()
        .withMessage('Le titre est requis')
        .isLength({ max: 200 })
        .withMessage('Le titre ne doit pas dépasser 200 caractères'),
    (0, express_validator_1.body)('type')
        .isIn(['controle', 'devoir', 'participation', 'examen'])
        .withMessage('Type d\'évaluation invalide'),
    (0, express_validator_1.body)('coefficient')
        .isFloat({ min: 0.5, max: 10 })
        .withMessage('Le coefficient doit être entre 0.5 et 10'),
    (0, express_validator_1.body)('maxScale')
        .optional()
        .isFloat({ min: 1, max: 100 })
        .withMessage('Le barème doit être entre 1 et 100'),
    (0, express_validator_1.body)('evalDate')
        .isISO8601()
        .withMessage('Date d\'évaluation invalide'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('La description ne doit pas dépasser 1000 caractères'),
];
const updateEvaluationValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'),
    (0, express_validator_1.body)('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Le titre ne peut pas être vide')
        .isLength({ max: 200 })
        .withMessage('Le titre ne doit pas dépasser 200 caractères'),
    (0, express_validator_1.body)('type')
        .optional()
        .isIn(['controle', 'devoir', 'participation', 'examen'])
        .withMessage('Type d\'évaluation invalide'),
    (0, express_validator_1.body)('coefficient')
        .optional()
        .isFloat({ min: 0.5, max: 10 })
        .withMessage('Le coefficient doit être entre 0.5 et 10'),
    (0, express_validator_1.body)('maxScale')
        .optional()
        .isFloat({ min: 1, max: 100 })
        .withMessage('Le barème doit être entre 1 et 100'),
    (0, express_validator_1.body)('evalDate')
        .optional()
        .isISO8601()
        .withMessage('Date d\'évaluation invalide'),
];
const createGradesValidation = [
    (0, express_validator_1.body)('evaluationId')
        .isUUID()
        .withMessage('ID d\'évaluation invalide'),
    (0, express_validator_1.body)('grades')
        .isArray({ min: 1 })
        .withMessage('Au moins une note est requise'),
    (0, express_validator_1.body)('grades.*.studentId')
        .isUUID()
        .withMessage('ID d\'élève invalide'),
    (0, express_validator_1.body)('grades.*.value')
        .optional({ nullable: true }) // ✅ Permet null ET undefined
        .custom((value, { req, path }) => {
        // Extraire l'index du grade depuis le path (ex: "grades[0].value")
        const match = path.match(/grades\[(\d+)\]\.value/);
        if (!match)
            return true;
        const index = parseInt(match[1]);
        const grade = req.body.grades[index];
        // Si absent = true, value peut être null
        if (grade && grade.absent === true) {
            return true;
        }
        // Sinon, value doit être un nombre valide
        if (value !== null && value !== undefined) {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0 || num > 100) {
                throw new Error('La note doit être entre 0 et 100');
            }
        }
        return true;
    }),
    (0, express_validator_1.body)('grades.*.absent')
        .optional()
        .isBoolean()
        .withMessage('Le statut absent doit être un booléen'),
    (0, express_validator_1.body)('grades.*.comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Le commentaire ne doit pas dépasser 500 caractères'),
];
const updateGradeValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'),
    (0, express_validator_1.body)('value')
        .optional({ nullable: true }) // ✅ Permet null
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
    (0, express_validator_1.body)('absent')
        .optional()
        .isBoolean()
        .withMessage('Le statut absent doit être un booléen'),
    (0, express_validator_1.body)('comment')
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
router.post('/evaluations', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin'), createEvaluationValidation, validation_middleware_1.validateRequest, grade_controller_3.createEvaluationHandler);
/**
 * GET /api/grades/evaluations
 * Liste des évaluations (selon rôle)
 */
router.get('/evaluations', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff', 'parent'), grade_controller_3.getTeacherEvaluationsHandler);
/**
 * GET /api/grades/evaluations/:id
 * Détails d'une évaluation avec notes
 */
router.get('/evaluations/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff', 'parent'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getEvaluationDetailsHandler);
/**
 * PUT /api/grades/evaluations/:id
 * Modifier une évaluation
 */
router.put('/evaluations/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff', 'parent'), updateEvaluationValidation, validation_middleware_1.validateRequest, grade_controller_3.updateEvaluationHandler);
/**
 * DELETE /api/grades/evaluations/:id
 * Supprimer une évaluation
 */
router.delete('/evaluations/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, grade_controller_3.deleteEvaluationHandler);
// =========================
// ROUTES NOTES - Saisie/Modification
// =========================
/**
 * POST /api/grades
 * Saisir/modifier des notes en batch
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff', 'parent'), createGradesValidation, validation_middleware_1.validateRequest, grade_controller_3.createOrUpdateGradesHandler);
/**
 * PUT /api/grades/:id
 * Modifier une note individuelle
 */
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff', 'parent'), updateGradeValidation, validation_middleware_1.validateRequest, grade_controller_3.updateGradeHandler);
/**
 * DELETE /api/grades/:id
 * Supprimer une note
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, grade_controller_3.deleteGradeHandler);
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
router.get('/student/:studentId', auth_middleware_1.authenticate, (0, express_validator_1.param)('studentId').isUUID(), (0, express_validator_1.query)('termId').optional().isUUID(), (0, express_validator_1.query)('courseId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getStudentGradesHandler);
/**
 * GET /api/grades/student/:studentId/averages
 * Moyennes d'un élève
 */
router.get('/student/:studentId/averages', auth_middleware_1.authenticate, (0, express_validator_1.param)('studentId').isUUID(), (0, express_validator_1.query)('termId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getStudentAveragesHandler);
// =========================
// ROUTES NOTES - responsables
// =========================
/**
 * GET /api/grades/children
 * Notes des enfants d'un staff
 */
router.get('/children', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), (0, express_validator_1.query)('termId').optional().isUUID(), (0, express_validator_1.query)('studentId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getChildrenGradesHandler);
// Après la ligne (route /children)
/**
 * GET /api/grades/managed-students
 * Notes des élèves gérés par le staff
 */
router.get('/managed-students', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), (0, express_validator_1.query)('termId').optional().isUUID(), (0, express_validator_1.query)('courseId').optional().isUUID(), (0, express_validator_1.query)('classId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getStaffManagedStudentsGradesHandler);
// =========================
// ROUTES NOTES - Par Cours
// =========================
/**
 * GET /api/grades/course/:courseId
 * Notes d'un cours
 */
router.get('/course/:courseId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff'), (0, express_validator_1.param)('courseId').isUUID(), (0, express_validator_1.query)('evaluationId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getCourseGradesHandler);
// =========================
// ROUTES STATISTIQUES
// =========================
/**
 * GET /api/grades/class/:classId/averages
 * Moyennes d'une classe
 */
router.get('/class/:classId/averages', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff'), (0, express_validator_1.param)('classId').isUUID(), (0, express_validator_1.query)('termId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getClassAveragesHandler);
/**
 * GET /api/grades/course/:courseId/students
 * Liste des élèves d'un cours avec leurs notes
 */
router.get('/course/:courseId/students', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin'), (0, express_validator_1.param)('courseId').isUUID(), (0, express_validator_1.query)('evaluationId').optional().isUUID(), validation_middleware_1.validateRequest, grade_controller_2.getCourseStudentsWithGrades);
/**
 * GET /api/grades/:id
 * Récupère les détails complets d'une note
 * IMPORTANT : Cette route doit être AVANT /:id/history
 */
router.get('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff', 'student', 'parent'), (0, express_validator_1.param)('id').isUUID().withMessage('ID de note invalide'), validation_middleware_1.validateRequest, grade_controller_1.getGradeByIdHandler);
/**
 * GET /api/grades/:id/history
 * Historique d'une note
 */
router.get('/:id/history', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin', 'staff'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, grade_controller_3.getGradeHistoryHandler);
exports.default = router;
//# sourceMappingURL=grade.routes.js.map