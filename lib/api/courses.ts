"use client";

import { apiFetch } from "@/lib/api/api-client";

export interface AdminCourse {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  default_room: string | null;
  // champs enrichis par la jointure backend
  subject_name?: string;
  subject_short_code?: string;
  subject_color?: string;
  teacher_name?: string;
}

interface CoursesListResponse {
  success: boolean;
  data: AdminCourse[];
}

interface CourseMutationResponse {
  success: boolean;
  data?: AdminCourse;
  message?: string;
  error?: string;
}

export const coursesApi = {
  async listForClass(classId: string) {
    return apiFetch<CoursesListResponse>(
      `/admin/classes/${classId}/courses`
    );
  },

  async create(payload: {
    class_id: string;
    subject_id: string;
    teacher_id: string;
    default_room?: string;
  }) {
    return apiFetch<CourseMutationResponse>("/admin/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(
    courseId: string,
    payload: Partial<{
      subject_id: string;
      teacher_id: string;
      default_room: string;
    }>
  ) {
    return apiFetch<CourseMutationResponse>(`/admin/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
