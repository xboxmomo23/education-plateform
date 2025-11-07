// =========================
// MISE À JOUR DU FICHIER types/index.ts
// Ajouter ces types aux types existants
// =========================

// Modifier l'export du type AttendanceStatus existant
export type AttendanceStatus = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'excused'   // ✅ NOUVEAU
  | 'remote'    // ✅ NOUVEAU
  | 'excluded';

// Ajouter ces nouvelles interfaces

export interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: Date;
  scheduled_start: string;
  scheduled_end: string;
  status: TimetableStatus;
  recorded_by: string | null;
  created_at: Date;
  establishment_id: string | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  late_minutes?: number | null;
  justification?: string | null;
  justified: boolean;
  justified_by?: string | null;
  justified_at?: Date | null;
  justification_document?: string | null;
  recorded_at: Date;
  recorded_by: string | null;
  last_modified_at?: Date;
  last_modified_by?: string | null;
}

export interface AttendanceSessionWithDetails extends AttendanceSession {
  course_title: string;
  subject_name: string;
  subject_code: string;
  class_label: string;
  class_id: string;
  teacher_name: string;
  teacher_id: string;
}

export interface AttendanceRecordWithDetails extends AttendanceRecord {
  student_name: string;
  student_no: string;
  session_date: Date;
  subject_name: string;
  class_label: string;
  scheduled_start: string;
  scheduled_end: string;
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

export interface StudentAttendanceData {
  student_id: string;
  student_name: string;
  student_no: string;
  record_id: string | null;
  status: AttendanceStatus | null;
  late_minutes: number | null;
  justification: string | null;
}

// API Responses
export interface AttendanceSessionResponse {
  success: boolean;
  data?: {
    session: AttendanceSession;
    students: StudentAttendanceData[];
    canModify: boolean;
  };
  error?: string;
}

export interface AttendanceHistoryResponse {
  success: boolean;
  data?: {
    records: AttendanceRecordWithDetails[];
    stats: AttendanceStats;
  };
  error?: string;
}