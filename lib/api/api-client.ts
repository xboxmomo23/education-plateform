// lib/api/api-client.ts
import { API_BASE_URL } from "./config";

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")

  if (isJson) {
    try {
      return await response.json()
    } catch (error) {
      return { parseError: error }
    }
  }

  try {
    return { text: await response.text() }
  } catch {
    return { text: "" }
  }
}

/**
 * Petit helper générique pour appeler l'API backend
 * en incluant automatiquement le token si présent.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // On récupère le token stocké par ton système d'auth
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("auth_token");
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data: any = await parseResponse(res);

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      (typeof data?.text === "string" && data.text.length > 0
        ? `Erreur API (${res.status}): ${data.text.slice(0, 300)}`
        : `Erreur API (${res.status})`);
    throw new Error(message);
  }

  return data as T;
}
