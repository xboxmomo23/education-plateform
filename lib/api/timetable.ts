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
  // TIMETABLE ENTRIES
  // ==================

  

  async getClassTimetable(classId: string, week?: 'A' | 'B', signal?: AbortSignal) {
    const params = week ? `?week=${week}` : '';
    return apiCallWithAbort(`/timetable/class/${classId}${params}`, {}, signal);
  },

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
  // TEMPLATES (NOUVEAU)
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