const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// =========================
// HELPER
// =========================

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data: T; message?: string }> {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Erreur API');
  }

  return data;
}

// =========================
// TYPES - KPI
// =========================

export interface StudentKpi {
  coursesToday: number;
  totalDurationMinutes: number;
  homeworkCount: number;
  unreadMessages: number;
  absencesNotJustified: number;
}

export interface TeacherKpi {
  coursesToday: number;
  totalDurationMinutes: number;
  homeworkToCorrect: number;
  pendingAttendance: number;
  unreadMessages: number;
}

export interface StaffKpi {
  presentToday: number;
  absentToday: number;
  absencesNotJustified: number;
  lateToday: number;
  unreadMessages: number;
}

// =========================
// TYPES - FEED / TIMELINE
// =========================

export type FeedEventType = 'devoir' | 'absence' | 'planning' | 'message' | 'note' | 'document';

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  title: string;
  description?: string;
  date: string;
  link?: string;
  metadata?: {
    subjectName?: string;
    subjectColor?: string;
    className?: string;
    senderName?: string;
    status?: string;
  };
}

// =========================
// TYPES - COURSES
// =========================

export interface TodayCourse {
  id: string;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  class_label?: string;
  class_id?: string;
  teacher_name?: string;
  teacher_id?: string;
  start_time: string;
  end_time: string;
  room: string | null;
  day_of_week: number;
  has_attendance?: boolean;
  attendance_status?: 'pending' | 'completed' | 'partial';
}

// =========================
// TYPES - UPCOMING
// =========================

export interface UpcomingLesson {
  id: string;
  subject_name: string;
  subject_color: string;
  class_label?: string;
  teacher_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string | null;
}

export interface UpcomingHomework {
  id: string;
  title: string;
  subject_name: string;
  subject_color: string;
  class_label?: string;
  due_at: string;
  description?: string;
  max_points?: number;
}

// =========================
// TYPES - GRADES (NOTES)
// =========================

export interface RecentGrade {
  id: string;
  value: number;
  max_value: number;
  coefficient: number;
  subject_name: string;
  subject_color: string;
  evaluation_title: string;
  date: string;
}

// =========================
// TYPES - ABSENCES
// =========================

export interface AbsenceAlert {
  id: string;
  student_id: string;
  student_name: string;
  student_number?: string;
  class_label: string;
  class_id: string;
  subject_name: string;
  subject_color: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: 'absent' | 'late' | 'excused';
  late_minutes?: number;
  justified: boolean;
  justification?: string;
}

// =========================
// TYPES - CLASSES
// =========================

export interface ClassSummary {
  id: string;
  label: string;
  level: string;
  student_count: number;
  absent_today: number;
  late_today: number;
}

// =========================
// TYPES - DAILY EVENTS (Staff)
// =========================

export interface DailyEvent {
  id: string;
  type: 'reunion' | 'examen' | 'evenement' | 'modification';
  title: string;
  description?: string;
  time?: string;
  location?: string;
  participants?: string[];
}

// =========================
// API CLIENT
// =========================

