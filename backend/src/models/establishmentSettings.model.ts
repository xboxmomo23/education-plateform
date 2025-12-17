import pool from "../config/database"

const DEFAULT_APP_NAME = process.env.APP_NAME || "EduPilot"
const DEFAULT_CONTACT_EMAIL = process.env.EMAIL_FROM || "no-reply@edupilot.test"
const DEFAULT_LOCALE_MIGRATION_NAME = "2024-06-05_add_default_locale_to_establishment_settings.sql"
const DEFAULT_LOCALE_MISSING_LOG = `[ESTABLISHMENT_SETTINGS] La colonne default_locale est absente. Veuillez exécuter la migration ${DEFAULT_LOCALE_MIGRATION_NAME}.`

export type SupportedLocale = "fr" | "en"

export type EstablishmentSettingsDTO = {
  establishmentId: string | null
  displayName: string
  contactEmail: string
  schoolYear: string
  defaultLocale: SupportedLocale
}

type EstablishmentSettingsRow = {
  establishment_id: string
  display_name: string | null
  school_year: string | null
  contact_email: string | null
  establishment_name: string | null
  establishment_email: string | null
  school_year_start_date: string | null
  school_year_end_date: string | null
  default_locale: SupportedLocale | null
}

let defaultLocaleColumnCheckPromise: Promise<boolean> | null = null
let defaultLocaleColumnExists = true

async function ensureDefaultLocaleColumnExists(): Promise<boolean> {
  if (defaultLocaleColumnCheckPromise) {
    return defaultLocaleColumnCheckPromise
  }

  defaultLocaleColumnCheckPromise = (async () => {
    try {
      const result = await pool.query(
        `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'establishment_settings'
            AND column_name = 'default_locale'
          LIMIT 1
        `
      )

      const count = result.rowCount ?? 0
      defaultLocaleColumnExists = count > 0
      if (!defaultLocaleColumnExists) {
        console.error(DEFAULT_LOCALE_MISSING_LOG)
      }
    } catch (error) {
      defaultLocaleColumnExists = false
      console.error(
        "[ESTABLISHMENT_SETTINGS] Impossible de vérifier la colonne default_locale:",
        error
      )
    }

    return defaultLocaleColumnExists
  })()

  return defaultLocaleColumnCheckPromise!
}

function computeDefaultSchoolYear(startDate?: string | null, endDate?: string | null): string {
  if (startDate && endDate) {
    const startYear = new Date(startDate).getFullYear()
    const endYear = new Date(endDate).getFullYear()
    if (startYear && endYear) {
      return `${startYear}-${endYear}`
    }
  }

  const now = new Date()
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return `${startYear}-${startYear + 1}`
}

function mapRowToSettings(row?: EstablishmentSettingsRow | null): EstablishmentSettingsDTO {
  if (!row) {
    return getDefaultEstablishmentSettings()
  }

  const displayName = row.display_name || row.establishment_name || DEFAULT_APP_NAME
  const contactEmail = row.contact_email || row.establishment_email || DEFAULT_CONTACT_EMAIL
  const schoolYear = row.school_year || computeDefaultSchoolYear(row.school_year_start_date, row.school_year_end_date)

  return {
    establishmentId: row.establishment_id,
    displayName,
    contactEmail,
    schoolYear,
    defaultLocale: row.default_locale ?? "fr",
  }
}

export function getDefaultEstablishmentSettings(): EstablishmentSettingsDTO {
  return {
    establishmentId: null,
    displayName: DEFAULT_APP_NAME,
    contactEmail: DEFAULT_CONTACT_EMAIL,
    schoolYear: computeDefaultSchoolYear(),
    defaultLocale: "fr",
  }
}

export async function getEstablishmentSettings(establishmentId: string): Promise<EstablishmentSettingsDTO> {
  const hasDefaultLocaleColumn = await ensureDefaultLocaleColumnExists()
  const defaultLocaleSelect = hasDefaultLocaleColumn
    ? "es.default_locale"
    : `'fr'::text as default_locale`

  const result = await pool.query<EstablishmentSettingsRow>(
    `
      SELECT 
        e.id as establishment_id,
        es.display_name,
        es.school_year,
        es.contact_email,
        e.name as establishment_name,
        e.email as establishment_email,
        e.school_year_start_date,
        e.school_year_end_date,
        ${defaultLocaleSelect}
      FROM establishments e
      LEFT JOIN establishment_settings es ON es.establishment_id = e.id
      WHERE e.id = $1
      LIMIT 1
    `,
    [establishmentId]
  )

  const row = result.rows[0] || null
  return mapRowToSettings(row)
}

export async function upsertEstablishmentSettings(
  establishmentId: string,
  data: Partial<{
    displayName: string | null
    contactEmail: string | null
    schoolYear: string | null
    defaultLocale: SupportedLocale | null
  }>
): Promise<EstablishmentSettingsDTO> {
  const hasDefaultLocaleColumn = await ensureDefaultLocaleColumnExists()
  if (!hasDefaultLocaleColumn) {
    throw new Error(DEFAULT_LOCALE_MISSING_LOG)
  }

  const payload = {
    display_name: data.displayName ?? null,
    contact_email: data.contactEmail ?? null,
    school_year: data.schoolYear ?? null,
    default_locale: data.defaultLocale ?? null,
  }

  await pool.query(
    `
      INSERT INTO establishment_settings (establishment_id, display_name, contact_email, school_year, default_locale)
      VALUES ($1, $2, $3, $4, COALESCE($5, 'fr'))
      ON CONFLICT (establishment_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        contact_email = EXCLUDED.contact_email,
        school_year = EXCLUDED.school_year,
        default_locale = COALESCE(EXCLUDED.default_locale, establishment_settings.default_locale),
        updated_at = NOW()
    `,
    [establishmentId, payload.display_name, payload.contact_email, payload.school_year, payload.default_locale]
  )

  return getEstablishmentSettings(establishmentId)
}
