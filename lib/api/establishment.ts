import { apiCall } from './base';

/**
 * Configuration de l'établissement pour les emplois du temps
 * 
 * MODE DYNAMIC UNIQUEMENT
 * La propriété timetable_mode a été supprimée car le système
 * utilise maintenant exclusivement le mode dynamic (instances).
 */
export interface EstablishmentTimetableConfig {
  auto_generate_weeks: boolean;
  school_year_start_date: string | null;
  school_year_end_date: string | null;
}

export interface EstablishmentSettings {
  establishmentId: string | null;
  displayName: string;
  contactEmail: string;
  schoolYear: string;
  defaultLocale: 'fr' | 'en';
}

export const establishmentApi = {
  /**
   * Récupérer la configuration de l'établissement
   */
  async getTimetableConfig() {
    return apiCall<EstablishmentTimetableConfig>('/establishment/timetable-config');
  },

  /**
   * Mettre à jour la configuration
   */
  async updateTimetableConfig(config: Partial<EstablishmentTimetableConfig>) {
    return apiCall<EstablishmentTimetableConfig>('/establishment/timetable-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  async getSettings() {
    return apiCall<EstablishmentSettings>('/establishment/settings');
  },

  async updateSettings(settings: Partial<{ displayName: string | null; contactEmail: string | null; schoolYear: string | null; defaultLocale: 'fr' | 'en' | null }>) {
    const payload: Record<string, string | null> = {}
    if (settings.displayName !== undefined) {
      payload.display_name = settings.displayName
    }
    if (settings.contactEmail !== undefined) {
      payload.contact_email = settings.contactEmail
    }
    if (settings.schoolYear !== undefined) {
      payload.school_year = settings.schoolYear
    }
    if (settings.defaultLocale !== undefined) {
      payload.default_locale = settings.defaultLocale
    }

    return apiCall<EstablishmentSettings>('/establishment/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
