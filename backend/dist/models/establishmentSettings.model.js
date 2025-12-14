"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultEstablishmentSettings = getDefaultEstablishmentSettings;
exports.getEstablishmentSettings = getEstablishmentSettings;
exports.upsertEstablishmentSettings = upsertEstablishmentSettings;
const database_1 = __importDefault(require("../config/database"));
const DEFAULT_APP_NAME = process.env.APP_NAME || "EduPilot";
const DEFAULT_CONTACT_EMAIL = process.env.EMAIL_FROM || "no-reply@edupilot.test";
function computeDefaultSchoolYear(startDate, endDate) {
    if (startDate && endDate) {
        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();
        if (startYear && endYear) {
            return `${startYear}-${endYear}`;
        }
    }
    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
}
function mapRowToSettings(row) {
    if (!row) {
        return getDefaultEstablishmentSettings();
    }
    const displayName = row.display_name || row.establishment_name || DEFAULT_APP_NAME;
    const contactEmail = row.contact_email || row.establishment_email || DEFAULT_CONTACT_EMAIL;
    const schoolYear = row.school_year || computeDefaultSchoolYear(row.school_year_start_date, row.school_year_end_date);
    return {
        establishmentId: row.establishment_id,
        displayName,
        contactEmail,
        schoolYear,
    };
}
function getDefaultEstablishmentSettings() {
    return {
        establishmentId: null,
        displayName: DEFAULT_APP_NAME,
        contactEmail: DEFAULT_CONTACT_EMAIL,
        schoolYear: computeDefaultSchoolYear(),
    };
}
async function getEstablishmentSettings(establishmentId) {
    const result = await database_1.default.query(`
      SELECT 
        e.id as establishment_id,
        es.display_name,
        es.school_year,
        es.contact_email,
        e.name as establishment_name,
        e.email as establishment_email,
        e.school_year_start_date,
        e.school_year_end_date
      FROM establishments e
      LEFT JOIN establishment_settings es ON es.establishment_id = e.id
      WHERE e.id = $1
      LIMIT 1
    `, [establishmentId]);
    const row = result.rows[0] || null;
    return mapRowToSettings(row);
}
async function upsertEstablishmentSettings(establishmentId, data) {
    const payload = {
        display_name: data.displayName ?? null,
        contact_email: data.contactEmail ?? null,
        school_year: data.schoolYear ?? null,
    };
    await database_1.default.query(`
      INSERT INTO establishment_settings (establishment_id, display_name, contact_email, school_year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (establishment_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        contact_email = EXCLUDED.contact_email,
        school_year = EXCLUDED.school_year,
        updated_at = NOW()
    `, [establishmentId, payload.display_name, payload.contact_email, payload.school_year]);
    return getEstablishmentSettings(establishmentId);
}
//# sourceMappingURL=establishmentSettings.model.js.map