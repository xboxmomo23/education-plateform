import { ParentChildSummary, ParentForStudentInput } from '../types';
export interface ParentAccessOptions {
    requireCanViewGrades?: boolean;
    requireCanViewAttendance?: boolean;
}
export interface SyncParentsResult {
    parentUserId: string;
    full_name: string;
    email: string | null;
    isNewUser: boolean;
}
export declare function getChildrenForParent(parentId: string): Promise<ParentChildSummary[]>;
export declare function assertParentCanAccessStudent(parentId: string, studentId: string, options?: ParentAccessOptions): Promise<void>;
export declare function syncParentsForStudent(params: {
    studentId: string;
    establishmentId: string;
    parents: ParentForStudentInput[];
}): Promise<SyncParentsResult[]>;
//# sourceMappingURL=parent.model.d.ts.map