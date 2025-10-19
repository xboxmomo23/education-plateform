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
  // Evaluations
  createEvaluation: (data: Partial<Evaluation>) => 
    api.post('/api/grades/evaluations', data),
    
  getEvaluations: (filters?: any) => 
    api.get('/api/grades/evaluations', { params: filters }),
    
  getEvaluation: (id: string) => 
    api.get(`/api/grades/evaluations/${id}`),
    
  updateEvaluation: (id: string, data: Partial<Evaluation>) => 
    api.put(`/api/grades/evaluations/${id}`, data),
    
  deleteEvaluation: (id: string) => 
    api.delete(`/api/grades/evaluations/${id}`),

  // Grades
  createOrUpdateGrades: (evaluationId: string, grades: Grade[]) => 
    api.post('/api/grades', { evaluationId, grades }),
    
  updateGrade: (id: string, data: Partial<Grade>) => 
    api.put(`/api/grades/${id}`, data),
    
  deleteGrade: (id: string) => 
    api.delete(`/api/grades/${id}`),
    
  getGradeHistory: (id: string) => 
    api.get(`/api/grades/${id}/history`),

  // Student
  getStudentGrades: (studentId: string, filters?: any) => 
    api.get(`/api/grades/student/${studentId}`, { params: filters }),
    
  getStudentAverages: (studentId: string, termId?: string) => 
    api.get(`/api/grades/student/${studentId}/averages`, { 
      params: { termId } 
    }),

  // Responsable
  getChildrenGrades: (filters?: any) => 
    api.get('/api/grades/children', { params: filters }),

  // Course
  getCourseGrades: (courseId: string, evaluationId?: string) => 
    api.get(`/api/grades/course/${courseId}`, { 
      params: { evaluationId } 
    }),

  // Statistics
  getClassAverages: (classId: string, termId?: string) => 
    api.get(`/api/grades/class/${classId}/averages`, { 
      params: { termId } 
    }),
};