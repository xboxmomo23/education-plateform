import pool from '../config/database';

export interface AuditLogInput {
  establishmentId: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogRecord {
  id: string;
  establishment_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  actorUserId?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface AuditSearchParams {
  establishmentId: string;
  filters?: AuditLogFilters;
  page?: number;
  limit?: number;
}

function buildWhereClause(establishmentId: string, filters: AuditLogFilters = {}) {
  const clauses: string[] = ['establishment_id = $1'];
  const params: any[] = [establishmentId];
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

export async function logAudit(entry: AuditLogInput): Promise<void> {
  try {
    await pool.query(
      `
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
      `,
      [
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
      ]
    );
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}

export async function searchAuditLogs({
  establishmentId,
  filters = {},
  page = 1,
  limit = 50,
}: AuditSearchParams) {
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
    pool.query<AuditLogRecord>(query, [...params, limit, offset]),
    pool.query<{ total: string }>(countQuery, params),
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

export async function exportAuditLogs(establishmentId: string, filters: AuditLogFilters = {}) {
  const { where, params } = buildWhereClause(establishmentId, filters);
  const exportQuery = `
    SELECT *
    FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT 5000
  `;

  const result = await pool.query<AuditLogRecord>(exportQuery, params);
  return result.rows;
}
