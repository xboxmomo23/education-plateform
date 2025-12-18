export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'excluded' | 'remote';
export interface AttendanceSession {
    id: string;
    instance_id: string;
    class_id: string;
    course_id: string;
    teacher_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    status: 'open' | 'closed' | 'validated';
    notes: string | null;
    establishment_id: string;
    created_at: string;
    created_by: string | null;
    closed_at: string | null;
    closed_by: string | null;
}
export interface AttendanceSessionWithDetails extends AttendanceSession {
    class_label: string;
    subject_name: string;
    subject_code: string;
    subject_color: string;
    teacher_name: string;
    room: string | null;
    day_of_week: number;
    week_start_date: string;
    total_students: number;
    present_count: number;
    absent_count: number;
    late_count: number;
}
export interface AttendanceRecord {
    id: string;
    session_id: string;
    student_id: string;
    status: AttendanceStatus;
    comment: string | null;
    late_minutes: number | null;
    justified: boolean;
    justification: string | null;
    justified_by: string | null;
    justified_at: string | null;
    created_at: string;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
}
export interface AttendanceRecordWithStudent extends AttendanceRecord {
    student_name: string;
    student_email: string;
    student_number: string | null;
}
export interface StudentForAttendance {
    user_id: string;
    full_name: string;
    email: string;
    student_number: string | null;
    status: AttendanceStatus | null;
    comment: string | null;
    late_minutes: number | null;
    record_id: string | null;
}
export interface TeacherWeekCourse {
    instance_id: string;
    session_id: string | null;
    class_id: string;
    class_label: string;
    course_id: string;
    subject_name: string;
    subject_code: string;
    subject_color: string;
    day_of_week: number;
    session_date: string;
    start_time: string;
    end_time: string;
    room: string | null;
    has_session: boolean;
    status: 'open' | 'closed' | 'validated' | null;
    present_count: number;
    absent_count: number;
    late_count: number;
    total_students: number;
}
export declare const AttendanceModel: {
    /**
     * Récupérer les cours d'un professeur pour une semaine (avec statut présence)
     */
    getTeacherWeekCourses(teacherId: string, weekStartDate: string, establishmentId?: string): Promise<TeacherWeekCourse[]>;
    /**
     * Récupérer ou créer une session pour une instance
     */
    getOrCreateSession(instanceId: string, userId: string): Promise<AttendanceSessionWithDetails>;
    /**
     * Récupérer une session par ID avec détails
     */
    getSessionById(sessionId: string): Promise<AttendanceSessionWithDetails>;
    /**
     * Récupérer une session par instance_id
     */
    getSessionByInstanceId(instanceId: string): Promise<AttendanceSessionWithDetails | null>;
    /**
     * Récupérer les absences/retards récents d'un professeur
     */
    getRecentTeacherAbsences(teacherId: string, options: {
        date: string;
        days: number;
        limit: number;
    }): Promise<any[]>;
    /**
     * Fermer une session
     */
    closeSession(sessionId: string, userId: string): Promise<AttendanceSession>;
    /**
     * Récupérer tous les élèves d'une session avec leur statut
     */
    getSessionStudents(sessionId: string): Promise<StudentForAttendance[]>;
    /**
     * Marquer la présence d'un élève
     */
    markAttendance(sessionId: string, studentId: string, status: AttendanceStatus, userId: string, options?: {
        comment?: string;
        lateMinutes?: number;
    }): Promise<AttendanceRecord>;
    /**
     * Marquer plusieurs élèves en masse
     */
    bulkMarkAttendance(sessionId: string, records: Array<{
        studentId: string;
        status: AttendanceStatus;
        comment?: string;
        lateMinutes?: number;
    }>, userId: string): Promise<AttendanceRecord[]>;
    /**
     * Récupérer l'historique de présence d'un élève
     */
    getStudentAttendanceHistory(studentId: string, options?: {
        startDate?: string;
        endDate?: string;
        courseId?: string;
        limit?: number;
    }): Promise<Array<AttendanceRecord & {
        session_date: string;
        subject_name: string;
        subject_color: string;
        class_label: string;
        start_time: string;
        end_time: string;
    }>>;
    /**
     * Obtenir l'état des sessions pour une série d'instances
     */
    getSessionsStatusByInstanceIds(teacherId: string, instanceIds: string[]): Promise<Array<{
        instance_id: string;
        session_id: string | null;
        session_status: string | null;
        has_attendance: boolean;
    }>>;
    /**
     * Récupérer les statistiques de présence d'un élève
     */
    getStudentAttendanceStats(studentId: string, options?: {
        startDate?: string;
        endDate?: string;
        courseId?: string;
    }): Promise<{
        total: number;
        present: number;
        absent: number;
        late: number;
        excused: number;
        rate: number;
    }>;
    /**
     * Vérifier si un utilisateur peut accéder à une session
     */
    canAccessSession(userId: string, role: string, sessionId: string): Promise<boolean>;
    /**
     * Vérifier si un utilisateur peut accéder à une instance
     */
    canAccessInstance(userId: string, role: string, instanceId: string): Promise<boolean>;
};
//# sourceMappingURL=attendance.model.d.ts.map