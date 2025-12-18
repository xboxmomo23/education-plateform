export interface StaffClassInfo {
    class_id: string;
    class_label: string;
    level: string | null;
    students_count: number;
}
export interface StaffClassAttendanceStats {
    class_id: string;
    absent_count: number;
    late_count: number;
    not_justified_count: number;
}
export interface StaffPendingAbsence {
    id: string;
    student_id: string;
    student_name: string;
    student_number: string | null;
    class_id: string;
    class_label: string;
    status: 'absent' | 'late';
    session_date: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    subject_color: string | null;
    justified: boolean;
    late_minutes: number | null;
}
export interface StaffAbsenceHistoryFilters {
    q?: string;
    classId?: string;
    status?: 'absent' | 'late' | 'excused' | 'all';
    justified?: 'true' | 'false' | 'all';
    from?: string;
    to?: string;
    sort?: 'date_desc' | 'date_asc' | 'student_asc' | 'class_asc';
}
export interface StaffAbsenceHistoryItem {
    id: string;
    student_id: string;
    student_name: string;
    student_number: string | null;
    class_id: string;
    class_label: string;
    status: 'absent' | 'late' | 'excused';
    justified: boolean;
    session_date: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    subject_color: string | null;
    teacher_name: string | null;
    comment: string | null;
    justification: string | null;
    justified_at: string | null;
    created_at: string;
    updated_at: string | null;
    late_minutes: number | null;
    school_year: string;
}
export declare const DashboardStaffModel: {
    getAccessibleClasses(establishmentId: string, assignedClassIds?: string[] | null): Promise<StaffClassInfo[]>;
    getClassAttendanceStats(establishmentId: string, classIds: string[], date: string): Promise<StaffClassAttendanceStats[]>;
    getPendingAbsences(establishmentId: string, classIds: string[], date: string, limit: number): Promise<StaffPendingAbsence[]>;
    getAbsenceHistory(establishmentId: string, assignedClassIds: string[] | undefined, filters: StaffAbsenceHistoryFilters, page: number, limit: number): Promise<{
        items: StaffAbsenceHistoryItem[];
        total: number;
    }>;
    getAbsencesForExport(establishmentId: string, assignedClassIds: string[] | undefined, filters: StaffAbsenceHistoryFilters, maxRows?: number): Promise<StaffAbsenceHistoryItem[]>;
};
//# sourceMappingURL=dashboard-staff.model.d.ts.map