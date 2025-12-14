import { Request } from 'express';
import { logAudit } from '../models/audit.model';

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

export async function logAuditEvent(options: AuditEventOptions): Promise<void> {
  try {
    const establishmentId =
      options.establishmentId ||
      options.req?.user?.establishmentId ||
      undefined;

    if (!establishmentId) {
      return;
    }

    const actorUserId =
      options.actorUserId ??
      options.req?.user?.userId ??
      null;
    const actorRole =
      options.actorRole ??
      options.req?.user?.role ??
      null;
    const actorName =
      options.actorName ??
      options.req?.user?.full_name ??
      null;

    const ipAddress =
      options.ipAddress ??
      options.req?.ip ??
      options.req?.socket.remoteAddress ??
      null;

    const userAgent =
      options.userAgent ??
      (options.req?.headers['user-agent'] as string | undefined) ??
      null;

    await logAudit({
      establishmentId,
      actorUserId,
      actorRole,
      actorName,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId ?? null,
      metadata: options.metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('[AuditService] Failed to log event', error);
  }
}
