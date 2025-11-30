import { apiFetch } from "./api-client";

export async function updateClassApi(id: string, data: any) {
  return apiFetch(`/admin/classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
