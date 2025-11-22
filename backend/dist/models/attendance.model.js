"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModel = void 0;
exports.getStaffClasses = getStaffClasses;
exports.getSessions = getSessions;
exports.isTeacherOwnerOfSession = isTeacherOwnerOfSession;
exports.isStaffManagerOfSession = isStaffManagerOfSession;
exports.getSessionDetails = getSessionDetails;
exports.getSessionById = getSessionById;
exports.canModifyAttendance = canModifyAttendance;
exports.upsertAttendanceRecords = upsertAttendanceRecords;
exports.updateAttendanceRecord = updateAttendanceRecord;
exports.getStudentAttendanceHistory = getStudentAttendanceHistory;
exports.getStudentAttendanceStats = getStudentAttendanceStats;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// FONCTION MINIMALE POUR STAFF CLASSES
// ============================================
/**
 * Récupérer les classes gérées par un staff
 */
async function getStaffClasses(staffId) {
    const query = `
    SELECT DISTINCT c.*
    FROM classes c
    JOIN class_staff cs ON c.id = cs.class_id
    WHERE cs.user_id = $1
    ORDER BY c.label
  `;
    const result = await database_1.default.query(query, [staffId]);
    return result.rows;
}
// ============================================
// FONCTIONS STUBS (pour éviter erreurs TypeScript)
// ============================================
async function getSessions(userId, role, date) {
    return [];
}
async function isTeacherOwnerOfSession(teacherId, sessionId) {
    return false;
}
async function isStaffManagerOfSession(staffId, sessionId) {
    return false;
}
async function getSessionDetails(sessionId, userId, role) {
    return null;
}
async function getSessionById(sessionId) {
    return null;
}
async function canModifyAttendance(sessionId, userId, role) {
    return false;
}
async function upsertAttendanceRecords(sessionId, records, recordedBy) {
    return [];
}
async function updateAttendanceRecord(recordId, data, modifiedBy) {
    return null;
}
async function getStudentAttendanceHistory(studentId, options) {
    return [];
}
async function getStudentAttendanceStats(studentId, options) {
    return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        remote: 0,
        excluded: 0,
        attendance_rate: 0,
    };
}
// ============================================
// EXPORT PAR DÉFAUT
// ============================================
exports.AttendanceModel = {
    getStaffClasses,
    getSessions,
    isTeacherOwnerOfSession,
    isStaffManagerOfSession,
    getSessionDetails,
    getSessionById,
    canModifyAttendance,
    upsertAttendanceRecords,
    updateAttendanceRecord,
    getStudentAttendanceHistory,
    getStudentAttendanceStats,
};
//# sourceMappingURL=attendance.model.js.map