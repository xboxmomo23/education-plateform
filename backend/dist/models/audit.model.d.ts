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
export declare function logAudit(entry: AuditLogInput): Promise<void>;
export declare function searchAuditLogs({ establishmentId, filters, page, limit, }: AuditSearchParams): Promise<{
    items: AuditLogRecord[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function exportAuditLogs(establishmentId: string, filters?: AuditLogFilters): Promise<AuditLogRecord[]>;
//# sourceMappingURL=audit.model.d.ts.map