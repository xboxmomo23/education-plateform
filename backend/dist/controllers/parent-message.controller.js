"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentThreadsHandler = getParentThreadsHandler;
exports.getParentThreadMessagesHandler = getParentThreadMessagesHandler;
exports.sendParentMessageHandler = sendParentMessageHandler;
exports.getParentContactsHandler = getParentContactsHandler;
const database_1 = __importDefault(require("../config/database"));
const message_model_1 = require("../models/message.model");
async function getStudentEstablishmentId(studentId) {
    const result = await database_1.default.query('SELECT establishment_id FROM users WHERE id = $1', [studentId]);
    return result.rows[0]?.establishment_id || null;
}
async function getParentThreadsHandler(req, res) {
    try {
        const { studentId } = req.params;
        const establishmentId = await getStudentEstablishmentId(studentId);
        if (!establishmentId) {
            return res.status(404).json({
                success: false,
                error: "Impossible de déterminer l'établissement de cet élève",
            });
        }
        const threads = await message_model_1.MessageModel.getThreadsForParticipant(studentId, establishmentId);
        return res.json({
            success: true,
            data: threads,
        });
    }
    catch (error) {
        console.error('[ParentMessages] getParentThreadsHandler error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des conversations',
        });
    }
}
async function getParentThreadMessagesHandler(req, res) {
    try {
        const { studentId, threadId } = req.params;
        const { markAsRead } = req.query;
        const establishmentId = await getStudentEstablishmentId(studentId);
        if (!establishmentId) {
            return res.status(404).json({
                success: false,
                error: "Impossible de déterminer l'établissement de cet élève",
            });
        }
        const messages = await message_model_1.MessageModel.getThreadMessagesForParticipant(threadId, studentId, establishmentId);
        if (messages.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Conversation introuvable ou inaccessible',
            });
        }
        if (markAsRead !== 'false') {
            const unreadMessages = messages.filter((message) => message.sender_id !== studentId && !message.read_at);
            for (const unread of unreadMessages) {
                await message_model_1.MessageModel.markAsRead(unread.id, studentId, establishmentId);
            }
        }
        return res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('[ParentMessages] getParentThreadMessagesHandler error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des messages de la conversation',
        });
    }
}
async function sendParentMessageHandler(req, res) {
    try {
        const parentId = req.user.userId;
        const { studentId } = req.params;
        const { subject, body, target, parentMessageId } = req.body;
        const establishmentId = await getStudentEstablishmentId(studentId);
        if (!establishmentId) {
            return res.status(404).json({
                success: false,
                error: "Impossible de déterminer l'établissement de cet élève",
            });
        }
        const result = await message_model_1.MessageModel.sendMessage({
            senderId: parentId,
            establishmentId,
            subject,
            body,
            parentMessageId: parentMessageId || null,
            target,
        });
        if (!result.recipientIds.includes(studentId)) {
            await message_model_1.MessageModel.addRecipients(result.message.id, [studentId]);
        }
        return res.status(201).json({
            success: true,
            data: {
                message: result.message,
                recipientCount: result.recipientCount,
            },
        });
    }
    catch (error) {
        console.error('[ParentMessages] sendParentMessageHandler error:', error);
        if (error.message === 'Aucun destinataire trouvé') {
            return res.status(400).json({
                success: false,
                error: 'Aucun destinataire trouvé pour cette cible',
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de l'envoi du message",
        });
    }
}
async function getParentContactsHandler(req, res) {
    try {
        const { studentId } = req.params;
        const establishmentId = await getStudentEstablishmentId(studentId);
        if (!establishmentId) {
            return res.status(404).json({
                success: false,
                error: "Impossible de déterminer l'établissement de cet élève",
            });
        }
        const teachers = await message_model_1.MessageModel.getTeachersForStudent(studentId, establishmentId);
        const staff = await message_model_1.MessageModel.getStaffForEstablishment(establishmentId);
        return res.json({
            success: true,
            data: {
                teachers,
                staff,
            },
        });
    }
    catch (error) {
        console.error('[ParentMessages] getParentContactsHandler error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des contacts',
        });
    }
}
//# sourceMappingURL=parent-message.controller.js.map