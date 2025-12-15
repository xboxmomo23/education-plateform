import { Request } from "express";
import pool from "../config/database";
import { ParentForStudentInput } from "../types";
import { parseCsvContent } from "../utils/csv.utils";
import { createStudentAccount } from "./studentCreation.service";

const MAX_IMPORT_ROWS = 500;
const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // ~1.5MB

type RowStatus = "OK" | "WARNING" | "ERROR";

interface ClassRecord {
  id: string;
  code: string;
  label: string;
}

interface ParentRecord {
  id: string;
  email: string;
  establishment_id: string;
}

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

interface ParsedStudentRow {
  rowNumber: number;
  fullName: string;
  contactEmail: string;
  loginEmail?: string;
  studentNumber?: string;
  dateOfBirth?: string;
  classCode?: string;
  classLabel?: string;
  existingParentEmail?: string;
  parentFirstName?: string;
  parentLastName?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseDateInput(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function mapServiceError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      const conflictEmail = (error as any).email;
      return conflictEmail
        ? `Impossible de créer l'élève: l'email ${conflictEmail} est déjà utilisé`
        : "Impossible de créer l'élève: l'email est déjà utilisé";
    }
    return error.message;
  }
  return "Erreur inconnue";
}

function buildRowInput(row: ParsedStudentRow): Record<string, string | null> {
  return {
    full_name: row.fullName || null,
    contact_email: row.contactEmail || null,
    login_email: row.loginEmail || null,
    student_number: row.studentNumber || null,
    date_of_birth: row.dateOfBirth || null,
    class_code: row.classCode || null,
    class_label: row.classLabel || null,
    existing_parent_email: row.existingParentEmail || null,
    parent_first_name: row.parentFirstName || null,
    parent_last_name: row.parentLastName || null,
  };
}

async function fetchClasses(establishmentId: string): Promise<ClassRecord[]> {
  const result = await pool.query(
    `
      SELECT id, code, label
      FROM classes
      WHERE establishment_id = $1
    `,
    [establishmentId]
  );
  return result.rows;
}

async function fetchExistingUsersByEmail(
  establishmentId: string,
  emails: string[]
): Promise<Set<string>> {
  if (!emails.length) {
    return new Set();
  }
  const result = await pool.query(
    `
      SELECT LOWER(email) AS email_lower
      FROM users
      WHERE establishment_id = $1
        AND LOWER(email) = ANY($2)
    `,
    [establishmentId, emails]
  );
  return new Set(result.rows.map((row) => row.email_lower as string));
}

async function fetchParentRecords(
  establishmentId: string,
  emails: string[]
): Promise<Map<string, ParentRecord>> {
  const map = new Map<string, ParentRecord>();
  if (!emails.length) {
    return map;
  }
  const result = await pool.query(
    `
      SELECT id, email, establishment_id
      FROM users
      WHERE LOWER(email) = ANY($1)
        AND role = 'parent'
    `,
    [emails]
  );

  result.rows.forEach((row) => {
    const key = (row.email as string).trim().toLowerCase();
    if (row.establishment_id === establishmentId) {
      map.set(key, {
        id: row.id,
        email: row.email,
        establishment_id: row.establishment_id,
      });
    }
  });

  return map;
}

