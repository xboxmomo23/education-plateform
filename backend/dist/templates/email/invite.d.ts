type InviteTemplateParams = {
    userName?: string | null;
    establishmentName?: string | null;
    roleLabel: string;
    loginEmail: string;
    actionUrl: string;
    expiresInDays: number;
};
export declare function buildInviteEmail(params: InviteTemplateParams): {
    subject: string;
    html: string;
    text: string;
};
export {};
//# sourceMappingURL=invite.d.ts.map