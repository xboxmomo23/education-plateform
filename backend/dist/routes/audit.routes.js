"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const audit_controller_1 = require("../controllers/audit.controller");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin', 'super_admin'), (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 200 }), (0, express_validator_1.query)('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/), validation_middleware_1.validateRequest, audit_controller_1.getAuditLogsHandler);
router.get('/export.csv', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin', 'super_admin'), (0, express_validator_1.query)('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/), (0, express_validator_1.query)('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/), validation_middleware_1.validateRequest, audit_controller_1.exportAuditLogsCsvHandler);
exports.default = router;
//# sourceMappingURL=audit.routes.js.map