"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
exports.logoutAll = logoutAll;
exports.refreshToken = refreshToken;
exports.getCurrentUser = getCurrentUser;
exports.register = register;
const user_model_1 = require("../models/user.model");
const session_model_1 = require("../models/session.model");
const auth_utils_1 = require("../utils/auth.utils");
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
async function login(req, res) {
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
        const user = await (0, user_model_1.findUserByEmail)(email.toLowerCase().trim());
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Email ou mot de passe incorrect',
            });
            return;
        }
        // Vérifier si le compte est bloqué
        const locked = await (0, user_model_1.isAccountLocked)(user.id);
        if (locked) {
            res.status(403).json({
                success: false,
                error: `Compte temporairement bloqué suite à trop de tentatives échouées. Réessayez dans ${LOCK_DURATION_MINUTES} minutes.`,
                locked_until: user.account_locked_until,
            });
            return;
        }
        // Vérifier le mot de passe
        const passwordMatch = await (0, auth_utils_1.comparePassword)(password, user.password_hash);
        if (!passwordMatch) {
            // Incrémenter les tentatives échouées
            const failedAttempts = await (0, user_model_1.incrementFailedAttempts)(user.id);
            // Bloquer le compte si trop de tentatives
            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                await (0, user_model_1.lockAccount)(user.id, LOCK_DURATION_MINUTES);
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
        const userWithProfile = await (0, user_model_1.getUserWithProfile)(user.id, user.role);
        const profile = userWithProfile?.profile || null;
        // Générer les tokens JWT
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
        };
        const accessToken = (0, auth_utils_1.generateAccessToken)(payload);
        const refreshToken = (0, auth_utils_1.generateRefreshToken)(payload);
        // Créer la session en base
        const deviceInfo = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
        await (0, session_model_1.createSession)({
            userId: user.id,
            token: accessToken,
            deviceInfo,
            ipAddress,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        });
        // Limiter le nombre de sessions
        await (0, session_model_1.limitUserSessions)(user.id, MAX_SESSIONS_PER_USER);
        // Mettre à jour la dernière connexion
        await (0, user_model_1.updateLastLogin)(user.id);
        // Réponse avec les données utilisateur (sans le password_hash)
        const response = {
            success: true,
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                profile: profile || undefined,
            },
        };
        res.status(200).json(response);
    }
    catch (error) {
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
// LOGOUT
// =========================
/**
 * Déconnecte un utilisateur en révoquant sa session
 */
async function logout(req, res) {
    try {
        const token = (0, auth_utils_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(400).json({
                success: false,
                error: 'Token manquant',
            });
            return;
        }
        // Révoquer la session
        const revoked = await (0, session_model_1.revokeSession)(token);
        if (revoked) {
            res.status(200).json({
                success: true,
                message: 'Déconnexion réussie',
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Session introuvable',
            });
        }
    }
    catch (error) {
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
async function logoutAll(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentification requise',
            });
            return;
        }
        const revokedCount = await (0, session_model_1.revokeAllUserSessions)(req.user.userId);
        res.status(200).json({
            success: true,
            message: `${revokedCount} session(s) révoquée(s)`,
            revoked_count: revokedCount,
        });
    }
    catch (error) {
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
async function refreshToken(req, res) {
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
            decoded = (0, auth_utils_1.verifyToken)(refreshToken);
        }
        catch (error) {
            res.status(401).json({
                success: false,
                error: 'Refresh token invalide ou expiré',
            });
            return;
        }
        // Vérifier que l'utilisateur existe toujours
        const user = await (0, user_model_1.findUserByEmail)(decoded.email);
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
        const newAccessToken = (0, auth_utils_1.generateAccessToken)(payload);
        // Créer une nouvelle session
        await (0, session_model_1.createSession)({
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
    }
    catch (error) {
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
async function getCurrentUser(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentification requise',
            });
            return;
        }
        // Récupérer les infos complètes avec le profil
        const userWithProfile = await (0, user_model_1.getUserWithProfile)(req.user.userId, req.user.role);
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
    }
    catch (error) {
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
async function register(req, res) {
    try {
        const { email, password, full_name, role, profile_data } = req.body;
        // Validation
        if (!email || !password || !full_name || !role) {
            res.status(400).json({
                success: false,
                error: 'Tous les champs sont requis',
            });
            return;
        }
        // Vérifier que l'email n'existe pas déjà
        const existingUser = await (0, user_model_1.findUserByEmail)(email);
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: 'Un utilisateur avec cet email existe déjà',
            });
            return;
        }
        // Créer l'utilisateur
        const user = await (0, user_model_1.createUser)({
            email: email.toLowerCase().trim(),
            password,
            role,
            full_name,
        });
        // Créer le profil selon le rôle
        let profile = null;
        switch (role) {
            case 'student':
                profile = await (0, user_model_1.createStudentProfile)(user.id, profile_data || {});
                break;
            case 'teacher':
                profile = await (0, user_model_1.createTeacherProfile)(user.id, profile_data || {});
                break;
            case 'staff':
                profile = await (0, user_model_1.createStaffProfile)(user.id, profile_data || {});
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
    }
    catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la création de l\'utilisateur',
        });
    }
}
//# sourceMappingURL=auth.controller.js.map