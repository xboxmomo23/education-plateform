import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import pool from '../config/database';
import {
  DashboardStaffModel,
  StaffAbsenceHistoryFilters,
  StaffAbsenceHistoryItem,
} from '../models/dashboard-staff.model';
import { getEstablishmentSettings } from '../models/establishmentSettings.model';
import { logAuditEvent } from '../services/audit.service';

type HistoryQuery = {
  filters: StaffAbsenceHistoryFilters;
  pagination: { page: number; limit: number };
};

const ALLOWED_STATUS = ['absent', 'late', 'excused', 'all'];
const ALLOWED_SORT = ['date_desc', 'date_asc', 'student_asc', 'class_asc'];

function parseHistoryQuery(query: Request['query']): HistoryQuery {
  const page = Math.max(1, parseInt((query.page as string) || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt((query.limit as string) || '50', 10)));

  const status = typeof query.status === 'string' && ALLOWED_STATUS.includes(query.status)
    ? (query.status as StaffAbsenceHistoryFilters['status'])
    : 'all';

  const justified =
    typeof query.justified === 'string' && ['true', 'false', 'all'].includes(query.justified)
      ? (query.justified as StaffAbsenceHistoryFilters['justified'])
      : 'all';

  const sort =
    typeof query.sort === 'string' && ALLOWED_SORT.includes(query.sort)
      ? (query.sort as StaffAbsenceHistoryFilters['sort'])
      : 'date_desc';

  const filters: StaffAbsenceHistoryFilters = {
    q: typeof query.q === 'string' ? query.q.trim() : undefined,
    classId: typeof query.classId === 'string' ? query.classId : undefined,
    status,
    justified,
    from: typeof query.from === 'string' ? query.from : undefined,
    to: typeof query.to === 'string' ? query.to : undefined,
    sort,
  };

  return {
    filters,
    pagination: { page, limit },
  };
}

function formatStatusLabel(status: string) {
  switch (status) {
    case 'late':
      return 'Retard';
    case 'excused':
      return 'Excusé';
    default:
      return 'Absent';
  }
}

function formatBoolean(value: boolean) {
  return value ? 'Oui' : 'Non';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}

function formatTimeRange(start: string, end: string) {
  return `${start?.slice(0, 5) ?? ''} - ${end?.slice(0, 5) ?? ''}`;
}

function csvEscape(value: string | null | undefined) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",;\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function ensureEstablishmentContext(req: Request, res: Response) {
  const establishmentId = req.user?.establishmentId;
  if (!establishmentId) {
    res.status(400).json({
      success: false,
      error: 'Aucun établissement associé à ce compte staff',
    });
    return null;
  }
  return establishmentId;
}

async function validateClassAccess(
  establishmentId: string,
  requestedClassId: string | undefined,
  assignedClassIds?: string[] | null
) {
  if (!requestedClassId || requestedClassId === 'all') {
    return null;
  }

  if (assignedClassIds && assignedClassIds.length > 0) {
    if (!assignedClassIds.includes(requestedClassId)) {
      return null;
    }
  }

  const result = await pool.query<{ label: string }>(
    `SELECT label FROM classes WHERE id = $1 AND establishment_id = $2 LIMIT 1`,
    [requestedClassId, establishmentId]
  );

  return result.rows[0]?.label || null;
}

export async function getStaffAbsenceHistoryHandler(req: Request, res: Response) {
  try {
    const establishmentId = await ensureEstablishmentContext(req, res);
    if (!establishmentId) return;

    const assignedClassIds = req.user?.assignedClassIds;
    const { filters, pagination } = parseHistoryQuery(req.query);

    if (
      assignedClassIds &&
      assignedClassIds.length > 0 &&
      filters.classId &&
      filters.classId !== 'all' &&
      !assignedClassIds.includes(filters.classId)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Cette classe n’est pas accessible pour votre profil',
      });
    }

    const { items, total } = await DashboardStaffModel.getAbsenceHistory(
      establishmentId,
      assignedClassIds,
      filters,
      pagination.page,
      pagination.limit
    );

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
        },
      },
    });
  } catch (error) {
    console.error('[StaffAbsences] history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des absences',
    });
  }
}

