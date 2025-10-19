import { UserRole } from '../types';
export interface Grade {
    id: string;
    evaluation_id: string;
    student_id: string;
    value: number | null;
    absent: boolean;
    normalized_value: number | null;
    comment: string | null;
    created_by: string;
    created_at: Date;
    updated_at: Date | null;
}
export interface CreateGradeData {
    evaluationId: string;
    studentId: string;
    value?: number;
    absent?: boolean;
    comment?: string;
    createdBy: string;
}
export interface UpdateGradeData {
    value?: number;
    absent?: boolean;
    comment?: string;
}
export interface GradeFilters {
    id?: string;
    evaluationId?: string;
    studentId?: string;
    courseId?: string;
    termId?: string;
    classId?: string;
    includeAbsent?: boolean;
    establishmentId?: string;
}
export interface GradeWithDetails {
    id: string;
    evaluation_id: string;
    student_id: string;
    value: number | null;
    absent: boolean;
    normalized_value: number | null;
    comment: string | null;
    created_by: string;
    created_at: Date;
    updated_at: Date | null;
    student_name?: string;
    student_email?: string;
    student_no?: string;
    evaluation_title?: string;
    evaluation_type?: string;
    evaluation_coefficient?: number;
    evaluation_max_scale?: number;
    evaluation_date?: Date;
    evaluation_description?: string;
    course_id?: string;
    course_subject_name?: string;
    subject_name?: string;
    subject_code?: string;
    course_class_label?: string;
    class_label?: string;
    class_code?: string;
    created_by_name?: string;
    created_by_role?: string;
}
export interface GradeHistory {
    id: string;
    grade_id: string;
    changed_by: string;
    role: UserRole;
    changed_at: Date;
    changes: Record<string, any>;
}
export interface StudentAverage {
    student_id: string;
    student_name: string;
    subject_id?: string;
    subject_name?: string;
    average: number;
    weighted_average: number;
    grades_count: number;
}
/**
 * Crée une seule note
 */
export declare function createGrade(data: CreateGradeData): Promise<Grade>;
/**
 * Crée plusieurs notes en batch
 */
export declare function createGrades(grades: CreateGradeData[]): Promise<Grade[]>;
/**
 * Trouve des notes avec filtres
 */
export declare function findGrades(filters?: GradeFilters): Promise<GradeWithDetails[]>;
/**
 * Trouve une note par ID
 */
export declare function findGradeById(id: string): Promise<GradeWithDetails | null>;
/**
 * Trouve les notes d'un étudiant
 */
export declare function findStudentGrades(studentId: string, filters?: Partial<GradeFilters>): Promise<GradeWithDetails[]>;
/**
 * Trouve les notes d'une évaluation
 */
export declare function findEvaluationGrades(evaluationId: string, includeAbsent?: boolean): Promise<GradeWithDetails[]>;
/**
 * Récupère une note par son ID avec tous les détails nécessaires pour l'édition
 * Utilisé par l'endpoint GET /api/grades/:id
 */
export declare function findGradeByIdWithDetails(gradeId: string, establishmentId?: string): Promise<GradeWithDetails | null>;
/**
 * Met à jour une note avec historique
 */
export declare function updateGrade(id: string, data: UpdateGradeData, updatedBy: string, updatedByRole: UserRole): Promise<Grade | null>;
/**
 * Supprime une note
 */
export declare function deleteGrade(id: string): Promise<boolean>;
/**
 * Récupère l'historique d'une note
 */
export declare function getGradeHistory(gradeId: string): Promise<GradeHistory[]>;
/**
 * Calcule les moyennes d'un étudiant
 */
export declare function getStudentAverages(studentId: string, termId?: string, establishmentId?: string): Promise<StudentAverage[]>;
/**
 * Calcule la moyenne générale d'un étudiant
 */
export declare function getStudentOverallAverage(studentId: string, termId?: string, establishmentId?: string): Promise<number>;
/**
 * Calcule les moyennes d'une classe
 */
export declare function getClassAverages(classId: string, termId?: string, establishmentId?: string): Promise<{
    class_id: string;
    class_label: string;
    subject_id: string;
    subject_name: string;
    average: number;
    min: number;
    max: number;
    students_count: number;
}[]>;
/**
 * Récupère les notes des enfants d'un responsable
 */
export declare function getChildrenGrades(responsableId: string, filters?: Partial<GradeFilters>): Promise<GradeWithDetails[]>;
//# sourceMappingURL=grade.model.d.ts.map