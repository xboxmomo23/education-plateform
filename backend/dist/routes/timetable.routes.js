"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const timetable_controller_1 = require("../controllers/timetable.controller");
const router = (0, express_1.Router)();
// =========================
// VALIDATIONS
// =========================
const createEntryValidation = [
    (0, express_validator_1.body)('course_id').isUUID().withMessage('ID de cours invalide'),
    (0, express_validator_1.body)('day_of_week')
        .isInt({ min: 1, max: 7 })
        .withMessage('Jour de la semaine invalide (1-7)'),
    (0, express_validator_1.body)('start_time')
        .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Heure de début invalide (format HH:MM)'),
    (0, express_validator_1.body)('end_time')
        .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Heure de fin invalide (format HH:MM)'),
    (0, express_validator_1.body)('week')
        .optional()
        .isIn(['A', 'B'])
        .withMessage('Semaine invalide (A ou B)'),
    (0, express_validator_1.body)('room').optional().isString().withMessage('Salle invalide'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes invalides'),
];
const createTemplateValidation = [
    (0, express_validator_1.body)('course_id').isUUID().withMessage('ID de cours invalide'),
    (0, express_validator_1.body)('default_duration')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Durée invalide (15-480 minutes)'),
    (0, express_validator_1.body)('default_room').optional().isString().withMessage('Salle invalide'),
    (0, express_validator_1.body)('display_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Ordre d\'affichage invalide'),
];
const createFromTemplateValidation = [
    (0, express_validator_1.body)('template_id').isUUID().withMessage('ID de template invalide'),
    (0, express_validator_1.body)('day_of_week')
        .isInt({ min: 1, max: 7 })
        .withMessage('Jour de la semaine invalide (1-7)'),
    (0, express_validator_1.body)('start_time')
        .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Heure de début invalide (format HH:MM)'),
    (0, express_validator_1.body)('room').optional().isString().withMessage('Salle invalide'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes invalides'),
];
// =========================
// ROUTES SPÉCIFIQUES (EN PREMIER)
// =========================
/**
 * GET /api/timetable/staff/classes
 * Récupérer les classes gérées par le staff
 */
router.get('/staff/classes', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), timetable_controller_1.getStaffClassesHandler);
/**
 * GET /api/timetable/student/class
 * Récupérer la classe d'un élève
 */
router.get('/student/class', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('student'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
        const result = await pool.query(`SELECT s.class_id, c.label, c.level
         FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE s.user_id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Élève non trouvé ou non assigné à une classe',
            });
        }
        return res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Erreur récupération classe élève:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur',
        });
    }
});
/**
 * POST /api/timetable/duplicate
 * Dupliquer un emploi du temps
 */
router.post('/duplicate', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('sourceClassId').isUUID().withMessage('ID de classe source invalide'), (0, express_validator_1.body)('targetClassId').isUUID().withMessage('ID de classe cible invalide'), validation_middleware_1.validateRequest, timetable_controller_1.duplicateTimetableHandler);
/**
 * POST /api/timetable/check-conflicts
 * Vérifier les conflits
 */
router.post('/check-conflicts', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('course_id').isUUID().withMessage('ID de cours invalide'), (0, express_validator_1.body)('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide'), (0, express_validator_1.body)('start_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide'), (0, express_validator_1.body)('end_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide'), (0, express_validator_1.body)('room').optional().isString(), (0, express_validator_1.body)('exclude_entry_id').optional().isUUID(), validation_middleware_1.validateRequest, timetable_controller_1.checkConflictsHandler);
// =========================
// ROUTES TEMPLATES
// =========================
/**
 * GET /api/timetable/templates/class/:classId
 * Récupérer les templates d'une classe
 */
router.get('/templates/class/:classId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('classId').isUUID().withMessage('ID de classe invalide'), validation_middleware_1.validateRequest, timetable_controller_1.getTemplatesByClassHandler);
/**
 * POST /api/timetable/templates
 * Créer un nouveau template
 */
router.post('/templates', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), createTemplateValidation, validation_middleware_1.validateRequest, timetable_controller_1.createTemplateHandler);
/**
 * PUT /api/timetable/templates/:id
 * Modifier un template
 */
router.put('/templates/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID de template invalide'), validation_middleware_1.validateRequest, timetable_controller_1.updateTemplateHandler);
/**
 * DELETE /api/timetable/templates/:id
 * Supprimer un template
 */
router.delete('/templates/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID de template invalide'), validation_middleware_1.validateRequest, timetable_controller_1.deleteTemplateHandler);
// =========================
// ROUTES ENTRIES
// =========================
/**
 * POST /api/timetable/entries/bulk
 * Créer plusieurs créneaux
 */
router.post('/entries/bulk', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('entries').isArray({ min: 1 }).withMessage('Au moins un créneau requis'), validation_middleware_1.validateRequest, timetable_controller_1.bulkCreateEntriesHandler);
/**
 * POST /api/timetable/entries/from-template
 * Créer un créneau à partir d'un template
 */
router.post('/entries/from-template', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), createFromTemplateValidation, validation_middleware_1.validateRequest, timetable_controller_1.createEntryFromTemplateHandler);
/**
 * POST /api/timetable/entries
 * Créer un créneau
 */
router.post('/entries', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), createEntryValidation, validation_middleware_1.validateRequest, timetable_controller_1.createEntryHandler);
/**
 * PUT /api/timetable/entries/:id
 * Modifier un créneau
 */
router.put('/entries/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'), validation_middleware_1.validateRequest, timetable_controller_1.updateEntryHandler);
/**
 * DELETE /api/timetable/entries/:id
 * Supprimer un créneau
 */
router.delete('/entries/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'), validation_middleware_1.validateRequest, timetable_controller_1.deleteEntryHandler);
// =========================
// ROUTES AVEC PARAMÈTRES (EN DERNIER)
// =========================
/**
 * GET /api/timetable/class/:classId
 * Récupérer l'emploi du temps d'une classe
 */
router.get('/class/:classId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin', 'student'), (0, express_validator_1.param)('classId').isUUID().withMessage('ID de classe invalide'), (0, express_validator_1.query)('week').optional().isIn(['A', 'B']).withMessage('Semaine invalide'), validation_middleware_1.validateRequest, timetable_controller_1.getClassTimetableHandler);
/**
 * GET /api/timetable/teacher/:teacherId
 * Récupérer l'emploi du temps d'un professeur
 */
router.get('/teacher/:teacherId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.param)('teacherId').isUUID().withMessage('ID de professeur invalide'), (0, express_validator_1.query)('week').optional().isIn(['A', 'B']).withMessage('Semaine invalide'), validation_middleware_1.validateRequest, timetable_controller_1.getTeacherTimetableHandler);
/**
 * GET /api/timetable/courses/:classId
 * Récupérer les cours disponibles pour une classe
 */
router.get('/courses/:classId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('classId').isUUID().withMessage('ID de classe invalide'), validation_middleware_1.validateRequest, timetable_controller_1.getAvailableCoursesHandler);
exports.default = router;
//# sourceMappingURL=timetable.routes.js.map