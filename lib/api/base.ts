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

function buildError(response: Response, payload: any) {
  const snippet =
    typeof payload?.text === "string" && payload.text.length > 0
      ? payload.text.slice(0, 300)
      : undefined

  const message =
    payload?.error ||
    payload?.message ||
    (snippet ? `HTTP ${response.status} ${response.statusText}: ${snippet}` : `HTTP ${response.status} ${response.statusText}`)

  return new Error(message)
}

/**
 * Helper pour les appels API
 */
export async function apiCall<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; error?: string; message?: string }> {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await parseResponse(response);
  
  if (!response.ok) {
    throw buildError(response, data);
  }

  return data;
}

/**
 * Helper pour les appels API avec signal d'annulation
 */
export async function apiCallWithAbort<T = any>(
  endpoint: string, 
  options: RequestInit = {}, 
  signal?: AbortSignal
): Promise<{ success: boolean; data: T; error?: string }> {
  return apiCall<T>(endpoint, { ...options, signal });
}
