"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyHistoryHandler = getMyHistoryHandler;
exports.getAllAbsencesHandler = getAllAbsencesHandler;
exports.getTeacherRecentAbsencesHandler = getTeacherRecentAbsencesHandler;
exports.getAccessibleClassesHandler = getAccessibleClassesHandler;
exports.justifyAbsenceHandler = justifyAbsenceHandler;
exports.getClassAttendanceStatsHandler = getClassAttendanceStatsHandler;
exports.updateRecordStatusHandler = updateRecordStatusHandler;
const attendance_model_1 = require("../models/attendance.model");
const database_1 = __importDefault(require("../config/database"));
const audit_service_1 = require("../services/audit.service");
// ============================================
// HANDLERS SUPPLÉMENTAIRES - ABSENCES
// ============================================
/**
 * GET /api/attendance/my-history
 * Récupérer l'historique de présence de l'élève connecté
 * (Utilisé par la page /student/assiduite)
 */
async function getMyHistoryHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { startDate, endDate, limit } = req.query;
        // Vérifier que c'est bien un élève
        if (role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Cette route est réservée aux élèves',
            });
        }
        console.log(`📊 Historique assiduité élève: ${userId}`);
        const history = await attendance_model_1.AttendanceModel.getStudentAttendanceHistory(userId, {
            startDate: startDate,
            endDate: endDate,
            limit: limit ? parseInt(limit) : 100,
        });
        const stats = await attendance_model_1.AttendanceModel.getStudentAttendanceStats(userId, {
            startDate: startDate,
            endDate: endDate,
        });
        return res.json({
            success: true,
            data: {
                history,
                stats,
            },
        });
    }
    catch (error) {
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
async function getAllAbsencesHandler(req, res) {
    try {
        const { userId, role, assignedClassIds } = req.user;
        if (!['staff', 'admin', 'teacher'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
        }
        const { classId, status, startDate, endDate, justifiedOnly, search, page = '1', limit = '50', } = req.query;
        const userQuery = 'SELECT establishment_id FROM users WHERE id = $1';
        const userResult = await database_1.default.query(userQuery, [userId]);
        const establishmentId = userResult.rows[0]?.establishment_id;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        const classAssignments = assignedClassIds ?? [];
        const hasClassScope = classAssignments.length > 0;
        const clauses = [
            "ar.status IN ('absent', 'late', 'excused')",
            "ases.establishment_id = $1",
        ];
        const params = [establishmentId];
        let paramIndex = 2;
        if (classId && classId !== 'all') {
            clauses.push(`cl.id = $${paramIndex}`);
            params.push(classId);
            paramIndex++;
        }
        if (status && status !== 'all') {
            clauses.push(`ar.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }
        if (startDate) {
            clauses.push(`ases.session_date >= $${paramIndex}`);
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            clauses.push(`ases.session_date <= $${paramIndex}`);
            params.push(endDate);
            paramIndex++;
        }
        if (justifiedOnly === 'true') {
            clauses.push(`ar.justified = true`);
        }
        if (search) {
            clauses.push(`(
        u.full_name ILIKE $${paramIndex} OR
        sp.student_no ILIKE $${paramIndex} OR
        cl.label ILIKE $${paramIndex}
      )`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (role === 'teacher') {
            clauses.push(`c.teacher_id = $${paramIndex}`);
            params.push(userId);
            paramIndex++;
            if (hasClassScope) {
                clauses.push(`cl.id = ANY($${paramIndex}::uuid[])`);
                params.push(classAssignments);
                paramIndex++;
            }
        }
        else if (role === 'staff' && hasClassScope) {
            clauses.push(`cl.id = ANY($${paramIndex}::uuid[])`);
            params.push(classAssignments);
            paramIndex++;
        }
        const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const dataQuery = `
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
        ar.justified_at
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      JOIN users u ON ar.student_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      JOIN classes cl ON ases.class_id = cl.id
      JOIN courses c ON ases.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      ${whereClause}
      ORDER BY ases.session_date DESC, ases.start_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        const dataParams = [...params, limitNum, offset];
        const result = await database_1.default.query(dataQuery, dataParams);
        const countQuery = `
      SELECT COUNT(*) as total
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      JOIN users u ON ar.student_id = u.id
      JOIN classes cl ON ases.class_id = cl.id
      JOIN courses c ON ases.course_id = c.id
      ${whereClause}
    `;
        const countResult = await database_1.default.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);
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
    }
    catch (error) {
        console.error('Erreur getAllAbsencesHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des absences',
        });
    }
}
/**
 * GET /api/attendance/teacher/recent
 * Récupérer les absences/retards récents pour un professeur
 */
async function getTeacherRecentAbsencesHandler(req, res) {
    try {
        const { userId, role } = req.user;
        if (role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé aux professeurs',
            });
        }
        const { date, limit, days } = req.query;
        const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
            ? date
            : new Date().toISOString().slice(0, 10);
        const limitNum = limit ? Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20) : 8;
        const daysNum = days ? Math.min(Math.max(parseInt(days, 10) || 7, 1), 14) : 7;
        const data = await attendance_model_1.AttendanceModel.getRecentTeacherAbsences(userId, {
            date: targetDate,
            days: daysNum,
            limit: limitNum,
        });
        return res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error('Erreur getTeacherRecentAbsencesHandler:', error);
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
async function getAccessibleClassesHandler(req, res) {
    try {
        const { userId, role, assignedClassIds } = req.user;
        let query;
        let params;
        const classAssignments = assignedClassIds ?? [];
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
        }
        else if (role === 'staff') {
            if (classAssignments.length === 0) {
                if (!req.user?.establishmentId) {
                    return res.json({ success: true, data: [] });
                }
                query = `
          SELECT cl.id, cl.label
          FROM classes cl
          WHERE cl.establishment_id = $1
            AND cl.archived = false
          ORDER BY cl.label
        `;
                params = [req.user.establishmentId];
            }
            else {
                query = `
          SELECT cl.id, cl.label
          FROM classes cl
          WHERE cl.id = ANY($1::uuid[])
            AND cl.archived = false
          ORDER BY cl.label
        `;
                params = [classAssignments];
            }
        }
        else if (role === 'teacher') {
            if (classAssignments.length === 0) {
                return res.json({ success: true, data: [] });
            }
            query = `
        SELECT cl.id, cl.label
        FROM classes cl
        WHERE cl.id = ANY($1::uuid[])
          AND cl.archived = false
        ORDER BY cl.label
      `;
            params = [classAssignments];
        }
        else {
            return res.json({
                success: true,
                data: [],
            });
        }
        const result = await database_1.default.query(query, params);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
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
async function justifyAbsenceHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        const result = await database_1.default.query(query, [
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
        await (0, audit_service_1.logAuditEvent)({
            req,
            action: 'ATTENDANCE_JUSTIFIED',
            entityType: 'attendance_record',
            entityId: recordId,
        });
        return res.json({
            success: true,
            message: 'Absence justifiée',
            data: result.rows[0],
        });
    }
    catch (error) {
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
async function getClassAttendanceStatsHandler(req, res) {
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
        const params = [classId];
        if (startDate)
            params.push(startDate);
        if (endDate)
            params.push(endDate);
        const result = await database_1.default.query(query, params);
        return res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Erreur getClassAttendanceStatsHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques',
        });
    }
}
async function updateRecordStatusHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        const result = await database_1.default.query(query, [status, userId, recordId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Enregistrement non trouvé',
            });
        }
        console.log(`✅ Statut modifié: ${recordId} → ${status}`);
        const action = status === 'present' ? 'ATTENDANCE_REMOVED' : 'ATTENDANCE_STATUS_CHANGED';
        await (0, audit_service_1.logAuditEvent)({
            req,
            action,
            entityType: 'attendance_record',
            entityId: recordId,
            metadata: { newStatus: status },
        });
        return res.json({
            success: true,
            message: 'Statut modifié',
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Erreur updateRecordStatusHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la modification',
        });
    }
}
//# sourceMappingURL=attendance-extended.controller.js.map