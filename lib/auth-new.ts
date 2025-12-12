import { api, saveToken } from './api/client';
import { API_ENDPOINTS } from './api/config';

export type UserRole = "student" | "teacher" | "admin" | "staff" | "parent" | "super_admin";

export interface ParentChildSummary {
  id: string;
  full_name: string;
  email?: string | null;
  student_number?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  relation_type?: string | null;
  is_primary?: boolean | null;
  can_view_grades?: boolean | null;
  can_view_attendance?: boolean | null;
  receive_notifications?: boolean | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  profile?: any;
  must_change_password?: boolean;
  parentChildren?: ParentChildSummary[];
}

export interface BackendLoginResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
  requiresPasswordChange?: boolean;
  children?: ParentChildSummary[];
}

export interface AuthResult {
  success: boolean;
  user?: User;
  requiresPasswordChange?: boolean;
  error?: string;
  children?: ParentChildSummary[];
}

interface AuthenticateCredentials {
  email: string;
  password: string;
}

interface AuthenticateOptions {
  expectedRole?: UserRole;
}

export async function authenticateUser(
  credentials: AuthenticateCredentials,
  options: AuthenticateOptions = {}
): Promise<AuthResult> {
  try {
    const { email, password } = credentials;
    const response = await api.post<BackendLoginResponse>(API_ENDPOINTS.auth.login, {
      email,
      password,
    });

    if (response.success) {
      // ✅ Accès direct aux propriétés (le backend retourne directement, pas dans "data")
      const token = (response as any).token || response.data?.token;
      const refreshToken = (response as any).refreshToken || response.data?.refreshToken;
      const user = (response as any).user || response.data?.user;
      const children = ((response as any).children ?? response.data?.children) as ParentChildSummary[] | undefined;

      if (!token) {
        return {
          success: false,
          error: 'Token manquant dans la réponse du serveur',
        };
      }

      if (!user) {
        return {
          success: false,
          error: 'Utilisateur manquant dans la réponse du serveur',
        };
      }

      if (options.expectedRole && user.role !== options.expectedRole) {
        throw new Error(`Ce compte n'est pas un compte ${getRoleLabel(options.expectedRole)}`);
      }

      // Sauvegarder le token
      saveToken(token);
      
      // Sauvegarder le refresh token si présent
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      const normalizedChildren = Array.isArray(children) ? children : undefined;
      const userForSession =
        user.role === 'parent'
          ? { ...user, parentChildren: normalizedChildren ?? [] }
          : user;

      // Sauvegarder la session utilisateur
      setUserSession(userForSession);

      const requiresPasswordChange =
        (response as any).requiresPasswordChange ??
        response.data?.requiresPasswordChange ??
        false;

      return {
        success: true,
        user: userForSession,
        requiresPasswordChange: Boolean(requiresPasswordChange),
        children: normalizedChildren,
      };
    }

    return {
      success: false,
      error: response.error || 'Échec de la connexion',
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Ce compte')) {
      throw error;
    }
    return {
      success: false,
      error: 'Erreur de connexion au serveur',
    };
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'student': return 'élève';
    case 'teacher': return 'professeur';
    case 'admin': return 'administrateur';
    case 'staff': return 'staff';
    case 'parent': return 'parent';
    case 'super_admin': return 'super administrateur';
    default: return 'utilisateur';
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

export interface PasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  try {
    const response = await api.post(API_ENDPOINTS.auth.requestPasswordReset, { email });
    if (response.success) {
      return {
        success: true,
        message:
          response.message ||
          'Si un compte existe, un email de réinitialisation a été envoyé.',
      };
    }

    return {
      success: false,
      error: response.error || 'Impossible d\'envoyer la demande.',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de connexion au serveur',
    };
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<PasswordResetResponse> {
  try {
    const response = await api.post(API_ENDPOINTS.auth.resetPassword, { token, newPassword });
    if (response.success) {
      return {
        success: true,
        message: response.message || 'Mot de passe réinitialisé avec succès.',
      };
    }

    return {
      success: false,
      error: response.error || 'Impossible de réinitialiser le mot de passe.',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de connexion au serveur',
    };
  }
}

export async function acceptInvite(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const trimmedToken = token.trim();
    const response = await api.post<BackendLoginResponse>(API_ENDPOINTS.auth.acceptInvite, {
      token: trimmedToken,
      newPassword,
    });

    if (response.success) {
      const tokenValue = (response as any).token || response.data?.token;
      const refreshToken = (response as any).refreshToken || response.data?.refreshToken;
      const user = (response as any).user || response.data?.user;
      const children = ((response as any).children ?? response.data?.children) as ParentChildSummary[] | undefined;

      if (tokenValue) {
        saveToken(tokenValue);
      }

      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      const normalizedChildren = Array.isArray(children) ? children : undefined;
      let userForSession = user;
      if (user && user.role === 'parent') {
        userForSession = { ...user, parentChildren: normalizedChildren ?? [] };
      } else if (user && normalizedChildren) {
        userForSession = { ...user, parentChildren: normalizedChildren };
      }

      if (userForSession) {
        setUserSession(userForSession);
      }

      return { success: true, user: userForSession, children: normalizedChildren };
    }

    return {
      success: false,
      error: response.error || 'Impossible d\'activer le compte',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de connexion au serveur',
    };
  }
}
