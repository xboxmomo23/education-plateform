import { Request } from 'express';
interface AuditEventOptions {
    req?: Request;
    establishmentId?: string;
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
export declare function logAuditEvent(options: AuditEventOptions): Promise<void>;
export {};
//# sourceMappingURL=audit.service.d.ts.map