export interface TimetableOverride {
    id: string;
    template_entry_id: string;
    override_date: string;
    override_type: 'cancel' | 'modify_time' | 'modify_room' | 'replace_course' | 'replace_teacher';
    new_start_time?: string;
    new_end_time?: string;
    new_room?: string;
    new_course_id?: string;
    replacement_teacher_id?: string;
    replacement_subject?: string;
    reason?: string;
    notes?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface TimetableOverrideWithDetails extends TimetableOverride {
    template_subject_name?: string;
    template_teacher_name?: string;
    template_start_time?: string;
    template_end_time?: string;
    replacement_teacher_name?: string;
    replacement_subject_name?: string;
}
export interface CreateOverrideData {
    template_entry_id: string;
    override_date: string;
    override_type: 'cancel' | 'modify_time' | 'modify_room' | 'replace_course' | 'replace_teacher';
    new_start_time?: string;
    new_end_time?: string;
    new_room?: string;
    new_course_id?: string;
    replacement_teacher_id?: string;
    replacement_subject?: string;
    reason?: string;
    notes?: string;
    created_by: string;
}
export declare const TimetableOverrideModel: {
    /**
     * Créer une exception
     */
    create(data: CreateOverrideData): Promise<TimetableOverride>;
    /**
     * Récupérer les overrides d'une semaine pour une classe
     */
    getOverridesForWeek(classId: string, weekStartDate: string): Promise<TimetableOverrideWithDetails[]>;
    /**
     * Récupérer un override par ID
     */
    getById(overrideId: string): Promise<TimetableOverrideWithDetails | null>;
    /**
     * Mettre à jour un override
     */
    update(overrideId: string, data: Partial<CreateOverrideData>): Promise<TimetableOverride>;
    /**
     * Supprimer un override
     */
    delete(overrideId: string): Promise<void>;
    /**
     * Vérifier si un override existe pour un créneau et une date
     */
    existsForEntryAndDate(templateEntryId: string, overrideDate: string): Promise<boolean>;
};
//# sourceMappingURL=timetable-override.model.d.ts.map