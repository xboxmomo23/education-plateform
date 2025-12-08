import { apiFetch } from "./api-client";

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
  return apiFetch<{ success: boolean; inviteUrl?: string; error?: string }>(
    `/admin/students/${userId}/resend-invite`,
    { method: "POST" }
  );
}
