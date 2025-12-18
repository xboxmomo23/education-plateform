"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const staff_absences_controller_1 = require("../controllers/staff-absences.controller");
const router = (0, express_1.Router)();
const historyValidations = [
    (0, express_validator_1.query)('q').optional().isString().isLength({ max: 200 }),
    (0, express_validator_1.query)('classId').optional().isUUID().withMessage('classId invalide'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['absent', 'late', 'excused', 'all'])
        .withMessage('status invalide'),
    (0, express_validator_1.query)('justified')
        .optional()
        .isIn(['true', 'false', 'all'])
        .withMessage('justified invalide'),
    (0, express_validator_1.query)('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('from invalide'),
    (0, express_validator_1.query)('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('to invalide'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page invalide'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit invalide'),
    (0, express_validator_1.query)('sort')
        .optional()
        .isIn(['date_desc', 'date_asc', 'student_asc', 'class_asc'])
        .withMessage('sort invalide'),
];
router.get('/history', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), historyValidations, validation_middleware_1.validateRequest, staff_absences_controller_1.getStaffAbsenceHistoryHandler);
router.get('/export.csv', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), historyValidations, validation_middleware_1.validateRequest, staff_absences_controller_1.exportStaffAbsencesCsvHandler);
router.get('/export.pdf', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('staff'), historyValidations, validation_middleware_1.validateRequest, staff_absences_controller_1.exportStaffAbsencesPdfHandler);
exports.default = router;
//# sourceMappingURL=staff-absences.routes.js.map