export const dashboardApi = {
  // ==================
  // ÉLÈVE
  // ==================

  /**
   * Récupérer les KPI de l'élève
   */
  async getStudentKpi(): Promise<{ success: boolean; data: StudentKpi }> {
    return apiCall<StudentKpi>('/dashboard/student/kpi');
  },

  /**
   * Récupérer les cours du jour pour l'élève
   */
  async getStudentTodayCourses(): Promise<{ success: boolean; data: TodayCourse[] }> {
    return apiCall<TodayCourse[]>('/dashboard/student/today-courses');
  },

  /**
   * Récupérer le fil d'actualité de l'élève
   */
  async getStudentFeed(limit: number = 20): Promise<{ success: boolean; data: FeedEvent[] }> {
    return apiCall<FeedEvent[]>(`/dashboard/student/feed?limit=${limit}`);
  },

  /**
   * Récupérer les prochains cours de l'élève
   */
  async getStudentUpcomingLessons(limit: number = 5): Promise<{ success: boolean; data: UpcomingLesson[] }> {
    return apiCall<UpcomingLesson[]>(`/dashboard/student/upcoming-lessons?limit=${limit}`);
  },

  /**
   * Récupérer les devoirs à venir de l'élève
   */
  async getStudentUpcomingHomework(limit: number = 5): Promise<{ success: boolean; data: UpcomingHomework[] }> {
    return apiCall<UpcomingHomework[]>(`/dashboard/student/upcoming-homework?limit=${limit}`);
  },

  /**
   * Récupérer les dernières notes de l'élève
   */
  async getStudentRecentGrades(limit: number = 5): Promise<{ success: boolean; data: RecentGrade[] }> {
    return apiCall<RecentGrade[]>(`/dashboard/student/recent-grades?limit=${limit}`);
  },

  // ==================
  // PROFESSEUR
  // ==================

  /**
   * Récupérer les KPI du professeur
   */
  async getTeacherKpi(): Promise<{ success: boolean; data: TeacherKpi }> {
    return apiCall<TeacherKpi>('/dashboard/teacher/kpi');
  },

  /**
   * Récupérer les cours du jour pour le professeur
   */
  async getTeacherTodayCourses(): Promise<{ success: boolean; data: TodayCourse[] }> {
    return apiCall<TodayCourse[]>('/dashboard/teacher/today-courses');
  },

  /**
   * Récupérer les devoirs récents du professeur
   */
  async getTeacherRecentHomework(limit: number = 5): Promise<{ success: boolean; data: UpcomingHomework[] }> {
    return apiCall<UpcomingHomework[]>(`/dashboard/teacher/recent-homework?limit=${limit}`);
  },

  /**
   * Récupérer les absences récentes dans les classes du professeur
   */
  async getTeacherRecentAbsences(limit: number = 10): Promise<{ success: boolean; data: AbsenceAlert[] }> {
    return apiCall<AbsenceAlert[]>(`/dashboard/teacher/recent-absences?limit=${limit}`);
  },

  /**
   * Récupérer les classes du professeur avec résumé
   */
  async getTeacherClasses(): Promise<{ success: boolean; data: ClassSummary[] }> {
    return apiCall<ClassSummary[]>('/dashboard/teacher/classes');
  },

  // ==================
  // STAFF
  // ==================

  /**
   * Récupérer les KPI du staff
   */
  async getStaffKpi(): Promise<{ success: boolean; data: StaffKpi }> {
    return apiCall<StaffKpi>('/dashboard/staff/kpi');
  },

  /**
   * Récupérer les absences non justifiées à traiter
   */
  async getStaffPendingAbsences(limit: number = 20): Promise<{ success: boolean; data: AbsenceAlert[] }> {
    return apiCall<AbsenceAlert[]>(`/dashboard/staff/pending-absences?limit=${limit}`);
  },

  /**
   * Récupérer les événements du jour pour le staff
   */
  async getStaffDailyEvents(): Promise<{ success: boolean; data: DailyEvent[] }> {
    return apiCall<DailyEvent[]>('/dashboard/staff/daily-events');
  },

  /**
   * Récupérer les classes gérées par le staff avec résumé
   */
  async getStaffClasses(): Promise<{ success: boolean; data: ClassSummary[] }> {
    return apiCall<ClassSummary[]>('/dashboard/staff/classes');
  },
};

// =========================
// HELPERS
// =========================

/**
 * Formater la durée en heures et minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}min`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

/**
 * Formater une heure (HH:MM:SS → HH:MM)
 */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * Formater une date relative
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'À l\'instant';
  }
  if (diffMins < 60) {
    return `Il y a ${diffMins} min`;
  }
  if (diffHours < 24) {
    return `Il y a ${diffHours}h`;
  }
  if (diffDays === 1) {
    return 'Hier';
  }
  if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formater une date complète
 */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formater une date courte pour les devoirs
 */
export function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Aujourd\'hui';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Demain';
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Vérifier si une date est passée
 */
export function isOverdue(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

/**
 * Obtenir le label du type d'événement
 */
export function getEventTypeLabel(type: FeedEventType): string {
  const labels: Record<FeedEventType, string> = {
    devoir: 'Devoir',
    absence: 'Absence',
    planning: 'Planning',
    message: 'Message',
    note: 'Note',
    document: 'Document',
  };
  return labels[type] || type;
}

/**
 * Obtenir l'icône du type d'événement (nom)
 */
export function getEventTypeIcon(type: FeedEventType): string {
  const icons: Record<FeedEventType, string> = {
    devoir: 'FileText',
    absence: 'AlertCircle',
    planning: 'Calendar',
    message: 'Mail',
    note: 'BarChart',
    document: 'File',
  };
  return icons[type] || 'Circle';
}