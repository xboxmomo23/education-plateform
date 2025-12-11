"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
// =========================
// Validation Schemas
// =========================
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
];
const registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .optional({ checkFalsy: true })
        .isLength({ min: 12 })
        .withMessage('Le mot de passe doit contenir au moins 12 caractères')
        .matches(/[A-Z]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule')
        .matches(/[0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre')
        .matches(/[^A-Za-z0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
    (0, express_validator_1.body)('full_name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Le nom complet doit contenir au moins 2 caractères'),
    (0, express_validator_1.body)('role')
        .isIn(['student', 'teacher', 'staff', 'parent', 'admin'])
        .withMessage('Rôle invalide'),
];
const requestPasswordResetValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail(),
];
const resetPasswordValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Token requis'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 12 })
        .withMessage('Le mot de passe doit contenir au moins 12 caractères')
        .matches(/[A-Z]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule')
        .matches(/[0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre')
        .matches(/[^A-Za-z0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
];
const acceptInviteValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Token requis'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 12 })
        .withMessage('Le mot de passe doit contenir au moins 12 caractères')
        .matches(/[A-Z]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule')
        .matches(/[0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre')
        .matches(/[^A-Za-z0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
];
const sendInviteValidation = [
    (0, express_validator_1.body)('userId')
        .isUUID()
        .withMessage('userId invalide'),
];
const refreshTokenValidation = [
    (0, express_validator_1.body)('refreshToken')
        .notEmpty()
        .withMessage('Refresh token requis'),
];
// =========================
// Routes Publiques
// =========================
/**
 * POST /api/auth/login
 * Authentifie un utilisateur
 */
router.post('/login', loginValidation, validation_middleware_1.validateRequest, auth_controller_1.login);
/**
 * POST /api/auth/request-password-reset
 * Envoie un lien de réinitialisation
 */
router.post('/request-password-reset', requestPasswordResetValidation, validation_middleware_1.validateRequest, auth_controller_1.requestPasswordReset);
/**
 * POST /api/auth/reset-password
 * Réinitialise un mot de passe via token
 */
router.post('/reset-password', resetPasswordValidation, validation_middleware_1.validateRequest, auth_controller_1.resetPassword);
/**
 * POST /api/auth/accept-invite
 * Active un compte via invitation
 */
router.post('/accept-invite', acceptInviteValidation, validation_middleware_1.validateRequest, auth_controller_1.acceptInvite);
/**
 * POST /api/auth/refresh
 * Rafraîchit un token expiré
 */
router.post('/refresh', refreshTokenValidation, validation_middleware_1.validateRequest, auth_controller_1.refreshToken);
// =========================
// Routes Protégées
// =========================
/**
 * POST /api/auth/logout
 * Déconnecte l'utilisateur actuel
 */
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logout);
/**
 * POST /api/auth/logout-all
 * Déconnecte l'utilisateur de tous les appareils
 */
router.post('/logout-all', auth_middleware_1.authenticate, auth_controller_1.logoutAll);
/**
 * POST /api/auth/change-password
 * Met à jour le mot de passe de l'utilisateur
 */
router.post('/change-password', auth_middleware_1.authenticate, auth_controller_1.changePasswordHandler);
/**
 * GET /api/auth/me
 * Récupère les informations de l'utilisateur connecté
 */
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getCurrentUser);
// =========================
// Routes Admin
// =========================
/**
 * POST /api/auth/register
 * Crée un nouvel utilisateur (admin seulement)
 */
router.post('/register', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), registerValidation, validation_middleware_1.validateRequest, auth_controller_1.register);
/**
 * POST /api/auth/send-invite
 * Génère un lien d'invitation pour un utilisateur
 */
router.post('/send-invite', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), sendInviteValidation, validation_middleware_1.validateRequest, auth_controller_1.sendInvite);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map