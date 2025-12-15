import { Request, Response } from 'express';
import { getAdminKpis, getAdminPerformanceMetrics } from '../models/dashboard-admin.model';
import { findTermById } from '../models/term.model';

function resolveEstablishmentId(req: Request): { establishmentId: string | null; error?: string } {
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

function getParisDate(): string {
  const now = new Date();
  const parisString = now.toLocaleString('en-US', { timeZone: 'Europe/Paris' });
  const parisDate = new Date(parisString);
  return parisDate.toISOString().split('T')[0];
}

export async function getAdminDashboardKpisHandler(req: Request, res: Response) {
  try {
    const scope = resolveEstablishmentId(req);
    if (!scope.establishmentId) {
      return res.status(400).json({
        success: false,
        error: scope.error || 'Établissement requis',
      });
    }

    const date = getParisDate();
    const data = await getAdminKpis(scope.establishmentId, date);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[DashboardAdmin] getAdminDashboardKpisHandler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des indicateurs admin',
    });
  }
}

export async function getAdminPerformanceHandler(req: Request, res: Response) {
  try {
    const scope = resolveEstablishmentId(req);
    if (!scope.establishmentId) {
      return res.status(400).json({
        success: false,
        error: scope.error || 'Établissement requis',
      });
    }

    const termId = (req.query.termId as string) || null;
    const classId = req.query.classId === 'all' ? null : ((req.query.classId as string) || null);

    let periodLabel = 'Année complète';
    let periodFrom: string | undefined;
    let periodTo: string | undefined;

    if (termId) {
      const term = await findTermById(termId, scope.establishmentId);
      if (!term) {
        return res.status(404).json({
          success: false,
          error: 'Période introuvable pour cet établissement',
        });
      }
      periodLabel = term.name;
      periodFrom = term.start_date.toISOString();
      periodTo = term.end_date.toISOString();
    }

    const data = await getAdminPerformanceMetrics(scope.establishmentId, {
      termId,
      classId,
    });

    return res.json({
      success: true,
      data: {
        period: {
          termId,
          label: periodLabel,
          from: periodFrom,
          to: periodTo,
        },
        ...data,
      },
    });
  } catch (error) {
    console.error('[DashboardAdmin] getAdminPerformanceHandler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des performances',
    });
  }
}
