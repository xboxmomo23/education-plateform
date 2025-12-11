export type AssignmentStatus = 'draft' | 'published' | 'archived';
/**
 * Devoir (assignment)
 */
export interface Assignment {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    due_at: string;
    status: AssignmentStatus;
    resource_url: string | null;
    max_points: number | null;
    created_by: string;
    created_at: string;
    updated_at: string | null;
    establishment_id: string | null;
    class_id?: string;
    class_label?: string;
    subject_name?: string;
    subject_code?: string;
    subject_color?: string;
    teacher_name?: string;
    teacher_id?: string;
}
export interface CreateAssignmentData {
    course_id: string;
    title: string;
    description?: string;
    due_at: string;
    status?: AssignmentStatus;
    resource_url?: string;
    max_points?: number;
    created_by: string;
    establishment_id: string;
}
export interface UpdateAssignmentData {
    title?: string;
    description?: string;
    due_at?: string;
    status?: AssignmentStatus;
    resource_url?: string;
    max_points?: number;
    course_id?: string;
}
export interface AssignmentFilters {
    courseId?: string;
    classId?: string;
    status?: AssignmentStatus;
    fromDueAt?: string;
    toDueAt?: string;
}
export declare const AssignmentModel: {
    /**
     * Récupérer les devoirs d'un enseignant avec filtres
     * Ne retourne que les devoirs :
     * - créés par ce teacherId
     * - du même establishment_id
     * - reliés à des courses.active = true
     */
    getByTeacher(teacherId: string, filters?: AssignmentFilters): Promise<Assignment[]>;
    /**
     * Récupérer un devoir par son ID
     */
    getById(assignmentId: string): Promise<Assignment | null>;
    /**
     * Créer un nouveau devoir
     * - Insère dans assignments
     * - Récupère class_id via courses
     * - Insère une entrée dans assignment_targets
     */
    create(data: CreateAssignmentData): Promise<Assignment>;
    /**
     * Mettre à jour un devoir
     * - Vérifie que le devoir appartient au teacherId
     * - Met à jour les champs modifiables
     * - Si course_id change, met à jour assignment_targets
     */
    updateByTeacher(assignmentId: string, teacherId: string, data: UpdateAssignmentData): Promise<Assignment>;
    /**
     * Récupérer les devoirs pour un élève
     * - Récupère la classe de l'élève via students/enrollments
     * - Retourne les devoirs status = 'published'
     * - Pour la classe de l'élève (via assignment_targets ou courses.class_id)
     * - Même establishment_id
     */
    getForStudent(studentId: string, filters?: {
        subjectId?: string;
        fromDueAt?: string;
        toDueAt?: string;
    }): Promise<Assignment[]>;
    /**
     * Vérifier qu'un cours appartient à un enseignant
     */
    verifyCourseOwnership(courseId: string, teacherId: string, establishmentId: string): Promise<boolean>;
    /**
     * Récupérer l'establishment_id d'un utilisateur
     */
    getUserEstablishment(userId: string): Promise<string | null>;
};
//# sourceMappingURL=assignment.model.d.ts.map