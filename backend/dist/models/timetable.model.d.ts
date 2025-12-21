/**
 * Instance de cours (mode DYNAMIC)
 * Une instance = un cours à une date/heure spécifique pour une semaine donnée
 */
export interface TimetableInstance {
    id: string;
    course_id: string;
    class_id: string;
    week_start_date: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room: string | null;
    notes: string | null;
    created_from_template: boolean;
    template_entry_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    subject_name?: string;
    subject_code?: string;
    subject_color?: string;
    teacher_name?: string;
    teacher_id?: string;
    class_label?: string;
}
/**
 * Template de cours (pour génération rapide)
 * Un template = modèle réutilisable pour créer des instances
 */
export interface TimetableEntry {
    id: string;
    course_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    week: 'A' | 'B' | null;
    room: string | null;
    status: 'confirmed' | 'cancelled' | 'changed';
    valid_from: string;
    valid_to: string | null;
    notes: string | null;
    course_title?: string;
    subject_name?: string;
    subject_code?: string;
    subject_color?: string;
    class_label?: string;
    class_id?: string;
    teacher_name?: string;
    teacher_id?: string;
}
export interface CreateTimetableInstanceData {
    course_id: string;
    class_id: string;
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
export interface CreateTimetableEntryData {
    course_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    week?: 'A' | 'B' | null;
    room?: string;
    status?: 'confirmed' | 'cancelled' | 'changed';
    valid_from?: string;
    valid_to?: string;
    notes?: string;
}
export interface ConflictCheck {
    hasConflict: boolean;
    conflictType?: 'teacher' | 'room';
    conflictDetails?: any;
}
export declare const TimetableInstanceModel: {
    /**
     * Récupérer les instances pour une classe et une semaine
     */
    getInstancesForWeek(classId: string, weekStartDate: string): Promise<TimetableInstance[]>;
    /**
     * Récupérer les instances pour un professeur et une semaine
     */
    getInstancesForTeacher(teacherId: string, weekStartDate: string): Promise<TimetableInstance[]>;
    /**
     * Créer une instance
     */
    createInstance(data: CreateTimetableInstanceData): Promise<TimetableInstance>;
    /**
     * Créer plusieurs instances en masse
     */
    bulkCreateInstances(instances: CreateTimetableInstanceData[]): Promise<TimetableInstance[]>;
    /**
     * Mettre à jour une instance
     */
    updateInstance(instanceId: string, data: Partial<CreateTimetableInstanceData>): Promise<TimetableInstance>;
    /**
     * Supprimer une instance
     */
    deleteInstance(instanceId: string): Promise<TimetableInstance>;
    /**
     * Copier les instances d'une semaine vers une autre
     */
    copyWeekToWeek(classId: string, sourceWeekStart: string, targetWeekStart: string, userId: string): Promise<TimetableInstance[]>;
};
export declare const TimetableModel: {
    /**
     * Récupérer les templates pour une classe
     */
    getEntriesByClass(classId: string, week?: "A" | "B"): Promise<TimetableEntry[]>;
    /**
     * Récupérer les templates d'une journée (toutes classes) pour génération auto
     */
    getEntriesByDayOfWeek(dayOfWeek: number, week?: "A" | "B"): Promise<TimetableEntry[]>;
    /**
     * Créer un template
     */
    createEntry(data: CreateTimetableEntryData): Promise<TimetableEntry>;
    /**
     * Créer plusieurs templates en masse
     */
    bulkCreateEntries(entries: CreateTimetableEntryData[]): Promise<TimetableEntry[]>;
    /**
     * Mettre à jour un template
     */
    updateEntry(entryId: string, data: Partial<CreateTimetableEntryData>): Promise<TimetableEntry>;
    /**
     * Supprimer un template
     */
    deleteEntry(entryId: string): Promise<TimetableEntry>;
    /**
     * Récupérer tous les cours disponibles pour une classe
     */
    getAvailableCoursesForClass(classId: string): Promise<any[]>;
    /**
     * Vérifier les conflits de salle
     */
    checkRoomConflict(classId: string, weekStartDate: string, dayOfWeek: number, startTime: string, endTime: string, room: string, excludeInstanceId?: string): Promise<ConflictCheck>;
    /**
     * Vérifier les conflits de professeur
     */
    checkTeacherConflict(teacherId: string, weekStartDate: string, dayOfWeek: number, startTime: string, endTime: string, excludeInstanceId?: string): Promise<ConflictCheck>;
};
//# sourceMappingURL=timetable.model.d.ts.map