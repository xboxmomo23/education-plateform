"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const teacher_controller_1 = require("../controllers/teacher.controller");
const router = (0, express_1.Router)();
router.get('/classes/summary', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher'), teacher_controller_1.getTeacherClassesSummaryHandler);
exports.default = router;
//# sourceMappingURL=teacher.routes.js.map