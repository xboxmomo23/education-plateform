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
export declare const TimetableModel: {
    /**
     * Récupérer les créneaux d'emploi du temps pour un cours
     */
    getEntriesByCourse(courseId: string): Promise<TimetableEntry[]>;
    /**
     * Récupérer les créneaux pour une classe
     */
    getEntriesByClass(classId: string, week?: "A" | "B"): Promise<TimetableEntry[]>;
    /**
     * Récupérer les créneaux pour un professeur
     */
    getEntriesByTeacher(teacherId: string, week?: "A" | "B"): Promise<TimetableEntry[]>;
    /**
     * Récupérer les créneaux pour un jour spécifique
     */
    getEntriesByDayOfWeek(dayOfWeek: number, week?: "A" | "B"): Promise<TimetableEntry[]>;
    /**
     * Créer un nouveau créneau
     */
    createEntry(data: CreateTimetableEntryData): Promise<TimetableEntry>;
    /**
     * Mettre à jour un créneau
     */
    updateEntry(entryId: string, data: Partial<CreateTimetableEntryData>): Promise<TimetableEntry>;
    /**
     * Supprimer un créneau
     */
    deleteEntry(entryId: string): Promise<TimetableEntry>;
    /**
     * Vérifier les conflits de salle
     */
    checkRoomConflict(dayOfWeek: number, startTime: string, endTime: string, room: string, excludeEntryId?: string): Promise<ConflictCheck>;
    /**
     * Vérifier les conflits de professeur
     */
    checkTeacherConflict(teacherId: string, dayOfWeek: number, startTime: string, endTime: string, excludeEntryId?: string): Promise<ConflictCheck>;
    /**
     * Dupliquer les créneaux d'une classe vers une autre
     */
    duplicateToClass(sourceClassId: string, targetClassId: string): Promise<any[]>;
    /**
     * Récupérer tous les cours disponibles pour une classe
     */
    getAvailableCoursesForClass(classId: string): Promise<any[]>;
};
//# sourceMappingURL=timetable.model.d.ts.map