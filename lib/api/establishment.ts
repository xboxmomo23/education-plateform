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
};