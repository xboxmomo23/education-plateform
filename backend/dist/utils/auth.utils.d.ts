import { JWTPayload, DecodedToken } from '../types';
/**
 * Hashe un mot de passe avec bcrypt
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Compare un mot de passe en clair avec son hash
 */
export declare function comparePassword(password: string, hashedPassword: string): Promise<boolean>;
/**
 * Génère un token JWT d'accès
 */
export declare function generateAccessToken(payload: JWTPayload): string;
/**
 * Génère un refresh token (durée de vie plus longue)
 */
export declare function generateRefreshToken(payload: JWTPayload): string;
/**
 * Vérifie et décode un token JWT
 */
export declare function verifyToken(token: string): DecodedToken;
/**
 * Génère un hash du token pour stockage sécurisé en base
 */
export declare function hashToken(token: string): string;
/**
 * Génère un token aléatoire sécurisé (pour reset password, etc.)
 */
export declare function generateRandomToken(length?: number): string;
/**
 * Génère un token de vérification d'email
 */
export declare function generateVerificationToken(): string;
/**
 * Génère un token de réinitialisation de mot de passe
 */
export declare function generateResetToken(): string;
export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
}
/**
 * Valide la force d'un mot de passe
 */
export declare function validatePassword(password: string): PasswordValidation;
/**
 * Génère un mot de passe temporaire sécurisé
 */
export declare function generateTemporaryPassword(): string;
/**
 * Extrait le token JWT depuis le header Authorization
 */
export declare function extractTokenFromHeader(authHeader: string | undefined): string | null;
//# sourceMappingURL=auth.utils.d.ts.map