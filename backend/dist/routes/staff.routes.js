"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const timetable_controller_1 = require("../controllers/timetable.controller");
const router = (0, express_1.Router)();
router.get('/timetable/classes/:classId/print', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), (0, express_validator_1.param)('classId').isUUID().withMessage('ID de classe invalide'), (0, express_validator_1.query)('weekStart')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide (format YYYY-MM-DD)'), (0, express_validator_1.query)('format')
    .optional()
    .isIn(['carnet', 'full'])
    .withMessage('format doit être "carnet" ou "full"'), (0, express_validator_1.query)('theme')
    .optional()
    .isIn(['color', 'gray'])
    .withMessage('theme doit être "color" ou "gray"'), (0, express_validator_1.query)('color')
    .optional()
    .isIn(['0', '1'])
    .withMessage('color doit être "0" ou "1"'), validation_middleware_1.validateRequest, timetable_controller_1.exportClassTimetablePdfHandler);
exports.default = router;
//# sourceMappingURL=staff.routes.js.map