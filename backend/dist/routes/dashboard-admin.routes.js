"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const dashboard_admin_controller_1 = require("../controllers/dashboard-admin.controller");
const router = (0, express_1.Router)();
router.get('/kpi', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin', 'super_admin'), dashboard_admin_controller_1.getAdminDashboardKpisHandler);
router.get('/performance', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin', 'super_admin'), (0, express_validator_1.query)('termId').optional().isUUID(), (0, express_validator_1.query)('classId').optional().custom((value) => value === 'all' || /^[0-9a-fA-F-]{36}$/.test(value)), validation_middleware_1.validateRequest, dashboard_admin_controller_1.getAdminPerformanceHandler);
exports.default = router;
//# sourceMappingURL=dashboard-admin.routes.js.map