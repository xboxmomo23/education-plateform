"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const attendance_controller_1 = require("../controllers/attendance.controller");
const router = (0, express_1.Router)();
// =========================
// VALIDATIONS
// =========================
const bulkCreateValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('ID de session invalide'),
    (0, express_validator_1.body)('records')
        .isArray({ min: 1 })
        .withMessage('Au moins un enregistrement est requis'),
    (0, express_validator_1.body)('records.*.student_id')
        .isUUID()
        .withMessage('ID étudiant invalide'),
    (0, express_validator_1.body)('records.*.status')
        .isIn(['present', 'absent', 'late', 'excused', 'remote', 'excluded'])
        .withMessage('Statut invalide'),
    (0, express_validator_1.body)('records.*.late_minutes')
        .optional()
        .isInt({ min: 0, max: 1440 })
        .withMessage('Le retard doit être entre 0 et 1440 minutes'),
    (0, express_validator_1.body)('records.*.justification')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('La justification ne doit pas dépasser 500 caractères'),
];
const updateRecordValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['present', 'absent', 'late', 'excused', 'remote', 'excluded'])
        .withMessage('Statut invalide'),
    (0, express_validator_1.body)('late_minutes')
        .optional()
        .isInt({ min: 0, max: 1440 })
        .withMessage('Le retard doit être entre 0 et 1440 minutes'),
    (0, express_validator_1.body)('justification')
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
router.get('/sessions', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.query)('date').optional().isISO8601().withMessage('Date invalide'), validation_middleware_1.validateRequest, attendance_controller_1.getSessionsHandler);
/**
 * GET /api/attendance/sessions/:id
 * Détails d'une session avec les élèves
 */
router.get('/sessions/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'), validation_middleware_1.validateRequest, attendance_controller_1.getSessionStudentsHandler);
// =========================
// ROUTES RECORDS
// =========================
/**
 * POST /api/attendance/sessions/:id/records/bulk
 * Enregistrer/modifier l'appel complet
 */
router.post('/sessions/:id/records/bulk', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), bulkCreateValidation, validation_middleware_1.validateRequest, attendance_controller_1.bulkCreateRecordsHandler);
/**
 * PUT /api/attendance/records/:id
 * Modifier une présence individuelle
 */
router.put('/records/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), updateRecordValidation, validation_middleware_1.validateRequest, attendance_controller_1.updateRecordHandler);
// =========================
// ROUTES STUDENT
// =========================
/**
 * GET /api/attendance/students/:id/records
 * Historique des présences d'un élève
 */
router.get('/students/:id/records', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('student', 'parent', 'teacher', 'staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'), (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Date de début invalide'), (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Date de fin invalide'), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limite invalide'), validation_middleware_1.validateRequest, attendance_controller_1.getStudentRecordsHandler);
/**
 * GET /api/attendance/students/:id/stats
 * Statistiques de présence d'un élève
 */
router.get('/students/:id/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('student', 'parent', 'teacher', 'staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'), (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Date de début invalide'), (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Date de fin invalide'), validation_middleware_1.validateRequest, attendance_controller_1.getStudentStatsHandler);
// =========================
// ROUTES STAFF
// =========================
/**
 * GET /api/attendance/staff/classes
 * Classes gérées par le staff
 */
router.get('/staff/classes', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), attendance_controller_1.getStaffClassesHandler);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map