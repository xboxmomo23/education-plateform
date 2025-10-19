import { EvaluationType } from '../types';
export interface Evaluation {
    id: string;
    course_id: string;
    term_id: string | null;
    title: string;
    type: EvaluationType;
    coefficient: number;
    max_scale: number;
    eval_date: Date;
    description: string | null;
    created_by: string;
    created_at: Date;
    establishment_id: string | null;
}
export interface CreateEvaluationData {
    courseId: string;
    termId?: string;
    title: string;
    type: EvaluationType;
    coefficient: number;
    maxScale?: number;
    evalDate: Date;
    description?: string;
    createdBy: string;
    establishmentId?: string;
}
export interface UpdateEvaluationData {
    title?: string;
    type?: EvaluationType;
    coefficient?: number;
    maxScale?: number;
    evalDate?: Date;
    description?: string;
}
export interface EvaluationFilters {
    id?: string;
    courseId?: string;
    termId?: string;
    teacherId?: string;
    type?: EvaluationType;
    startDate?: Date;
    endDate?: Date;
    establishmentId?: string;
}
export interface EvaluationWithDetails extends Evaluation {
    course_subject_name?: string;
    course_class_label?: string;
    teacher_name?: string;
    grades_count?: number;
    average_grade?: number;
}
/**
 * Crée une nouvelle évaluation
 */
export declare function createEvaluation(data: CreateEvaluationData): Promise<Evaluation>;
/**
 * Trouve des évaluations avec filtres
 */
export declare function findEvaluations(filters?: EvaluationFilters): Promise<EvaluationWithDetails[]>;
/**
 * Trouve une évaluation par ID avec détails
 */
export declare function findEvaluationById(id: string, establishmentId?: string): Promise<EvaluationWithDetails | null>;
/**
 * Trouve les évaluations d'un professeur
 */
export declare function findTeacherEvaluations(teacherId: string, filters?: Partial<EvaluationFilters>): Promise<EvaluationWithDetails[]>;
/**
 * Trouve les évaluations d'un cours
 */
export declare function findCourseEvaluations(courseId: string, establishmentId?: string): Promise<Evaluation[]>;
/**
 * Met à jour une évaluation
 */
export declare function updateEvaluation(id: string, data: UpdateEvaluationData, establishmentId?: string): Promise<Evaluation | null>;
/**
 * Supprime une évaluation (et ses notes en cascade)
 */
export declare function deleteEvaluation(id: string, establishmentId?: string): Promise<boolean>;
/**
 * Récupère les statistiques d'une évaluation
 */
export declare function getEvaluationStats(evaluationId: string, establishmentId?: string): Promise<{
    total: number;
    completed: number;
    average: number;
    min: number;
    max: number;
    absent: number;
} | null>;
/**
 * Vérifie si un professeur peut modifier une évaluation
 */
export declare function canTeacherModifyEvaluation(evaluationId: string, teacherId: string, establishmentId?: string): Promise<boolean>;
//# sourceMappingURL=evaluation.model.d.ts.map