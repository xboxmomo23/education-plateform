"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const timetable_override_controller_1 = require("../controllers/timetable-override.controller");
const router = (0, express_1.Router)();
/**
 * POST /api/timetable/overrides
 * Créer une exception
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.body)('template_entry_id').isUUID().withMessage('ID invalide'), (0, express_validator_1.body)('override_date').isDate().withMessage('Date invalide (format: YYYY-MM-DD)'), (0, express_validator_1.body)('override_type')
    .isIn(['cancel', 'modify_time', 'modify_room', 'replace_course', 'replace_teacher'])
    .withMessage('Type d\'exception invalide'), validation_middleware_1.validateRequest, timetable_override_controller_1.createOverrideHandler);
/**
 * GET /api/timetable/overrides/class/:classId/week/:weekStartDate
 * Récupérer les overrides d'une semaine
 */
router.get('/class/:classId/week/:weekStartDate', auth_middleware_1.authenticate, (0, express_validator_1.param)('classId').isUUID(), (0, express_validator_1.param)('weekStartDate').isDate(), validation_middleware_1.validateRequest, timetable_override_controller_1.getOverridesForWeekHandler);
/**
 * PUT /api/timetable/overrides/:id
 * Modifier un override
 */
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, timetable_override_controller_1.updateOverrideHandler);
/**
 * DELETE /api/timetable/overrides/:id
 * Supprimer un override
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff', 'admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, timetable_override_controller_1.deleteOverrideHandler);
exports.default = router;
//# sourceMappingURL=timetable-override.routes.js.map