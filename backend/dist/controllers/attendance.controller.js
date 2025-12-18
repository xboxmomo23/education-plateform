"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherWeekHandler = getTeacherWeekHandler;
exports.getSessionHandler = getSessionHandler;
exports.getSessionsStatusListHandler = getSessionsStatusListHandler;
exports.closeSessionHandler = closeSessionHandler;
exports.markAttendanceHandler = markAttendanceHandler;
exports.bulkMarkAttendanceHandler = bulkMarkAttendanceHandler;
exports.getStudentHistoryHandler = getStudentHistoryHandler;
exports.getStudentStatsHandler = getStudentStatsHandler;
exports.checkSessionExistsHandler = checkSessionExistsHandler;
const attendance_model_1 = require("../models/attendance.model");
const parent_model_1 = require("../models/parent.model");
// ============================================
// HANDLERS - SEMAINE PROFESSEUR
// ============================================
/**
 * GET /api/attendance/week
 * Récupérer tous les cours d'un professeur pour une semaine avec statut présence
 */
async function getTeacherWeekHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { teacherId, weekStart } = req.query;
        // Si pas de teacherId spécifié, utiliser l'utilisateur connecté
        const targetTeacherId = teacherId || userId;
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
        const courses = await attendance_model_1.AttendanceModel.getTeacherWeekCourses(targetTeacherId, weekStart);
        console.log(`✅ ${courses.length} cours trouvés`);
        return res.json({
            success: true,
            data: courses,
        });
    }
    catch (error) {
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
async function getSessionHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { instanceId } = req.params;
        console.log(`📋 Récupération session présence - Instance: ${instanceId}`);
        // Vérifier les permissions
        const canAccess = await attendance_model_1.AttendanceModel.canAccessInstance(userId, role, instanceId);
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                error: 'Vous n\'avez pas accès à ce cours',
            });
        }
        // Récupérer ou créer la session
        const session = await attendance_model_1.AttendanceModel.getOrCreateSession(instanceId, userId);
        // Récupérer les élèves avec leur statut
        const students = await attendance_model_1.AttendanceModel.getSessionStudents(session.id);
        console.log(`✅ Session ${session.id} - ${students.length} élèves`);
        return res.json({
            success: true,
            data: {
                session,
                students,
            },
        });
    }
    catch (error) {
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
 * GET /api/attendance/sessions/status
 * Récupérer l'état des présences pour plusieurs séances
 */
async function getSessionsStatusListHandler(req, res) {
    try {
        const { userId, role } = req.user;
        if (role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé aux professeurs',
            });
        }
        const instanceIdsParam = req.query.instanceIds;
        if (!instanceIdsParam || typeof instanceIdsParam !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'instanceIds est requis',
            });
        }
        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
        let instanceIds = instanceIdsParam
            .split(',')
            .map((id) => id.trim())
            .filter((id) => uuidRegex.test(id));
        if (instanceIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun instanceId valide fourni',
            });
        }
        if (instanceIds.length > 50) {
            instanceIds = instanceIds.slice(0, 50);
        }
        const rows = await attendance_model_1.AttendanceModel.getSessionsStatusByInstanceIds(userId, instanceIds);
        const map = {};
        instanceIds.forEach((id) => {
            map[id] = {
                has_attendance: false,
                attendance_status: 'pending',
            };
        });
        rows.forEach((row) => {
            const hasAttendance = row.has_attendance;
            let attendanceStatus = 'pending';
            if (row.session_status === 'closed' || row.session_status === 'validated') {
                attendanceStatus = 'completed';
            }
            else if (hasAttendance) {
                attendanceStatus = 'partial';
            }
            map[row.instance_id] = {
                has_attendance: hasAttendance,
                attendance_status: attendanceStatus,
                session_id: row.session_id,
            };
        });
        return res.json({
            success: true,
            data: map,
        });
    }
    catch (error) {
        console.error('Erreur getSessionsStatusListHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statuts',
        });
    }
}
/**
 * POST /api/attendance/session/:sessionId/close
 * Fermer une session de présence
 */
