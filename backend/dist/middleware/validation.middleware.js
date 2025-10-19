"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const express_validator_1 = require("express-validator");
/**
 * Middleware pour valider les requêtes avec express-validator
 */
function validateRequest(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: 'Erreurs de validation',
            errors: errors.array().map((err) => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg,
            })),
        });
        return;
    }
    next();
}
//# sourceMappingURL=validation.middleware.js.map