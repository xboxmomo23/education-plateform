// Configuration de l'API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    refresh: '/auth/refresh',
    me: '/auth/me',
    register: '/auth/register',
  },
};

// Fonction helper pour construire les URLs
export function buildApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}