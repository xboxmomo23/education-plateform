import type { UserRole } from "../types";
import type { SupportedLocale } from "../models/establishmentSettings.model";
interface DeliverEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
    context: string;
    requestId?: string;
}
export declare function deliverEmail(params: DeliverEmailParams): Promise<void>;
interface InviteEmailParams {
    to: string;
    loginEmail: string;
    role: Exclude<UserRole, "admin" | "super_admin">;
    establishmentName?: string;
    inviteUrl: string;
    expiresInDays?: number;
    locale?: SupportedLocale;
}
export declare function sendInviteEmail(params: InviteEmailParams): Promise<void>;
interface ResetEmailParams {
    to: string;
    loginEmail: string;
    resetUrl: string;
    establishmentName?: string | null;
    userName?: string | null;
    locale?: SupportedLocale;
}
export declare function sendPasswordResetEmail(params: ResetEmailParams): Promise<void>;
export declare function sendTestEmail(to: string, requestId?: string): Promise<void>;
export {};
//# sourceMappingURL=email.service.d.ts.map