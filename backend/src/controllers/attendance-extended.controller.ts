import { Request, Response } from 'express';
import { AttendanceModel } from '../models/attendance.model';
import pool from '../config/database';

// ============================================
// HANDLERS SUPPLÉMENTAIRES - ABSENCES
// ============================================

/**
 * GET /api/attendance/my-history
 * Récupérer l'historique de présence de l'élève connecté
 * (Utilisé par la page /student/assiduite)
 */
export async function getMyHistoryHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { startDate, endDate, limit } = req.query;

    // Vérifier que c'est bien un élève
    if (role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Cette route est réservée aux élèves',
      });
    }

    console.log(`📊 Historique assiduité élève: ${userId}`);

    const history = await AttendanceModel.getStudentAttendanceHistory(userId, {
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : 100,
    });

    const stats = await AttendanceModel.getStudentAttendanceStats(userId, {
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json({
      success: true,
      data: {
        history,
        stats,
      },
    });
  } catch (error) {
    console.error('Erreur getMyHistoryHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    });
  }
}

/**
 * GET /api/attendance/absences
 * Récupérer toutes les absences avec filtres (staff uniquement)
 * (Utilisé par la page /staff/absences)
 */
export async function getAllAbsencesHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    
    // Vérifier les permissions
    if (role !== 'staff' && role !== 'admin' && role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    const {
      classId,
      status,
      schoolYear,
      startDate,
      endDate,
      justifiedOnly,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    console.log(`📋 Récupération absences - Filtres:`, req.query);

    // Récupérer l'establishment_id de l'utilisateur
    const userQuery = 'SELECT establishment_id FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const establishmentId = userResult.rows[0]?.establishment_id;

    // Construire la requête
    let query = `
      SELECT 
        ar.id,
        ar.student_id,
        u.full_name AS student_name,
        sp.student_no AS student_number,
        cl.id AS class_id,
        cl.label AS class_label,
        s.name AS subject_name,
        s.color AS subject_color,
        ases.session_date,
        ases.start_time,
        ases.end_time,
        ar.status,
        ar.late_minutes,
        ar.comment,
        ar.justified,
        ar.justification,
        ar.justified_at,
        EXTRACT(YEAR FROM ases.session_date) || '-' || (EXTRACT(YEAR FROM ases.session_date) + 1) AS school_year
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      JOIN users u ON ar.student_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      JOIN classes cl ON ases.class_id = cl.id
      JOIN courses c ON ases.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      WHERE ar.status IN ('absent', 'late', 'excused')
        AND ases.establishment_id = $1
    `;

    const params: any[] = [establishmentId];
    let paramIndex = 2;

    // Filtre classe
    if (classId && classId !== 'all') {
      query += ` AND cl.id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    // Filtre statut
    if (status && status !== 'all') {
      query += ` AND ar.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filtre date début
    if (startDate) {
      query += ` AND ases.session_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    // Filtre date fin
    if (endDate) {
      query += ` AND ases.session_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Filtre justifié seulement
    if (justifiedOnly === 'true') {
      query += ` AND ar.justified = true`;
    }

    // Recherche textuelle
    if (search) {
      query += ` AND (
        u.full_name ILIKE $${paramIndex} OR
        sp.student_no ILIKE $${paramIndex} OR
        cl.label ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Si c'est un professeur, limiter à ses classes
    if (role === 'teacher') {
      query += ` AND c.teacher_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Si c'est un staff, limiter à ses classes assignées
    if (role === 'staff') {
      query += ` AND cl.id IN (SELECT class_id FROM class_staff WHERE user_id = $${paramIndex})`;
      params.push(userId);
      paramIndex++;
    }

    // Ordre et pagination
    query += ` ORDER BY ases.session_date DESC, ases.start_time DESC`;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      JOIN users u ON ar.student_id = u.id
      JOIN classes cl ON ases.class_id = cl.id
      JOIN courses c ON ases.course_id = c.id
      WHERE ar.status IN ('absent', 'late', 'excused')
        AND ases.establishment_id = $1
    `;
    // Ajouter les mêmes filtres (simplifié)
    const countResult = await pool.query(countQuery, [establishmentId]);
    const total = parseInt(countResult.rows[0].total);

    return res.json({
      success: true,
      data: {
        absences: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur getAllAbsencesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des absences',
    });
  }
}

/**
 * GET /api/attendance/classes
 * Récupérer les classes accessibles à l'utilisateur (pour les filtres)
 */
export async function getAccessibleClassesHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;

    let query: string;
    let params: any[];

    if (role === 'admin') {
      // Admin voit toutes les classes de l'établissement
      query = `
        SELECT cl.id, cl.label
        FROM classes cl
        JOIN users u ON cl.establishment_id = u.establishment_id
        WHERE u.id = $1 AND cl.archived = false
        ORDER BY cl.label
      `;
      params = [userId];
    } else if (role === 'staff') {
      // Staff voit ses classes assignées
      query = `
        SELECT cl.id, cl.label
        FROM classes cl
        JOIN class_staff cs ON cl.id = cs.class_id
        WHERE cs.user_id = $1 AND cl.archived = false
        ORDER BY cl.label
      `;
      params = [userId];
    } else if (role === 'teacher') {
      // Professeur voit les classes où il enseigne
      query = `
        SELECT DISTINCT cl.id, cl.label
        FROM classes cl
        JOIN courses c ON cl.id = c.class_id
        WHERE c.teacher_id = $1 AND c.active = true AND cl.archived = false
        ORDER BY cl.label
      `;
      params = [userId];
    } else {
      return res.json({
        success: true,
        data: [],
      });
    }

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur getAccessibleClassesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des classes',
    });
  }
}

/**
 * PUT /api/attendance/absences/:recordId/justify
 * Justifier une absence
 */
export async function justifyAbsenceHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { recordId } = req.params;
    const { justification, documentUrl } = req.body;

    // Vérifier les permissions
    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul le staff peut justifier les absences',
      });
    }

    const query = `
      UPDATE attendance_records
      SET 
        justified = true,
        justification = $1,
        justification_document = $2,
        justified_by = $3,
        justified_at = NOW(),
        updated_at = NOW(),
        updated_by = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(query, [
      justification,
      documentUrl || null,
      userId,
      recordId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Absence non trouvée',
      });
    }

    return res.json({
      success: true,
      message: 'Absence justifiée',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur justifyAbsenceHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la justification',
    });
  }
}

/**
 * GET /api/attendance/stats/class/:classId
 * Statistiques de présence pour une classe
 */
export async function getClassAttendanceStatsHandler(req: Request, res: Response) {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    const query = `
      SELECT 
        COUNT(*)::INTEGER AS total_records,
        COUNT(*) FILTER (WHERE ar.status = 'present')::INTEGER AS present_count,
        COUNT(*) FILTER (WHERE ar.status = 'absent')::INTEGER AS absent_count,
        COUNT(*) FILTER (WHERE ar.status = 'late')::INTEGER AS late_count,
        COUNT(*) FILTER (WHERE ar.status = 'excused')::INTEGER AS excused_count,
        COUNT(*) FILTER (WHERE ar.status = 'absent' AND NOT ar.justified)::INTEGER AS not_justified_count,
        ROUND(
          (COUNT(*) FILTER (WHERE ar.status IN ('present', 'late'))::NUMERIC / 
           NULLIF(COUNT(*), 0)) * 100, 
          1
        ) AS attendance_rate
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      WHERE ases.class_id = $1
        ${startDate ? `AND ases.session_date >= $2` : ''}
        ${endDate ? `AND ases.session_date <= $3` : ''}
    `;

    const params: any[] = [classId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur getClassAttendanceStatsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
}







export async function updateRecordStatusHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { recordId } = req.params;
    const { status } = req.body;

    // Vérifier les permissions
    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul le staff peut modifier les statuts',
      });
    }

    const query = `
      UPDATE attendance_records
      SET 
        status = $1,
        updated_at = NOW(),
        updated_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, userId, recordId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrement non trouvé',
      });
    }

    console.log(`✅ Statut modifié: ${recordId} → ${status}`);

    return res.json({
      success: true,
      message: 'Statut modifié',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur updateRecordStatusHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification',
    });
  }
}
