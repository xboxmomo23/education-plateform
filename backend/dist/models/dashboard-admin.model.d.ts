export interface AdminDashboardKpis {
    students_active: number;
    teachers_active: number;
    staff_active: number;
    parents_active: number;
    absences_today_total: number;
    absences_today_not_justified: number;
    date: string;
}
export interface AdminPerformanceOptions {
    termId?: string | null;
    classId?: string | null;
}
export interface AdminPerformanceData {
    establishment: {
        avg: number;
        studentCount: number;
        passRate: number;
    };
    distribution: {
        lt10: number;
        b10_12: number;
        b12_14: number;
        b14_16: number;
        gte16: number;
    };
    classes: Array<{
        class_id: string;
        class_label: string;
        student_count: number;
        avg: number;
        passRate: number;
    }>;
    topStudents: Array<{
        student_id: string;
        full_name: string;
        class_label: string;
        avg: number;
    }>;
}
export declare function getAdminKpis(establishmentId: string, date: string): Promise<AdminDashboardKpis>;
export declare function getAdminPerformanceMetrics(establishmentId: string, options: AdminPerformanceOptions): Promise<AdminPerformanceData>;
//# sourceMappingURL=dashboard-admin.model.d.ts.map