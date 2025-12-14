import { Request, Response } from 'express';
import { DashboardStaffModel } from '../models/dashboard-staff.model';
import { MessageModel } from '../models/message.model';

function parseDateParam(value?: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date().toISOString().split('T')[0];
}

async function ensureEstablishment(req: Request, res: Response): Promise<string | null> {
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

export async function getStaffKpiHandler(req: Request, res: Response) {
  try {
    const establishmentId = await ensureEstablishment(req, res);
    if (!establishmentId) return;

    const date = parseDateParam(req.query.date as string | undefined);
    const classes = await DashboardStaffModel.getAccessibleClasses(
      establishmentId,
      req.user?.assignedClassIds
    );

    const classIds = classes.map((cls) => cls.class_id);
    const attendanceStats = await DashboardStaffModel.getClassAttendanceStats(
      establishmentId,
      classIds,
      date
    );

    const studentsTotal = classes.reduce((sum, cls) => sum + cls.students_count, 0);

    let absentTotal = 0;
    let lateTotal = 0;
    let notJustifiedTotal = 0;

    for (const stat of attendanceStats) {
      absentTotal += stat.absent_count;
      lateTotal += stat.late_count;
      notJustifiedTotal += stat.not_justified_count;
    }

    const presentTotal = Math.max(studentsTotal - absentTotal, 0);
    const unreadMessages = await MessageModel.countUnread(req.user!.userId, establishmentId);

    return res.json({
      success: true,
      data: {
        present_today: presentTotal,
        absent_today: absentTotal,
        late_today: lateTotal,
        not_justified_today: notJustifiedTotal,
        unread_messages: unreadMessages,
        classes_count: classes.length,
        students_total: studentsTotal,
        date,
      },
    });
  } catch (error) {
    console.error('[DashboardStaff] getStaffKpiHandler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des indicateurs',
    });
  }
}

export async function getStaffPendingAbsencesHandler(req: Request, res: Response) {
  try {
    const establishmentId = await ensureEstablishment(req, res);
    if (!establishmentId) return;

    const date = parseDateParam(req.query.date as string | undefined);
    const limit = Math.min(
      50,
      Math.max(1, parseInt((req.query.limit as string) || '8', 10))
    );

    const classes = await DashboardStaffModel.getAccessibleClasses(
      establishmentId,
      req.user?.assignedClassIds
    );
    const classIds = classes.map((cls) => cls.class_id);

    const absences = await DashboardStaffModel.getPendingAbsences(
      establishmentId,
      classIds,
      date,
      limit
    );

    return res.json({
      success: true,
      data: absences,
    });
  } catch (error) {
    console.error('[DashboardStaff] getStaffPendingAbsencesHandler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des absences à traiter',
    });
  }
}

export async function getStaffClassesSummaryHandler(req: Request, res: Response) {
  try {
    const establishmentId = await ensureEstablishment(req, res);
    if (!establishmentId) return;

    const date = parseDateParam(req.query.date as string | undefined);

    const classes = await DashboardStaffModel.getAccessibleClasses(
      establishmentId,
      req.user?.assignedClassIds
    );
    const classIds = classes.map((cls) => cls.class_id);

    const attendanceStats = await DashboardStaffModel.getClassAttendanceStats(
      establishmentId,
      classIds,
      date
    );
    const statsMap = new Map(attendanceStats.map((item) => [item.class_id, item]));

    const summary = classes.map((cls) => {
      const stats = statsMap.get(cls.class_id);
      return {
        class_id: cls.class_id,
        class_label: cls.class_label,
        level: cls.level,
        students_count: cls.students_count,
        absent_today: stats?.absent_count ?? 0,
        late_today: stats?.late_count ?? 0,
        not_justified_today: stats?.not_justified_count ?? 0,
      };
    });

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[DashboardStaff] getStaffClassesSummaryHandler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement du résumé des classes',
    });
  }
}
