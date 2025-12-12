import { apiFetch } from "./api-client";

export interface StudentClassChangePayload {
  new_class_id: string;
  effective_term_id: string;
  reason?: string;
}

export interface StudentClassChange {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  old_class: { id: string; label: string | null; code: string | null } | null;
  new_class: { id: string; label: string | null; code: string | null };
  term: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    academic_year: number;
  };
  reason?: string | null;
  created_at: string;
  created_by: string;
  applied_at?: string | null;
  applied_by?: string | null;
}

export async function updateStudentStatusApi(userId: string, active: boolean) {
  return apiFetch(`/admin/students/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function updateStudentClassApi(userId: string, classId: string | null) {
  return apiFetch(`/admin/students/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ class_id: classId }),
  });
}

export async function resendStudentInviteApi(userId: string) {
  return apiFetch<{
    success: boolean;
    inviteUrl?: string;
    loginEmail?: string;
    targetEmail?: string | null;
    smtpConfigured?: boolean;
    error?: string;
    message?: string;
  }>(`/admin/students/${userId}/resend-invite`, { method: "POST" });
}

export async function resendParentInviteApi(userId: string) {
  return apiFetch<{
    success: boolean;
    inviteUrl?: string;
    loginEmail?: string;
    targetEmail?: string | null;
    smtpConfigured?: boolean;
    error?: string;
    message?: string;
  }>(`/admin/students/${userId}/resend-parent-invite`, { method: "POST" });
}

export async function getStudentClassChangesApi(params?: {
  status?: "pending" | "applied" | "all";
  termId?: string;
  studentId?: string;
}) {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params?.termId) {
    query.set("termId", params.termId);
  }
  if (params?.studentId) {
    query.set("studentId", params.studentId);
  }
  const qs = query.toString();
  const endpoint = `/admin/student-class-changes${qs ? `?${qs}` : ""}`;
  return apiFetch<{ success: boolean; data: StudentClassChange[] }>(endpoint);
}

export async function scheduleStudentClassChangeApi(
  userId: string,
  payload: StudentClassChangePayload
) {
  return apiFetch<{ success: boolean; data: StudentClassChange }>(
    `/admin/students/${userId}/class-changes`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteStudentClassChangeApi(changeId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/admin/student-class-changes/${changeId}`,
    { method: "DELETE" }
  );
}

export async function applyStudentClassChangesApi(termId: string) {
  return apiFetch<{ success: boolean; appliedCount: number; message?: string }>(
    `/admin/student-class-changes/apply`,
    {
      method: "POST",
      body: JSON.stringify({ term_id: termId }),
    }
  );
}
