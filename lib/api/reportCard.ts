import { api } from './client';

// =========================
// Types
// =========================

export interface ReportCardStatus {
  exists: boolean;
  validated: boolean;
  validatedAt: string | null;
  validatedBy: string | null;
  councilAppreciation: string | null;
}

export interface SubjectAppreciation {
  id: string;
  appreciation: string;
  courseId: string;
  teacherId: string;
  subjectName: string;
  teacherName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAppreciations {
  subjectAppreciations: SubjectAppreciation[];
  councilAppreciation: string | null;
  validated: boolean;
}

export interface ClassReportCard {
  student_id: string;
  student_name: string;
  report_card_id: string | null;
  council_appreciation: string | null;
  validated_at: string | null;
  validated_by: string | null;
  validated_by_name: string | null;
}

// =========================
// API
// =========================

export const reportCardApi = {
  // Statut d'un bulletin
  getStatus: (studentId: string, termId: string) =>
    api.get<ReportCardStatus>(`/report-cards/status/${studentId}/${termId}`),

  // Valider un bulletin individuel
  validate: (studentId: string, termId: string) =>
    api.post<any>('/report-cards/validate', { studentId, termId }),

  // Annuler une validation (admin uniquement)
  unvalidate: (studentId: string, termId: string) =>
    api.post<any>('/report-cards/unvalidate', { studentId, termId }),

  // Valider tous les bulletins d'une classe
  validateClass: (classId: string, termId: string) =>
    api.post<{ validatedCount: number }>('/report-cards/validate-class', { classId, termId }),

  // Ajouter/modifier l'appréciation du conseil
  setCouncilAppreciation: (studentId: string, termId: string, appreciation: string) =>
    api.put<any>('/report-cards/council-appreciation', { studentId, termId, appreciation }),

  // Liste des bulletins d'une classe
  getClassReportCards: (classId: string, termId: string) =>
    api.get<ClassReportCard[]>(`/report-cards/class/${classId}/${termId}`),

  // Ajouter/modifier une appréciation par matière
  setSubjectAppreciation: (studentId: string, termId: string, courseId: string, appreciation: string) =>
    api.post<any>('/report-cards/appreciations/subject', { studentId, termId, courseId, appreciation }),

  // Récupérer les appréciations d'un élève
  getStudentAppreciations: (studentId: string, termId: string) =>
    api.get<StudentAppreciations>(`/report-cards/appreciations/student/${studentId}/${termId}`),
};