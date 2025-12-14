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
    contactEmailOverride?: string | null;
}
type ParentChildrenOptions = {
    includeInactive?: boolean;
    includePendingActivation?: boolean;
};
export declare function getChildrenForParent(parentId: string, options?: ParentChildrenOptions): Promise<ParentChildSummary[]>;
export declare function assertParentCanAccessStudent(parentId: string, studentId: string, options?: ParentAccessOptions): Promise<void>;
export declare function syncParentsForStudent(params: {
    studentId: string;
    establishmentId: string;
    parents: ParentForStudentInput[];
}): Promise<SyncParentsResult[]>;
export declare function linkExistingParentToStudent(params: {
    studentId: string;
    parentId: string;
    relationType?: string | null;
    isPrimary?: boolean;
    receiveNotifications?: boolean;
    canViewGrades?: boolean;
    canViewAttendance?: boolean;
    contactEmail?: string | null;
}): Promise<void>;
export declare function recomputeParentActiveStatus(parentId: string): Promise<{
    activeChildren: number;
    deactivated: boolean;
}>;
export {};
//# sourceMappingURL=parent.model.d.ts.map