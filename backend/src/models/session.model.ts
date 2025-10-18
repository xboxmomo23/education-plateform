import { pool } from '../config/database';
import { UserSession } from '../types';
import { hashToken } from '../utils/auth.utils';
import { QueryBuilder } from '../utils/query-builder';

// =========================
// Interfaces
// =========================

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
  // Future: Multi-tenant
  establishmentId?: string;
}

// =========================
// Création de sessions
// =========================

export async function createSession(data: CreateSessionData): Promise<UserSession> {
  const { userId, token, deviceInfo, ipAddress, expiresIn } = data;
  
  const token_hash = hashToken(token);
  const expiresAt = calculateExpiration(expiresIn);
  
  const query = `
    INSERT INTO user_sessions (
      user_id, token_hash, device_info, ip_address, expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const values = [userId, token_hash, deviceInfo || null, ipAddress || null, expiresAt];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

function calculateExpiration(duration: string): Date {
  const now = new Date();
  
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Format de durée invalide');
  }
  
  const [, value, unit] = match;
  const numValue = parseInt(value);
  
  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + numValue);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + numValue);
      break;
    case 'h':
      now.setHours(now.getHours() + numValue);
      break;
    case 'd':
      now.setDate(now.getDate() + numValue);
      break;
  }
  
  return now;
}

// =========================
// Récupération de sessions (REFACTORÉ)
// =========================

/**
 * Trouve des sessions avec filtres extensibles
 * Future-proof pour multi-tenant
 */
export async function findSessions(filters: SessionFilters = {}): Promise<UserSession[]> {
  const qb = new QueryBuilder();
  
  if (filters.userId) {
    qb.addCondition('user_id', filters.userId);
  }
  
  if (filters.tokenHash) {
    qb.addCondition('token_hash', filters.tokenHash);
  }
  
  if (filters.expired === false) {
    qb.addCondition('expires_at', 'NOW()', '>');
  } else if (filters.expired === true) {
    qb.addCondition('expires_at', 'NOW()', '<');
  }
  
  // Future: Multi-tenant via JOIN avec users
  // if (filters.establishmentId) {
  //   // Nécessite un JOIN avec users pour filter par establishment_id
  // }
  
  const { where, values } = qb.build();
  
  const query = `
    SELECT * FROM user_sessions 
    ${where}
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Trouve une session par token
 */
export async function findSessionByToken(token: string): Promise<UserSession | null> {
  const token_hash = hashToken(token);
  const sessions = await findSessions({ tokenHash: token_hash, expired: false });
  return sessions[0] || null;
}

/**
 * Récupère toutes les sessions actives d'un utilisateur
 */
export async function getUserActiveSessions(userId: string): Promise<UserSession[]> {
  return findSessions({ userId, expired: false });
}

/**
 * Compte les sessions actives d'un utilisateur
 */
export async function countUserActiveSessions(userId: string): Promise<number> {
  const query = `
    SELECT COUNT(*) as count 
    FROM user_sessions 
    WHERE user_id = $1 AND expires_at > NOW()
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count);
}

// =========================
// Mise à jour de sessions
// =========================

export async function updateSessionActivity(token: string): Promise<void> {
  const token_hash = hashToken(token);
  
  const query = `
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE token_hash = $1
  `;
  
  await pool.query(query, [token_hash]);
}

// =========================
// Suppression de sessions
// =========================

export async function revokeSession(token: string): Promise<boolean> {
  const token_hash = hashToken(token);
  
  const query = `
    DELETE FROM user_sessions 
    WHERE token_hash = $1
    RETURNING id
  `;
  
  const result = await pool.query(query, [token_hash]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const query = `
    DELETE FROM user_sessions 
    WHERE user_id = $1
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rowCount || 0;
}

export async function revokeOtherSessions(userId: string, currentToken: string): Promise<number> {
  const token_hash = hashToken(currentToken);
  
  const query = `
    DELETE FROM user_sessions 
    WHERE user_id = $1 AND token_hash != $2
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId, token_hash]);
  return result.rowCount || 0;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const query = `
    DELETE FROM user_sessions 
    WHERE expires_at < NOW()
    RETURNING id
  `;
  
  const result = await pool.query(query);
  return result.rowCount || 0;
}

export async function limitUserSessions(userId: string, maxSessions: number = 5): Promise<void> {
  const query = `
    DELETE FROM user_sessions 
    WHERE id IN (
      SELECT id FROM user_sessions 
      WHERE user_id = $1 
      ORDER BY created_at ASC 
      LIMIT (SELECT COUNT(*) - $2 FROM user_sessions WHERE user_id = $1)
    )
  `;
  
  await pool.query(query, [userId, maxSessions]);
}