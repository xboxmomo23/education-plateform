import { PoolClient } from "pg";
import { Request } from "express";
import { SyncParentsResult } from "../models/parent.model";
import { ParentForStudentInput } from "../types";
import { ParentInviteInfo } from "./parentInvite.service";
interface LinkedParentSummary {
    id: string;
    full_name: string;
    email: string | null;
}
export interface CreateStudentInput {
    establishmentId: string;
    establishmentName?: string | null;
    createdByUserId: string;
    actorRole?: string | null;
    actorName?: string | null;
    fullName: string;
    classId?: string | null;
    dateOfBirth?: Date | null;
    studentNumber?: string | null;
    contactEmail?: string | null;
    loginEmail?: string | null;
    parents?: ParentForStudentInput[];
    existingParentId?: string | null;
    allowAutoParentFromContact?: boolean;
    sendInvites?: boolean;
    dryRun?: boolean;
    strict?: boolean;
    client?: PoolClient;
    allowExternalClient?: boolean;
    req?: Request;
}
export interface CreateStudentResult {
    created: boolean;
    warnings: string[];
    student: any;
    user: {
        id: string;
        email: string;
        full_name: string;
        active: boolean;
    };
    contact_email: string | null;
    inviteUrl?: string;
    parentInviteUrls?: string[];
    parentLoginEmails?: string[];
    parents: SyncParentsResult[];
    linkedExistingParent: LinkedParentSummary | null;
    parentInvites: ParentInviteInfo[];
    smtpConfigured: boolean;
}
export declare function createStudentAccount(input: CreateStudentInput): Promise<CreateStudentResult>;
export {};
//# sourceMappingURL=studentCreation.service.d.ts.map