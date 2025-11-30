// lib/api/api-client.ts

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // pas de JSON dans la réponse
  }

  if (!res.ok) {
    const message =
      data?.error || data?.message || `Erreur API (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
