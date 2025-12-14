type EmailLayoutParams = {
    title: string;
    greeting: string;
    messageLines: string[];
    actionLabel: string;
    actionUrl: string;
    footerLines?: string[];
};
export declare function renderEmailLayout({ title, greeting, messageLines, actionLabel, actionUrl, footerLines, }: EmailLayoutParams): string;
export {};
//# sourceMappingURL=layout.d.ts.map