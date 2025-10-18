import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload, DecodedToken } from '../types';

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
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare un mot de passe en clair avec son hash
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// =========================
// Génération de Tokens JWT
// =========================

/**
 * Génère un token JWT d'accès
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'edupilot-api',
    audience: 'edupilot-client',
  } as jwt.SignOptions);
}

/**
 * Génère un refresh token (durée de vie plus longue)
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'edupilot-api',
    audience: 'edupilot-client',
  } as jwt.SignOptions);
}

/**
 * Vérifie et décode un token JWT
 */
export function verifyToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'edupilot-api',
      audience: 'edupilot-client',
    } as jwt.VerifyOptions) as DecodedToken;
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
}

/**
 * Génère un hash du token pour stockage sécurisé en base
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// =========================
// Génération de tokens aléatoires
// =========================

/**
 * Génère un token aléatoire sécurisé (pour reset password, etc.)
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Génère un token de vérification d'email
 */
export function generateVerificationToken(): string {
  return generateRandomToken(32);
}

/**
 * Génère un token de réinitialisation de mot de passe
 */
export function generateResetToken(): string {
  return generateRandomToken(32);
}

// =========================
// Validation de mots de passe
// =========================

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Valide la force d'un mot de passe
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Génère un mot de passe temporaire sécurisé
 */
export function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
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
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
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