export async function processStudentImport(
  options: StudentImportOptions
): Promise<StudentImportResult> {
  const {
    csvData,
    establishmentId,
    establishmentName,
    adminUserId,
    actorRole,
    actorName,
    defaultClassId,
    sendInvites,
    dryRun,
    req,
  } = options;

  if (!csvData || typeof csvData !== "string") {
    throw new Error("Fichier CSV manquant");
  }

  if (csvData.length > MAX_FILE_SIZE) {
    throw new Error("Fichier trop volumineux (max 1.5MB)");
  }

  const { headers, rows } = parseCsvContent(csvData, MAX_IMPORT_ROWS);
  if (!rows.length) {
    throw new Error("Aucune ligne à importer");
  }

  const parsedRows: ParsedStudentRow[] = [];
  let rowNumber = 1;

  rows.forEach((row) => {
    rowNumber += 1;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });

    const hasContent = Object.values(record).some((value) => value.length > 0);
    if (!hasContent) {
      return;
    }

    parsedRows.push({
      rowNumber,
      fullName: record["full_name"] || "",
      contactEmail: (record["contact_email"] || "").toLowerCase(),
      loginEmail: record["login_email"] ? record["login_email"].toLowerCase() : undefined,
      studentNumber: record["student_number"] || undefined,
      dateOfBirth: record["date_of_birth"] || undefined,
      classCode: record["class_code"] || undefined,
      classLabel: record["class_label"] || undefined,
      existingParentEmail: record["existing_parent_email"]
        ? record["existing_parent_email"].toLowerCase()
        : undefined,
      parentFirstName: record["parent_first_name"] || undefined,
      parentLastName: record["parent_last_name"] || undefined,
    });
  });

  if (!parsedRows.length) {
    throw new Error("Aucune ligne exploitable dans le CSV");
  }

  const classes = await fetchClasses(establishmentId);
  const classById = new Map<string, ClassRecord>();
  const classByCode = new Map<string, ClassRecord>();
  const classByLabel = new Map<string, ClassRecord>();

  classes.forEach((cls) => {
    classById.set(cls.id, cls);
    if (cls.code) {
      classByCode.set(cls.code.trim().toLowerCase(), cls);
    }
    if (cls.label) {
      classByLabel.set(cls.label.trim().toLowerCase(), cls);
    }
  });

  if (defaultClassId && !classById.has(defaultClassId)) {
    throw new Error("Classe par défaut invalide");
  }

  const loginEmailsToCheck = Array.from(
    new Set(
      parsedRows
        .map((row) => row.loginEmail?.toLowerCase())
        .filter((value): value is string => Boolean(value))
    )
  );
  const existingLoginEmails = await fetchExistingUsersByEmail(
    establishmentId,
    loginEmailsToCheck
  );

  const parentEmailsToCheck = Array.from(
    new Set(
      parsedRows
        .map((row) => row.existingParentEmail?.toLowerCase())
        .filter((value): value is string => Boolean(value))
    )
  );
  const existingParents = await fetchParentRecords(
    establishmentId,
    parentEmailsToCheck
  );

  const rowsResults: StudentImportRowResult[] = [];
  const seenLoginEmails = new Set<string>();

  for (const row of parsedRows) {
    const rowWarnings: string[] = [];
    const errors: string[] = [];
    const input = buildRowInput(row);
    let status: RowStatus = "OK";
    let created = false;
    let generatedLoginEmail: string | undefined;

    const rowLoginEmail = row.loginEmail?.toLowerCase();
    const rowContactEmail = row.contactEmail?.toLowerCase();

    if (!row.fullName) {
      errors.push("Le champ full_name est obligatoire");
    }
    if (!rowContactEmail) {
      errors.push("Le champ contact_email est obligatoire");
    } else if (!isValidEmail(rowContactEmail)) {
      errors.push(`Email de contact invalide (${rowContactEmail})`);
    }

    if (rowLoginEmail) {
      if (!isValidEmail(rowLoginEmail)) {
        errors.push(`Email de connexion invalide (${rowLoginEmail})`);
      } else if (seenLoginEmails.has(rowLoginEmail)) {
        errors.push("Email de connexion dupliqué dans le fichier");
      } else {
        seenLoginEmails.add(rowLoginEmail);
      }
    }

    const dobDate = row.dateOfBirth ? parseDateInput(row.dateOfBirth) : null;
    if (row.dateOfBirth && !dobDate) {
      errors.push(`Date de naissance invalide (${row.dateOfBirth})`);
    }

    let classId: string | null = null;
    if (row.classCode) {
      const classRecord = classByCode.get(row.classCode.trim().toLowerCase());
      if (!classRecord) {
        errors.push(`Classe introuvable pour le code ${row.classCode}`);
      } else {
        classId = classRecord.id;
      }
    } else if (row.classLabel) {
      const classRecord = classByLabel.get(row.classLabel.trim().toLowerCase());
      if (!classRecord) {
        errors.push(`Classe introuvable pour le libellé ${row.classLabel}`);
      } else {
        classId = classRecord.id;
      }
    } else if (defaultClassId) {
      classId = defaultClassId;
    } else {
      errors.push("Aucune classe définie pour cette ligne");
    }

    let existingParentId: string | null = null;
    if (row.existingParentEmail) {
      if (!isValidEmail(row.existingParentEmail)) {
        rowWarnings.push("existing_parent_email invalide, ignoré");
      } else {
        const parent = existingParents.get(row.existingParentEmail);
        if (parent) {
          existingParentId = parent.id;
        } else {
          rowWarnings.push("Parent introuvable pour existing_parent_email, un nouveau parent sera créé");
        }
      }
    }

    if (errors.length > 0) {
      status = "ERROR";
      rowsResults.push({
        rowNumber: row.rowNumber,
        input,
        status,
        created,
        warnings: rowWarnings,
        error: errors.join(" | "),
        generatedLoginEmail: rowLoginEmail || undefined,
      });
      continue;
    }

    if (rowLoginEmail && existingLoginEmails.has(rowLoginEmail)) {
      status = "WARNING";
      rowsResults.push({
        rowNumber: row.rowNumber,
        input,
        status,
        created: false,
        warnings: [
          ...rowWarnings,
          `Un utilisateur avec l'email ${rowLoginEmail} existe déjà dans votre établissement, ligne ignorée`,
        ],
        generatedLoginEmail: rowLoginEmail,
      });
      continue;
    }

    const parentsPayload: ParentForStudentInput[] = [];
    if (!existingParentId && row.parentFirstName && row.parentLastName) {
      parentsPayload.push({
        firstName: row.parentFirstName,
        lastName: row.parentLastName,
        relation_type: "guardian",
        is_primary: true,
        receive_notifications: true,
        can_view_attendance: true,
        can_view_grades: true,
        contact_email: rowContactEmail,
      });
    }

    try {
      const creation = await createStudentAccount({
        establishmentId,
        establishmentName,
        createdByUserId: adminUserId,
        actorRole,
        actorName,
        fullName: row.fullName,
        classId,
        dateOfBirth: dobDate,
        studentNumber: row.studentNumber?.trim() || null,
        contactEmail: rowContactEmail,
        loginEmail: rowLoginEmail,
        parents: parentsPayload,
        existingParentId,
        allowAutoParentFromContact: true,
        sendInvites,
        dryRun,
        strict: false,
        req,
      });

      generatedLoginEmail = creation.user.email;

      const combinedWarnings = [...rowWarnings, ...creation.warnings];
      if (combinedWarnings.length > 0) {
        status = "WARNING";
      }

      created = dryRun ? true : creation.created;

      rowsResults.push({
        rowNumber: row.rowNumber,
        input,
        status,
        created,
        warnings: combinedWarnings,
        generatedLoginEmail,
      });
    } catch (error) {
      status = "ERROR";
      rowsResults.push({
        rowNumber: row.rowNumber,
        input,
        status,
        created: false,
        warnings: rowWarnings,
        error: mapServiceError(error),
        generatedLoginEmail: rowLoginEmail || undefined,
      });
    }
  }

  const summary: StudentImportSummary = {
    total: rowsResults.length,
    ok: rowsResults.filter((row) => row.status === "OK").length,
    warnings: rowsResults.filter((row) => row.status === "WARNING").length,
    errors: rowsResults.filter((row) => row.status === "ERROR").length,
    createdCount: rowsResults.filter((row) => row.created).length,
  };

  return {
    summary,
    rows: rowsResults,
  };
}
