"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const attendance_controller_1 = require("../controllers/attendance.controller");
const attendance_extended_controller_1 = require("../controllers/attendance-extended.controller");
const router = (0, express_1.Router)();
// ============================================
// VALIDATIONS
// ============================================
const markAttendanceValidation = [
    (0, express_validator_1.body)('sessionId').isUUID().withMessage('ID de session invalide'),
    (0, express_validator_1.body)('studentId').isUUID().withMessage('ID d\'élève invalide'),
    (0, express_validator_1.body)('status').isIn(['present', 'absent', 'late', 'excused', 'excluded', 'remote']).withMessage('Statut invalide'),
    (0, express_validator_1.body)('comment').optional().isString().isLength({ max: 500 }),
    (0, express_validator_1.body)('lateMinutes').optional().isInt({ min: 0, max: 1440 }),
];
const bulkMarkValidation = [
    (0, express_validator_1.body)('sessionId').isUUID().withMessage('ID de session invalide'),
    (0, express_validator_1.body)('records').isArray({ min: 1 }).withMessage('records doit être un tableau non vide'),
    (0, express_validator_1.body)('records.*.studentId').isUUID().withMessage('ID d\'élève invalide'),
    (0, express_validator_1.body)('records.*.status').isIn(['present', 'absent', 'late', 'excused', 'excluded', 'remote']).withMessage('Statut invalide'),
];
// ============================================
// ROUTES - SEMAINE PROFESSEUR
// ============================================
router.get('/week', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.query)('weekStart').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('weekStart invalide'), (0, express_validator_1.query)('teacherId').optional().isUUID(), validation_middleware_1.validateRequest, attendance_controller_1.getTeacherWeekHandler);
// ============================================
// ROUTES - ÉLÈVE (son propre historique)
// ============================================
router.get('/my-history', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('student'), (0, express_validator_1.query)('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 500 }), validation_middleware_1.validateRequest, attendance_extended_controller_1.getMyHistoryHandler);
// ============================================
// ROUTES - SESSION
// ============================================
router.get('/session/:instanceId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.param)('instanceId').isUUID(), validation_middleware_1.validateRequest, attendance_controller_1.getSessionHandler);
router.get('/sessions/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher'), (0, express_validator_1.query)('instanceIds').isString().withMessage('instanceIds requis'), validation_middleware_1.validateRequest, attendance_controller_1.getSessionsStatusListHandler);
router.post('/session/:sessionId/close', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.param)('sessionId').isUUID(), validation_middleware_1.validateRequest, attendance_controller_1.closeSessionHandler);
router.get('/instance/:instanceId/check', auth_middleware_1.authenticate, (0, express_validator_1.param)('instanceId').isUUID(), validation_middleware_1.validateRequest, attendance_controller_1.checkSessionExistsHandler);
// ============================================
// ROUTES - MARQUAGE PRÉSENCE
// ============================================
router.post('/mark', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), markAttendanceValidation, validation_middleware_1.validateRequest, attendance_controller_1.markAttendanceHandler);
router.post('/bulk', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), bulkMarkValidation, validation_middleware_1.validateRequest, attendance_controller_1.bulkMarkAttendanceHandler);
// ============================================
// ROUTES - HISTORIQUE ÉLÈVE
// ============================================
router.get('/student/:studentId', auth_middleware_1.authenticate, (0, express_validator_1.param)('studentId').isUUID(), (0, express_validator_1.query)('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('courseId').optional().isUUID(), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }), validation_middleware_1.validateRequest, attendance_controller_1.getStudentHistoryHandler);
router.get('/student/:studentId/stats', auth_middleware_1.authenticate, (0, express_validator_1.param)('studentId').isUUID(), (0, express_validator_1.query)('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('courseId').optional().isUUID(), validation_middleware_1.validateRequest, attendance_controller_1.getStudentStatsHandler);
// ============================================
// ROUTES - STAFF (gestion des absences)
// ============================================
router.get('/absences', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.query)('classId').optional(), (0, express_validator_1.query)('status').optional(), (0, express_validator_1.query)('schoolYear').optional(), (0, express_validator_1.query)('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('search').optional(), (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }), validation_middleware_1.validateRequest, attendance_extended_controller_1.getAllAbsencesHandler);
router.get('/classes', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), attendance_extended_controller_1.getAccessibleClassesHandler);
router.get('/teacher/recent', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher'), (0, express_validator_1.query)('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 20 }), (0, express_validator_1.query)('days').optional().isInt({ min: 1, max: 14 }), validation_middleware_1.validateRequest, attendance_extended_controller_1.getTeacherRecentAbsencesHandler);
router.put('/absences/:recordId/justify', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('recordId').isUUID(), (0, express_validator_1.body)('justification').isString().isLength({ min: 1, max: 500 }), (0, express_validator_1.body)('documentUrl').optional().isString(), validation_middleware_1.validateRequest, attendance_extended_controller_1.justifyAbsenceHandler);
router.get('/stats/class/:classId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'staff', 'admin'), (0, express_validator_1.param)('classId').isUUID(), (0, express_validator_1.query)('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/), validation_middleware_1.validateRequest, attendance_extended_controller_1.getClassAttendanceStatsHandler);
router.put('/records/:recordId/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('recordId').isUUID().withMessage('ID invalide'), (0, express_validator_1.body)('status').isIn(['present', 'absent', 'late', 'excused', 'excluded', 'remote']).withMessage('Statut invalide'), validation_middleware_1.validateRequest, attendance_extended_controller_1.updateRecordStatusHandler);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map