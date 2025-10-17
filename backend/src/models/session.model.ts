import { pool } from '../config/database';
import { UserSession } from '../types';
import { hashToken } from '../utils/auth.utils';

// =========================
// Création de sessions
// =========================

export interface CreateSessionData {
  userId: string;
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
  expiresIn: string; // Ex: '24h', '7d'
}

/**
 * Crée une nouvelle session utilisateur
 */
export async function createSession(data: CreateSessionData): Promise<UserSession> {
  const { userId, token, deviceInfo, ipAddress, expiresIn } = data;
  
  // Hasher le token pour sécurité
  const token_hash = hashToken(token);
  
  // Calculer la date d'expiration
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

/**
 * Calcule la date d'expiration à partir d'une durée
 */
function calculateExpiration(duration: string): Date {
  const now = new Date();
  
  // Parser la durée (ex: '24h', '7d', '30m')
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Format de durée invalide');
  }
  
  const [, value, unit] = match;
  const numValue = parseInt(value);
  
  switch (unit) {
    case 's': // secondes
      now.setSeconds(now.getSeconds() + numValue);
      break;
    case 'm': // minutes
      now.setMinutes(now.getMinutes() + numValue);
      break;
    case 'h': // heures
      now.setHours(now.getHours() + numValue);
      break;
    case 'd': // jours
      now.setDate(now.getDate() + numValue);
      break;
  }
  
  return now;
}

// =========================
// Récupération de sessions
// =========================

/**
 * Trouve une session par token
 */
export async function findSessionByToken(token: string): Promise<UserSession | null> {
  const token_hash = hashToken(token);
  
  const query = `
    SELECT * FROM user_sessions 
    WHERE token_hash = $1 AND expires_at > NOW()
  `;
  
  const result = await pool.query(query, [token_hash]);
  return result.rows[0] || null;
}

/**
 * Récupère toutes les sessions actives d'un utilisateur
 */
export async function getUserActiveSessions(userId: string): Promise<UserSession[]> {
  const query = `
    SELECT * FROM user_sessions 
    WHERE user_id = $1 AND expires_at > NOW()
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
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

/**
 * Met à jour l'activité d'une session
 */
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

/**
 * Révoque une session (déconnexion)
 */
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

/**
 * Révoque toutes les sessions d'un utilisateur
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const query = `
    DELETE FROM user_sessions 
    WHERE user_id = $1
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rowCount || 0;
}

/**
 * Révoque toutes les sessions sauf celle en cours
 */
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

/**
 * Nettoie les sessions expirées
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const query = `
    DELETE FROM user_sessions 
    WHERE expires_at < NOW()
    RETURNING id
  `;
  
  const result = await pool.query(query);
  return result.rowCount || 0;
}

/**
 * Limite le nombre de sessions par utilisateur
 */
export async function limitUserSessions(userId: string, maxSessions: number = 5): Promise<void> {
  // Supprimer les sessions les plus anciennes si on dépasse la limite
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