export async function exportStaffAbsencesCsvHandler(req: Request, res: Response) {
  try {
    const establishmentId = await ensureEstablishmentContext(req, res);
    if (!establishmentId) {
      return;
    }

    const assignedClassIds = req.user?.assignedClassIds;
    const { filters } = parseHistoryQuery(req.query);

    if (
      assignedClassIds &&
      assignedClassIds.length > 0 &&
      filters.classId &&
      filters.classId !== 'all' &&
      !assignedClassIds.includes(filters.classId)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Cette classe n’est pas accessible pour votre profil',
      });
    }

    const rows = await DashboardStaffModel.getAbsencesForExport(
      establishmentId,
      assignedClassIds,
      filters,
      5000
    );

    const header = [
      'Date',
      'Heure',
      'Élève',
      'Classe',
      'Statut',
      'Justifiée',
      'Matière',
      'Professeur',
    ];

    const lines = rows.map((item) => [
      formatDate(item.session_date),
      formatTimeRange(item.start_time, item.end_time),
      item.student_name,
      item.class_label,
      formatStatusLabel(item.status),
      formatBoolean(item.justified),
      item.subject_name,
      item.teacher_name || '',
    ]);

    const csvContent = [header, ...lines]
      .map((row) => row.map(csvEscape).join(';'))
      .join('\n');

    const filename = `absences_${filters.from || filters.to || new Date().toISOString().slice(0, 10)}.csv`;
    await logAuditEvent({
      req,
      establishmentId,
      action: 'STAFF_ABSENCES_EXPORT_CSV',
      metadata: filters,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(`\uFEFF${csvContent}`);
  } catch (error) {
    console.error('[StaffAbsences] export CSV error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du CSV',
    });
  }
}

function drawPdfHeader(
  doc: PDFKit.PDFDocument,
  establishmentName: string,
  schoolYear: string,
  filters: StaffAbsenceHistoryFilters,
  classLabel?: string | null
) {
  const margin = 36;
  const width = doc.page.width - margin * 2;

  doc.font('Helvetica-Bold').fontSize(14).text(establishmentName, margin, margin, {
    width,
    align: 'center',
  });

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Historique des absences', margin, doc.y + 6, { width, align: 'center' });

  doc.fontSize(10).font('Helvetica').text(`Année scolaire : ${schoolYear}`, {
    width,
    align: 'center',
  });

  const details: string[] = [];
  if (filters.from && filters.to) {
    details.push(`Période : ${formatDate(filters.from)} → ${formatDate(filters.to)}`);
  } else if (filters.from) {
    details.push(`À partir du ${formatDate(filters.from)}`);
  } else if (filters.to) {
    details.push(`Jusqu'au ${formatDate(filters.to)}`);
  }

  if (classLabel) {
    details.push(`Classe : ${classLabel}`);
  }

  if (details.length) {
    doc.fontSize(9).fillColor('#4b5563').text(details.join(' | '), {
      width,
      align: 'center',
    });
    doc.fillColor('#111827');
  }

  doc.moveDown(1.5);
}

