import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getInboxHandler,
  getSentMessagesHandler,
  getUnreadCountHandler,
  getMessageHandler,
  markAsReadHandler,
  markMultipleAsReadHandler,
  deleteMessageHandler,
  sendMessageHandler,
  getRecipientsHandler,
} from '../controllers/message.controller';

const router = Router();

// ============================================
// VALIDATIONS
// ============================================

const sendMessageValidation = [
  body('subject')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Sujet obligatoire (max 200 caractères)'),
  body('body')
    .isString()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Corps du message obligatoire (max 10000 caractères)'),
  body('target')
    .isObject()
    .withMessage('Cible du message requise'),
  body('target.type')
    .isIn(['user', 'class', 'role', 'all_students', 'all_teachers'])
    .withMessage('Type de cible invalide'),
  body('target.userIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('userIds doit être un tableau non vide'),
  body('target.userIds.*')
    .optional()
    .isUUID()
    .withMessage('Chaque userIds doit être un UUID valide'),
  body('target.classId')
    .optional()
    .isUUID()
    .withMessage('classId doit être un UUID valide'),
  body('target.role')
    .optional()
    .isIn(['student', 'teacher', 'staff'])
    .withMessage('role invalide'),
  body('parentMessageId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('parentMessageId doit être un UUID valide'),
];

const markMultipleReadValidation = [
  body('messageIds')
    .isArray({ min: 1 })
    .withMessage('messageIds doit être un tableau non vide'),
  body('messageIds.*')
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
router.get(
  '/',
  authenticate,
  query('onlyUnread').optional().isIn(['true', 'false']).withMessage('onlyUnread doit être true ou false'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit invalide (1-100)'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset invalide'),
  validateRequest,
  getInboxHandler
);

/**
 * GET /api/messages/sent
 * Récupérer les messages envoyés
 * 
 * Query params:
 * - limit?: number
 */
router.get(
  '/sent',
  authenticate,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit invalide (1-100)'),
  validateRequest,
  getSentMessagesHandler
);

/**
 * GET /api/messages/unread-count
 * Récupérer le nombre de messages non lus
 */
router.get(
  '/unread-count',
  authenticate,
  getUnreadCountHandler
);

/**
 * GET /api/messages/recipients
 * Récupérer les destinataires possibles selon le rôle
 */
router.get(
  '/recipients',
  authenticate,
  getRecipientsHandler
);

/**
 * GET /api/messages/:id
 * Récupérer un message spécifique
 * 
 * Query params:
 * - markAsRead?: 'true' | 'false' (default: true)
 */
router.get(
  '/:id',
  authenticate,
  param('id').isUUID().withMessage('ID de message invalide'),
  query('markAsRead').optional().isIn(['true', 'false']).withMessage('markAsRead doit être true ou false'),
  validateRequest,
  getMessageHandler
);

// ============================================
// ROUTES - ACTIONS
// ============================================

/**
 * PATCH /api/messages/:id/read
 * Marquer un message comme lu
 */
router.patch(
  '/:id/read',
  authenticate,
  param('id').isUUID().withMessage('ID de message invalide'),
  validateRequest,
  markAsReadHandler
);

/**
 * PATCH /api/messages/read-multiple
 * Marquer plusieurs messages comme lus
 */
router.patch(
  '/read-multiple',
  authenticate,
  markMultipleReadValidation,
  validateRequest,
  markMultipleAsReadHandler
);

/**
 * DELETE /api/messages/:id
 * Supprimer un message (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  param('id').isUUID().withMessage('ID de message invalide'),
  validateRequest,
  deleteMessageHandler
);

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
router.post(
  '/',
  authenticate,
  sendMessageValidation,
  validateRequest,
  sendMessageHandler
);

export default router;
