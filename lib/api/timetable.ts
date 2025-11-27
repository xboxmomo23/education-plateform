import { apiCallWithAbort } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper pour les appels API
async function apiCall(endpoint: string, options: RequestInit = {}) {
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
// TYPES
// =========================

export interface TimetableEntry {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  week: 'A' | 'B' | null;
  room: string | null;
  status: 'confirmed' | 'cancelled' | 'changed';
  course_title?: string;
  subject_name?: string;
  subject_code?: string;
  subject_color?: string;
  class_label?: string;
  teacher_name?: string;
  template_id?: string;
}

// ✨ NOUVEAU TYPE pour les cours avec détection de mode
export interface TimetableCourse {
  id: string;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name?: string;
  teacher_id?: string;
  class_label?: string;
  class_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  notes?: string | null;
  status: 'normal' | 'cancelled' | 'modified';
  week_start_date?: string;
  override_reason?: string;
  override_date?: string;
  modifications?: {
    original_start_time?: string;
    original_end_time?: string;
    original_room?: string;
    new_start_time?: string;
    new_end_time?: string;
    new_room?: string;
  };
}

// ✨ NOUVEAU TYPE pour la réponse avec mode
export interface TimetableWeekResponse {
  mode: 'classic' | 'dynamic' | 'mixed';
  courses: TimetableCourse[];
}

export interface CreateEntryData {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  week?: 'A' | 'B' | null;
  room?: string;
  notes?: string;
}

export interface CourseTemplate {
  id: string;
  course_id: string;
  default_duration: number;
  default_room: string | null;
  display_order: number;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name: string;
  class_label: string;
  class_id: string;
}

export interface CreateTemplateData {
  course_id: string;
  default_duration?: number;
  default_room?: string;
  display_order?: number;
}

export interface CreateFromTemplateData {
  template_id: string;
  day_of_week: number;
  start_time: string;
  room?: string;
  notes?: string;
}

// =========================
// API CLIENT
// =========================

export const timetableApi = {
  // ==================
  // ✨ NOUVELLES FONCTIONS - ÉLÈVES & PROFESSEURS
  // ==================

  /**
   * Récupérer l'emploi du temps d'une classe pour une semaine spécifique
   * Détection automatique du mode (dynamic/classic)
   * @param classId - ID de la classe
   * @param weekStartDate - Date de début de semaine (format YYYY-MM-DD)
   * @param signal - AbortSignal pour annuler la requête
   */
  async getClassTimetableForWeek(
    classId: string, 
    weekStartDate: string, 
    signal?: AbortSignal
  ): Promise<{ success: boolean; data: TimetableWeekResponse }> {
    return apiCallWithAbort(
      `/timetable/class/${classId}/week/${weekStartDate}`,
      {},
      signal
    );
  },

  /**
   * Récupérer l'emploi du temps d'un professeur pour une semaine spécifique
   * Agrège tous les cours de toutes ses classes
   * @param teacherId - ID du professeur
   * @param weekStartDate - Date de début de semaine (format YYYY-MM-DD)
   * @param signal - AbortSignal pour annuler la requête
   */
  async getTeacherTimetableForWeek(
    teacherId: string, 
    weekStartDate: string, 
    signal?: AbortSignal
  ): Promise<{ success: boolean; data: TimetableWeekResponse }> {
    return apiCallWithAbort(
      `/timetable/teacher/${teacherId}/week/${weekStartDate}`,
      {},
      signal
    );
  },

  // ==================
  // FONCTIONS EXISTANTES (LEGACY - MODE CLASSIC SEULEMENT)
  // ==================

  /**
   * Récupérer l'emploi du temps d'une classe (mode classic seulement)
   * @deprecated Utiliser getClassTimetableForWeek à la place
   */
  async getClassTimetable(classId: string, week?: 'A' | 'B', signal?: AbortSignal) {
    const params = week ? `?week=${week}` : '';
    return apiCallWithAbort(`/timetable/class/${classId}${params}`, {}, signal);
  },

  /**
   * Récupérer l'emploi du temps d'un professeur (mode classic seulement)
   * @deprecated Utiliser getTeacherTimetableForWeek à la place
   */
  async getTeacherTimetable(teacherId: string, week?: 'A' | 'B', signal?: AbortSignal) {
    const params = week ? `?week=${week}` : '';
    return apiCallWithAbort(`/timetable/teacher/${teacherId}${params}`, {}, signal);
  },

  async getAvailableCourses(classId: string) {
    return apiCall(`/timetable/courses/${classId}`);
  },

  async createEntry(data: CreateEntryData) {
    return apiCall('/timetable/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkCreateEntries(entries: CreateEntryData[]) {
    return apiCall('/timetable/entries/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  },

  async updateEntry(entryId: string, data: Partial<CreateEntryData>) {
    return apiCall(`/timetable/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteEntry(entryId: string) {
    return apiCall(`/timetable/entries/${entryId}`, {
      method: 'DELETE',
    });
  },

  async duplicate(sourceClassId: string, targetClassId: string) {
    return apiCall('/timetable/duplicate', {
      method: 'POST',
      body: JSON.stringify({
        sourceClassId,
        targetClassId,
      }),
    });
  },

  async checkConflicts(data: {
    course_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
    exclude_entry_id?: string;
  }) {
    return apiCall('/timetable/check-conflicts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getStudentClass(signal?: AbortSignal) {
    return apiCallWithAbort('/timetable/student/class', {}, signal);
  },

  // ==================
  // STAFF MANAGEMENT
  // ==================
  
  /**
   * Récupérer les classes gérées par le staff
   */
  async getStaffClasses() {
    return apiCall('/timetable/staff/classes');
  },

  // ==================
  // TEMPLATES
  // ==================

  async getTemplates(classId: string): Promise<{ success: boolean; data: CourseTemplate[] }> {
    return apiCall(`/timetable/templates/class/${classId}`);
  },

  async createTemplate(data: CreateTemplateData): Promise<{ success: boolean; data: CourseTemplate }> {
    return apiCall('/timetable/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTemplate(templateId: string, data: Partial<CreateTemplateData>): Promise<{ success: boolean; data: CourseTemplate }> {
    return apiCall(`/timetable/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTemplate(templateId: string): Promise<{ success: boolean }> {
    return apiCall(`/timetable/templates/${templateId}`, {
      method: 'DELETE',
    });
  },

  async createFromTemplate(data: CreateFromTemplateData): Promise<{ success: boolean; data: TimetableEntry }> {
    return apiCall('/timetable/entries/from-template', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};