"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const parentAccess_1 = require("../middleware/parentAccess");
const parent_message_controller_1 = require("../controllers/parent-message.controller");
const router = (0, express_1.Router)();
const sendMessageValidation = [
    (0, express_validator_1.body)('subject')
        .isString()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Sujet obligatoire (max 200 caractères)'),
    (0, express_validator_1.body)('body')
        .isString()
        .trim()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Corps du message obligatoire (max 10000 caractères)'),
    (0, express_validator_1.body)('target')
        .isObject()
        .withMessage('Cible du message requise'),
    (0, express_validator_1.body)('target.type')
        .isIn(['user', 'class', 'role', 'all_students', 'all_teachers'])
        .withMessage('Type de cible invalide'),
    (0, express_validator_1.body)('target.userIds')
        .optional()
        .isArray({ min: 1 })
        .withMessage('userIds doit être un tableau non vide'),
    (0, express_validator_1.body)('target.userIds.*')
        .optional()
        .isUUID()
        .withMessage('Chaque userId doit être un UUID valide'),
    (0, express_validator_1.body)('target.classId')
        .optional()
        .isUUID()
        .withMessage('classId doit être un UUID valide'),
    (0, express_validator_1.body)('target.role')
        .optional()
        .isIn(['student', 'teacher', 'staff'])
        .withMessage('role invalide'),
    (0, express_validator_1.body)('parentMessageId')
        .optional({ nullable: true })
        .isUUID()
        .withMessage('parentMessageId doit être un UUID valide'),
];
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('parent'));
router.get('/students/:studentId/messages/threads', (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId invalide'), validation_middleware_1.validateRequest, (0, parentAccess_1.requireParentAccessToStudent)(), parent_message_controller_1.getParentThreadsHandler);
router.get('/students/:studentId/messages/threads/:threadId', (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId invalide'), (0, express_validator_1.param)('threadId').isUUID().withMessage('threadId invalide'), validation_middleware_1.validateRequest, (0, parentAccess_1.requireParentAccessToStudent)(), parent_message_controller_1.getParentThreadMessagesHandler);
router.post('/students/:studentId/messages', (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId invalide'), sendMessageValidation, validation_middleware_1.validateRequest, (0, parentAccess_1.requireParentAccessToStudent)(), parent_message_controller_1.sendParentMessageHandler);
router.get('/students/:studentId/contacts', (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId invalide'), validation_middleware_1.validateRequest, (0, parentAccess_1.requireParentAccessToStudent)(), parent_message_controller_1.getParentContactsHandler);
exports.default = router;
//# sourceMappingURL=parent-messages.routes.js.map