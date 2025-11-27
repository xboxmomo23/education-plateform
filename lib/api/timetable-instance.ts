import { apiCall } from './base';

export interface TimetableInstance {
  id: string;
  class_id: string;
  course_id: string;
  week_start_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  notes: string | null;
  status: string;
  created_from_template: boolean;
  template_entry_id: string | null;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name: string;
  teacher_id: string;
  class_label: string;
}

export interface CreateInstanceData {
  class_id: string;
  course_id: string;
  week_start_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  notes?: string;
  created_from_template?: boolean;
}

export interface BulkGenerateResult {
  totalCreated: number;
  weeksAffected: number;
  details: Array<{
    week: string;
    count: number;
    success: boolean;
    error?: string;
  }>;
}

export const timetableInstanceApi = {
  /**
   * Récupérer les instances d'une semaine
   */
  async getForWeek(classId: string, weekStartDate: string) {
    return apiCall<TimetableInstance[]>(
      `/timetable/instances/class/${classId}/week/${weekStartDate}`
    );
  },

  /**
   * Créer une instance
   */
  async create(data: CreateInstanceData) {
    return apiCall<TimetableInstance>('/timetable/instances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Générer les instances depuis le template (UNE SEULE SEMAINE)
   */
  async generateFromTemplate(classId: string, weekStartDate: string) {
    return apiCall<{ count: number }>('/timetable/instances/generate-from-template', {
      method: 'POST',
      body: JSON.stringify({
        class_id: classId,
        week_start_date: weekStartDate,
      }),
    });
  },

  /**
   * ✨ NOUVEAU : Générer les instances depuis le template (PLUSIEURS SEMAINES)
   * @param classId - ID de la classe
   * @param targetWeeks - Liste des semaines cibles (format 'yyyy-MM-dd')
   * @returns Résultat détaillé de la génération
   */
  async generateFromTemplateBulk(classId: string, targetWeeks: string[]) {
    return apiCall<BulkGenerateResult>('/timetable/instances/generate-bulk', {
      method: 'POST',
      body: JSON.stringify({
        class_id: classId,
        target_weeks: targetWeeks,
      }),
    });
  },

  /**
   * Copier une semaine vers une autre
   */
  async copyWeek(classId: string, sourceWeek: string, targetWeek: string) {
    return apiCall<{ count: number }>('/timetable/instances/copy-week', {
      method: 'POST',
      body: JSON.stringify({
        class_id: classId,
        source_week: sourceWeek,
        target_week: targetWeek,
      }),
    });
  },

  /**
   * Modifier une instance
   */
  async update(instanceId: string, data: Partial<CreateInstanceData>) {
    return apiCall<TimetableInstance>(`/timetable/instances/${instanceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Supprimer une instance
   */
  async delete(instanceId: string) {
    return apiCall(`/timetable/instances/${instanceId}`, {
      method: 'DELETE',
    });
  },
};