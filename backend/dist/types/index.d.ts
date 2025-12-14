export type UserRole = 'student' | 'teacher' | 'staff' | 'admin' | 'parent' | "super_admin";
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    full_name: string;
}
export interface DecodedToken extends JWTPayload {
    iat: number;
    exp: number;
}
export interface UserSession {
    id: string;
    user_id: string;
    token_hash: string;
    device_info?: string;
    ip_address?: string;
    created_at: Date;
    expires_at: Date;
    last_activity?: Date;
    revoked: boolean;
}
export interface LoginResponse {
    success: boolean;
    token: string;
    refreshToken?: string;
    requiresPasswordChange?: boolean;
    user: {
        id: string;
        email: string;
        role: UserRole;
        full_name: string;
        profile?: any;
        must_change_password?: boolean;
    };
    children?: ParentChildSummary[];
    error?: string;
    locked_until?: Date;
    remaining_attempts?: number;
}
export interface RegisterRequest {
    email: string;
    password?: string;
    full_name: string;
    role: UserRole;
    profile_data?: {
        student_no?: string;
        birthdate?: Date;
        address?: string;
        phone?: string;
        emergency_contact?: string;
        medical_notes?: string;
        photo_url?: string;
        employee_no?: string;
        hire_date?: Date;
        specialization?: string;
        office_room?: string;
        department?: string;
        relation_type?: string;
        is_primary_contact?: boolean;
        can_view_grades?: boolean;
        can_view_attendance?: boolean;
        emergency_contact?: boolean;
    };
}
export interface User {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    full_name: string;
    active: boolean;
    email_verified: boolean;
    last_login?: Date;
    failed_login_attempts: number;
    must_change_password: boolean;
    account_locked_until?: Date;
    password_changed_at?: Date;
    created_at: Date;
    updated_at?: Date;
    deleted_at?: Date;
    establishment_id?: string | null;
}
export interface StudentProfile {
    user_id: string;
    student_no?: string;
    birthdate?: Date;
    address?: string;
    phone?: string;
    emergency_contact?: string;
    medical_notes?: string;
    photo_url?: string;
    contact_email?: string;
}
export interface TeacherProfile {
    user_id: string;
    employee_no?: string;
    hire_date?: Date;
    specialization?: string;
    phone?: string;
    office_room?: string;
    contact_email?: string;
    assigned_class_ids?: string[] | null;
}
export interface StaffProfile {
    user_id: string;
    employee_no?: string;
    phone?: string;
    office_room?: string;
    department?: string;
    hire_date?: Date;
    created_at?: Date;
    contact_email?: string;
    assigned_class_ids?: string[] | null;
}
export interface StudentClassChange {
    id: string;
    student_id: string;
    old_class_id?: string | null;
    new_class_id: string;
    effective_term_id: string;
    establishment_id: string;
    created_at: Date;
    created_by: string;
    applied_at?: Date | null;
    applied_by?: string | null;
    reason?: string | null;
}
export interface ParentProfile {
    user_id: string;
    phone: string;
    address?: string;
    relation_type?: string;
    is_primary_contact?: boolean;
    can_view_grades?: boolean;
    can_view_attendance?: boolean;
    emergency_contact?: boolean;
    created_at?: Date;
    contact_email?: string | null;
}
export interface ParentChildSummary {
    id: string;
    full_name: string;
    email?: string | null;
    student_number?: string | null;
    class_id?: string | null;
    class_name?: string | null;
    relation_type?: string | null;
    is_primary?: boolean | null;
    can_view_grades?: boolean | null;
    can_view_attendance?: boolean | null;
    receive_notifications?: boolean | null;
}
export interface ParentForStudentInput {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    relation_type?: string;
    is_primary?: boolean;
    can_view_grades?: boolean;
    can_view_attendance?: boolean;
    receive_notifications?: boolean;
    contact_email?: string;
}
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'remote' | 'excluded';
export type TimetableStatus = 'confirmed' | 'cancelled' | 'changed';
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
export interface Establishment {
    id: string;
    name: string;
    code?: string | null;
    login_email_domain?: string | null;
}
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
export type EvaluationType = 'controle' | 'devoir' | 'participation' | 'examen';
export interface Evaluation {
    id: string;
    course_id: string;
    term_id?: string;
    title: string;
    type: EvaluationType;
    coefficient: number;
    max_scale: number;
    eval_date: Date;
    description?: string;
    created_by: string;
    created_at: Date;
    establishment_id?: string;
}
export interface Grade {
    id: string;
    evaluation_id: string;
    student_id: string;
    value?: number | null;
    absent: boolean;
    normalized_value?: number | null;
    comment?: string;
    created_by: string;
    created_at: Date;
    updated_at?: Date;
}
export interface Course {
    id: string;
    subject_id: string;
    class_id: string;
    teacher_id: string;
    academic_year: number;
    title?: string;
    active: boolean;
    created_at: Date;
    establishment_id?: string;
}
export interface Subject {
    id: string;
    code: string;
    name: string;
    description?: string;
    color?: string;
    active: boolean;
    establishment_id?: string;
}
export interface Class {
    id: string;
    code: string;
    label: string;
    academic_year: number;
    level?: string;
    capacity?: number;
    current_size?: number;
    room?: string;
    archived: boolean;
    created_at: Date;
    establishment_id?: string;
}
export interface Enrollment {
    student_id: string;
    class_id: string;
    academic_year: number;
    start_date: Date;
    end_date?: Date;
}
//# sourceMappingURL=index.d.ts.map