import { apiCall } from './base';

// ============================================
// TYPES
// ============================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'excluded' | 'remote';

export interface AttendanceSession {
  id: string;
  instance_id: string;
  class_id: string;
  course_id: string;
  teacher_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: 'open' | 'closed' | 'validated';
  notes: string | null;
  establishment_id: string;
  // Détails enrichis
  class_label: string;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name: string;
  room: string | null;
  day_of_week: number;
  week_start_date: string;
  // Stats
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
}

export interface StudentForAttendance {
  user_id: string;
  full_name: string;
  email: string;
  student_number: string | null;
  status: AttendanceStatus | null;
  comment: string | null;
  late_minutes: number | null;
  record_id: string | null;
}

export interface TeacherWeekCourse {
  instance_id: string;
  session_id: string | null;
  class_id: string;
  class_label: string;
  course_id: string;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  day_of_week: number;
  session_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  has_session: boolean;
  status: 'open' | 'closed' | 'validated' | null;
  present_count: number;
  absent_count: number;
  late_count: number;
  total_students: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  comment: string | null;
  late_minutes: number | null;
}

export interface AttendanceHistoryItem {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  comment: string | null;
  late_minutes: number | null;
  session_date: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_color: string;
  class_label: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

export interface SessionResponse {
  session: AttendanceSession;
  students: StudentForAttendance[];
}

// ============================================
// API CLIENT
// ============================================

export const attendanceApi = {



  
  


  // ============================================
  // SEMAINE PROFESSEUR
  // ============================================

  /**
   * Récupérer les cours d'un professeur pour une semaine avec statut présence
   * @param weekStart - Date de début de semaine (YYYY-MM-DD)
   * @param teacherId - ID du professeur (optionnel, par défaut utilisateur connecté)
   */
  async getTeacherWeek(weekStart: string, teacherId?: string) {
    const params = new URLSearchParams({ weekStart });
    if (teacherId) {
      params.append('teacherId', teacherId);
    }
    return apiCall<TeacherWeekCourse[]>(`/attendance/week?${params.toString()}`);
  },

  // ============================================
  // SESSION
  // ============================================

  /**
   * Récupérer (ou créer automatiquement) une session de présence
   * @param instanceId - ID de l'instance de cours (timetable_instances.id)
   */
  async getSession(instanceId: string) {
    return apiCall<SessionResponse>(`/attendance/session/${instanceId}`);
  },

  /**
   * Vérifier si une session existe (sans la créer)
   * @param instanceId - ID de l'instance de cours
   */
  async checkSessionExists(instanceId: string) {
    return apiCall<{ exists: boolean; session: AttendanceSession | null }>(
      `/attendance/instance/${instanceId}/check`
    );
  },

  /**
   * Fermer une session de présence
   * @param sessionId - ID de la session
   */
  async closeSession(sessionId: string) {
    return apiCall<AttendanceSession>(`/attendance/session/${sessionId}/close`, {
      method: 'POST',
    });
  },

  // ============================================
  // MARQUAGE PRÉSENCE
  // ============================================

  /**
   * Marquer la présence d'un seul élève
   */
  async markAttendance(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    options?: {
      comment?: string;
      lateMinutes?: number;
    }
  ) {
    return apiCall<AttendanceRecord>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        studentId,
        status,
        comment: options?.comment,
        lateMinutes: options?.lateMinutes,
      }),
    });
  },

  /**
   * Marquer la présence de plusieurs élèves en masse
   */
  async bulkMarkAttendance(
    sessionId: string,
    records: Array<{
      studentId: string;
      status: AttendanceStatus;
      comment?: string;
      lateMinutes?: number;
    }>
  ) {
    return apiCall<AttendanceRecord[]>('/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        records,
      }),
    });
  },

  // ============================================
  // HISTORIQUE ÉLÈVE
  // ============================================

  /**
   * Récupérer l'historique de présence d'un élève
   */
  async getStudentHistory(
    studentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      courseId?: string;
      limit?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.courseId) params.append('courseId', options.courseId);
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const url = `/attendance/student/${studentId}${queryString ? `?${queryString}` : ''}`;

    return apiCall<{ history: AttendanceHistoryItem[]; stats: AttendanceStats }>(url);
  },

  /**
   * Récupérer les statistiques de présence d'un élève
   */
  async getStudentStats(
    studentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      courseId?: string;
    }
  ) {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.courseId) params.append('courseId', options.courseId);

    const queryString = params.toString();
    const url = `/attendance/student/${studentId}/stats${queryString ? `?${queryString}` : ''}`;

    return apiCall<AttendanceStats>(url);
  },
};

// ============================================
// HELPERS
// ============================================

/**
 * Obtenir le label français d'un statut
 */
export function getStatusLabel(status: AttendanceStatus): string {
  const labels: Record<AttendanceStatus, string> = {
    present: 'Présent',
    absent: 'Absent',
    late: 'En retard',
    excused: 'Excusé',
    excluded: 'Exclu',
    remote: 'À distance',
  };
  return labels[status];
}

/**
 * Obtenir la couleur d'un statut
 */
export function getStatusColor(status: AttendanceStatus): string {
  const colors: Record<AttendanceStatus, string> = {
    present: 'bg-green-100 text-green-800 border-green-300',
    absent: 'bg-red-100 text-red-800 border-red-300',
    late: 'bg-orange-100 text-orange-800 border-orange-300',
    excused: 'bg-blue-100 text-blue-800 border-blue-300',
    excluded: 'bg-purple-100 text-purple-800 border-purple-300',
    remote: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  };
  return colors[status];
}

/**
 * Obtenir l'icône d'un statut (pour Lucide)
 */
export function getStatusIcon(status: AttendanceStatus): string {
  const icons: Record<AttendanceStatus, string> = {
    present: 'check-circle',
    absent: 'x-circle',
    late: 'clock',
    excused: 'shield-check',
    excluded: 'ban',
    remote: 'monitor',
  };
  return icons[status];
}

/**
 * Formater une durée de retard
 */
export function formatLateMinutes(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}