import { SyncParentsResult } from "../models/parent.model";
export interface ParentInviteInfo {
    parentUserId: string;
    inviteUrl: string;
    loginEmail: string;
    targetEmail: string;
}
export declare function sendParentInvitesForNewAccounts(parents: SyncParentsResult[], establishmentName: string | null, locale: "fr" | "en", toEmailOverride?: string | null): Promise<ParentInviteInfo[]>;
//# sourceMappingURL=parentInvite.service.d.ts.map