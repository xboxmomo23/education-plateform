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
   * Générer les instances depuis le template
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