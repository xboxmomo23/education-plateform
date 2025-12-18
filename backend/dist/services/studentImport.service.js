"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStudentImport = processStudentImport;
const database_1 = __importDefault(require("../config/database"));
const csv_utils_1 = require("../utils/csv.utils");
const studentCreation_service_1 = require("./studentCreation.service");
const MAX_IMPORT_ROWS = 500;
const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // ~1.5MB
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function parseDateInput(value) {
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
function mapServiceError(error) {
    if (error instanceof Error) {
        if (error.message === "EMAIL_ALREADY_EXISTS") {
            const conflictEmail = error.email;
            return conflictEmail
                ? `Impossible de créer l'élève: l'email ${conflictEmail} est déjà utilisé`
                : "Impossible de créer l'élève: l'email est déjà utilisé";
        }
        return error.message;
    }
    return "Erreur inconnue";
}
function buildRowInput(row) {
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
async function fetchClasses(establishmentId) {
    const result = await database_1.default.query(`
      SELECT id, code, label
      FROM classes
      WHERE establishment_id = $1
    `, [establishmentId]);
    return result.rows;
}
async function fetchExistingUsersByEmail(establishmentId, emails) {
    if (!emails.length) {
        return new Set();
    }
    const result = await database_1.default.query(`
      SELECT LOWER(email) AS email_lower
      FROM users
      WHERE establishment_id = $1
        AND LOWER(email) = ANY($2)
    `, [establishmentId, emails]);
    return new Set(result.rows.map((row) => row.email_lower));
}
async function fetchParentRecords(establishmentId, emails) {
    const map = new Map();
    if (!emails.length) {
        return map;
    }
    const result = await database_1.default.query(`
      SELECT id, email, establishment_id
      FROM users
      WHERE LOWER(email) = ANY($1)
        AND role = 'parent'
    `, [emails]);
    result.rows.forEach((row) => {
        const key = row.email.trim().toLowerCase();
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
async function processStudentImport(options) {
    const { csvData, establishmentId, establishmentName, adminUserId, actorRole, actorName, defaultClassId, sendInvites, dryRun, req, } = options;
    if (!csvData || typeof csvData !== "string") {
        throw new Error("Fichier CSV manquant");
    }
    if (csvData.length > MAX_FILE_SIZE) {
        throw new Error("Fichier trop volumineux (max 1.5MB)");
    }
    const { headers, rows } = (0, csv_utils_1.parseCsvContent)(csvData, MAX_IMPORT_ROWS);
    if (!rows.length) {
        throw new Error("Aucune ligne à importer");
    }
    const parsedRows = [];
    let rowNumber = 1;
    rows.forEach((row) => {
        rowNumber += 1;
        const record = {};
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
    const classById = new Map();
    const classByCode = new Map();
    const classByLabel = new Map();
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
    const loginEmailsToCheck = Array.from(new Set(parsedRows
        .map((row) => row.loginEmail?.toLowerCase())
        .filter((value) => Boolean(value))));
    const existingLoginEmails = await fetchExistingUsersByEmail(establishmentId, loginEmailsToCheck);
    const parentEmailsToCheck = Array.from(new Set(parsedRows
        .map((row) => row.existingParentEmail?.toLowerCase())
        .filter((value) => Boolean(value))));
    const existingParents = await fetchParentRecords(establishmentId, parentEmailsToCheck);
    const rowsResults = [];
    const seenLoginEmails = new Set();
    for (const row of parsedRows) {
        const rowWarnings = [];
        const errors = [];
        const input = buildRowInput(row);
        let status = "OK";
        let created = false;
        let generatedLoginEmail;
        const rowLoginEmail = row.loginEmail?.toLowerCase();
        const rowContactEmail = row.contactEmail?.toLowerCase();
        if (!row.fullName) {
            errors.push("Le champ full_name est obligatoire");
        }
        if (!rowContactEmail) {
            errors.push("Le champ contact_email est obligatoire");
        }
        else if (!isValidEmail(rowContactEmail)) {
            errors.push(`Email de contact invalide (${rowContactEmail})`);
        }
        if (rowLoginEmail) {
            if (!isValidEmail(rowLoginEmail)) {
                errors.push(`Email de connexion invalide (${rowLoginEmail})`);
            }
            else if (seenLoginEmails.has(rowLoginEmail)) {
                errors.push("Email de connexion dupliqué dans le fichier");
            }
            else {
                seenLoginEmails.add(rowLoginEmail);
            }
        }
        const dobDate = row.dateOfBirth ? parseDateInput(row.dateOfBirth) : null;
        if (row.dateOfBirth && !dobDate) {
            errors.push(`Date de naissance invalide (${row.dateOfBirth})`);
        }
        let classId = null;
        if (row.classCode) {
            const classRecord = classByCode.get(row.classCode.trim().toLowerCase());
            if (!classRecord) {
                errors.push(`Classe introuvable pour le code ${row.classCode}`);
            }
            else {
                classId = classRecord.id;
            }
        }
        else if (row.classLabel) {
            const classRecord = classByLabel.get(row.classLabel.trim().toLowerCase());
            if (!classRecord) {
                errors.push(`Classe introuvable pour le libellé ${row.classLabel}`);
            }
            else {
                classId = classRecord.id;
            }
        }
        else if (defaultClassId) {
            classId = defaultClassId;
        }
        else {
            errors.push("Aucune classe définie pour cette ligne");
        }
        let existingParentId = null;
        if (row.existingParentEmail) {
            if (!isValidEmail(row.existingParentEmail)) {
                errors.push("existing_parent_email invalide");
            }
            else {
                const parent = existingParents.get(row.existingParentEmail);
                if (parent) {
                    existingParentId = parent.id;
                }
                else {
                    errors.push("existing_parent_email introuvable dans votre établissement");
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
        const parentsPayload = [];
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
            const creation = await (0, studentCreation_service_1.createStudentAccount)({
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
        }
        catch (error) {
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
    const summary = {
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
//# sourceMappingURL=studentImport.service.js.map