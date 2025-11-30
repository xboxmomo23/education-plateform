import { apiFetch } from "./api-client";

export async function updateStudentStatusApi(userId: string, active: boolean) {
  return apiFetch(`/admin/students/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}
