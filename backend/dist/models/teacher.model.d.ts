export interface TeacherClassSummary {
    class_id: string;
    class_label: string;
    level: string | null;
    student_count: number;
    absent_today: number;
    late_today: number;
    pending_assignments: number;
    last_session_date: string | null;
}
export declare const TeacherModel: {
    getClassesSummary(teacherId: string, establishmentId?: string): Promise<TeacherClassSummary[]>;
};
//# sourceMappingURL=teacher.model.d.ts.map