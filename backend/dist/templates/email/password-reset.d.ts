type SupportedLocale = "fr" | "en";
type ResetTemplateParams = {
    userName?: string | null;
    establishmentName?: string | null;
    loginEmail: string;
    actionUrl: string;
    locale?: SupportedLocale;
};
export declare function buildResetEmail(params: ResetTemplateParams): {
    subject: string;
    html: string;
    text: string;
};
export {};
//# sourceMappingURL=password-reset.d.ts.map