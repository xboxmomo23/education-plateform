"use strict";
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
const updateEntryValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'),
    (0, express_validator_1.body)('day_of_week')
        .optional()
        .isInt({ min: 1, max: 7 })
        .withMessage('Jour de la semaine invalide (1-7)'),
    (0, express_validator_1.body)('start_time')
        .optional()
        .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Heure de début invalide (format HH:MM)'),
    (0, express_validator_1.body)('end_time')
        .optional()
        .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Heure de fin invalide (format HH:MM)'),
    (0, express_validator_1.body)('week')
        .optional()
        .isIn(['A', 'B', null])
        .withMessage('Semaine invalide (A, B ou null)'),
    (0, express_validator_1.body)('room').optional().isString().withMessage('Salle invalide'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['confirmed', 'cancelled', 'changed'])
        .withMessage('Statut invalide'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes invalides'),
];
// =========================
// ROUTES DE RÉCUPÉRATION
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
// =========================
// ROUTES DE CRÉATION
// =========================
/**
 * POST /api/timetable/entries
 * Créer un nouveau créneau
 */
router.post('/entries', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), createEntryValidation, validation_middleware_1.validateRequest, timetable_controller_1.createEntryHandler);
/**
 * POST /api/timetable/entries/bulk
 * Créer plusieurs créneaux en une fois
 */
router.post('/entries/bulk', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('entries').isArray({ min: 1 }).withMessage('Au moins un créneau requis'), validation_middleware_1.validateRequest, timetable_controller_1.bulkCreateEntriesHandler);
// =========================
// ROUTES DE MODIFICATION
// =========================
/**
 * PUT /api/timetable/entries/:id
 * Modifier un créneau
 */
router.put('/entries/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), updateEntryValidation, validation_middleware_1.validateRequest, timetable_controller_1.updateEntryHandler);
// =========================
// ROUTES DE SUPPRESSION
// =========================
/**
 * DELETE /api/timetable/entries/:id
 * Supprimer un créneau
 */
router.delete('/entries/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'), validation_middleware_1.validateRequest, timetable_controller_1.deleteEntryHandler);
// =========================
// ROUTES DE DUPLICATION
// =========================
/**
 * POST /api/timetable/duplicate
 * Dupliquer l'emploi du temps d'une classe vers une autre
 */
router.post('/duplicate', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('sourceClassId').isUUID().withMessage('ID de classe source invalide'), (0, express_validator_1.body)('targetClassId').isUUID().withMessage('ID de classe cible invalide'), validation_middleware_1.validateRequest, timetable_controller_1.duplicateTimetableHandler);
// =========================
// ROUTES DE VÉRIFICATION
// =========================
/**
 * POST /api/timetable/check-conflicts
 * Vérifier les conflits pour un créneau
 */
router.post('/check-conflicts', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('course_id').isUUID().withMessage('ID de cours invalide'), (0, express_validator_1.body)('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide'), (0, express_validator_1.body)('start_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide'), (0, express_validator_1.body)('end_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide'), (0, express_validator_1.body)('room').optional().isString(), (0, express_validator_1.body)('exclude_entry_id').optional().isUUID(), validation_middleware_1.validateRequest, timetable_controller_1.checkConflictsHandler);
exports.default = router;
//# sourceMappingURL=timetable.routes.js.map