import { API_BASE_URL } from './config';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, any>;
}

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

let isHandlingUnauthorized = false;

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
}

function clearAuthStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
}

function getLoginPath(): string {
  if (typeof window === 'undefined') {
    return '/login-eleve';
  }
  const userRaw = localStorage.getItem('user');
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      switch (parsed.role) {
        case 'teacher':
          return '/login-professeur';
        case 'staff':
          return '/login-staff';
        case 'admin':
          return '/login-admin-ecole';
        case 'super_admin':
          return '/login-super-admin';
        default:
          return '/login-eleve';
      }
    } catch (error) {
      console.error('Erreur parsing user pour redirection login:', error);
    }
  }
  return '/login-eleve';
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  if (isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;
  const loginPath = getLoginPath();
  clearAuthStorage();
  window.location.href = loginPath;
}

function buildUrl(endpoint: string, params?: Record<string, any>): string {
  if (!params) return endpoint;
  
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const { params, ...fetchOptions } = options;
    
    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...(fetchOptions.headers as Record<string, string>),
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = buildUrl(`${API_BASE_URL}${endpoint}`, params);

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (response.status === 401) {
      handleUnauthorized();
      return {
        success: false,
        error: data.error || 'Authentification requise',
        errors: data.errors,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Erreur HTTP ${response.status}`,
        errors: data.errors,
      };
    }

    return data;
  } catch (error) {
    console.error('Erreur API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion',
    };
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ====================================
// 🆕 NOUVELLE FONCTION: apiCallWithAbort
// ====================================

/**
 * Wrapper API amélioré avec support d'AbortController
 * 
 * ✅ Gère automatiquement le token
 * ✅ Support d'AbortController pour annuler les requêtes
 * ✅ Gestion d'erreurs améliorée
 * 
 * @example
 * const controller = new AbortController()
 * 
 * useEffect(() => {
 *   apiCallWithAbort('/timetable/teacher/123', {}, controller.signal)
 *     .then(data => setEntries(data))
 *   
 *   return () => controller.abort() // Annule au démontage
 * }, [])
 */
export async function apiCallWithAbort<T = any>(
  endpoint: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    signal, // ✅ Support d'AbortController
  });

  const data = await response.json();

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(data.error || 'Authentification requise');
  }

  if (!response.ok) {
    throw new Error(data.error || `Erreur HTTP ${response.status}`);
  }

  return data;
}
