import { Request, Response } from 'express';
import { exportAuditLogs, searchAuditLogs, AuditLogFilters } from '../models/audit.model';

function resolveEstablishmentId(req: Request): { establishmentId: string | null; error?: any } {
  const { role, establishmentId } = req.user || {};

  if (role === 'super_admin') {
    const scopedId = (req.query.establishmentId as string) || establishmentId || null;
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

function buildFilters(query: Request['query']): AuditLogFilters {
  return {
    action: query.action as string | undefined,
    actorUserId: query.actorUserId as string | undefined,
    actorRole: query.actorRole as string | undefined,
    entityType: query.entityType as string | undefined,
    entityId: query.entityId as string | undefined,
    from: query.from as string | undefined,
    to: query.to as string | undefined,
    q: query.q as string | undefined,
  };
}

export async function getAuditLogsHandler(req: Request, res: Response) {
  try {
    const scope = resolveEstablishmentId(req);
    if (!scope.establishmentId) {
      return res.status(400).json({
        success: false,
        error: scope.error || 'Etablissement requis',
      });
    }

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const filters = buildFilters(req.query);

    const result = await searchAuditLogs({
      establishmentId: scope.establishmentId,
      filters,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Audit] getAuditLogs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du journal d’audit',
    });
  }
}

export async function exportAuditLogsCsvHandler(req: Request, res: Response) {
  try {
    const scope = resolveEstablishmentId(req);
    if (!scope.establishmentId) {
      return res.status(400).json({
        success: false,
        error: scope.error || 'Etablissement requis',
      });
    }

    const filters = buildFilters(req.query);
    const rows = await exportAuditLogs(scope.establishmentId, filters);

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
      .concat(
        '\n' +
          rows
            .map((entry) =>
              [
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
                .join(';')
            )
            .join('\n')
      );

    const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    console.error('[Audit] export CSV error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du CSV',
    });
  }
}
