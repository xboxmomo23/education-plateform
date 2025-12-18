import { Request } from "express";
type RowStatus = "OK" | "WARNING" | "ERROR";
export interface StudentImportRowResult {
    rowNumber: number;
    input: Record<string, string | null>;
    status: RowStatus;
    created: boolean;
    warnings: string[];
    error?: string;
    generatedLoginEmail?: string;
}
export interface StudentImportSummary {
    total: number;
    ok: number;
    warnings: number;
    errors: number;
    createdCount: number;
}
export interface StudentImportResult {
    summary: StudentImportSummary;
    rows: StudentImportRowResult[];
}
interface StudentImportOptions {
    csvData: string;
    establishmentId: string;
    establishmentName?: string | null;
    adminUserId: string;
    actorRole?: string | null;
    actorName?: string | null;
    defaultClassId?: string | null;
    sendInvites: boolean;
    dryRun: boolean;
    req?: Request;
}
export declare function processStudentImport(options: StudentImportOptions): Promise<StudentImportResult>;
export {};
//# sourceMappingURL=studentImport.service.d.ts.map