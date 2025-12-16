import { apiFetch } from "./api-client";

export interface ParentStudentLink {
  student_id: string;
  full_name: string;
  class_label: string | null;
}

export interface ParentDirectoryItem {
  parent_id: string;
  first_name: string | null;
  last_name: string | null;
  login_email: string;
  contact_email: string | null;
  active: boolean;
  students: ParentStudentLink[];
}

export interface ParentDirectoryResponse {
  success: boolean;
  data: ParentDirectoryItem[];
  error?: string;
}

export async function fetchParentsDirectory(params?: { q?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.q) {
    query.set("q", params.q);
  }
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  const endpoint = `/admin/parents${query.toString() ? `?${query.toString()}` : ""}`;
  return apiFetch<ParentDirectoryResponse>(endpoint);
}
