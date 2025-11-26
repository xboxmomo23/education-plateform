export interface CourseTemplate {
    id: string;
    course_id: string;
    default_duration: number;
    default_room: string | null;
    display_order: number;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface CourseTemplateWithDetails extends CourseTemplate {
    subject_name: string;
    subject_code: string;
    subject_color: string;
    teacher_name: string;
    class_label: string;
    class_id: string;
}
export interface CreateTemplateData {
    course_id: string;
    default_duration?: number;
    default_room?: string;
    display_order?: number;
    created_by: string;
}
export interface UpdateTemplateData {
    default_duration?: number;
    default_room?: string;
    display_order?: number;
}
export declare const CourseTemplateModel: {
    /**
     * Récupérer les templates d'une classe (via les cours)
     */
    getTemplatesByClass(classId: string): Promise<CourseTemplateWithDetails[]>;
    /**
     * Créer un nouveau template
     */
    create(data: CreateTemplateData): Promise<CourseTemplate>;
    /**
     * Récupérer un template par ID
     */
    getById(templateId: string): Promise<CourseTemplateWithDetails | null>;
    /**
     * Mettre à jour un template
     */
    update(templateId: string, data: UpdateTemplateData): Promise<CourseTemplate>;
    /**
     * Supprimer un template
     */
    delete(templateId: string): Promise<void>;
    /**
     * Vérifier si un template existe pour un cours
     */
    existsForCourse(courseId: string): Promise<boolean>;
};
//# sourceMappingURL=course-template.model.d.ts.map