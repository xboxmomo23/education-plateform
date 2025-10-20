import { api } from './client';

// Types
export interface Evaluation {
  id: string;
  courseId: string;
  termId?: string;
  title: string;
  type: 'controle' | 'devoir' | 'participation' | 'examen';
  coefficient: number;
  maxScale: number;
  evalDate: string;
  description?: string;
}

// ✅ CORRIGÉ : value peut être number, null ou undefined
export interface CreateGradeInput {
  studentId: string;
  value?: number | null;  // ✅ Ajout de "| null"
  absent?: boolean;
  comment?: string | null;  // ✅ Ajout de "| null"
}

export interface UpdateGradeInput {
  value?: number | null;  // ✅ Ajout de "| null"
  absent?: boolean;
  comment?: string | null;  // ✅ Ajout de "| null"
}

export interface Grade {
  id: string;
  evaluationId: string;
  studentId: string;
  value?: number;
  absent?: boolean;
  comment?: string;
}

// API Functions
export const gradesApi = {
  // ============================================
  // EVALUATIONS
  // ============================================
  
  createEvaluation: (data: Partial<Evaluation>) => 
    api.post('/grades/evaluations', data),
    
  getEvaluations: (filters?: any) => 
    api.get('/grades/evaluations', { params: filters }),
    
  getEvaluation: (id: string) => 
    api.get(`/grades/evaluations/${id}`),
    
  updateEvaluation: (id: string, data: Partial<Evaluation>) => 
    api.put(`/grades/evaluations/${id}`, data),
    
  deleteEvaluation: (id: string) => 
    api.delete(`/grades/evaluations/${id}`),

  // ============================================
  // GRADES (Notes)
  // ============================================
  
  getGrade: (gradeId: string) =>
    api.get(`/grades/${gradeId}`),

  createOrUpdateGrades: (evaluationId: string, grades: CreateGradeInput[]) => 
    api.post('/grades', { evaluationId, grades }),
    
  updateGrade: (id: string, data: UpdateGradeInput) => 
    api.put(`/grades/${id}`, data),
    
  deleteGrade: (id: string) => 
    api.delete(`/grades/${id}`),
    
  getGradeHistory: (id: string) => 
    api.get(`/grades/${id}/history`),

  // ============================================
  // STUDENT (Élève)
  // ============================================
  
  getStudentGrades: (studentId: string, filters?: any) => 
    api.get(`/grades/student/${studentId}`, { params: filters }),
    
  getStudentAverages: (studentId: string, termId?: string) => 
    api.get(`/grades/student/${studentId}/averages`, { 
      params: termId ? { termId } : undefined 
    }),

  // ============================================
  // RESPONSABLE (Parents)
  // ============================================
  
  getChildrenGrades: (filters?: any) => 
    api.get('/grades/children', { params: filters }),

  // ============================================
  // COURSE (Cours)
  // ============================================
  
  getCourseGrades: (courseId: string, evaluationId?: string) => 
    api.get(`/grades/course/${courseId}`, { 
      params: evaluationId ? { evaluationId } : undefined 
    }),

  // ✅ AJOUTÉ : Récupérer les élèves d'un cours
  getCourseStudents: (courseId: string, evaluationId?: string) =>
    api.get(`/grades/course/${courseId}/students`, {
      params: evaluationId ? { evaluationId } : undefined
    }),

  // ============================================
  // STATISTICS (Statistiques)
  // ============================================
  
  getClassAverages: (classId: string, termId?: string) => 
    api.get(`/grades/class/${classId}/averages`, { 
      params: termId ? { termId } : undefined 
    }),
};