function drawPdfTable(
  doc: PDFKit.PDFDocument,
  items: StaffAbsenceHistoryItem[],
  margin = 36
) {
  const columns = [
    { key: 'date', label: 'Date', width: 55 },
    { key: 'time', label: 'Heure', width: 60 },
    { key: 'student', label: 'Élève', width: 100 },
    { key: 'class', label: 'Classe', width: 55 },
    { key: 'status', label: 'Statut', width: 55 },
    { key: 'justified', label: 'Justifiée', width: 55 },
    { key: 'subject', label: 'Matière', width: 85 },
    { key: 'teacher', label: 'Professeur', width: 70 },
  ];

  const headerHeight = 18;
  const rowSpacing = 6;
  const footerMargin = 32;

  const drawHeader = () => {
    doc.font('Helvetica-Bold').fontSize(9);
    let currentX = margin;
    columns.forEach((col) => {
      doc.text(col.label, currentX, doc.y, { width: col.width, align: 'left' });
      currentX += col.width;
    });
    doc.moveDown();
    doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).stroke();
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9);
  };

  const drawFooter = () => {
    const prevY = doc.y;
    const currentPageNumber =
      (doc as PDFKit.PDFDocument & { page: { number?: number } }).page?.number || 1;
    doc.fontSize(8).fillColor('#6b7280').text(`Page ${currentPageNumber}`, margin, doc.page.height - footerMargin, {
      width: doc.page.width - margin * 2,
      align: 'right',
    });
    doc.fillColor('#111827');
    doc.y = prevY;
  };

  drawHeader();

  for (const row of items) {
    const values: Record<string, string> = {
      date: formatDate(row.session_date),
      time: formatTimeRange(row.start_time, row.end_time),
      student: row.student_name,
      class: row.class_label,
      status: formatStatusLabel(row.status),
      justified: formatBoolean(row.justified),
      subject: row.subject_name,
      teacher: row.teacher_name || '',
    };

    let rowHeight = headerHeight;
    columns.forEach((col) => {
      const height = doc.heightOfString(values[col.key], {
        width: col.width,
        align: 'left',
      });
      rowHeight = Math.max(rowHeight, height + 4);
    });

    if (doc.y + rowHeight + footerMargin > doc.page.height) {
      drawFooter();
      doc.addPage();
      drawHeader();
    }

    let currentX = margin;
    columns.forEach((col) => {
      doc.text(values[col.key], currentX, doc.y, {
        width: col.width,
        align: 'left',
        lineGap: 1,
      });
      currentX += col.width;
    });

    doc.moveDown(rowHeight / 12);
    doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).strokeColor('#e5e7eb').stroke();
    doc.strokeColor('#111827');
    doc.moveDown(rowSpacing / 12);
  }

  drawFooter();
}

export async function exportStaffAbsencesPdfHandler(req: Request, res: Response) {
  try {
    const establishmentId = await ensureEstablishmentContext(req, res);
    if (!establishmentId) {
      return;
    }

    const assignedClassIds = req.user?.assignedClassIds;
    const { filters } = parseHistoryQuery(req.query);

    if (
      assignedClassIds &&
      assignedClassIds.length > 0 &&
      filters.classId &&
      filters.classId !== 'all' &&
      !assignedClassIds.includes(filters.classId)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Cette classe n’est pas accessible pour votre profil',
      });
    }

    const [settings, rows, classLabel] = await Promise.all([
      getEstablishmentSettings(establishmentId),
      DashboardStaffModel.getAbsencesForExport(establishmentId, assignedClassIds, filters, 1000),
      validateClassAccess(establishmentId, filters.classId, assignedClassIds),
    ]);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const sanitizedName = settings.displayName.replace(/\s+/g, '_').toLowerCase();
    const filename = `absences_${sanitizedName}_${filters.from || filters.to || new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    await logAuditEvent({
      req,
      establishmentId,
      action: 'STAFF_ABSENCES_EXPORT_PDF',
      metadata: filters,
    });

    drawPdfHeader(doc, settings.displayName, settings.schoolYear, filters, classLabel);

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(11).text('Aucune absence ne correspond aux filtres sélectionnés.', {
        align: 'center',
      });
      doc.end();
      return;
    }

    drawPdfTable(doc, rows);
    doc.end();
    return;
  } catch (error) {
    console.error('[StaffAbsences] export PDF error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du PDF',
    });
  }
}
