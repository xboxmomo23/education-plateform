import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  logout,
  logoutAll,
  refreshToken,
  getCurrentUser,
  register,
  changePasswordHandler,
} from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// =========================
// Validation Schemas
// =========================

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
];

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Le mot de passe doit contenir au moins 12 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
  body('full_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom complet doit contenir au moins 2 caractères'),
  body('role')
    .isIn(['student', 'teacher', 'staff', 'parent', 'admin'])
    .withMessage('Rôle invalide'),
];

const refreshTokenValidation = [
  body('refreshToken')
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
router.post('/login', loginValidation, validateRequest, login);

/**
 * POST /api/auth/refresh
 * Rafraîchit un token expiré
 */
router.post('/refresh', refreshTokenValidation, validateRequest, refreshToken);

// =========================
// Routes Protégées
// =========================

/**
 * POST /api/auth/logout
 * Déconnecte l'utilisateur actuel
 */
router.post('/logout', authenticate, logout);

/**
 * POST /api/auth/logout-all
 * Déconnecte l'utilisateur de tous les appareils
 */
router.post('/logout-all', authenticate, logoutAll);

/**
 * POST /api/auth/change-password
 * Met à jour le mot de passe de l'utilisateur
 */
router.post('/change-password', authenticate, changePasswordHandler);

/**
 * GET /api/auth/me
 * Récupère les informations de l'utilisateur connecté
 */
router.get('/me', authenticate, getCurrentUser);

// =========================
// Routes Admin
// =========================

/**
 * POST /api/auth/register
 * Crée un nouvel utilisateur (admin seulement)
 */
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  registerValidation,
  validateRequest,
  register
);

export default router;
