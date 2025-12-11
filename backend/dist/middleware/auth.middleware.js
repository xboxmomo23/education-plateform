"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.requireRole = requireRole;
exports.optionalAuthenticate = optionalAuthenticate;
exports.checkAccountStatus = checkAccountStatus;
const auth_utils_1 = require("../utils/auth.utils");
const session_model_1 = require("../models/session.model");
const user_model_1 = require("../models/user.model");
const database_1 = __importDefault(require("../config/database"));
async function fetchAssignedClassIds(userId, role) {
    if (role !== 'teacher' && role !== 'staff') {
        return undefined;
    }
    const table = role === 'teacher' ? 'teacher_profiles' : 'staff_profiles';
    const result = await database_1.default.query(`SELECT assigned_class_ids FROM ${table} WHERE user_id = $1`, [userId]);
    const assigned = result.rows[0]?.assigned_class_ids;
    return assigned ? assigned.filter(Boolean) : [];
}
// =========================
// Middleware d'authentification
// =========================
/**
 * Vérifie qu'un utilisateur est authentifié
 * Future-proof: inclut le contexte establishment
 */
async function authenticate(req, res, next) {
    try {
        const token = (0, auth_utils_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Token d\'authentification manquant',
            });
            return;
        }
        let decoded;
        try {
            decoded = (0, auth_utils_1.verifyToken)(token);
        }
        catch (error) {
            res.status(401).json({
                success: false,
                error: 'Token invalide ou expiré',
            });
            return;
        }
        const session = await (0, session_model_1.findSessionByToken)(token);
        if (!session) {
            res.status(401).json({
                success: false,
                error: 'Session expirée ou révoquée',
            });
            return;
        }
        const user = await (0, user_model_1.findUserById)(decoded.userId);
        if (!user || !user.active || user.deleted_at) {
            res.status(401).json({
                success: false,
                error: 'Compte utilisateur inactif ou supprimé',
            });
            return;
        }
        await (0, session_model_1.updateSessionActivity)(token);
        const assignedClassIds = await fetchAssignedClassIds(user.id, user.role);
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            establishmentId: user.establishment_id || undefined,
            assignedClassIds,
        };
        next();
    }
    catch (error) {
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
function authorize(...allowedRoles) {
    return (req, res, next) => {
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
                required_roles: allowedRoles,
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
function requireRole(...roles) {
    return [authenticate, authorize(...roles)];
}
// =========================
// Middleware optionnel (si token présent)
// =========================
/**
 * Authentifie l'utilisateur si un token est présent, mais continue sinon
 */
async function optionalAuthenticate(req, res, next) {
    try {
        const token = (0, auth_utils_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            next();
            return;
        }
        try {
            const decoded = (0, auth_utils_1.verifyToken)(token);
            const session = await (0, session_model_1.findSessionByToken)(token);
            if (session) {
                const user = await (0, user_model_1.findUserById)(decoded.userId);
                if (user && user.active && !user.deleted_at) {
                    const assignedClassIds = await fetchAssignedClassIds(user.id, user.role);
                    req.user = {
                        userId: user.id,
                        email: user.email,
                        role: user.role,
                        full_name: user.full_name,
                        establishmentId: user.establishment_id || undefined,
                        assignedClassIds,
                    };
                    await (0, session_model_1.updateSessionActivity)(token);
                }
            }
        }
        catch (error) {
            // Token invalide, on continue sans authentification
        }
        next();
    }
    catch (error) {
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
async function checkAccountStatus(req, res, next) {
    if (!req.user) {
        next();
        return;
    }
    try {
        const user = await (0, user_model_1.findUserById)(req.user.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Utilisateur introuvable',
            });
            return;
        }
        if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
            res.status(403).json({
                success: false,
                error: 'Compte temporairement bloqué',
                locked_until: user.account_locked_until,
            });
            return;
        }
        if (!user.active) {
            res.status(403).json({
                success: false,
                error: 'Compte désactivé',
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Erreur de vérification du compte:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
        });
    }
}
// =========================
// Future: Middleware Multi-tenant
// =========================
/**
 * Middleware pour isoler les données par établissement
 * À activer lors de la migration multi-tenant
 */
/*
export async function enforceEstablishmentIsolation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.establishmentId) {
    res.status(403).json({
      success: false,
      error: 'Établissement non identifié',
    });
    return;
  }
  
  // Vérifier que l'utilisateur appartient bien à cet établissement
  const user = await findUserById(req.user.userId);
  
  if (user.establishment_id !== req.user.establishmentId) {
    res.status(403).json({
      success: false,
      error: 'Accès interdit à cet établissement',
    });
    return;
  }
  
  next();
}
*/
//# sourceMappingURL=auth.middleware.js.map