import { api, saveToken, clearToken } from './api/client';
import { API_ENDPOINTS } from './api/config';

export type UserRole = "student" | "teacher" | "admin" | "staff" | "super_admin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  profile?: any;
  must_change_password?: boolean;
}

export interface BackendLoginResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
  requiresPasswordChange?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  requiresPasswordChange?: boolean;
  error?: string;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const response = await api.post<BackendLoginResponse>(API_ENDPOINTS.auth.login, {
      email,
      password,
    });

    if (response.success) {
      // ✅ Accès direct aux propriétés (le backend retourne directement, pas dans "data")
      const token = (response as any).token || response.data?.token;
      const refreshToken = (response as any).refreshToken || response.data?.refreshToken;
      const user = (response as any).user || response.data?.user;

      if (!token) {
        return {
          success: false,
          error: 'Token manquant dans la réponse du serveur',
        };
      }

      // Sauvegarder le token
      saveToken(token);
      
      // Sauvegarder le refresh token si présent
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      // Sauvegarder la session utilisateur
      setUserSession(user);

      const requiresPasswordChange =
        (response as any).requiresPasswordChange ??
        response.data?.requiresPasswordChange ??
        false;

      return { success: true, user, requiresPasswordChange: Boolean(requiresPasswordChange) };
    }

    return {
      success: false,
      error: response.error || 'Échec de la connexion',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de connexion au serveur',
    };
  }
}

export function setUserSession(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function getUserSession(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Erreur parsing user session:', error);
        return null;
      }
    }
  }
  return null;
}

export async function clearUserSession(): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.auth.logout);
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  }
}

interface ChangePasswordPayload {
  newPassword: string;
  currentPassword?: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<AuthResult> {
  try {
    const response = await api.post<BackendLoginResponse>(API_ENDPOINTS.auth.changePassword, payload);

    if (response.success) {
      const token = (response as any).token || response.data?.token;
      const refreshToken = (response as any).refreshToken || response.data?.refreshToken;
      const user = (response as any).user || response.data?.user;

      if (token) {
        saveToken(token);
      }

      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      if (user) {
        setUserSession(user);
      }

      return { success: true, user };
    }

    return {
      success: false,
      error: response.error || 'Impossible de changer le mot de passe',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de connexion au serveur',
    };
  }
}
