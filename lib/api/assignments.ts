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

export type AssignmentStatus = 'draft' | 'published' | 'archived';

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_at: string;
  status: AssignmentStatus;
  resource_url: string | null;
  max_points: number | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  establishment_id: string | null;
  // Données enrichies
  class_id?: string;
  class_label?: string;
  subject_name?: string;
  subject_code?: string;
  subject_color?: string;
  teacher_name?: string;
  teacher_id?: string;
}

export interface CreateAssignmentData {
  course_id: string;
  title: string;
  description?: string;
  due_at: string;
  status?: AssignmentStatus;
  resource_url?: string;
  max_points?: number;
}

export interface UpdateAssignmentData {
  title?: string;
  description?: string | null;
  due_at?: string;
  status?: AssignmentStatus;
  resource_url?: string | null;
  max_points?: number | null;
  course_id?: string;
}

export interface TeacherAssignmentFilters {
  courseId?: string;
  classId?: string;
  status?: AssignmentStatus;
  fromDueAt?: string;
  toDueAt?: string;
}

export interface StudentAssignmentFilters {
  subjectId?: string;
  fromDueAt?: string;
  toDueAt?: string;
}

/**
 * Cours du professeur (pour création de devoirs)
 */
export interface TeacherCourse {
  course_id: string;
  title: string | null;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  establishment_id: string;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  class_label: string;
  class_code: string;
  class_level: string;
  teacher_name: string;
}

// =========================
// API CLIENT
// =========================

export const assignmentsApi = {
  // ==================
  // ENSEIGNANTS
  // ==================

  /**
   * Récupérer les cours du professeur connecté
   * (pour la création de devoirs)
   */
  async getTeacherCourses(): Promise<{ success: boolean; data: TeacherCourse[] }> {
    return apiCall<TeacherCourse[]>('/assignments/teacher/courses');
  },

  /**
   * Récupérer les devoirs de l'enseignant connecté
   * @param filters - Filtres optionnels
   */
  async getTeacherAssignments(filters: TeacherAssignmentFilters = {}): Promise<{ success: boolean; data: Assignment[] }> {
    const params = new URLSearchParams();
    
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.status) params.append('status', filters.status);
    if (filters.fromDueAt) params.append('fromDueAt', filters.fromDueAt);
    if (filters.toDueAt) params.append('toDueAt', filters.toDueAt);
    
    const queryString = params.toString();
    const endpoint = `/assignments/teacher${queryString ? `?${queryString}` : ''}`;
    
    return apiCall<Assignment[]>(endpoint);
  },

  /**
   * Créer un nouveau devoir
   * @param data - Données du devoir
   */
  async createAssignment(data: CreateAssignmentData): Promise<{ success: boolean; data: Assignment; message?: string }> {
    return apiCall<Assignment>('/assignments/teacher', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Mettre à jour un devoir existant
   * @param id - UUID du devoir
   * @param data - Données à mettre à jour
   */
  async updateAssignment(id: string, data: UpdateAssignmentData): Promise<{ success: boolean; data: Assignment; message?: string }> {
    return apiCall<Assignment>(`/assignments/teacher/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Supprimer (archiver) un devoir
   * @param id - UUID du devoir
   */
  async deleteAssignment(id: string): Promise<{ success: boolean; message?: string }> {
    return apiCall<void>(`/assignments/teacher/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Publier un devoir (raccourci pour updateAssignment avec status='published')
   * @param id - UUID du devoir
   */
  async publishAssignment(id: string): Promise<{ success: boolean; data: Assignment; message?: string }> {
    return this.updateAssignment(id, { status: 'published' });
  },

  /**
   * Repasser un devoir en brouillon
   * @param id - UUID du devoir
   */
  async unpublishAssignment(id: string): Promise<{ success: boolean; data: Assignment; message?: string }> {
    return this.updateAssignment(id, { status: 'draft' });
  },

  // ==================
  // ÉLÈVES
  // ==================

  /**
   * Récupérer les devoirs de l'élève connecté
   * @param filters - Filtres optionnels
   */
  async getStudentAssignments(filters: StudentAssignmentFilters = {}): Promise<{ success: boolean; data: Assignment[] }> {
    const params = new URLSearchParams();
    
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.fromDueAt) params.append('fromDueAt', filters.fromDueAt);
    if (filters.toDueAt) params.append('toDueAt', filters.toDueAt);
    
    const queryString = params.toString();
    const endpoint = `/assignments/student${queryString ? `?${queryString}` : ''}`;
    
    return apiCall<Assignment[]>(endpoint);
  },

  /**
   * Récupérer un devoir spécifique pour un élève
   * @param id - UUID du devoir
   */
  async getStudentAssignmentById(id: string): Promise<{ success: boolean; data: Assignment }> {
    return apiCall<Assignment>(`/assignments/student/${id}`);
  },

  /**
   * Récupérer les devoirs pour un élève spécifique (accès parent/admin/staff)
   */
  async getAssignmentsForStudent(studentId: string, filters: StudentAssignmentFilters = {}): Promise<{ success: boolean; data: Assignment[] }> {
    const params = new URLSearchParams();

    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.fromDueAt) params.append('fromDueAt', filters.fromDueAt);
    if (filters.toDueAt) params.append('toDueAt', filters.toDueAt);

    const queryString = params.toString();
    const endpoint = `/students/${studentId}/assignments${queryString ? `?${queryString}` : ''}`;

    return apiCall<Assignment[]>(endpoint);
  },
};

// =========================
// HELPERS
// =========================

/**
 * Vérifier si un devoir est en retard
 */
export function isAssignmentOverdue(assignment: Assignment): boolean {
  return new Date(assignment.due_at) < new Date();
}

/**
 * Vérifier si un devoir est dû aujourd'hui
 */
export function isAssignmentDueToday(assignment: Assignment): boolean {
  const dueDate = new Date(assignment.due_at);
  const today = new Date();
  return (
    dueDate.getFullYear() === today.getFullYear() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getDate() === today.getDate()
  );
}

/**
 * Vérifier si un devoir est dû cette semaine
 */
export function isAssignmentDueThisWeek(assignment: Assignment): boolean {
  const dueDate = new Date(assignment.due_at);
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  
  return dueDate >= today && dueDate <= endOfWeek;
}

/**
 * Vérifier si un devoir est dû ce mois
 */
export function isAssignmentDueThisMonth(assignment: Assignment): boolean {
  const dueDate = new Date(assignment.due_at);
  const today = new Date();
  
  return (
    dueDate.getFullYear() === today.getFullYear() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate >= today
  );
}

/**
 * Formater la date limite d'un devoir
 */
export function formatDueDate(dueAt: string): string {
  const date = new Date(dueAt);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formater la date limite en version courte
 */
export function formatDueDateShort(dueAt: string): string {
  const date = new Date(dueAt);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Obtenir le label de statut en français
 */
export function getStatusLabel(status: AssignmentStatus): string {
  switch (status) {
    case 'draft':
      return 'Brouillon';
    case 'published':
      return 'Publié';
    case 'archived':
      return 'Archivé';
    default:
      return status;
  }
}
