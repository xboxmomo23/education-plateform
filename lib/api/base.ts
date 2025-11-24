const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Erreur API');
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