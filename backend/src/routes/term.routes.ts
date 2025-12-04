import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createTermHandler,
  getTermsHandler,
  getCurrentTermHandler,
  getTermByIdHandler,
  updateTermHandler,
  deleteTermHandler,
} from '../controllers/term.controller';

const router = Router();

// =========================
// Validation Schemas
// =========================

const createTermValidation = [
  body('academicYear')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('Année académique invalide'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ max: 100 })
    .withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('startDate')
    .isISO8601()
    .withMessage('Date de début invalide'),
  body('endDate')
    .isISO8601()
    .withMessage('Date de fin invalide'),
  body('isCurrent')
    .optional()
    .isBoolean()
    .withMessage('isCurrent doit être un booléen'),
];

const updateTermValidation = [
  param('id').isUUID().withMessage('ID invalide'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom ne peut pas être vide')
    .isLength({ max: 100 })
    .withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Date de début invalide'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Date de fin invalide'),
  body('isCurrent')
    .optional()
    .isBoolean()
    .withMessage('isCurrent doit être un booléen'),
];

// =========================
// ROUTES
// =========================

/**
 * POST /api/terms
 * Créer une nouvelle période
 * Accès : admin, staff
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createTermValidation,
  validateRequest,
  createTermHandler
);

/**
 * GET /api/terms
 * Liste des périodes de l'établissement
 * Accès : tous les utilisateurs authentifiés
 */
router.get(
  '/',
  authenticate,
  query('academicYear').optional().isInt(),
  validateRequest,
  getTermsHandler
);

/**
 * GET /api/terms/current
 * Récupère la période courante
 * Accès : tous les utilisateurs authentifiés
 */
router.get(
  '/current',
  authenticate,
  getCurrentTermHandler
);

/**
 * GET /api/terms/:id
 * Détails d'une période
 * Accès : tous les utilisateurs authentifiés
 */
router.get(
  '/:id',
  authenticate,
  param('id').isUUID(),
  validateRequest,
  getTermByIdHandler
);

/**
 * PUT /api/terms/:id
 * Modifier une période
 * Accès : admin, staff
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateTermValidation,
  validateRequest,
  updateTermHandler
);

/**
 * DELETE /api/terms/:id
 * Supprimer une période
 * Accès : admin uniquement
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  param('id').isUUID(),
  validateRequest,
  deleteTermHandler
);

export default router;