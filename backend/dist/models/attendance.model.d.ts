import { AttendanceStatus, TimetableStatus } from '../types';
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
export declare function createAttendanceSession(data: {
    course_id: string;
    session_date: Date;
    scheduled_start: string;
    scheduled_end: string;
    recorded_by?: string;
    establishment_id?: string;
}): Promise<AttendanceSession>;
export declare function getSessionById(sessionId: string): Promise<AttendanceSession | null>;
export declare function getTeacherSessionsByDate(teacherId: string, date: Date): Promise<AttendanceSessionWithDetails[]>;
export declare function getStaffSessionsByDate(staffId: string, date: Date): Promise<AttendanceSessionWithDetails[]>;
export declare function getOrCreateSession(data: {
    course_id: string;
    session_date: Date;
    scheduled_start: string;
    scheduled_end: string;
    recorded_by: string;
}): Promise<AttendanceSession>;
export declare function createAttendanceRecord(data: {
    session_id: string;
    student_id: string;
    status: AttendanceStatus;
    late_minutes?: number;
    justification?: string;
    recorded_by: string;
}): Promise<AttendanceRecord>;
export declare function updateAttendanceRecord(recordId: string, data: {
    status?: AttendanceStatus;
    late_minutes?: number | null;
    justification?: string;
    modified_by: string;
}): Promise<AttendanceRecord>;
export declare function upsertAttendanceRecords(sessionId: string, records: Array<{
    student_id: string;
    status: AttendanceStatus;
    late_minutes?: number;
    justification?: string;
}>, recordedBy: string): Promise<AttendanceRecord[]>;
export declare function getSessionStudentsWithAttendance(sessionId: string): Promise<Array<{
    student_id: string;
    student_name: string;
    student_no: string;
    record_id: string | null;
    status: AttendanceStatus | null;
    late_minutes: number | null;
    justification: string | null;
}>>;
export declare function getStudentAttendanceHistory(studentId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}): Promise<AttendanceRecordWithDetails[]>;
export declare function canModifyAttendance(userId: string, userRole: string, sessionId: string): Promise<boolean>;
export declare function isTeacherOwnerOfSession(teacherId: string, sessionId: string): Promise<boolean>;
export declare function isStaffManagerOfSession(staffId: string, sessionId: string): Promise<boolean>;
export declare function deleteAttendanceRecord(recordId: string): Promise<void>;
export declare function getStudentAttendanceStats(studentId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    remote: number;
    excluded: number;
    attendance_rate: number;
}>;
//# sourceMappingURL=attendance.model.d.ts.map