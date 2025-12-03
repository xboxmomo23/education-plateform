import pool from '../config/database';

// ============================================
// TYPES
// ============================================

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
  // Données enrichies
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
export type MessageTarget =
  | { type: 'user'; userIds: string[] }
  | { type: 'class'; classId: string }
  | { type: 'role'; role: 'student' | 'teacher' | 'staff' }
  | { type: 'all_students' }
  | { type: 'all_teachers' };

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

// ============================================
// MODÈLE - MESSAGES
// ============================================

export const MessageModel = {
  /**
   * Envoyer un message
   * - Insère dans messages
   * - Résout les destinataires selon target
   * - Insère dans message_recipients
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Résoudre les destinataires finaux
      const recipientIds = await MessageModel.resolveRecipients(
        options.target,
        options.establishmentId,
        options.senderId
      );

      if (recipientIds.length === 0) {
        throw new Error('Aucun destinataire trouvé');
      }

      // 2. Insérer le message
      const insertMessageQuery = `
        INSERT INTO messages (
          sender_id, subject, body, parent_message_id, establishment_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const messageResult = await client.query(insertMessageQuery, [
        options.senderId,
        options.subject,
        options.body,
        options.parentMessageId || null,
        options.establishmentId,
      ]);

      const message = messageResult.rows[0];

      // 3. Insérer les destinataires
      for (const recipientId of recipientIds) {
        const insertRecipientQuery = `
          INSERT INTO message_recipients (message_id, recipient_id)
          VALUES ($1, $2)
        `;
        await client.query(insertRecipientQuery, [message.id, recipientId]);
      }

      await client.query('COMMIT');

      return {
        message,
        recipientCount: recipientIds.length,
        recipientIds,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Résoudre les destinataires en fonction du type de cible
   */
  async resolveRecipients(
    target: MessageTarget,
    establishmentId: string,
    excludeSenderId?: string
  ): Promise<string[]> {
    let query: string;
    let params: any[];

    switch (target.type) {
      case 'user':
        // Retourner directement les userIds fournis
        return target.userIds.filter(id => id !== excludeSenderId);

      case 'class':
        // Récupérer tous les élèves de la classe
        query = `
          SELECT s.user_id
          FROM students s
          JOIN users u ON s.user_id = u.id
          WHERE s.class_id = $1
            AND u.establishment_id = $2
            AND u.active = true
            AND u.deleted_at IS NULL
        `;
        params = [target.classId, establishmentId];
        break;

      case 'role':
        // Récupérer tous les utilisateurs avec ce rôle
        query = `
          SELECT id as user_id
          FROM users
          WHERE role = $1
            AND establishment_id = $2
            AND active = true
            AND deleted_at IS NULL
        `;
        params = [target.role, establishmentId];
        break;

      case 'all_students':
        // Tous les élèves de l'établissement
        query = `
          SELECT id as user_id
          FROM users
          WHERE role = 'student'
            AND establishment_id = $1
            AND active = true
            AND deleted_at IS NULL
        `;
        params = [establishmentId];
        break;

      case 'all_teachers':
        // Tous les professeurs de l'établissement
        query = `
          SELECT id as user_id
          FROM users
          WHERE role = 'teacher'
            AND establishment_id = $1
            AND active = true
            AND deleted_at IS NULL
        `;
        params = [establishmentId];
        break;

      default:
        throw new Error('Type de cible non supporté');
    }

    const result = await pool.query(query, params);
    const userIds = result.rows.map(row => row.user_id);

    // Exclure l'expéditeur si présent
    return userIds.filter(id => id !== excludeSenderId);
  },

  /**
   * Récupérer la boîte de réception d'un utilisateur
   */
  async getInboxForUser(
    userId: string,
    establishmentId: string,
    filters: InboxFilters = {}
  ): Promise<InboxMessage[]> {
    let query = `
      SELECT 
        m.id,
        m.subject,
        m.body,
        m.parent_message_id,
        m.created_at,
        m.establishment_id,
        m.sender_id,
        u.full_name as sender_name,
        u.role as sender_role,
        mr.read_at,
        mr.recipient_id
      FROM messages m
      JOIN message_recipients mr ON m.id = mr.message_id
      JOIN users u ON m.sender_id = u.id
      WHERE mr.recipient_id = $1
        AND m.establishment_id = $2
        AND mr.deleted_at IS NULL
    `;

    const params: any[] = [userId, establishmentId];
    let paramIndex = 3;

    // Filtre: messages non lus uniquement
    if (filters.onlyUnread) {
      query += ` AND mr.read_at IS NULL`;
    }

    query += ` ORDER BY m.created_at DESC`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Récupérer un message pour un utilisateur
   * Vérifie que l'utilisateur est bien destinataire
   */
  async getMessageForUser(
    messageId: string,
    userId: string,
    establishmentId: string
  ): Promise<InboxMessage | null> {
    const query = `
      SELECT 
        m.id,
        m.subject,
        m.body,
        m.parent_message_id,
        m.created_at,
        m.establishment_id,
        m.sender_id,
        u.full_name as sender_name,
        u.role as sender_role,
        mr.read_at,
        mr.recipient_id
      FROM messages m
      JOIN message_recipients mr ON m.id = mr.message_id
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
        AND mr.recipient_id = $2
        AND m.establishment_id = $3
        AND mr.deleted_at IS NULL
    `;

    const result = await pool.query(query, [messageId, userId, establishmentId]);
    return result.rows[0] || null;
  },

  /**
   * Marquer un message comme lu
   */
  async markAsRead(
    messageId: string,
    userId: string,
    establishmentId: string
  ): Promise<boolean> {
    const query = `
      UPDATE message_recipients mr
      SET read_at = NOW()
      FROM messages m
      WHERE mr.message_id = m.id
        AND mr.message_id = $1
        AND mr.recipient_id = $2
        AND m.establishment_id = $3
        AND mr.read_at IS NULL
      RETURNING mr.id
    `;

    const result = await pool.query(query, [messageId, userId, establishmentId]);
    return result.rows.length > 0;
  },

  /**
   * Marquer plusieurs messages comme lus
   */
  async markMultipleAsRead(
    messageIds: string[],
    userId: string,
    establishmentId: string
  ): Promise<number> {
    if (messageIds.length === 0) return 0;

    const query = `
      UPDATE message_recipients mr
      SET read_at = NOW()
      FROM messages m
      WHERE mr.message_id = m.id
        AND mr.message_id = ANY($1)
        AND mr.recipient_id = $2
        AND m.establishment_id = $3
        AND mr.read_at IS NULL
      RETURNING mr.id
    `;

    const result = await pool.query(query, [messageIds, userId, establishmentId]);
    return result.rows.length;
  },

  /**
   * Compter les messages non lus
   */
  async countUnread(userId: string, establishmentId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM message_recipients mr
      JOIN messages m ON mr.message_id = m.id
      WHERE mr.recipient_id = $1
        AND m.establishment_id = $2
        AND mr.read_at IS NULL
        AND mr.deleted_at IS NULL
    `;

    const result = await pool.query(query, [userId, establishmentId]);
    return parseInt(result.rows[0].count, 10);
  },

  /**
   * Supprimer (soft delete) un message pour un utilisateur
   */
  async deleteForUser(
    messageId: string,
    userId: string,
    establishmentId: string
  ): Promise<boolean> {
    const query = `
      UPDATE message_recipients mr
      SET deleted_at = NOW()
      FROM messages m
      WHERE mr.message_id = m.id
        AND mr.message_id = $1
        AND mr.recipient_id = $2
        AND m.establishment_id = $3
      RETURNING mr.id
    `;

    const result = await pool.query(query, [messageId, userId, establishmentId]);
    return result.rows.length > 0;
  },

  /**
   * Récupérer les messages envoyés par un utilisateur
   */
  async getSentMessages(
    userId: string,
    establishmentId: string,
    limit: number = 50
  ): Promise<Message[]> {
    const query = `
      SELECT 
        m.*,
        u.full_name as sender_name,
        u.role as sender_role,
        (SELECT COUNT(*) FROM message_recipients WHERE message_id = m.id) as recipient_count
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.sender_id = $1
        AND m.establishment_id = $2
      ORDER BY m.created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [userId, establishmentId, limit]);
    return result.rows;
  },

  // ============================================
  // HELPERS POUR RÉCUPÉRER LES DESTINATAIRES POSSIBLES
  // ============================================

  /**
   * Récupérer les professeurs d'un élève (via ses cours)
   */
  async getTeachersForStudent(
    studentId: string,
    establishmentId: string
  ): Promise<{ id: string; full_name: string; subject_name?: string }[]> {
    const query = `
      SELECT DISTINCT
        u.id,
        u.full_name,
        STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as subject_name
      FROM users u
      JOIN courses c ON c.teacher_id = u.id
      JOIN subjects s ON s.id = c.subject_id
      JOIN students st ON st.class_id = c.class_id
      WHERE st.user_id = $1
        AND u.establishment_id = $2
        AND c.active = true
        AND u.active = true
      GROUP BY u.id, u.full_name
      ORDER BY u.full_name
    `;
    const result = await pool.query(query, [studentId, establishmentId]);
    return result.rows;
  },

  /**
   * Récupérer le staff de l'établissement
   */
  async getStaffForEstablishment(
    establishmentId: string
  ): Promise<{ id: string; full_name: string; department?: string }[]> {
    const query = `
      SELECT 
        u.id,
        u.full_name,
        sp.department
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'staff'
        AND u.establishment_id = $1
        AND u.active = true
        AND u.deleted_at IS NULL
      ORDER BY u.full_name
    `;

    const result = await pool.query(query, [establishmentId]);
    return result.rows;
  },

  /**
   * Récupérer les élèves d'un professeur (via ses cours)
   */
  async getStudentsForTeacher(
    teacherId: string,
    establishmentId: string
  ): Promise<{ id: string; full_name: string; class_label: string }[]> {
    const query = `
      SELECT DISTINCT
        u.id,
        u.full_name,
        cl.label as class_label
      FROM users u
      JOIN students st ON st.user_id = u.id
      JOIN classes cl ON st.class_id = cl.id
      JOIN courses c ON c.class_id = cl.id
      WHERE c.teacher_id = $1
        AND u.establishment_id = $2
        AND c.active = true
        AND u.active = true
      ORDER BY cl.label, u.full_name
    `;

    const result = await pool.query(query, [teacherId, establishmentId]);
    return result.rows;
  },

  /**
   * Récupérer les classes d'un professeur
   */
  async getClassesForTeacher(
    teacherId: string,
    establishmentId: string
  ): Promise<{ id: string; label: string; level: string; student_count: number }[]> {
    const query = `
      SELECT DISTINCT
        cl.id,
        cl.label,
        cl.level,
        (SELECT COUNT(*) FROM students WHERE class_id = cl.id) as student_count
      FROM classes cl
      JOIN courses c ON c.class_id = cl.id
      WHERE c.teacher_id = $1
        AND cl.establishment_id = $2
        AND c.active = true
        AND cl.archived = false
      ORDER BY cl.level, cl.label
    `;

    const result = await pool.query(query, [teacherId, establishmentId]);
    return result.rows;
  },

  /**
   * Récupérer tous les professeurs de l'établissement
   */
  async getAllTeachers(
    establishmentId: string
  ): Promise<{ id: string; full_name: string }[]> {
    const query = `
      SELECT 
        u.id,
        u.full_name
      FROM users u
      WHERE u.role = 'teacher'
        AND u.establishment_id = $1
        AND u.active = true
        AND u.deleted_at IS NULL
      ORDER BY u.full_name
    `;

    const result = await pool.query(query, [establishmentId]);
    return result.rows;
  },

  /**
   * Récupérer tous les élèves de l'établissement
   */
  async getAllStudents(
    establishmentId: string
  ): Promise<{ id: string; full_name: string; class_label: string }[]> {
    const query = `
      SELECT 
        u.id,
        u.full_name,
        cl.label as class_label
      FROM users u
      JOIN students st ON st.user_id = u.id
      JOIN classes cl ON st.class_id = cl.id
      WHERE u.role = 'student'
        AND u.establishment_id = $1
        AND u.active = true
        AND u.deleted_at IS NULL
      ORDER BY cl.label, u.full_name
    `;

    const result = await pool.query(query, [establishmentId]);
    return result.rows;
  },

  /**
   * Récupérer toutes les classes de l'établissement
   */
  async getAllClasses(
    establishmentId: string
  ): Promise<{ id: string; label: string; level: string; student_count: number }[]> {
    const query = `
      SELECT 
        cl.id,
        cl.label,
        cl.level,
        (SELECT COUNT(*) FROM students WHERE class_id = cl.id) as student_count
      FROM classes cl
      WHERE cl.establishment_id = $1
        AND cl.archived = false
      ORDER BY cl.level, cl.label
    `;

    const result = await pool.query(query, [establishmentId]);
    return result.rows;
  },
};
