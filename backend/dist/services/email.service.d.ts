import type { UserRole } from "../types";
interface InviteEmailParams {
    to: string;
    loginEmail: string;
    role: Exclude<UserRole, "admin" | "super_admin">;
    establishmentName?: string;
    inviteUrl: string;
    expiresInDays?: number;
}
export declare function sendInviteEmail(params: InviteEmailParams): Promise<void>;
interface ResetEmailParams {
    to: string;
    loginEmail: string;
    resetUrl: string;
}
export declare function sendPasswordResetEmail(params: ResetEmailParams): Promise<void>;
export {};
//# sourceMappingURL=email.service.d.ts.map