async function closeSessionHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { sessionId } = req.params;
        // Vérifier les permissions
        const canAccess = await attendance_model_1.AttendanceModel.canAccessSession(userId, role, sessionId);
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                error: 'Vous n\'avez pas accès à cette session',
            });
        }
        const session = await attendance_model_1.AttendanceModel.closeSession(sessionId, userId);
        return res.json({
            success: true,
            message: 'Session fermée',
            data: session,
        });
    }
    catch (error) {
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
async function markAttendanceHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { sessionId, studentId, status, comment, lateMinutes } = req.body;
        // Validation
        if (!sessionId || !studentId || !status) {
            return res.status(400).json({
                success: false,
                error: 'sessionId, studentId et status sont requis',
            });
        }
        const validStatuses = ['present', 'absent', 'late', 'excused', 'excluded', 'remote'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}`,
            });
        }
        // Vérifier les permissions
        const canAccess = await attendance_model_1.AttendanceModel.canAccessSession(userId, role, sessionId);
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                error: 'Vous n\'avez pas accès à cette session',
            });
        }
        console.log(`✏️ Marquage présence - Session: ${sessionId}, Student: ${studentId}, Status: ${status}`);
        const record = await attendance_model_1.AttendanceModel.markAttendance(sessionId, studentId, status, userId, { comment, lateMinutes });
        return res.json({
            success: true,
            message: 'Présence enregistrée',
            data: record,
        });
    }
    catch (error) {
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
async function bulkMarkAttendanceHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        const validStatuses = ['present', 'absent', 'late', 'excused', 'excluded', 'remote'];
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
        const canAccess = await attendance_model_1.AttendanceModel.canAccessSession(userId, role, sessionId);
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                error: 'Vous n\'avez pas accès à cette session',
            });
        }
        console.log(`✏️ Marquage présence bulk - Session: ${sessionId}, ${records.length} élèves`);
        const result = await attendance_model_1.AttendanceModel.bulkMarkAttendance(sessionId, records, userId);
        return res.json({
            success: true,
            message: `${result.length} présences enregistrées`,
            data: result,
        });
    }
    catch (error) {
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
async function getStudentHistoryHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        // Parents peuvent voir leurs enfants
        if (role === 'parent') {
            try {
                await (0, parent_model_1.assertParentCanAccessStudent)(userId, studentId, {
                    requireCanViewAttendance: true,
                });
            }
            catch (error) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé',
                });
            }
        }
        console.log(`📊 Historique présence élève: ${studentId}`);
        const history = await attendance_model_1.AttendanceModel.getStudentAttendanceHistory(studentId, {
            startDate: startDate,
            endDate: endDate,
            courseId: courseId,
            limit: limit ? parseInt(limit) : undefined,
        });
        const stats = await attendance_model_1.AttendanceModel.getStudentAttendanceStats(studentId, {
            startDate: startDate,
            endDate: endDate,
            courseId: courseId,
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
async function getStudentStatsHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { studentId } = req.params;
        const { startDate, endDate, courseId } = req.query;
        // Vérifier les permissions (même logique que getStudentHistoryHandler)
        if (role === 'student' && userId !== studentId) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
        }
        const stats = await attendance_model_1.AttendanceModel.getStudentAttendanceStats(studentId, {
            startDate: startDate,
            endDate: endDate,
            courseId: courseId,
        });
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
// ============================================
// HANDLERS - UTILITAIRES
// ============================================
/**
 * GET /api/attendance/instance/:instanceId/check
 * Vérifier si une session existe pour une instance (sans la créer)
 */
async function checkSessionExistsHandler(req, res) {
    try {
        const { instanceId } = req.params;
        const session = await attendance_model_1.AttendanceModel.getSessionByInstanceId(instanceId);
        return res.json({
            success: true,
            data: {
                exists: session !== null,
                session: session,
            },
        });
    }
    catch (error) {
        console.error('Erreur checkSessionExistsHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la vérification',
        });
    }
}
//# sourceMappingURL=attendance.controller.js.map