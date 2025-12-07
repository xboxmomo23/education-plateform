"use client";

import { apiFetch } from "@/lib/api/api-client";

export interface AdminTeacher {
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
  employee_no?: string | null;
  hire_date?: string | null;
  specialization?: string | null;
  phone?: string | null;
  office_room?: string | null;
  contact_email?: string | null;
}

interface ListTeachersResponse {
  success: boolean;
  data: AdminTeacher[];
}

interface TeacherMutationResponse {
  success: boolean;
  message?: string;
  data?: AdminTeacher;
}

interface TeacherCreateResponse {
  success: boolean;
  message?: string;
  teacher?: AdminTeacher;
  inviteUrl?: string;
  error?: string;
}

export const teachersApi = {
  async list() {
    return apiFetch<ListTeachersResponse>("/admin/teachers");
  },

  async create(payload: {
    full_name: string;
    login_email?: string;
    contact_email?: string;
    employee_no?: string;
    hire_date?: string;
    specialization?: string;
    phone?: string;
    office_room?: string;
  }) {
    return apiFetch<TeacherCreateResponse>("/admin/teachers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(userId: string, payload: Partial<{
    full_name: string;
    email: string;
    employee_no: string;
    hire_date: string;
    specialization: string;
    phone: string;
    office_room: string;
    contact_email: string;
  }>) {
    return apiFetch<TeacherMutationResponse>(`/admin/teachers/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(userId: string, active: boolean) {
    return apiFetch<TeacherMutationResponse>(
      `/admin/teachers/${userId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }
    );
  },
};
