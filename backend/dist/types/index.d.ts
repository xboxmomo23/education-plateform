export type UserRole = 'student' | 'teacher' | 'staff' | 'admin' | 'parent';
export type EvaluationType = 'controle' | 'devoir' | 'participation' | 'examen';
export type AssignmentStatus = 'draft' | 'published' | 'archived';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excluded';
export type TimetableStatus = 'confirmed' | 'cancelled' | 'changed';
export type WeekType = 'A' | 'B';
export type ClassLevel = '6eme' | '5eme' | '4eme' | '3eme' | 'seconde' | 'premiere' | 'terminale';
export interface User {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    full_name: string;
    establishment_id: string | null;
    active: boolean;
    email_verified: boolean;
    last_login: Date | null;
    failed_login_attempts: number;
    account_locked_until: Date | null;
    password_changed_at: Date;
    verification_token: string | null;
    reset_token: string | null;
    reset_token_expires: Date | null;
    created_at: Date;
    updated_at: Date | null;
    deleted_at: Date | null;
}
export interface UserSession {
    id: string;
    user_id: string;
    token_hash: string;
    device_info: string | null;
    ip_address: string | null;
    expires_at: Date;
    created_at: Date;
    last_activity: Date;
}
export interface StudentProfile {
    user_id: string;
    student_no: string | null;
    birthdate: Date | null;
    address: string | null;
    phone: string | null;
    emergency_contact: string | null;
    medical_notes: string | null;
    photo_url: string | null;
}
export interface TeacherProfile {
    user_id: string;
    employee_no: string | null;
    hire_date: Date | null;
    specialization: string | null;
    phone: string | null;
    office_room: string | null;
}
export interface StaffProfile {
    user_id: string;
    phone?: string;
    address?: string;
    office_room?: string;
    relation_type?: string;
    is_primary_contact?: boolean;
    can_view_grades?: boolean;
    can_view_attendance?: boolean;
    emergency_contact?: string;
    department?: string;
    employee_no?: string;
    hire_date?: string;
    created_at?: string;
}
/** ✅ Compat: tout ancien "ResponsableProfile" = StaffProfile */
export type ResponsableProfile = StaffProfile;
/** (facultatif mais pratique) */
export type AnyProfile = StudentProfile | TeacherProfile | StaffProfile;
export type UserWithProfile = {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    profile?: StudentProfile | TeacherProfile | StaffProfile;
};
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
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    success: boolean;
    token: string;
    refreshToken?: string;
    user: {
        id: string;
        email: string;
        role: UserRole;
        full_name: string;
        profile?: StudentProfile | TeacherProfile | StaffProfile;
    };
}
export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    profile_data?: any;
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}
export interface ResetPasswordRequest {
    email: string;
}
export interface ResetPasswordConfirmRequest {
    token: string;
    newPassword: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: ValidationError[];
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}
//# sourceMappingURL=index.d.ts.map