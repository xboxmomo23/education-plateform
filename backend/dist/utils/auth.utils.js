"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.hashToken = hashToken;
exports.generateRandomToken = generateRandomToken;
exports.generateVerificationToken = generateVerificationToken;
exports.generateResetToken = generateResetToken;
exports.validatePassword = validatePassword;
exports.generateTemporaryPassword = generateTemporaryPassword;
exports.extractTokenFromHeader = extractTokenFromHeader;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Constantes de sécurité
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
// =========================
// Hashing de mots de passe
// =========================
/**
 * Hashe un mot de passe avec bcrypt
 */
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
}
/**
 * Compare un mot de passe en clair avec son hash
 */
async function comparePassword(password, hashedPassword) {
    return bcrypt_1.default.compare(password, hashedPassword);
}
// =========================
// Génération de Tokens JWT
// =========================
/**
 * Génère un token JWT d'accès
 */
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'edupilot-api',
        audience: 'edupilot-client',
    });
}
/**
 * Génère un refresh token (durée de vie plus longue)
 */
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'edupilot-api',
        audience: 'edupilot-client',
    });
}
/**
 * Vérifie et décode un token JWT
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            issuer: 'edupilot-api',
            audience: 'edupilot-client',
        });
    }
    catch (error) {
        throw new Error('Token invalide ou expiré');
    }
}
/**
 * Génère un hash du token pour stockage sécurisé en base
 */
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
// =========================
// Génération de tokens aléatoires
// =========================
/**
 * Génère un token aléatoire sécurisé (pour reset password, etc.)
 */
function generateRandomToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Génère un token de vérification d'email
 */
function generateVerificationToken() {
    return generateRandomToken(32);
}
/**
 * Génère un token de réinitialisation de mot de passe
 */
function generateResetToken() {
    return generateRandomToken(32);
}
/**
 * Valide la force d'un mot de passe
 */
function validatePassword(password) {
    const errors = [];
    if (password.length < 12) {
        errors.push('Le mot de passe doit contenir au moins 12 caractères');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Génère un mot de passe temporaire sécurisé
 */
function generateTemporaryPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto_1.default.randomInt(0, charset.length);
        password += charset[randomIndex];
    }
    return password;
}
// =========================
// Extraction du token depuis les headers
// =========================
/**
 * Extrait le token JWT depuis le header Authorization
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader) {
        return null;
    }
    // Format attendu : "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1];
}
//# sourceMappingURL=auth.utils.js.map