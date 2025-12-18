"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const dashboard_staff_controller_1 = require("../controllers/dashboard-staff.controller");
const router = (0, express_1.Router)();
router.get('/kpi', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), (0, express_validator_1.query)('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date doit être au format YYYY-MM-DD'), validation_middleware_1.validateRequest, dashboard_staff_controller_1.getStaffKpiHandler);
router.get('/pending-absences', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), (0, express_validator_1.query)('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date doit être au format YYYY-MM-DD'), (0, express_validator_1.query)('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit doit être entre 1 et 50'), validation_middleware_1.validateRequest, dashboard_staff_controller_1.getStaffPendingAbsencesHandler);
router.get('/classes/summary', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), (0, express_validator_1.query)('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date doit être au format YYYY-MM-DD'), validation_middleware_1.validateRequest, dashboard_staff_controller_1.getStaffClassesSummaryHandler);
exports.default = router;
//# sourceMappingURL=dashboard-staff.routes.js.map