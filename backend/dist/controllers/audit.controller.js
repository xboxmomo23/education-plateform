"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogsHandler = getAuditLogsHandler;
exports.exportAuditLogsCsvHandler = exportAuditLogsCsvHandler;
const audit_model_1 = require("../models/audit.model");
function resolveEstablishmentId(req) {
    const { role, establishmentId } = req.user || {};
    if (role === 'super_admin') {
        const scopedId = req.query.establishmentId || establishmentId || null;
        if (!scopedId) {
            return { establishmentId: null, error: 'establishmentId requis pour super_admin' };
        }
        return { establishmentId: scopedId };
    }
    if (!establishmentId) {
        return { establishmentId: null, error: 'Aucun établissement associé' };
    }
    return { establishmentId };
}
function buildFilters(query) {
    return {
        action: query.action,
        actorUserId: query.actorUserId,
        actorRole: query.actorRole,
        entityType: query.entityType,
        entityId: query.entityId,
        from: query.from,
        to: query.to,
        q: query.q,
    };
}
async function getAuditLogsHandler(req, res) {
    try {
        const scope = resolveEstablishmentId(req);
        if (!scope.establishmentId) {
            return res.status(400).json({
                success: false,
                error: scope.error || 'Etablissement requis',
            });
        }
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
        const filters = buildFilters(req.query);
        const result = await (0, audit_model_1.searchAuditLogs)({
            establishmentId: scope.establishmentId,
            filters,
            page,
            limit,
        });
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('[Audit] getAuditLogs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du journal d’audit',
        });
    }
}
async function exportAuditLogsCsvHandler(req, res) {
    try {
        const scope = resolveEstablishmentId(req);
        if (!scope.establishmentId) {
            return res.status(400).json({
                success: false,
                error: scope.error || 'Etablissement requis',
            });
        }
        const filters = buildFilters(req.query);
        const rows = await (0, audit_model_1.exportAuditLogs)(scope.establishmentId, filters);
        const header = [
            'created_at',
            'action',
            'actor_name',
            'actor_role',
            'entity_type',
            'entity_id',
            'ip_address',
            'metadata',
        ];
        const csv = [header]
            .map((row) => row.join(';'))
            .join('\n')
            .concat('\n' +
            rows
                .map((entry) => [
                entry.created_at,
                entry.action,
                entry.actor_name || '',
                entry.actor_role || '',
                entry.entity_type || '',
                entry.entity_id || '',
                entry.ip_address || '',
                JSON.stringify(entry.metadata || {}),
            ]
                .map((value) => {
                const str = String(value ?? '');
                return /[;\n"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
            })
                .join(';'))
                .join('\n'));
        const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(`\uFEFF${csv}`);
    }
    catch (error) {
        console.error('[Audit] export CSV error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération du CSV',
        });
    }
}
//# sourceMappingURL=audit.controller.js.map