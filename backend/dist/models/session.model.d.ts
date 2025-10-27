import { UserSession } from '../types';
export interface CreateSessionData {
    userId: string;
    token: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresIn: string;
}
export interface SessionFilters {
    userId?: string;
    tokenHash?: string;
    expired?: boolean;
    establishmentId?: string;
}
export declare function createSession(data: CreateSessionData): Promise<UserSession>;
/**
 * Trouve des sessions avec filtres extensibles
 * Future-proof pour multi-tenant
 */
export declare function findSessions(filters?: SessionFilters): Promise<UserSession[]>;
/**
 * Trouve une session par token
 */
export declare function findSessionByToken(token: string): Promise<UserSession | null>;
/**
 * Récupère toutes les sessions actives d'un utilisateur
 */
export declare function getUserActiveSessions(userId: string): Promise<UserSession[]>;
/**
 * Compte les sessions actives d'un utilisateur
 */
export declare function countUserActiveSessions(userId: string): Promise<number>;
export declare function updateSessionActivity(token: string): Promise<void>;
export declare function revokeSession(token: string): Promise<boolean>;
export declare function revokeAllUserSessions(userId: string): Promise<number>;
export declare function revokeOtherSessions(userId: string, currentToken: string): Promise<number>;
export declare function cleanupExpiredSessions(): Promise<number>;
/**
 * Limite le nombre de sessions par utilisateur
 * ✅ CORRIGÉ : Gère les cas où il y a plus de sessions que la limite
 */
export declare function limitUserSessions(userId: string, maxSessions?: number): Promise<number>;
//# sourceMappingURL=session.model.d.ts.map