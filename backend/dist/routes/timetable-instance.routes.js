"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const timetable_instance_controller_1 = require("../controllers/timetable-instance.controller");
const router = (0, express_1.Router)();
/**
 * GET /api/timetable/instances/class/:classId/week/:weekStartDate
 * Récupérer les instances d'une semaine
 */
router.get('/class/:classId/week/:weekStartDate', auth_middleware_1.authenticate, (0, express_validator_1.param)('classId').isUUID(), (0, express_validator_1.param)('weekStartDate').isDate(), validation_middleware_1.validateRequest, timetable_instance_controller_1.getInstancesForWeekHandler);
/**
 * POST /api/timetable/instances
 * Créer une instance
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('class_id').isUUID(), (0, express_validator_1.body)('course_id').isUUID(), (0, express_validator_1.body)('week_start_date').isDate(), (0, express_validator_1.body)('day_of_week').isInt({ min: 1, max: 7 }), (0, express_validator_1.body)('start_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), (0, express_validator_1.body)('end_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), validation_middleware_1.validateRequest, timetable_instance_controller_1.createInstanceHandler);
/**
 * POST /api/timetable/instances/generate-from-template
 * Générer depuis template (UNE SEULE SEMAINE)
 */
router.post('/generate-from-template', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('class_id').isUUID(), (0, express_validator_1.body)('source_week_start').isDate(), (0, express_validator_1.body)('target_week_start').isDate(), validation_middleware_1.validateRequest, timetable_instance_controller_1.generateFromTemplateHandler);
/**
 * ✨ NOUVEAU : POST /api/timetable/instances/generate-bulk
 * Générer depuis template (PLUSIEURS SEMAINES)
 */
router.post('/generate-bulk', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('class_id').isUUID().withMessage('ID de classe invalide'), (0, express_validator_1.body)('source_week_start').isDate().withMessage('source_week_start invalide'), (0, express_validator_1.body)('target_weeks')
    .isArray({ min: 1 })
    .withMessage('target_weeks doit être un tableau non vide'), (0, express_validator_1.body)('target_weeks.*')
    .isDate()
    .withMessage('Chaque date doit être au format valide (YYYY-MM-DD)'), validation_middleware_1.validateRequest, timetable_instance_controller_1.generateFromTemplateBulkHandler);
/**
 * POST /api/timetable/instances/copy-week
 * Copier une semaine
 */
router.post('/copy-week', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('class_id').isUUID(), (0, express_validator_1.body)('source_week').isDate(), (0, express_validator_1.body)('target_week').isDate(), validation_middleware_1.validateRequest, timetable_instance_controller_1.copyWeekHandler);
/**
 * PUT /api/timetable/instances/:id
 * Modifier une instance
 */
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, timetable_instance_controller_1.updateInstanceHandler);
/**
 * DELETE /api/timetable/instances/:id
 * Supprimer une instance
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, timetable_instance_controller_1.deleteInstanceHandler);
exports.default = router;
//# sourceMappingURL=timetable-instance.routes.js.map