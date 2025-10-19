"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helmetConfig = exports.loginLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
// =========================
// Rate Limiting Global
// =========================
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite à 100 requêtes par IP
    message: {
        success: false,
        error: 'Trop de requêtes, veuillez réessayer plus tard',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// =========================
// Rate Limiting pour Login (strict)
// =========================
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limite à 5 tentatives de connexion
    message: {
        success: false,
        error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
    },
    skipSuccessfulRequests: true, // Ne compte que les échecs
    standardHeaders: true,
    legacyHeaders: false,
});
// =========================
// Helmet - Sécurité des headers HTTP
// =========================
exports.helmetConfig = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});
//# sourceMappingURL=security.middleware.js.map