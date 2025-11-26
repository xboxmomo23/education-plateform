export interface TimetableInstance {
    id: string;
    class_id: string;
    course_id: string;
    week_start_date: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room: string | null;
    notes: string | null;
    status: string;
    created_from_template: boolean;
    template_entry_id: string | null;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface TimetableInstanceWithDetails extends TimetableInstance {
    subject_name: string;
    subject_code: string;
    subject_color: string;
    teacher_name: string;
    teacher_id: string;
    class_label: string;
}
export interface CreateInstanceData {
    class_id: string;
    course_id: string;
    week_start_date: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
    notes?: string;
    created_from_template?: boolean;
    template_entry_id?: string;
    created_by: string;
}
export declare const TimetableInstanceModel: {
    /**
     * Créer une instance
     */
    create(data: CreateInstanceData): Promise<TimetableInstance>;
    /**
     * Récupérer les instances d'une semaine pour une classe
     */
    getInstancesForWeek(classId: string, weekStartDate: string): Promise<TimetableInstanceWithDetails[]>;
    /**
     * Récupérer une instance par ID
     */
    getById(instanceId: string): Promise<TimetableInstanceWithDetails | null>;
    /**
     * Mettre à jour une instance
     */
    update(instanceId: string, data: Partial<CreateInstanceData>): Promise<TimetableInstance>;
    /**
     * Supprimer une instance
     */
    delete(instanceId: string): Promise<void>;
    /**
     * Générer les instances depuis le template
     */
    generateFromTemplate(classId: string, weekStartDate: string, createdBy: string): Promise<number>;
    /**
     * Copier une semaine vers une autre
     */
    copyWeek(classId: string, sourceWeek: string, targetWeek: string, createdBy: string): Promise<number>;
    /**
     * Vérifier les conflits
     */
    checkConflict(classId: string, weekStartDate: string, dayOfWeek: number, startTime: string, endTime: string, room: string, excludeId?: string): Promise<{
        hasConflict: boolean;
        conflictDetails?: any;
    }>;
};
//# sourceMappingURL=timetable-instance.model.d.ts.map