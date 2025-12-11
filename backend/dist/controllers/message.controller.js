"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInboxHandler = getInboxHandler;
exports.getSentMessagesHandler = getSentMessagesHandler;
exports.getUnreadCountHandler = getUnreadCountHandler;
exports.getMessageHandler = getMessageHandler;
exports.markAsReadHandler = markAsReadHandler;
exports.markMultipleAsReadHandler = markMultipleAsReadHandler;
exports.deleteMessageHandler = deleteMessageHandler;
exports.sendMessageHandler = sendMessageHandler;
exports.getRecipientsHandler = getRecipientsHandler;
const database_1 = __importDefault(require("../config/database"));
const message_model_1 = require("../models/message.model");
// ============================================
// HELPER - Récupérer establishmentId depuis DB si non dans token
// ============================================
async function getEstablishmentId(userId, fromToken) {
    if (fromToken)
        return fromToken;
    const result = await database_1.default.query('SELECT establishment_id FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.establishment_id || null;
}
// ============================================
// HANDLERS - BOÎTE DE RÉCEPTION
// ============================================
async function getInboxHandler(req, res) {
    try {
        const { userId } = req.user;
        const { onlyUnread, limit, offset } = req.query;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini pour cet utilisateur',
            });
        }
        console.log('📬 Récupération inbox - User:', userId);
        const filters = {};
        if (onlyUnread === 'true') {
            filters.onlyUnread = true;
        }
        if (limit && typeof limit === 'string') {
            filters.limit = parseInt(limit, 10);
        }
        if (offset && typeof offset === 'string') {
            filters.offset = parseInt(offset, 10);
        }
        const messages = await message_model_1.MessageModel.getInboxForUser(userId, establishmentId, filters);
        console.log(`✅ ${messages.length} messages trouvés`);
        return res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('❌ Erreur getInboxHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des messages',
        });
    }
}
async function getSentMessagesHandler(req, res) {
    try {
        const { userId } = req.user;
        const { limit } = req.query;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('📤 Récupération messages envoyés - User:', userId);
        const limitNum = limit ? parseInt(limit, 10) : 50;
        const messages = await message_model_1.MessageModel.getSentMessages(userId, establishmentId, limitNum);
        console.log(`✅ ${messages.length} messages envoyés trouvés`);
        return res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('❌ Erreur getSentMessagesHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des messages envoyés',
        });
    }
}
async function getUnreadCountHandler(req, res) {
    try {
        const { userId } = req.user;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        const count = await message_model_1.MessageModel.countUnread(userId, establishmentId);
        return res.json({
            success: true,
            data: { count },
        });
    }
    catch (error) {
        console.error('❌ Erreur getUnreadCountHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors du comptage des messages non lus',
        });
    }
}
async function getMessageHandler(req, res) {
    try {
        const { userId } = req.user;
        const { id: messageId } = req.params;
        const { markAsRead } = req.query;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('📩 Récupération message:', messageId, '- User:', userId);
        const message = await message_model_1.MessageModel.getMessageForUser(messageId, userId, establishmentId);
        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message non trouvé',
            });
        }
        if (markAsRead !== 'false' && !message.read_at) {
            await message_model_1.MessageModel.markAsRead(messageId, userId, establishmentId);
            message.read_at = new Date().toISOString();
        }
        return res.json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        console.error('❌ Erreur getMessageHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du message',
        });
    }
}
async function markAsReadHandler(req, res) {
    try {
        const { userId } = req.user;
        const { id: messageId } = req.params;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('✅ Marquage lu - Message:', messageId, '- User:', userId);
        const updated = await message_model_1.MessageModel.markAsRead(messageId, userId, establishmentId);
        if (!updated) {
            const message = await message_model_1.MessageModel.getMessageForUser(messageId, userId, establishmentId);
            if (!message) {
                return res.status(404).json({
                    success: false,
                    error: 'Message non trouvé',
                });
            }
        }
        return res.json({
            success: true,
            message: 'Message marqué comme lu',
        });
    }
    catch (error) {
        console.error('❌ Erreur markAsReadHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors du marquage du message',
        });
    }
}
async function markMultipleAsReadHandler(req, res) {
    try {
        const { userId } = req.user;
        const { messageIds } = req.body;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('✅ Marquage multiple lu - Messages:', messageIds.length, '- User:', userId);
        const count = await message_model_1.MessageModel.markMultipleAsRead(messageIds, userId, establishmentId);
        return res.json({
            success: true,
            message: `${count} message(s) marqué(s) comme lu(s)`,
            data: { count },
        });
    }
    catch (error) {
        console.error('❌ Erreur markMultipleAsReadHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors du marquage des messages',
        });
    }
}
async function deleteMessageHandler(req, res) {
    try {
        const { userId } = req.user;
        const { id: messageId } = req.params;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('🗑️ Suppression message:', messageId, '- User:', userId);
        const deleted = await message_model_1.MessageModel.deleteForUser(messageId, userId, establishmentId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Message non trouvé',
            });
        }
        return res.json({
            success: true,
            message: 'Message supprimé',
        });
    }
    catch (error) {
        console.error('❌ Erreur deleteMessageHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du message',
        });
    }
}
// ============================================
// HANDLERS - ENVOI DE MESSAGES
// ============================================
async function sendMessageHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { subject, body, target, parentMessageId } = req.body;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('📤 Envoi message - User:', userId, '- Role:', role);
        console.log('   Target:', JSON.stringify(target));
        const validationError = validateSendPermissions(role, target);
        if (validationError) {
            return res.status(403).json({
                success: false,
                error: validationError,
            });
        }
        const result = await message_model_1.MessageModel.sendMessage({
            senderId: userId,
            establishmentId,
            subject,
            body,
            parentMessageId: parentMessageId || null,
            target: target,
        });
        console.log(`✅ Message envoyé à ${result.recipientCount} destinataire(s)`);
        return res.status(201).json({
            success: true,
            message: `Message envoyé à ${result.recipientCount} destinataire(s)`,
            data: {
                message: result.message,
                recipientCount: result.recipientCount,
            },
        });
    }
    catch (error) {
        console.error('❌ Erreur sendMessageHandler:', error);
        if (error.message === 'Aucun destinataire trouvé') {
            return res.status(400).json({
                success: false,
                error: 'Aucun destinataire trouvé pour cette cible',
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'envoi du message',
        });
    }
}
function validateSendPermissions(role, target) {
    switch (role) {
        case 'student':
            if (target.type === 'class' || target.type === 'all_students' || target.type === 'all_teachers') {
                return 'Les élèves ne peuvent pas envoyer de messages à des groupes';
            }
            if (target.type === 'role' && target.role === 'student') {
                return 'Les élèves ne peuvent pas envoyer de messages aux autres élèves';
            }
            break;
        case 'teacher':
            if (target.type === 'all_teachers') {
                return 'Les professeurs ne peuvent pas envoyer à tous les professeurs';
            }
            break;
        case 'staff':
        case 'admin':
            break;
        default:
            return 'Rôle non autorisé à envoyer des messages';
    }
    return null;
}
// ============================================
// HANDLERS - RÉCUPÉRATION DES DESTINATAIRES
// ============================================
async function getRecipientsHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const establishmentId = await getEstablishmentId(userId, req.user.establishmentId);
        if (!establishmentId) {
            return res.status(400).json({
                success: false,
                error: 'Établissement non défini',
            });
        }
        console.log('👥 Récupération destinataires - User:', userId, '- Role:', role);
        let recipients = {};
        switch (role) {
            case 'student':
                recipients.teachers = await message_model_1.MessageModel.getTeachersForStudent(userId, establishmentId);
                recipients.staff = await message_model_1.MessageModel.getStaffForEstablishment(establishmentId);
                break;
            case 'teacher':
                recipients.students = await message_model_1.MessageModel.getStudentsForTeacher(userId, establishmentId);
                recipients.classes = await message_model_1.MessageModel.getClassesForTeacher(userId, establishmentId);
                recipients.staff = await message_model_1.MessageModel.getStaffForEstablishment(establishmentId);
                break;
            case 'staff':
            case 'admin':
                recipients.students = await message_model_1.MessageModel.getAllStudents(establishmentId);
                recipients.classes = await message_model_1.MessageModel.getAllClasses(establishmentId);
                recipients.teachers = await message_model_1.MessageModel.getAllTeachers(establishmentId);
                recipients.staff = await message_model_1.MessageModel.getStaffForEstablishment(establishmentId);
                recipients.canSendToAllStudents = true;
                recipients.canSendToAllTeachers = true;
                break;
            default:
                return res.status(403).json({
                    success: false,
                    error: 'Rôle non autorisé',
                });
        }
        return res.json({
            success: true,
            data: recipients,
        });
    }
    catch (error) {
        console.error('❌ Erreur getRecipientsHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des destinataires',
        });
    }
}
//# sourceMappingURL=message.controller.js.map