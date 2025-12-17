import { apiCallWithAbort } from './client';

// =========================
// HELPER
// =========================

async function apiCall<T>(endpoint: string, options: RequestInit = {}) {
  return apiCallWithAbort<T>(endpoint, options);
}

// =========================
// TYPES
// =========================

/**
 * Message dans la boîte de réception
 */
export interface InboxMessage {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  parent_message_id: string | null;
  created_at: string;
  establishment_id: string;
  read_at: string | null;
  recipient_id: string;
}

/**
 * Message envoyé
 */
export interface SentMessage {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  parent_message_id: string | null;
  created_at: string;
  establishment_id: string;
  recipient_count?: number;
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
 * Payload pour envoyer un message
 */
export interface SendMessagePayload {
  subject: string;
  body: string;
  target: MessageTarget;
  parentMessageId?: string | null;
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
 * Destinataire possible (professeur)
 */
export interface RecipientTeacher {
  id: string;
  full_name: string;
  subject_name?: string;
}

/**
 * Destinataire possible (staff)
 */
export interface RecipientStaff {
  id: string;
  full_name: string;
  department?: string;
}

/**
 * Destinataire possible (élève)
 */
export interface RecipientStudent {
  id: string;
  full_name: string;
  class_label: string;
}

/**
 * Classe (pour envoi groupé)
 */
export interface RecipientClass {
  id: string;
  label: string;
  level: string;
  student_count: number;
}

/**
 * Réponse des destinataires possibles
 */
export interface RecipientsResponse {
  teachers?: RecipientTeacher[];
  staff?: RecipientStaff[];
  students?: RecipientStudent[];
  classes?: RecipientClass[];
  canSendToAllStudents?: boolean;
  canSendToAllTeachers?: boolean;
}

// =========================
// API CLIENT
// =========================

export const messagesApi = {
  // ==================
  // BOÎTE DE RÉCEPTION
  // ==================

  /**
   * Récupérer la boîte de réception
   * @param filters - Filtres optionnels
   */
  async getInbox(filters: InboxFilters = {}): Promise<{ success: boolean; data: InboxMessage[] }> {
    const params = new URLSearchParams();
    
    if (filters.onlyUnread) params.append('onlyUnread', 'true');
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const endpoint = `/messages${queryString ? `?${queryString}` : ''}`;
    
    return apiCall<InboxMessage[]>(endpoint);
  },

  /**
   * Récupérer les messages envoyés
   * @param limit - Limite optionnelle
   */
  async getSentMessages(limit?: number): Promise<{ success: boolean; data: SentMessage[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return apiCall<SentMessage[]>(`/messages/sent${params}`);
  },

  /**
   * Récupérer le nombre de messages non lus
   */
  async getUnreadCount(): Promise<{ success: boolean; data: { count: number } }> {
    return apiCall<{ count: number }>('/messages/unread-count');
  },

  /**
   * Récupérer un message spécifique
   * @param id - UUID du message
   * @param markAsRead - Marquer comme lu automatiquement (default: true)
   */
  async getMessage(id: string, markAsRead: boolean = true): Promise<{ success: boolean; data: InboxMessage }> {
    const params = markAsRead ? '' : '?markAsRead=false';
    return apiCall<InboxMessage>(`/messages/${id}${params}`);
  },

  // ==================
  // ACTIONS
  // ==================

  /**
   * Marquer un message comme lu
   * @param id - UUID du message
   */
  async markAsRead(id: string): Promise<{ success: boolean; message?: string }> {
    return apiCall<void>(`/messages/${id}/read`, {
      method: 'PATCH',
    });
  },

  /**
   * Marquer plusieurs messages comme lus
   * @param messageIds - UUIDs des messages
   */
  async markMultipleAsRead(messageIds: string[]): Promise<{ success: boolean; data: { count: number }; message?: string }> {
    return apiCall<{ count: number }>('/messages/read-multiple', {
      method: 'PATCH',
      body: JSON.stringify({ messageIds }),
    });
  },

  /**
   * Supprimer un message (soft delete)
   * @param id - UUID du message
   */
  async deleteMessage(id: string): Promise<{ success: boolean; message?: string }> {
    return apiCall<void>(`/messages/${id}`, {
      method: 'DELETE',
    });
  },

  // ==================
  // ENVOI
  // ==================

  /**
   * Envoyer un nouveau message
   * @param payload - Données du message
   */
  async sendMessage(payload: SendMessagePayload): Promise<{ 
    success: boolean; 
    data: { message: SentMessage; recipientCount: number }; 
    message?: string 
  }> {
    return apiCall<{ message: SentMessage; recipientCount: number }>('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Répondre à un message
   * @param originalMessageId - ID du message original
   * @param payload - Données de la réponse
   */
  async replyToMessage(
    originalMessageId: string,
    payload: Omit<SendMessagePayload, 'parentMessageId'>
  ): Promise<{ success: boolean; data: { message: SentMessage; recipientCount: number }; message?: string }> {
    return this.sendMessage({
      ...payload,
      parentMessageId: originalMessageId,
    });
  },

  // ==================
  // DESTINATAIRES
  // ==================

  /**
   * Récupérer les destinataires possibles selon le rôle de l'utilisateur
   */
  async getRecipients(): Promise<{ success: boolean; data: RecipientsResponse }> {
    return apiCall<RecipientsResponse>('/messages/recipients');
  },
};

// =========================
// HELPERS
// =========================

/**
 * Vérifier si un message est non lu
 */
export function isMessageUnread(message: InboxMessage): boolean {
  return message.read_at === null;
}

/**
 * Formater la date d'un message
 */
type SupportedLocale = 'fr' | 'en';

function getLocale(locale: SupportedLocale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

export function formatMessageDate(dateString: string, locale: SupportedLocale = 'fr'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return locale === 'fr' ? "À l'instant" : 'Just now';
  }
  if (diffMins < 60) {
    return locale === 'fr'
      ? `Il y a ${diffMins} min`
      : `${diffMins} min ago`;
  }
  if (diffHours < 24) {
    return locale === 'fr'
      ? `Il y a ${diffHours}h`
      : `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return locale === 'fr' ? 'Hier' : 'Yesterday';
  }
  if (diffDays < 7) {
    return locale === 'fr'
      ? `Il y a ${diffDays} jours`
      : `${diffDays} days ago`;
  }

  return new Intl.DateTimeFormat(getLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }).format(date);
}

/**
 * Formater la date complète d'un message
 */
export function formatMessageDateFull(
  dateString: string,
  locale: SupportedLocale = 'fr'
): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(getLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Obtenir le label du rôle en français
 */
export function getRoleLabel(role: string, locale: SupportedLocale = 'fr'): string {
  switch (role) {
    case 'student':
      return locale === 'fr' ? 'Élève' : 'Student';
    case 'teacher':
      return locale === 'fr' ? 'Professeur' : 'Teacher';
    case 'staff':
      return locale === 'fr' ? 'Personnel' : 'Staff';
    case 'admin':
      return locale === 'fr' ? 'Administrateur' : 'Administrator';
    default:
      return role;
  }
}

/**
 * Tronquer le texte à une longueur donnée
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
