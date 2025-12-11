/**
 * Message
 */
export interface Message {
    id: string;
    sender_id: string;
    subject: string;
    body: string;
    parent_message_id: string | null;
    created_at: string;
    establishment_id: string;
    sender_name?: string;
    sender_role?: string;
}
/**
 * Message avec info destinataire (pour inbox)
 */
export interface InboxMessage extends Message {
    read_at: string | null;
    recipient_id: string;
}
/**
 * Destinataire d'un message
 */
export interface MessageRecipient {
    id: string;
    message_id: string;
    recipient_id: string;
    read_at: string | null;
    deleted_at: string | null;
}
/**
 * Cible pour l'envoi de messages
 */
export type MessageTarget = {
    type: 'user';
    userIds: string[];
} | {
    type: 'class';
    classId: string;
} | {
    type: 'role';
    role: 'student' | 'teacher' | 'staff';
} | {
    type: 'all_students';
} | {
    type: 'all_teachers';
};
/**
 * Options pour envoyer un message
 */
export interface SendMessageOptions {
    senderId: string;
    establishmentId: string;
    subject: string;
    body: string;
    parentMessageId?: string | null;
    target: MessageTarget;
}
/**
 * Filtres pour la boîte de réception
 */
export interface InboxFilters {
    onlyUnread?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Résultat de l'envoi de message
 */
export interface SendMessageResult {
    message: Message;
    recipientCount: number;
    recipientIds: string[];
}
export declare const MessageModel: {
    /**
     * Envoyer un message
     * - Insère dans messages
     * - Résout les destinataires selon target
     * - Insère dans message_recipients
     */
    sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
    /**
     * Résoudre les destinataires en fonction du type de cible
     */
    resolveRecipients(target: MessageTarget, establishmentId: string, excludeSenderId?: string): Promise<string[]>;
    /**
     * Récupérer la boîte de réception d'un utilisateur
     */
    getInboxForUser(userId: string, establishmentId: string, filters?: InboxFilters): Promise<InboxMessage[]>;
    /**
     * Récupérer un message pour un utilisateur
     * Vérifie que l'utilisateur est bien destinataire
     */
    getMessageForUser(messageId: string, userId: string, establishmentId: string): Promise<InboxMessage | null>;
    /**
     * Marquer un message comme lu
     */
    markAsRead(messageId: string, userId: string, establishmentId: string): Promise<boolean>;
    /**
     * Marquer plusieurs messages comme lus
     */
    markMultipleAsRead(messageIds: string[], userId: string, establishmentId: string): Promise<number>;
    /**
     * Compter les messages non lus
     */
    countUnread(userId: string, establishmentId: string): Promise<number>;
    /**
     * Supprimer (soft delete) un message pour un utilisateur
     */
    deleteForUser(messageId: string, userId: string, establishmentId: string): Promise<boolean>;
    /**
     * Récupérer les messages envoyés par un utilisateur
     */
    getSentMessages(userId: string, establishmentId: string, limit?: number): Promise<Message[]>;
    /**
     * Récupérer les professeurs d'un élève (via ses cours)
     */
    getTeachersForStudent(studentId: string, establishmentId: string): Promise<{
        id: string;
        full_name: string;
        subject_name?: string;
    }[]>;
    /**
     * Récupérer le staff de l'établissement
     */
    getStaffForEstablishment(establishmentId: string): Promise<{
        id: string;
        full_name: string;
        department?: string;
    }[]>;
    /**
     * Récupérer les élèves d'un professeur (via ses cours)
     */
    getStudentsForTeacher(teacherId: string, establishmentId: string): Promise<{
        id: string;
        full_name: string;
        class_label: string;
    }[]>;
    /**
     * Récupérer les classes d'un professeur
     */
    getClassesForTeacher(teacherId: string, establishmentId: string): Promise<{
        id: string;
        label: string;
        level: string;
        student_count: number;
    }[]>;
    /**
     * Récupérer tous les professeurs de l'établissement
     */
    getAllTeachers(establishmentId: string): Promise<{
        id: string;
        full_name: string;
    }[]>;
    /**
     * Récupérer tous les élèves de l'établissement
     */
    getAllStudents(establishmentId: string): Promise<{
        id: string;
        full_name: string;
        class_label: string;
    }[]>;
    /**
     * Récupérer toutes les classes de l'établissement
     */
    getAllClasses(establishmentId: string): Promise<{
        id: string;
        label: string;
        level: string;
        student_count: number;
    }[]>;
};
//# sourceMappingURL=message.model.d.ts.map