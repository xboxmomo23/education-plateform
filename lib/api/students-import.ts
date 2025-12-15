import { apiFetch } from "./api-client";

export type ImportRowStatus = "OK" | "WARNING" | "ERROR";

export interface StudentImportRow {
  rowNumber: number;
  input: Record<string, string | null>;
  status: ImportRowStatus;
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

export interface StudentImportResponse {
  success: boolean;
  data: {
    summary: StudentImportSummary;
    rows: StudentImportRow[];
  };
  error?: string;
}

export interface StudentImportRequestPayload {
  csvData: string;
  defaultClassId?: string | null;
}

export interface StudentImportCommitPayload extends StudentImportRequestPayload {
  sendInvites?: boolean;
}

export async function previewStudentImportApi(payload: StudentImportRequestPayload) {
  return apiFetch<StudentImportResponse>("/admin/students/import/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function commitStudentImportApi(payload: StudentImportCommitPayload) {
  return apiFetch<StudentImportResponse>("/admin/students/import/commit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
