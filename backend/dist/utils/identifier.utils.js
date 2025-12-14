"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHumanCode = generateHumanCode;
exports.generateLoginEmailFromName = generateLoginEmailFromName;
const database_1 = __importDefault(require("../config/database"));
const ROLE_PREFIX = {
    student: "STU",
    teacher: "TCH",
    staff: "STF",
};
function computeAcademicYear(currentDate = new Date()) {
    const month = currentDate.getMonth(); // 0 = janvier
    return month >= 8 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
}
function cleanSegment(value) {
    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return normalized
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .replace(/\.+/g, ".")
        .trim();
}
function slugify(value) {
    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const slug = normalized
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-");
    return slug || "etablissement";
}
async function getEstablishmentDomain(establishmentId) {
    const baseDomain = (process.env.EMAIL_LOGIN_BASE_DOMAIN || "ecole.local")
        .replace(/^\.+|\.+$/g, "")
        .toLowerCase() || "ecole.local";
    const result = await database_1.default.query(`SELECT name, code, login_email_domain FROM establishments WHERE id = $1 LIMIT 1`, [establishmentId]);
    const establishmentRow = result.rows[0];
    const explicitDomain = establishmentRow?.login_email_domain &&
        establishmentRow.login_email_domain.trim().length > 0
        ? establishmentRow.login_email_domain.trim().toLowerCase()
        : null;
    let domain;
    if (explicitDomain) {
        domain = explicitDomain;
    }
    else {
        const source = establishmentRow?.code || establishmentRow?.name || "etablissement";
        const schoolSlug = slugify(source);
        domain = `${schoolSlug}.${baseDomain}`;
    }
    console.log("[LOGIN_EMAIL_DEBUG]", {
        establishmentId,
        login_email_domain: establishmentRow?.login_email_domain || null,
        chosenDomain: domain,
    });
    return domain;
}
async function loginExists(email) {
    const result = await database_1.default.query(`
      SELECT 1
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email]);
    const count = result?.rowCount ?? 0;
    return count > 0;
}
function extractNameParts(fullName) {
    const cleaned = fullName.trim().replace(/\s+/g, " ");
    if (!cleaned) {
        return { lastName: "utilisateur", firstNames: [] };
    }
    const parts = cleaned.split(" ");
    const lastName = parts[0] || "utilisateur";
    const firstNames = parts.slice(1).filter(Boolean);
    return { lastName, firstNames };
}
async function generateHumanCode(params) {
    const { establishmentId, role } = params;
    const academicYear = computeAcademicYear();
    const result = await database_1.default.query(`
      INSERT INTO id_counters (establishment_id, role, academic_year, current_value)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (establishment_id, role, academic_year)
      DO UPDATE SET current_value = id_counters.current_value + 1
      RETURNING current_value
    `, [establishmentId, role, academicYear]);
    const counter = result.rows[0]?.current_value || 1;
    const prefix = ROLE_PREFIX[role] || "USR";
    return `${prefix}-${academicYear}-${String(counter).padStart(5, "0")}`;
}
async function generateLoginEmailFromName(params) {
    const { fullName, establishmentId, domainOverride, forceDomainSuffix } = params;
    const normalizeDomain = (value) => value.replace(/^\s+|\s+$/g, "").replace(/^\.+|\.+$/g, "").toLowerCase();
    const derivedDomain = domainOverride && domainOverride.trim().length > 0
        ? domainOverride
        : await getEstablishmentDomain(establishmentId);
    let domain = normalizeDomain(derivedDomain);
    if (forceDomainSuffix && forceDomainSuffix.trim().length > 0) {
        const suffix = forceDomainSuffix.startsWith(".")
            ? forceDomainSuffix.toLowerCase()
            : `.${forceDomainSuffix.toLowerCase()}`;
        if (!domain.endsWith(suffix)) {
            domain = `${domain.replace(/\.+$/, "")}${suffix}`;
        }
    }
    const { lastName, firstNames } = extractNameParts(fullName);
    const cleanedLastName = cleanSegment(lastName) || "utilisateur";
    const cleanedFirstNames = firstNames.map((name) => cleanSegment(name)).filter(Boolean);
    const candidates = [];
    if (cleanedFirstNames[0]) {
        candidates.push(`${cleanedLastName}.${cleanedFirstNames[0]}`);
    }
    if (cleanedFirstNames[1]) {
        candidates.push(`${cleanedLastName}.${cleanedFirstNames[1]}`);
    }
    if (cleanedFirstNames[0] && cleanedFirstNames[1]) {
        candidates.push(`${cleanedLastName}.${cleanedFirstNames[0]}.${cleanedFirstNames[1]}`);
    }
    if (candidates.length === 0) {
        candidates.push(cleanedLastName);
    }
    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
    for (const localPart of uniqueCandidates) {
        const emailCandidate = `${localPart}@${domain}`;
        if (!(await loginExists(emailCandidate))) {
            return emailCandidate;
        }
    }
    const baseLocal = cleanedFirstNames[0]
        ? `${cleanedLastName}.${cleanedFirstNames[0]}`
        : cleanedLastName;
    let suffix = 2;
    while (suffix < 1000) {
        const candidate = `${baseLocal}.${suffix}@${domain}`;
        if (!(await loginExists(candidate))) {
            return candidate;
        }
        suffix++;
    }
    // Fallback ultime si toutes les combinaisons précédentes échouent
    const fallback = `${cleanedLastName}.${Date.now()}@${domain}`;
    return fallback;
}
//# sourceMappingURL=identifier.utils.js.map