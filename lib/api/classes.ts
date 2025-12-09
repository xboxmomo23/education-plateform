import { apiFetch } from "./api-client";

export interface AdminClass {
  id: string;
  code: string;
  label: string;
  academic_year: number;
  level?: string | null;
  capacity?: number | null;
  current_size?: number | null;
  room?: string | null;
  archived: boolean;
  created_at?: string;
}

interface ClassListResponse {
  success: boolean;
  data: AdminClass[];
}

export async function updateClassApi(id: string, data: any) {
  return apiFetch(`/admin/classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export const classesApi = {
  list() {
    return apiFetch<ClassListResponse>("/admin/classes");
  },
  update(id: string, data: any) {
    return updateClassApi(id, data);
  },
};
