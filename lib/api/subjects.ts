"use client";

import { apiFetch } from "@/lib/api/api-client";

export interface Subject {
  id: string;
  name: string;
  short_code: string | null;
  color: string | null;
  level: string | null;
}

interface SubjectsListResponse {
  success: boolean;
  data: Subject[];
}

interface SubjectMutationResponse {
  success: boolean;
  data?: Subject;
  message?: string;
  error?: string;
}

export const subjectsApi = {
  async list() {
    return apiFetch<SubjectsListResponse>("/admin/subjects");
  },

  async create(payload: {
    name: string;
    short_code?: string;
    color?: string;
    level?: string;
  }) {
    return apiFetch<SubjectMutationResponse>("/admin/subjects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(
    subjectId: string,
    payload: Partial<{
      name: string;
      short_code: string;
      color: string;
      level: string;
    }>
  ) {
    return apiFetch<SubjectMutationResponse>(`/admin/subjects/${subjectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
