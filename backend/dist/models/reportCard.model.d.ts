export interface ReportCard {
    id: string;
    studentId: string;
    termId: string;
    establishmentId: string;
    councilAppreciation: string | null;
    councilAppreciationBy: string | null;
    councilAppreciationAt: Date | null;
    validatedAt: Date | null;
    validatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface SubjectAppreciation {
    id: string;
    studentId: string;
    termId: string;
    courseId: string;
    teacherId: string;
    appreciation: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare function findReportCard(studentId: string, termId: string, establishmentId?: string): Promise<ReportCard | null>;
export declare function createOrUpdateReportCard(studentId: string, termId: string, establishmentId: string): Promise<ReportCard>;
export declare function validateReportCard(studentId: string, termId: string, validatedBy: string, establishmentId: string): Promise<ReportCard>;
export declare function unvalidateReportCard(studentId: string, termId: string): Promise<ReportCard | null>;
export declare function setCouncilAppreciation(studentId: string, termId: string, appreciation: string, appreciationBy: string, establishmentId: string): Promise<ReportCard>;
export declare function getClassReportCards(classId: string, termId: string, establishmentId: string): Promise<any[]>;
export declare function findSubjectAppreciation(studentId: string, termId: string, courseId: string): Promise<SubjectAppreciation | null>;
export declare function setSubjectAppreciation(studentId: string, termId: string, courseId: string, teacherId: string, appreciation: string): Promise<SubjectAppreciation>;
export declare function getStudentAppreciations(studentId: string, termId: string): Promise<any[]>;
export declare function deleteSubjectAppreciation(studentId: string, termId: string, courseId: string): Promise<boolean>;
//# sourceMappingURL=reportCard.model.d.ts.map