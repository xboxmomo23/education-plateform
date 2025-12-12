import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation.middleware'
import { requireParentAccessToStudent } from '../middleware/parentAccess'
import {
  getParentThreadsHandler,
  getParentThreadMessagesHandler,
  sendParentMessageHandler,
  getParentContactsHandler,
} from '../controllers/parent-message.controller'

const router = Router()

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
    .withMessage('Chaque userId doit être un UUID valide'),
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
]

router.use(authenticate, authorize('parent'))

router.get(
  '/students/:studentId/messages/threads',
  param('studentId').isUUID().withMessage('studentId invalide'),
  validateRequest,
  requireParentAccessToStudent(),
  getParentThreadsHandler
)

router.get(
  '/students/:studentId/messages/threads/:threadId',
  param('studentId').isUUID().withMessage('studentId invalide'),
  param('threadId').isUUID().withMessage('threadId invalide'),
  validateRequest,
  requireParentAccessToStudent(),
  getParentThreadMessagesHandler
)

router.post(
  '/students/:studentId/messages',
  param('studentId').isUUID().withMessage('studentId invalide'),
  sendMessageValidation,
  validateRequest,
  requireParentAccessToStudent(),
  sendParentMessageHandler
)

router.get(
  '/students/:studentId/contacts',
  param('studentId').isUUID().withMessage('studentId invalide'),
  validateRequest,
  requireParentAccessToStudent(),
  getParentContactsHandler
)

export default router
