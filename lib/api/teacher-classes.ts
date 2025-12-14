import { apiCall } from './base';

export interface TeacherClassSummary {
  class_id: string;
  class_label: string;
  level: string | null;
  student_count: number;
  absent_today: number;
  late_today: number;
  pending_assignments: number;
  last_session_date: string | null;
}

export const teacherClassesApi = {
  async getSummary(signal?: AbortSignal) {
    return apiCall<TeacherClassSummary[]>('/teacher/classes/summary', { signal });
  },
};
