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
        .isLength({ min: 8 })
        .withMessage('Le mot de passe doit contenir au moins 8 caractères')
        .matches(/[A-Z]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule')
        .matches(/[a-z]/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule')
        .matches(/[0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre'),
    (0, express_validator_1.body)('full_name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Le nom complet doit contenir au moins 2 caractères'),
    (0, express_validator_1.body)('role')
        .isIn(['student', 'teacher', 'staff', 'parent', 'admin'])
        .withMessage('Rôle invalide'),
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
exports.default = router;
//# sourceMappingURL=auth.routes.js.map