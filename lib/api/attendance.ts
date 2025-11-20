import { api } from './client';

// ============================================
// TYPES
// ============================================

export type AttendanceStatus = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'excused' 
  | 'remote' 
  | 'excluded';

export interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  recorded_by: string | null;
  created_at: string;
  // Données enrichies
  course_title?: string;
  subject_name?: string;
  subject_code?: string;
  class_label?: string;
  class_id?: string;
  teacher_name?: string;
  teacher_id?: string;
}

export interface StudentAttendanceData {
  student_id: string;
  student_name: string;
  student_no: string;
  record_id: string | null;
  status: AttendanceStatus | null;
  late_minutes: number | null;
  justification: string | null;
}

export interface AttendanceSessionDetails {
  session: AttendanceSession;
  students: StudentAttendanceData[];
  canModify: boolean;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  late_minutes: number | null;
  justification: string | null;
  justified: boolean;
  justified_by: string | null;
  justified_at: string | null;
  justification_document: string | null;
  recorded_at: string;
  recorded_by: string | null;
  last_modified_at?: string;
  last_modified_by?: string | null;
  // Données enrichies
  student_name?: string;
  student_no?: string;
  session_date?: string;
  subject_name?: string;
  class_label?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  remote: number;
  excluded: number;
  attendance_rate: number;
}

export interface AttendanceHistoryData {
  records: AttendanceRecord[];
  stats: AttendanceStats;
}

export interface StaffClass {
  id: string;
  code: string;
  label: string;
  level: string;
  current_size: number;
  is_main: boolean;
}

export interface AttendanceRecordInput {
  student_id: string;
  status: AttendanceStatus;
  late_minutes?: number;
  justification?: string;
}

export interface BulkAttendanceResponse {
  message: string;
  data: AttendanceRecord[];
}

// ============================================
// API ATTENDANCE
// ============================================

export const attendanceApi = {
  /**
   * Récupérer les sessions du jour (teacher ou staff)
   */
  getSessions: (date?: string) => {
    const endpoint = date 
      ? `/attendance/sessions?date=${date}` 
      : '/attendance/sessions';
    
    return api.get<AttendanceSession[]>(endpoint);
  },

  /**
   * Récupérer les détails d'une session avec les élèves
   */
  getSessionDetails: (sessionId: string) => {
    return api.get<AttendanceSessionDetails>(`/attendance/sessions/${sessionId}`);
  },

  /**
   * Enregistrer/modifier l'appel complet (bulk)
   */
  bulkSaveAttendance: (sessionId: string, records: AttendanceRecordInput[]) => {
    return api.post<BulkAttendanceResponse>(
      `/attendance/sessions/${sessionId}/records/bulk`,
      { records }
    );
  },

  /**
   * Modifier une présence individuelle
   */
  updateRecord: (
    recordId: string,
    data: {
      status?: AttendanceStatus;
      late_minutes?: number | null;
      justification?: string;
    }
  ) => {
    return api.put<{ message: string; data: AttendanceRecord }>(
      `/attendance/records/${recordId}`,
      data
    );
  },

  /**
   * Récupérer l'historique des présences d'un élève
   */
  getStudentHistory: (
    studentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ) => {
    let endpoint = `/attendance/students/${studentId}/records`;
    const params: string[] = [];

    if (options?.startDate) params.push(`startDate=${options.startDate}`);
    if (options?.endDate) params.push(`endDate=${options.endDate}`);
    if (options?.limit) params.push(`limit=${options.limit}`);

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    return api.get<AttendanceHistoryData>(endpoint);
  },

  /**
   * Récupérer les statistiques d'un élève
   */
  getStudentStats: (
    studentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ) => {
    let endpoint = `/attendance/students/${studentId}/stats`;
    const params: string[] = [];

    if (options?.startDate) params.push(`startDate=${options.startDate}`);
    if (options?.endDate) params.push(`endDate=${options.endDate}`);

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    return api.get<AttendanceStats>(endpoint);
  },

  /**
   * Récupérer les classes gérées par le staff
   */
  getStaffClasses: () => {
    return api.get<StaffClass[]>('/attendance/staff/classes');
  },
};