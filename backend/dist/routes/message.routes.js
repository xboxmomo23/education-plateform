"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const message_controller_1 = require("../controllers/message.controller");
const router = (0, express_1.Router)();
// ============================================
// VALIDATIONS
// ============================================
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
        .withMessage('Chaque userIds doit être un UUID valide'),
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
const markMultipleReadValidation = [
    (0, express_validator_1.body)('messageIds')
        .isArray({ min: 1 })
        .withMessage('messageIds doit être un tableau non vide'),
    (0, express_validator_1.body)('messageIds.*')
        .isUUID()
        .withMessage('Chaque messageId doit être un UUID valide'),
];
// ============================================
// ROUTES - BOÎTE DE RÉCEPTION
// ============================================
/**
 * GET /api/messages
 * Récupérer la boîte de réception
 *
 * Query params:
 * - onlyUnread?: 'true' | 'false'
 * - limit?: number
 * - offset?: number
 */
router.get('/', auth_middleware_1.authenticate, (0, express_validator_1.query)('onlyUnread').optional().isIn(['true', 'false']).withMessage('onlyUnread doit être true ou false'), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit invalide (1-100)'), (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }).withMessage('offset invalide'), validation_middleware_1.validateRequest, message_controller_1.getInboxHandler);
/**
 * GET /api/messages/sent
 * Récupérer les messages envoyés
 *
 * Query params:
 * - limit?: number
 */
router.get('/sent', auth_middleware_1.authenticate, (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit invalide (1-100)'), validation_middleware_1.validateRequest, message_controller_1.getSentMessagesHandler);
/**
 * GET /api/messages/unread-count
 * Récupérer le nombre de messages non lus
 */
router.get('/unread-count', auth_middleware_1.authenticate, message_controller_1.getUnreadCountHandler);
/**
 * GET /api/messages/recipients
 * Récupérer les destinataires possibles selon le rôle
 */
router.get('/recipients', auth_middleware_1.authenticate, message_controller_1.getRecipientsHandler);
/**
 * GET /api/messages/:id
 * Récupérer un message spécifique
 *
 * Query params:
 * - markAsRead?: 'true' | 'false' (default: true)
 */
router.get('/:id', auth_middleware_1.authenticate, (0, express_validator_1.param)('id').isUUID().withMessage('ID de message invalide'), (0, express_validator_1.query)('markAsRead').optional().isIn(['true', 'false']).withMessage('markAsRead doit être true ou false'), validation_middleware_1.validateRequest, message_controller_1.getMessageHandler);
// ============================================
// ROUTES - ACTIONS
// ============================================
/**
 * PATCH /api/messages/:id/read
 * Marquer un message comme lu
 */
router.patch('/:id/read', auth_middleware_1.authenticate, (0, express_validator_1.param)('id').isUUID().withMessage('ID de message invalide'), validation_middleware_1.validateRequest, message_controller_1.markAsReadHandler);
/**
 * PATCH /api/messages/read-multiple
 * Marquer plusieurs messages comme lus
 */
router.patch('/read-multiple', auth_middleware_1.authenticate, markMultipleReadValidation, validation_middleware_1.validateRequest, message_controller_1.markMultipleAsReadHandler);
/**
 * DELETE /api/messages/:id
 * Supprimer un message (soft delete)
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, express_validator_1.param)('id').isUUID().withMessage('ID de message invalide'), validation_middleware_1.validateRequest, message_controller_1.deleteMessageHandler);
// ============================================
// ROUTES - ENVOI
// ============================================
/**
 * POST /api/messages
 * Envoyer un nouveau message
 *
 * Body:
 * - subject: string
 * - body: string
 * - target: {
 *     type: 'user' | 'class' | 'role' | 'all_students' | 'all_teachers',
 *     userIds?: string[],   // si type = 'user'
 *     classId?: string,     // si type = 'class'
 *     role?: 'student' | 'teacher' | 'staff'  // si type = 'role'
 *   }
 * - parentMessageId?: string (optionnel, pour réponse)
 */
router.post('/', auth_middleware_1.authenticate, sendMessageValidation, validation_middleware_1.validateRequest, message_controller_1.sendMessageHandler);
exports.default = router;
//# sourceMappingURL=message.routes.js.map