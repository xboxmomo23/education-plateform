"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const audit_model_1 = require("../models/audit.model");
async function logAuditEvent(options) {
    try {
        const establishmentId = options.establishmentId ||
            options.req?.user?.establishmentId ||
            undefined;
        if (!establishmentId) {
            return;
        }
        const actorUserId = options.actorUserId ??
            options.req?.user?.userId ??
            null;
        const actorRole = options.actorRole ??
            options.req?.user?.role ??
            null;
        const actorName = options.actorName ??
            options.req?.user?.full_name ??
            null;
        const ipAddress = options.ipAddress ??
            options.req?.ip ??
            options.req?.socket.remoteAddress ??
            null;
        const userAgent = options.userAgent ??
            options.req?.headers['user-agent'] ??
            null;
        await (0, audit_model_1.logAudit)({
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
    }
    catch (error) {
        console.error('[AuditService] Failed to log event', error);
    }
}
//# sourceMappingURL=audit.service.js.map