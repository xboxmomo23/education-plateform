"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const term_controller_1 = require("../controllers/term.controller");
const router = (0, express_1.Router)();
// =========================
// Validation Schemas
// =========================
const createTermValidation = [
    (0, express_validator_1.body)('academicYear')
        .isInt({ min: 2020, max: 2100 })
        .withMessage('Année académique invalide'),
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Le nom est requis')
        .isLength({ max: 100 })
        .withMessage('Le nom ne doit pas dépasser 100 caractères'),
    (0, express_validator_1.body)('startDate')
        .isISO8601()
        .withMessage('Date de début invalide'),
    (0, express_validator_1.body)('endDate')
        .isISO8601()
        .withMessage('Date de fin invalide'),
    (0, express_validator_1.body)('isCurrent')
        .optional()
        .isBoolean()
        .withMessage('isCurrent doit être un booléen'),
];
const updateTermValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('ID invalide'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Le nom ne peut pas être vide')
        .isLength({ max: 100 })
        .withMessage('Le nom ne doit pas dépasser 100 caractères'),
    (0, express_validator_1.body)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Date de début invalide'),
    (0, express_validator_1.body)('endDate')
        .optional()
        .isISO8601()
        .withMessage('Date de fin invalide'),
    (0, express_validator_1.body)('isCurrent')
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
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin', 'staff'), createTermValidation, validation_middleware_1.validateRequest, term_controller_1.createTermHandler);
/**
 * GET /api/terms
 * Liste des périodes de l'établissement
 * Accès : tous les utilisateurs authentifiés
 */
router.get('/', auth_middleware_1.authenticate, (0, express_validator_1.query)('academicYear').optional().isInt(), validation_middleware_1.validateRequest, term_controller_1.getTermsHandler);
/**
 * GET /api/terms/current
 * Récupère la période courante
 * Accès : tous les utilisateurs authentifiés
 */
router.get('/current', auth_middleware_1.authenticate, term_controller_1.getCurrentTermHandler);
/**
 * GET /api/terms/:id
 * Détails d'une période
 * Accès : tous les utilisateurs authentifiés
 */
router.get('/:id', auth_middleware_1.authenticate, (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, term_controller_1.getTermByIdHandler);
/**
 * PUT /api/terms/:id
 * Modifier une période
 * Accès : admin, staff
 */
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin', 'staff'), updateTermValidation, validation_middleware_1.validateRequest, term_controller_1.updateTermHandler);
/**
 * DELETE /api/terms/:id
 * Supprimer une période
 * Accès : admin uniquement
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), (0, express_validator_1.param)('id').isUUID(), validation_middleware_1.validateRequest, term_controller_1.deleteTermHandler);
exports.default = router;
//# sourceMappingURL=term.routes.js.map