// Client API pour l'emploi du temps
// Utilise fetch directement

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper pour les appels API
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');  // ✅ Correction  
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

export const timetableApi = {
  // Récupérer emploi du temps classe
  async getClassTimetable(classId: string, week?: 'A' | 'B') {
    const params = week ? `?week=${week}` : '';
    return apiCall(`/timetable/class/${classId}${params}`);
  },

  // Récupérer emploi du temps professeur
  async getTeacherTimetable(teacherId: string, week?: 'A' | 'B') {
    const params = week ? `?week=${week}` : '';
    return apiCall(`/timetable/teacher/${teacherId}${params}`);
  },

  // Récupérer cours disponibles
  async getAvailableCourses(classId: string) {
    return apiCall(`/timetable/courses/${classId}`);
  },

  // Créer un créneau
  async createEntry(data: CreateEntryData) {
    return apiCall('/timetable/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Créer plusieurs créneaux
  async bulkCreateEntries(entries: CreateEntryData[]) {
    return apiCall('/timetable/entries/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  },

  // Modifier un créneau
  async updateEntry(entryId: string, data: Partial<CreateEntryData>) {
    return apiCall(`/timetable/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Supprimer un créneau
  async deleteEntry(entryId: string) {
    return apiCall(`/timetable/entries/${entryId}`, {
      method: 'DELETE',
    });
  },

  // Dupliquer emploi du temps
  async duplicate(sourceClassId: string, targetClassId: string) {
    return apiCall('/timetable/duplicate', {
      method: 'POST',
      body: JSON.stringify({
        sourceClassId,
        targetClassId,
      }),
    });
  },

  // Vérifier conflits
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

  // Récupérer la classe de l'élève connecté
    async getStudentClass() {
      return apiCall('/timetable/student/class');
    },
  };