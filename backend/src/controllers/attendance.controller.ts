import { Request, Response } from 'express';
import { AttendanceModel } from '../models/attendance.model';
import { AttendanceStatus } from '../types';
import { emitAttendanceUpdate } from '../services/attendance.sse';
import pool from '../config/database';

// =========================
// SESSIONS
// =========================

/**
 * GET /api/attendance/sessions
 * Récupérer les sessions du jour pour le professeur ou le staff
 */
export async function getSessionsHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const date = req.query.date as string | undefined;

    const sessions = await AttendanceModel.getSessions(userId, role, date);

    return res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Erreur getSessionsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des sessions',
    });
  }
}

/**
 * GET /api/attendance/sessions/:id
 * Récupérer les élèves d'une session pour faire l'appel
 */
export async function getSessionStudentsHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: sessionId } = req.params;

    // Vérifier les permissions
    if (role === 'teacher') {
      const isOwner = await AttendanceModel.isTeacherOwnerOfSession(userId, sessionId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez faire l\'appel que sur vos propres cours',
        });
      }
    } else if (role === 'staff') {
      const isManager = await AttendanceModel.isStaffManagerOfSession(userId, sessionId);
      if (!isManager) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
      });
    }

    // Récupérer les détails de la session
    const data = await AttendanceModel.getSessionDetails(sessionId, userId, role);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erreur getSessionStudentsHandler:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des élèves';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}

// =========================
// RECORDS - CREATE/UPDATE
// =========================

/**
 * POST /api/attendance/sessions/:id/records/bulk
 * Sauvegarder l'appel complet (batch)
 */
export async function bulkCreateRecordsHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: sessionId } = req.params;
    const { records } = req.body;

    // Vérifier les permissions
    if (role === 'teacher') {
      const isOwner = await AttendanceModel.isTeacherOwnerOfSession(userId, sessionId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez faire l\'appel que sur vos propres cours',
        });
      }
    } else if (role === 'staff') {
      const isManager = await AttendanceModel.isStaffManagerOfSession(userId, sessionId);
      if (!isManager) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
      });
    }

    // Récupérer la session pour vérifier le délai
    const session = await AttendanceModel.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée',
      });
    }

    // Vérifier si on peut modifier
    const canModify = await AttendanceModel.canModifyAttendance(
      userId,
      role,
      session.session_date,
      session.scheduled_start
    );

    if (!canModify) {
      return res.status(403).json({
        success: false,
        error: 'Délai de modification dépassé (48h pour les professeurs)',
      });
    }

    // Valider les données
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun enregistrement fourni',
      });
    }

    // Créer/mettre à jour les enregistrements
    const results = await AttendanceModel.upsertAttendanceRecords(
      sessionId,
      records,
      userId
    );

    // Notifier en temps réel
    emitAttendanceUpdate(sessionId, {
      type: 'bulk_update',
      sessionId,
      updatedBy: userId,
      count: results.length,
    });

    return res.json({
      success: true,
      message: `${results.length} présence(s) enregistrée(s)`,
      data: results,
    });
  } catch (error) {
    console.error('Erreur bulkCreateRecordsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement des présences',
    });
  }
}

/**
 * PUT /api/attendance/records/:id
 * Modifier une présence individuelle
 */
export async function updateRecordHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: recordId } = req.params;
    const { status, late_minutes, justification } = req.body;

    // Récupérer l'enregistrement pour obtenir la session
    const recordQuery = `
      SELECT ar.*, s.id as session_id, s.session_date, s.scheduled_start
      FROM attendance_records ar
      JOIN attendance_sessions s ON ar.session_id = s.id
      WHERE ar.id = $1
    `;
    const recordResult = await pool.query(recordQuery, [recordId]);
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrement non trouvé',
      });
    }

    const record = recordResult.rows[0];
    const sessionId = record.session_id;

    // Vérifier les permissions
    if (role === 'teacher') {
      const isOwner = await AttendanceModel.isTeacherOwnerOfSession(userId, sessionId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez modifier que vos propres cours',
        });
      }
    } else if (role === 'staff') {
      const isManager = await AttendanceModel.isStaffManagerOfSession(userId, sessionId);
      if (!isManager) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
      });
    }

    // Vérifier si on peut modifier
    const canModify = await AttendanceModel.canModifyAttendance(
      userId,
      role,
      record.session_date,
      record.scheduled_start
    );

    if (!canModify) {
      return res.status(403).json({
        success: false,
        error: 'Délai de modification dépassé (48h pour les professeurs)',
      });
    }

    // Mettre à jour
    const updated = await AttendanceModel.updateAttendanceRecord(recordId, {
      status,
      late_minutes,
      justification,
      modified_by: userId,
    });

    // Notifier en temps réel
    emitAttendanceUpdate(sessionId, {
      type: 'record_update',
      sessionId,
      recordId,
      studentId: updated.student_id,
      updatedBy: userId,
    });

    return res.json({
      success: true,
      message: 'Présence mise à jour',
      data: updated,
    });
  } catch (error) {
    console.error('Erreur updateRecordHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la présence',
    });
  }
}

// =========================
// STUDENT - CONSULTATION
// =========================

/**
 * GET /api/attendance/students/:id/records
 * Historique des présences d'un élève
 */
export async function getStudentRecordsHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: studentId } = req.params;
    const { startDate, endDate, limit } = req.query;

    // Vérifier les permissions
    if (role === 'student') {
      // Un élève ne peut voir que son propre historique
      if (userId !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez voir que votre propre historique',
        });
      }
    } else if (role === 'parent') {
      // Vérifier que le parent est lié à l'élève
      const linkQuery = `
        SELECT COUNT(*) as count
        FROM student_parents
        WHERE student_id = $1 AND parent_id = $2
      `;
      const linkResult = await pool.query(linkQuery, [studentId, userId]);

      if (parseInt(linkResult.rows[0].count) === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous n\'êtes pas autorisé à voir cet historique',
        });
      }
    } else if (role !== 'teacher' && role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
      });
    }

    // Récupérer l'historique
    const records = await AttendanceModel.getStudentAttendanceHistory(studentId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // Récupérer les statistiques
    const stats = await AttendanceModel.getStudentAttendanceStats(
      studentId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return res.json({
      success: true,
      data: {
        records,
        stats,
      },
    });
  } catch (error) {
    console.error('Erreur getStudentRecordsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    });
  }
}

/**
 * GET /api/attendance/students/:id/stats
 * Statistiques de présence d'un élève
 */
export async function getStudentStatsHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Vérifier les permissions (même logique que getStudentRecordsHandler)
    if (role === 'student' && userId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
      });
    }

    if (role === 'parent') {
      const linkQuery = `
        SELECT COUNT(*) as count
        FROM student_parents
        WHERE student_id = $1 AND parent_id = $2
      `;
      const linkResult = await pool.query(linkQuery, [studentId, userId]);

      if (parseInt(linkResult.rows[0].count) === 0) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé',
        });
      }
    }

    const stats = await AttendanceModel.getStudentAttendanceStats(
      studentId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Erreur getStudentStatsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
}

// =========================
// STAFF - GESTION
// =========================

/**
 * GET /api/attendance/staff/classes
 * Classes gérées par le staff
 */
export async function getStaffClassesHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const classes = await AttendanceModel.getStaffClasses(userId);

    return res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error('Erreur getStaffClassesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des classes',
    });
  }
}