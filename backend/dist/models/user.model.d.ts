import { User, UserRole, StudentProfile, TeacherProfile, StaffProfile } from '../types';
export interface UserFilters {
    id?: string;
    email?: string;
    role?: UserRole;
    active?: boolean;
    includeDeleted?: boolean;
    establishmentId?: string;
}
export interface CreateUserData {
    email: string;
    password: string;
    role: UserRole;
    full_name: string;
    establishmentId?: string;
}
export declare function createUser(userData: CreateUserData): Promise<User>;
export declare function createStudentProfile(userId: string, profileData: Partial<StudentProfile>): Promise<StudentProfile>;
export declare function createTeacherProfile(userId: string, profileData: Partial<TeacherProfile>): Promise<TeacherProfile>;
export declare function createStaffProfile(userId: string, profileData: Partial<StaffProfile>): Promise<StaffProfile>;
export declare function createParentProfile(userId: string, profileData: Partial<StaffProfile>): Promise<StaffProfile>;
/**
 * Trouve des utilisateurs avec filtres extensibles
 * Future-proof pour multi-tenant
 */
export declare function findUsers(filters?: UserFilters): Promise<User[]>;
/**
 * Trouve un utilisateur par email
 * Wrapper pour compatibilité avec l'ancien code
 */
export declare function findUserByEmail(email: string, establishmentId?: string): Promise<User | null>;
/**
 * Trouve un utilisateur par ID
 */
export declare function findUserById(id: string, establishmentId?: string): Promise<User | null>;
/**
 * Récupère un utilisateur avec son profil
 */
export declare function getUserWithProfile(userId: string, role: UserRole, establishmentId?: string): Promise<{
    user: User;
    profile: StudentProfile | TeacherProfile | StaffProfile | null;
} | null>;
export declare function getStudentProfile(userId: string): Promise<StudentProfile | null>;
export declare function getTeacherProfile(userId: string): Promise<TeacherProfile | null>;
export declare function getParentProfile(userId: string): Promise<StaffProfile | null>;
export declare function getResponsableProfile(userId: string): Promise<StaffProfile | null>;
export declare function updateLastLogin(userId: string): Promise<void>;
export declare function incrementFailedAttempts(userId: string): Promise<number>;
export declare function lockAccount(userId: string, durationMinutes?: number): Promise<void>;
export declare function isAccountLocked(userId: string): Promise<boolean>;
export declare function updatePassword(userId: string, newPassword: string): Promise<void>;
export declare function activateUser(userId: string): Promise<void>;
export declare function deactivateUser(userId: string): Promise<void>;
//# sourceMappingURL=user.model.d.ts.map