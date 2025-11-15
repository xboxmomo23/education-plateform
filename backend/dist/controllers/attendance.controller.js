"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionsHandler = getSessionsHandler;
exports.getSessionStudentsHandler = getSessionStudentsHandler;
exports.bulkCreateRecordsHandler = bulkCreateRecordsHandler;
exports.updateRecordHandler = updateRecordHandler;
exports.getStudentRecordsHandler = getStudentRecordsHandler;
exports.getStudentStatsHandler = getStudentStatsHandler;
exports.getStaffClassesHandler = getStaffClassesHandler;
const attendanceModel = __importStar(require("../models/attendance.model"));
const attendance_sse_1 = require("../services/attendance.sse");
// =========================
// SESSIONS
// =========================
/**
 * GET /api/attendance/sessions
 * Récupérer les sessions du jour pour le professeur ou le staff
 */
async function getSessionsHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        let sessions;
        if (role === 'teacher') {
            sessions = await attendanceModel.getTeacherSessionsByDate(userId, date);
        }
        else if (role === 'staff') {
            sessions = await attendanceModel.getStaffSessionsByDate(userId, date);
        }
        else {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
            });
        }
        return res.json({
            success: true,
            data: sessions,
        });
    }
    catch (error) {
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
async function getSessionStudentsHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: sessionId } = req.params;
        // Vérifier les permissions
        if (role === 'teacher') {
            const isOwner = await attendanceModel.isTeacherOwnerOfSession(userId, sessionId);
            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez faire l\'appel que sur vos propres cours',
                });
            }
        }
        else if (role === 'staff') {
            const isManager = await attendanceModel.isStaffManagerOfSession(userId, sessionId);
            if (!isManager) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        else {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
            });
        }
        // Récupérer la session
        const session = await attendanceModel.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session non trouvée',
            });
        }
        // Vérifier si on peut modifier
        const canModify = await attendanceModel.canModifyAttendance(userId, role, sessionId);
        // Récupérer les élèves
        const students = await attendanceModel.getSessionStudentsWithAttendance(sessionId);
        return res.json({
            success: true,
            data: {
                session,
                students,
                canModify,
            },
        });
    }
    catch (error) {
        console.error('Erreur getSessionStudentsHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des élèves',
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
async function bulkCreateRecordsHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: sessionId } = req.params;
        const { records } = req.body;
        // Vérifier les permissions
        if (role === 'teacher') {
            const isOwner = await attendanceModel.isTeacherOwnerOfSession(userId, sessionId);
            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez faire l\'appel que sur vos propres cours',
                });
            }
        }
        else if (role === 'staff') {
            const isManager = await attendanceModel.isStaffManagerOfSession(userId, sessionId);
            if (!isManager) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        else {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
            });
        }
        // Vérifier si on peut modifier
        const canModify = await attendanceModel.canModifyAttendance(userId, role, sessionId);
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
        const results = await attendanceModel.upsertAttendanceRecords(sessionId, records, userId);
        // Notifier en temps réel
        (0, attendance_sse_1.emitAttendanceUpdate)(sessionId, {
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
    }
    catch (error) {
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
async function updateRecordHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: recordId } = req.params;
        const { status, late_minutes, justification } = req.body;
        // Récupérer l'enregistrement
        const recordQuery = `
      SELECT ar.*, ats.id as session_id
      FROM attendance_records ar
      JOIN attendance_sessions ats ON ar.session_id = ats.id
      WHERE ar.id = $1
    `;
        const recordResult = await require('../config/database').pool.query(recordQuery, [recordId]);
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
            const isOwner = await attendanceModel.isTeacherOwnerOfSession(userId, sessionId);
            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez modifier que vos propres cours',
                });
            }
        }
        else if (role === 'staff') {
            const isManager = await attendanceModel.isStaffManagerOfSession(userId, sessionId);
            if (!isManager) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        else {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
            });
        }
        // Vérifier si on peut modifier
        const canModify = await attendanceModel.canModifyAttendance(userId, role, sessionId);
        if (!canModify) {
            return res.status(403).json({
                success: false,
                error: 'Délai de modification dépassé (48h pour les professeurs)',
            });
        }
        // Mettre à jour
        const updated = await attendanceModel.updateAttendanceRecord(recordId, {
            status,
            late_minutes,
            justification,
            modified_by: userId,
        });
        // Notifier en temps réel
        (0, attendance_sse_1.emitAttendanceUpdate)(sessionId, {
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
    }
    catch (error) {
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
async function getStudentRecordsHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        }
        else if (role === 'parent') {
            // Vérifier que le parent est lié à l'élève
            const linkQuery = `
        SELECT COUNT(*) as count
        FROM student_parents
        WHERE student_id = $1 AND parent_id = $2
      `;
            const linkResult = await require('../config/database').pool.query(linkQuery, [
                studentId,
                userId,
            ]);
            if (parseInt(linkResult.rows[0].count) === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous n\'êtes pas autorisé à voir cet historique',
                });
            }
        }
        else if (role !== 'teacher' && role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
            });
        }
        // Récupérer l'historique
        const records = await attendanceModel.getStudentAttendanceHistory(studentId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
        // Récupérer les statistiques
        const stats = await attendanceModel.getStudentAttendanceStats(studentId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        return res.json({
            success: true,
            data: {
                records,
                stats,
            },
        });
    }
    catch (error) {
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
async function getStudentStatsHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: studentId } = req.params;
        const { startDate, endDate } = req.query;
        // Vérifier les permissions (même logique que getStudentRecordsHandler)
        if (role === 'student' && userId !== studentId) {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
            });
        }
        const stats = await attendanceModel.getStudentAttendanceStats(studentId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        return res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
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
async function getStaffClassesHandler(req, res) {
    try {
        const { userId, role } = req.user;
        if (role !== 'staff') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        const query = `
      SELECT DISTINCT
        cl.id,
        cl.code,
        cl.label,
        cl.level,
        cl.current_size,
        cs.is_main
      FROM class_staff cs
      JOIN classes cl ON cs.class_id = cl.id
      WHERE cs.user_id = $1
        AND cl.archived = FALSE
      ORDER BY cl.label
    `;
        const result = await require('../config/database').pool.query(query, [userId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Erreur getStaffClassesHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des classes',
        });
    }
}
//# sourceMappingURL=attendance.controller.js.map