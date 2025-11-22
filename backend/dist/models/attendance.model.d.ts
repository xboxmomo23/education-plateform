/**
 * Récupérer les classes gérées par un staff
 */
export declare function getStaffClasses(staffId: string): Promise<any[]>;
export declare function getSessions(userId: string, role: string, date: Date): Promise<any[]>;
export declare function isTeacherOwnerOfSession(teacherId: string, sessionId: string): Promise<boolean>;
export declare function isStaffManagerOfSession(staffId: string, sessionId: string): Promise<boolean>;
export declare function getSessionDetails(sessionId: string, userId: string, role: string): Promise<any>;
export declare function getSessionById(sessionId: string): Promise<any>;
export declare function canModifyAttendance(sessionId: string, userId: string, role: string): Promise<boolean>;
export declare function upsertAttendanceRecords(sessionId: string, records: any[], recordedBy: string): Promise<any[]>;
export declare function updateAttendanceRecord(recordId: string, data: any, modifiedBy: string): Promise<any>;
export declare function getStudentAttendanceHistory(studentId: string, options: any): Promise<any[]>;
export declare function getStudentAttendanceStats(studentId: string, options: any): Promise<any>;
export declare const AttendanceModel: {
    getStaffClasses: typeof getStaffClasses;
    getSessions: typeof getSessions;
    isTeacherOwnerOfSession: typeof isTeacherOwnerOfSession;
    isStaffManagerOfSession: typeof isStaffManagerOfSession;
    getSessionDetails: typeof getSessionDetails;
    getSessionById: typeof getSessionById;
    canModifyAttendance: typeof canModifyAttendance;
    upsertAttendanceRecords: typeof upsertAttendanceRecords;
    updateAttendanceRecord: typeof updateAttendanceRecord;
    getStudentAttendanceHistory: typeof getStudentAttendanceHistory;
    getStudentAttendanceStats: typeof getStudentAttendanceStats;
};
//# sourceMappingURL=attendance.model.d.ts.map