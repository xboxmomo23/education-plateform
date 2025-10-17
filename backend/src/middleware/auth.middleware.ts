import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth.utils';
import { findSessionByToken, updateSessionActivity } from '../models/session.model';
import { findUserById } from '../models/user.model';
import { UserRole, JWTPayload } from '../types';

// Extension de l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// =========================
// Middleware d'authentification
// =========================

/**
 * Vérifie qu'un utilisateur est authentifié
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extraire le token du header Authorization
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant',
      });
      return;
    }
    
    // Vérifier la validité du token JWT
    let decoded: JWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token invalide ou expiré',
      });
      return;
    }
    
    // Vérifier que la session existe toujours en base
    const session = await findSessionByToken(token);
    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Session expirée ou révoquée',
      });
      return;
    }
    
    // Vérifier que l'utilisateur existe et est actif
    const user = await findUserById(decoded.userId);
    if (!user || !user.active || user.deleted_at) {
      res.status(401).json({
        success: false,
        error: 'Compte utilisateur inactif ou supprimé',
      });
      return;
    }
    
    // Mettre à jour l'activité de la session
    await updateSessionActivity(token);
    
    // Attacher l'utilisateur à la requête
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'authentification',
    });
  }
}

// =========================
// Middleware d'autorisation par rôle
// =========================

/**
 * Vérifie que l'utilisateur a un des rôles autorisés
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Accès refusé : permissions insuffisantes',
        required_role: allowedRoles,
        your_role: req.user.role,
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware combiné : authentification + autorisation
 */
export function requireRole(...roles: UserRole[]) {
  return [authenticate, authorize(...roles)];
}

// =========================
// Middleware optionnel (si token présent)
// =========================

/**
 * Authentifie l'utilisateur si un token est présent, mais continue sinon
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      // Pas de token, on continue sans authentification
      next();
      return;
    }
    
    // Tenter de décoder le token
    try {
      const decoded = verifyToken(token);
      const session = await findSessionByToken(token);
      
      if (session) {
        const user = await findUserById(decoded.userId);
        if (user && user.active && !user.deleted_at) {
          req.user = decoded;
          await updateSessionActivity(token);
        }
      }
    } catch (error) {
      // Token invalide, on continue sans authentification
    }
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification optionnelle:', error);
    next();
  }
}

// =========================
// Middleware de vérification du compte
// =========================

/**
 * Vérifie que le compte n'est pas bloqué
 */
export async function checkAccountStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }
  
  try {
    const user = await findUserById(req.user.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur introuvable',
      });
      return;
    }
    
    // Vérifier si le compte est bloqué
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      res.status(403).json({
        success: false,
        error: 'Compte temporairement bloqué',
        locked_until: user.account_locked_until,
      });
      return;
    }
    
    // Vérifier si le compte est actif
    if (!user.active) {
      res.status(403).json({
        success: false,
        error: 'Compte désactivé',
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Erreur de vérification du compte:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}