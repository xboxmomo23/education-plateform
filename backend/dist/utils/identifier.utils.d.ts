type CodeRole = "student" | "teacher" | "staff";
export declare function generateHumanCode(params: {
    establishmentId: string;
    role: CodeRole;
}): Promise<string>;
export declare function generateLoginEmailFromName(params: {
    fullName: string;
    establishmentId: string;
    domainOverride?: string | null;
    forceDomainSuffix?: string;
}): Promise<string>;
export {};
//# sourceMappingURL=identifier.utils.d.ts.map