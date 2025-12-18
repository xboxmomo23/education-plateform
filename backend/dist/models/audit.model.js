"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.searchAuditLogs = searchAuditLogs;
exports.exportAuditLogs = exportAuditLogs;
const database_1 = __importDefault(require("../config/database"));
function buildWhereClause(establishmentId, filters = {}) {
    const clauses = ['establishment_id = $1'];
    const params = [establishmentId];
    let index = 2;
    if (filters.action) {
        clauses.push(`action = $${index++}`);
        params.push(filters.action);
    }
    if (filters.actorUserId) {
        clauses.push(`actor_user_id = $${index++}`);
        params.push(filters.actorUserId);
    }
    if (filters.actorRole) {
        clauses.push(`actor_role = $${index++}`);
        params.push(filters.actorRole);
    }
    if (filters.entityType) {
        clauses.push(`entity_type = $${index++}`);
        params.push(filters.entityType);
    }
    if (filters.entityId) {
        clauses.push(`entity_id = $${index++}`);
        params.push(filters.entityId);
    }
    if (filters.from) {
        clauses.push(`created_at >= $${index++}`);
        params.push(filters.from);
    }
    if (filters.to) {
        clauses.push(`created_at <= $${index++}`);
        params.push(filters.to);
    }
    if (filters.q) {
        clauses.push(`(
      actor_name ILIKE $${index}
      OR action ILIKE $${index}
      OR entity_id::text ILIKE $${index}
    )`);
        params.push(`%${filters.q}%`);
        index++;
    }
    return {
        where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
        params,
    };
}
async function logAudit(entry) {
    try {
        await database_1.default.query(`
        INSERT INTO audit_logs (
          establishment_id,
          actor_user_id,
          actor_role,
          actor_name,
          action,
          entity_type,
          entity_id,
          metadata,
          ip_address,
          user_agent
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
            entry.establishmentId,
            entry.actorUserId || null,
            entry.actorRole || null,
            entry.actorName || null,
            entry.action,
            entry.entityType || null,
            entry.entityId || null,
            entry.metadata ? JSON.stringify(entry.metadata) : JSON.stringify({}),
            entry.ipAddress || null,
            entry.userAgent || null,
        ]);
    }
    catch (error) {
        console.error('[AuditLog] Failed to record audit log:', error);
    }
}
async function searchAuditLogs({ establishmentId, filters = {}, page = 1, limit = 50, }) {
    const offset = (page - 1) * limit;
    const { where, params } = buildWhereClause(establishmentId, filters);
    const query = `
    SELECT *
    FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM audit_logs
    ${where}
  `;
    const [dataResult, countResult] = await Promise.all([
        database_1.default.query(query, [...params, limit, offset]),
        database_1.default.query(countQuery, params),
    ]);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
    return {
        items: dataResult.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    };
}
async function exportAuditLogs(establishmentId, filters = {}) {
    const { where, params } = buildWhereClause(establishmentId, filters);
    const exportQuery = `
    SELECT *
    FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT 5000
  `;
    const result = await database_1.default.query(exportQuery, params);
    return result.rows;
}
//# sourceMappingURL=audit.model.js.map