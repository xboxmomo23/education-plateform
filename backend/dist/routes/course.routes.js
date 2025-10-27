"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const course_controller_1 = require("../controllers/course.controller");
const router = (0, express_1.Router)();
/**
 * GET /api/courses/my-courses
 * Liste des cours du professeur connecté
 */
router.get('/my-courses', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('teacher', 'admin'), course_controller_1.getMyCoursesHandler);
exports.default = router;
//# sourceMappingURL=course.routes.js.map