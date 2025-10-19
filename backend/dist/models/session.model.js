"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.findSessions = findSessions;
exports.findSessionByToken = findSessionByToken;
exports.getUserActiveSessions = getUserActiveSessions;
exports.countUserActiveSessions = countUserActiveSessions;
exports.updateSessionActivity = updateSessionActivity;
exports.revokeSession = revokeSession;
exports.revokeAllUserSessions = revokeAllUserSessions;
exports.revokeOtherSessions = revokeOtherSessions;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
exports.limitUserSessions = limitUserSessions;
const database_1 = require("../config/database");
const auth_utils_1 = require("../utils/auth.utils");
const query_builder_1 = require("../utils/query-builder");
// =========================
// Création de sessions
// =========================
async function createSession(data) {
    const { userId, token, deviceInfo, ipAddress, expiresIn } = data;
    const token_hash = (0, auth_utils_1.hashToken)(token);
    const expiresAt = calculateExpiration(expiresIn);
    const query = `
    INSERT INTO user_sessions (
      user_id, token_hash, device_info, ip_address, expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
    const values = [userId, token_hash, deviceInfo || null, ipAddress || null, expiresAt];
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
function calculateExpiration(duration) {
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
async function findSessions(filters = {}) {
    const qb = new query_builder_1.QueryBuilder();
    if (filters.userId) {
        qb.addCondition('user_id', filters.userId);
    }
    if (filters.tokenHash) {
        qb.addCondition('token_hash', filters.tokenHash);
    }
    if (filters.expired === false) {
        qb.addCondition('expires_at', 'NOW()', '>');
    }
    else if (filters.expired === true) {
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
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Trouve une session par token
 */
async function findSessionByToken(token) {
    const token_hash = (0, auth_utils_1.hashToken)(token);
    const sessions = await findSessions({ tokenHash: token_hash, expired: false });
    return sessions[0] || null;
}
/**
 * Récupère toutes les sessions actives d'un utilisateur
 */
async function getUserActiveSessions(userId) {
    return findSessions({ userId, expired: false });
}
/**
 * Compte les sessions actives d'un utilisateur
 */
async function countUserActiveSessions(userId) {
    const query = `
    SELECT COUNT(*) as count 
    FROM user_sessions 
    WHERE user_id = $1 AND expires_at > NOW()
  `;
    const result = await database_1.pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
}
// =========================
// Mise à jour de sessions
// =========================
async function updateSessionActivity(token) {
    const token_hash = (0, auth_utils_1.hashToken)(token);
    const query = `
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE token_hash = $1
  `;
    await database_1.pool.query(query, [token_hash]);
}
// =========================
// Suppression de sessions
// =========================
async function revokeSession(token) {
    const token_hash = (0, auth_utils_1.hashToken)(token);
    const query = `
    DELETE FROM user_sessions 
    WHERE token_hash = $1
    RETURNING id
  `;
    const result = await database_1.pool.query(query, [token_hash]);
    return result.rowCount !== null && result.rowCount > 0;
}
async function revokeAllUserSessions(userId) {
    const query = `
    DELETE FROM user_sessions 
    WHERE user_id = $1
    RETURNING id
  `;
    const result = await database_1.pool.query(query, [userId]);
    return result.rowCount || 0;
}
async function revokeOtherSessions(userId, currentToken) {
    const token_hash = (0, auth_utils_1.hashToken)(currentToken);
    const query = `
    DELETE FROM user_sessions 
    WHERE user_id = $1 AND token_hash != $2
    RETURNING id
  `;
    const result = await database_1.pool.query(query, [userId, token_hash]);
    return result.rowCount || 0;
}
async function cleanupExpiredSessions() {
    const query = `
    DELETE FROM user_sessions 
    WHERE expires_at < NOW()
    RETURNING id
  `;
    const result = await database_1.pool.query(query);
    return result.rowCount || 0;
}
async function limitUserSessions(userId, maxSessions = 5) {
    const query = `
    DELETE FROM user_sessions 
    WHERE id IN (
      SELECT id FROM user_sessions 
      WHERE user_id = $1 
      ORDER BY created_at ASC 
      LIMIT (SELECT COUNT(*) - $2 FROM user_sessions WHERE user_id = $1)
    )
  `;
    await database_1.pool.query(query, [userId, maxSessions]);
}
//# sourceMappingURL=session.model.js.map