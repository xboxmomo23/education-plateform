import { apiClient } from './client';

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
    apiClient.post('/api/grades/evaluations', data),
    
  getEvaluations: (filters?: any) => 
    apiClient.get('/api/grades/evaluations', { params: filters }),
    
  getEvaluation: (id: string) => 
    apiClient.get(`/api/grades/evaluations/${id}`),
    
  updateEvaluation: (id: string, data: Partial<Evaluation>) => 
    apiClient.put(`/api/grades/evaluations/${id}`, data),
    
  deleteEvaluation: (id: string) => 
    apiClient.delete(`/api/grades/evaluations/${id}`),

  // Grades
  createOrUpdateGrades: (evaluationId: string, grades: Grade[]) => 
    apiClient.post('/api/grades', { evaluationId, grades }),
    
  updateGrade: (id: string, data: Partial<Grade>) => 
    apiClient.put(`/api/grades/${id}`, data),
    
  deleteGrade: (id: string) => 
    apiClient.delete(`/api/grades/${id}`),
    
  getGradeHistory: (id: string) => 
    apiClient.get(`/api/grades/${id}/history`),

  // Student
  getStudentGrades: (studentId: string, filters?: any) => 
    apiClient.get(`/api/grades/student/${studentId}`, { params: filters }),
    
  getStudentAverages: (studentId: string, termId?: string) => 
    apiClient.get(`/api/grades/student/${studentId}/averages`, { 
      params: { termId } 
    }),

  // Responsable
  getChildrenGrades: (filters?: any) => 
    apiClient.get('/api/grades/children', { params: filters }),

  // Course
  getCourseGrades: (courseId: string, evaluationId?: string) => 
    apiClient.get(`/api/grades/course/${courseId}`, { 
      params: { evaluationId } 
    }),

  // Statistics
  getClassAverages: (classId: string, termId?: string) => 
    apiClient.get(`/api/grades/class/${classId}/averages`, { 
      params: { termId } 
    }),
};