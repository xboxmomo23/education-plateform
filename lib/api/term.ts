import { api } from './client';

// =========================
// Types
// =========================

export interface Term {
  id: string;
  academicYear: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  establishmentId: string;
}

export interface CreateTermInput {
  academicYear: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface UpdateTermInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface SubjectSummary {
  subjectId: string;
  subjectName: string;
  coefTotal: number;
  studentAverage20: number;
  classAverage20: number | null;
  min: number | null;
  max: number | null;
  gradeCount: number;
  appreciation: string;
}

export interface EvaluationDetail {
  subjectId: string;
  subjectName: string;
  evaluationId: string;
  title: string;
  type: string;
  date: string;
  coefficient: number;
  maxScale: number;
  gradeValue: number | null;
  normalizedValue: number | null;
  absent: boolean;
  comment: string | null;
}

export interface GradesSummary {
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  overallAverage: number;
  overallAppreciation: string;
  subjects: SubjectSummary[];
  evaluations: EvaluationDetail[];
}

export interface ReportData {
  student: {
    id: string;
    fullName: string;
    studentNo: string;
    classLabel: string;
    academicYear: number;
  };
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  subjects: Array<{
    name: string;
    studentAverage: number;
    classAverage: number | null;
    appreciation: string;
  }>;
  overallAverage: number;
  overallAppreciation: string;
}

// =========================
// API - Terms (Périodes)
// =========================

export const termsApi = {
  /**
   * Récupère la liste des périodes
   */
  getTerms: (academicYear?: number) =>
    api.get<Term[]>('/terms', {
      params: academicYear ? { academicYear } : undefined,
    }),

  /**
   * Récupère la période courante
   */
  getCurrentTerm: () =>
    api.get<Term | null>('/terms/current'),

  /**
   * Récupère une période par ID
   */
  getTerm: (id: string) =>
    api.get<Term>(`/terms/${id}`),

  /**
   * Crée une nouvelle période
   */
  createTerm: (data: CreateTermInput) =>
    api.post<Term>('/terms', data),

  /**
   * Met à jour une période
   */
  updateTerm: (id: string, data: UpdateTermInput) =>
    api.put<Term>(`/terms/${id}`, data),

  /**
   * Supprime une période
   */
  deleteTerm: (id: string) =>
    api.delete(`/terms/${id}`),
};

// =========================
// API - Synthèse des notes et bulletins
// =========================

export const reportsApi = {
  /**
   * Récupère la synthèse des notes pour l'élève connecté
   */
  getMyGradesSummary: (academicYear?: number, termId?: string) =>
    api.get<GradesSummary>('/students/me/grades/summary', {
      params: {
        ...(academicYear && { academicYear }),
        ...(termId && { termId }),
      },
    }),

  /**
   * Récupère la synthèse des notes pour un élève spécifique
   */
  getStudentGradesSummary: (studentId: string, academicYear?: number, termId?: string) =>
    api.get<GradesSummary>(`/students/${studentId}/grades/summary`, {
      params: {
        ...(academicYear && { academicYear }),
        ...(termId && { termId }),
      },
    }),

  /**
   * Récupère les données du bulletin (JSON)
   */
  getReportData: (studentId: string, termId: string) =>
    api.get<ReportData>(`/students/${studentId}/report/data`, {
      params: { termId },
    }),

  /**
   * Génère l'URL de téléchargement du bulletin PDF
   */
  getReportDownloadUrl: (studentId: string, termId: string) =>
    `/api/students/${studentId}/report?termId=${termId}`,

  /**
   * Télécharge le bulletin PDF directement
   */
  downloadReport: async (studentId: string, termId: string, token: string) => {
    const response = await fetch(
      `/api/students/${studentId}/report?termId=${termId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement du bulletin');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Extraire le nom du fichier depuis le header Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'bulletin.pdf';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Créer un lien temporaire pour le téléchargement
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Nettoyer l'URL blob
    window.URL.revokeObjectURL(url);
  },
};