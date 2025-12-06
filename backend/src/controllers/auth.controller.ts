import { Request, Response } from 'express';
import {
  findUserByEmail,
  updateLastLogin,
  incrementFailedAttempts,
  lockAccount,
  isAccountLocked,
  getUserWithProfile,
  createUser,
  createStudentProfile,
  createTeacherProfile,
  createStaffProfile,
  updatePassword,
  findUserById,
} from '../models/user.model';
import {
  createSession,
  revokeSession,
  revokeAllUserSessions,
  limitUserSessions,
} from '../models/session.model';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader,
  validatePassword,
} from '../utils/auth.utils';
import { LoginResponse, RegisterRequest, UserRole } from '../types';



// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const MAX_SESSIONS_PER_USER = 5;

// =========================
// LOGIN
// =========================

/**
 * Authentifie un utilisateur et génère un token JWT
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validation basique
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis',
      });
      return;
    }

    // Trouver l'utilisateur
    const user = await findUserByEmail(email.toLowerCase().trim());

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect',
      });
      return;
    }

    // Vérifier si le compte est bloqué
    const locked = await isAccountLocked(user.id);
    if (locked) {
      res.status(403).json({
        success: false,
        error: `Compte temporairement bloqué suite à trop de tentatives échouées. Réessayez dans ${LOCK_DURATION_MINUTES} minutes.`,
        locked_until: user.account_locked_until,
      });
      return;
    }

    // Vérifier le mot de passe
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      // Incrémenter les tentatives échouées
      const failedAttempts = await incrementFailedAttempts(user.id);

      // Bloquer le compte si trop de tentatives
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        await lockAccount(user.id, LOCK_DURATION_MINUTES);
        res.status(403).json({
          success: false,
          error: `Trop de tentatives échouées. Compte bloqué pour ${LOCK_DURATION_MINUTES} minutes.`,
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect',
        remaining_attempts: MAX_FAILED_ATTEMPTS - failedAttempts,
      });
      return;
    }

    // Vérifier si le compte est actif
    if (!user.active) {
      res.status(403).json({
        success: false,
        error: 'Compte désactivé. Contactez l\'administrateur.',
      });
      return;
    }

    // Récupérer le profil selon le rôle
    const userWithProfile = await getUserWithProfile(user.id, user.role);
    const profile = userWithProfile?.profile || null;
    // Générer les tokens JWT
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Créer la session en base
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    await createSession({
      userId: user.id,
      token: accessToken,
      deviceInfo,
      ipAddress,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    // Limiter le nombre de sessions
    await limitUserSessions(user.id, MAX_SESSIONS_PER_USER);

    // Mettre à jour la dernière connexion
    await updateLastLogin(user.id);

    const requiresPasswordChange = Boolean(user.must_change_password);
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      profile: profile || undefined,
      must_change_password: user.must_change_password,
    };

    // Réponse avec les données utilisateur (sans le password_hash)
    const response: LoginResponse = {
      success: true,
      token: accessToken,
      refreshToken,
      requiresPasswordChange,
      user: sanitizedUser,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ ERREUR COMPLÈTE lors du login:');
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la connexion',
      debug: error instanceof Error ? error.message : String(error),
    });
  }
}

// =========================
// CHANGE PASSWORD
// =========================

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Le nouveau mot de passe est requis',
      });
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: validation.errors.join('. '),
      });
      return;
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable',
      });
      return;
    }

    const isFirstLogin = user.must_change_password;

    if (!isFirstLogin && (!currentPassword || typeof currentPassword !== 'string')) {
      res.status(400).json({
        success: false,
        error: 'Le mot de passe actuel est requis',
      });
      return;
    }

    if (currentPassword) {
      const passwordMatch = await comparePassword(currentPassword, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          error: 'Mot de passe actuel incorrect',
        });
        return;
      }
    }

    await updatePassword(user.id, newPassword);

    // Révoquer toutes les sessions existantes pour sécuriser le changement
    await revokeAllUserSessions(user.id);

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await createSession({
      userId: user.id,
      token: newAccessToken,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.socket.remoteAddress || 'Unknown',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    await limitUserSessions(user.id, MAX_SESSIONS_PER_USER);

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        must_change_password: false,
      },
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du changement de mot de passe',
    });
  }
}

// =========================
// LOGOUT
// =========================

/**
 * Déconnecte un utilisateur en révoquant sa session
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token manquant',
      });
      return;
    }

    // Révoquer la session
    const revoked = await revokeSession(token);

    if (revoked) {
      res.status(200).json({
        success: true,
        message: 'Déconnexion réussie',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Session introuvable',
      });
    }
  } catch (error) {
    console.error('Erreur lors du logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la déconnexion',
    });
  }
}

// =========================
// LOGOUT ALL (déconnexion de tous les appareils)
// =========================

/**
 * Révoque toutes les sessions d'un utilisateur
 */
export async function logoutAll(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
      return;
    }

    const revokedCount = await revokeAllUserSessions(req.user.userId);

    res.status(200).json({
      success: true,
      message: `${revokedCount} session(s) révoquée(s)`,
      revoked_count: revokedCount,
    });
  } catch (error) {
    console.error('Erreur lors du logout all:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}

// =========================
// REFRESH TOKEN
// =========================

/**
 * Rafraîchit un token JWT expiré
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token manquant',
      });
      return;
    }

    // Vérifier le refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Refresh token invalide ou expiré',
      });
      return;
    }

    // Vérifier que l'utilisateur existe toujours
    const user = await findUserByEmail(decoded.email);
    if (!user || !user.active) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur introuvable ou inactif',
      });
      return;
    }

    // Générer un nouveau token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    const newAccessToken = generateAccessToken(payload);

    // Créer une nouvelle session
    await createSession({
      userId: user.id,
      token: newAccessToken,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || 'Unknown',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    res.status(200).json({
      success: true,
      token: newAccessToken,
    });
  } catch (error) {
    console.error('Erreur lors du refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}

// =========================
// GET CURRENT USER (ME)
// =========================

/**
 * Récupère les informations de l'utilisateur connecté
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
      return;
    }

    // Récupérer les infos complètes avec le profil
    const userWithProfile = await getUserWithProfile(req.user.userId, req.user.role);

    if (!userWithProfile || !userWithProfile.user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable',
      });
      return;
    }

    const user = userWithProfile.user;
    const profile = userWithProfile.profile;

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable',
      });
      return;
    }

    // Ne pas renvoyer le password_hash
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}

// =========================
// REGISTER (inscription - admin seulement)
// =========================

/**
 * Crée un nouvel utilisateur (réservé aux admins)
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, full_name, role, profile_data }: RegisterRequest = req.body;

    // Validation
    if (!email || !password || !full_name || !role) {
      res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis',
      });
      return;
    }

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà',
      });
      return;
    }

    // Créer l'utilisateur
    const user = await createUser({
      email: email.toLowerCase().trim(),
      password,
      role,
      full_name,
    });

    // Créer le profil selon le rôle
    let profile = null;
    switch (role) {
      case 'student':
        profile = await createStudentProfile(user.id, profile_data || {});
        break;
      case 'teacher':
        profile = await createTeacherProfile(user.id, profile_data || {});
        break;
      case 'staff':
        profile = await createStaffProfile(user.id, profile_data || {});       
        break;

    }

    // Ne pas renvoyer le password_hash
    const { password_hash, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        profile: profile || undefined, // où 'profile' peut être StaffProfile, etc.
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création de l\'utilisateur',
    });
  }
}
