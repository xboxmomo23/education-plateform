"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const parentAccess_1 = require("../middleware/parentAccess");
const parent_attendance_controller_1 = require("../controllers/parent-attendance.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('parent'));
router.get('/students/:studentId/attendance', (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId doit être un UUID valide'), validation_middleware_1.validateRequest, (0, parentAccess_1.requireParentAccessToStudent)(), parent_attendance_controller_1.getParentStudentAttendanceHandler);
exports.default = router;
//# sourceMappingURL=parent-attendance.routes.js.map