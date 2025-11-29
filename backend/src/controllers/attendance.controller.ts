import { Request, Response } from 'express';
import { AttendanceModel, AttendanceStatus } from '../models/attendance.model';
import pool from '../config/database';

// ============================================
// HANDLERS - SEMAINE PROFESSEUR
// ============================================

/**
 * GET /api/attendance/week
 * Récupérer tous les cours d'un professeur pour une semaine avec statut présence
 */
export async function getTeacherWeekHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { teacherId, weekStart } = req.query;

    // Si pas de teacherId spécifié, utiliser l'utilisateur connecté
    const targetTeacherId = teacherId as string || userId;

    // Vérifier les permissions
    if (role !== 'admin' && role !== 'staff' && targetTeacherId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    if (!weekStart) {
      return res.status(400).json({
        success: false,
        error: 'weekStart est requis',
      });
    }

    console.log(`📅 Récupération présences semaine - Teacher: ${targetTeacherId}, Week: ${weekStart}`);

    const courses = await AttendanceModel.getTeacherWeekCourses(
      targetTeacherId,
      weekStart as string
    );

    console.log(`✅ ${courses.length} cours trouvés`);

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error('Erreur getTeacherWeekHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des cours',
    });
  }
}

// ============================================
// HANDLERS - SESSION
// ============================================

/**
 * GET /api/attendance/session/:instanceId
 * Récupérer ou créer une session de présence pour une instance de cours
 */
export async function getSessionHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { instanceId } = req.params;

    console.log(`📋 Récupération session présence - Instance: ${instanceId}`);

    // Vérifier les permissions
    const canAccess = await AttendanceModel.canAccessInstance(userId, role, instanceId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas accès à ce cours',
      });
    }

    // Récupérer ou créer la session
    const session = await AttendanceModel.getOrCreateSession(instanceId, userId);

    // Récupérer les élèves avec leur statut
    const students = await AttendanceModel.getSessionStudents(session.id);

    console.log(`✅ Session ${session.id} - ${students.length} élèves`);

    return res.json({
      success: true,
      data: {
        session,
        students,
      },
    });
  } catch (error: any) {
    console.error('Erreur getSessionHandler:', error);
    
    if (error.message?.includes('Instance non trouvée')) {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la session',
    });
  }
}

/**
 * POST /api/attendance/session/:sessionId/close
 * Fermer une session de présence
 */
export async function closeSessionHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { sessionId } = req.params;

    // Vérifier les permissions
    const canAccess = await AttendanceModel.canAccessSession(userId, role, sessionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas accès à cette session',
      });
    }

    const session = await AttendanceModel.closeSession(sessionId, userId);

    return res.json({
      success: true,
      message: 'Session fermée',
      data: session,
    });
  } catch (error) {
    console.error('Erreur closeSessionHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la fermeture de la session',
    });
  }
}

// ============================================
// HANDLERS - MARQUAGE PRÉSENCE
// ============================================

/**
 * POST /api/attendance/mark
 * Marquer la présence d'un seul élève
 */
export async function markAttendanceHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { sessionId, studentId, status, comment, lateMinutes } = req.body;

    // Validation
    if (!sessionId || !studentId || !status) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, studentId et status sont requis',
      });
    }

    const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused', 'excluded', 'remote'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}`,
      });
    }

    // Vérifier les permissions
    const canAccess = await AttendanceModel.canAccessSession(userId, role, sessionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas accès à cette session',
      });
    }

    console.log(`✏️ Marquage présence - Session: ${sessionId}, Student: ${studentId}, Status: ${status}`);

    const record = await AttendanceModel.markAttendance(
      sessionId,
      studentId,
      status,
      userId,
      { comment, lateMinutes }
    );

    return res.json({
      success: true,
      message: 'Présence enregistrée',
      data: record,
    });
  } catch (error) {
    console.error('Erreur markAttendanceHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement de la présence',
    });
  }
}

/**
 * POST /api/attendance/bulk
 * Marquer la présence de plusieurs élèves en masse
 */
export async function bulkMarkAttendanceHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { sessionId, records } = req.body;

    // Validation
    if (!sessionId || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'sessionId et records (tableau) sont requis',
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le tableau records ne peut pas être vide',
      });
    }

    // Valider chaque record
    const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused', 'excluded', 'remote'];
    for (const record of records) {
      if (!record.studentId || !record.status) {
        return res.status(400).json({
          success: false,
          error: 'Chaque record doit avoir studentId et status',
        });
      }
      if (!validStatuses.includes(record.status)) {
        return res.status(400).json({
          success: false,
          error: `Statut invalide: ${record.status}`,
        });
      }
    }

    // Vérifier les permissions
    const canAccess = await AttendanceModel.canAccessSession(userId, role, sessionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas accès à cette session',
      });
    }

    console.log(`✏️ Marquage présence bulk - Session: ${sessionId}, ${records.length} élèves`);

    const result = await AttendanceModel.bulkMarkAttendance(sessionId, records, userId);

    return res.json({
      success: true,
      message: `${result.length} présences enregistrées`,
      data: result,
    });
  } catch (error) {
    console.error('Erreur bulkMarkAttendanceHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement des présences',
    });
  }
}

// ============================================
// HANDLERS - HISTORIQUE ÉLÈVE
// ============================================

/**
 * GET /api/attendance/student/:studentId
 * Récupérer l'historique de présence d'un élève
 */
export async function getStudentHistoryHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { studentId } = req.params;
    const { startDate, endDate, courseId, limit } = req.query;

    // Vérifier les permissions
    // L'élève peut voir son propre historique
    // Les professeurs, staff et admin peuvent voir tout
    if (role === 'student' && userId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Parents peuvent voir leurs enfants (à implémenter si nécessaire)
    if (role === 'parent') {
      // Vérifier le lien parent-enfant
      const parentCheck = await pool.query(
        'SELECT 1 FROM student_parents WHERE parent_id = $1 AND student_id = $2',
        [userId, studentId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé',
        });
      }
    }

    console.log(`📊 Historique présence élève: ${studentId}`);

    const history = await AttendanceModel.getStudentAttendanceHistory(studentId, {
      startDate: startDate as string,
      endDate: endDate as string,
      courseId: courseId as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    const stats = await AttendanceModel.getStudentAttendanceStats(studentId, {
      startDate: startDate as string,
      endDate: endDate as string,
      courseId: courseId as string,
    });

    return res.json({
      success: true,
      data: {
        history,
        stats,
      },
    });
  } catch (error) {
    console.error('Erreur getStudentHistoryHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    });
  }
}

/**
 * GET /api/attendance/student/:studentId/stats
 * Récupérer les statistiques de présence d'un élève
 */
export async function getStudentStatsHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { studentId } = req.params;
    const { startDate, endDate, courseId } = req.query;

    // Vérifier les permissions (même logique que getStudentHistoryHandler)
    if (role === 'student' && userId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    const stats = await AttendanceModel.getStudentAttendanceStats(studentId, {
      startDate: startDate as string,
      endDate: endDate as string,
      courseId: courseId as string,
    });

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

// ============================================
// HANDLERS - UTILITAIRES
// ============================================

/**
 * GET /api/attendance/instance/:instanceId/check
 * Vérifier si une session existe pour une instance (sans la créer)
 */
export async function checkSessionExistsHandler(req: Request, res: Response) {
  try {
    const { instanceId } = req.params;

    const session = await AttendanceModel.getSessionByInstanceId(instanceId);

    return res.json({
      success: true,
      data: {
        exists: session !== null,
        session: session,
      },
    });
  } catch (error) {
    console.error('Erreur checkSessionExistsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification',
    });
  }
}