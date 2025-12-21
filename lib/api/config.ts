// Configuration de l'API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    refresh: '/auth/refresh',
    me: '/auth/me',
    register: '/auth/register',
    changePassword: '/auth/change-password',
    requestPasswordReset: '/auth/request-password-reset',
    resetPassword: '/auth/reset-password',
    acceptInvite: '/auth/accept-invite',
    sendInvite: '/auth/send-invite',
  },
};

// Fonction helper pour construire les URLs
export function buildApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
