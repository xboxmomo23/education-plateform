import { apiCall } from './base';

export interface TimetableOverride {
  id: string;
  template_entry_id: string;
  override_date: string;
  override_type: 'cancel' | 'modify_time' | 'modify_room' | 'replace_course' | 'replace_teacher';
  new_start_time?: string;
  new_end_time?: string;
  new_room?: string;
  new_course_id?: string;
  replacement_teacher_id?: string;
  replacement_subject?: string;
  reason?: string;
  notes?: string;
  template_subject_name?: string;
  template_teacher_name?: string;
  template_start_time?: string;
  template_end_time?: string;
  replacement_teacher_name?: string;
  replacement_subject_name?: string;
}

export interface CreateOverrideData {
  template_entry_id: string;
  override_date: string;
  override_type: 'cancel' | 'modify_time' | 'modify_room' | 'replace_course' | 'replace_teacher';
  new_start_time?: string;
  new_end_time?: string;
  new_room?: string;
  new_course_id?: string;
  replacement_teacher_id?: string;
  replacement_subject?: string;
  reason?: string;
  notes?: string;
}

export const timetableOverrideApi = {
  /**
   * Créer une exception
   */
  async create(data: CreateOverrideData) {
    return apiCall<TimetableOverride>('/api/timetable/overrides', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Récupérer les overrides d'une semaine
   */
  async getForWeek(classId: string, weekStartDate: string) {
    return apiCall<TimetableOverride[]>(
      `/api/timetable/overrides/class/${classId}/week/${weekStartDate}`
    );
  },

  /**
   * Modifier un override
   */
  async update(overrideId: string, data: Partial<CreateOverrideData>) {
    return apiCall<TimetableOverride>(`/api/timetable/overrides/${overrideId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Supprimer un override
   */
  async delete(overrideId: string) {
    return apiCall(`/api/timetable/overrides/${overrideId}`, {
      method: 'DELETE',
    });
  },
};