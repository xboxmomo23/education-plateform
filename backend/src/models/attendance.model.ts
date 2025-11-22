import pool from '../config/database';

// ============================================
// FONCTION MINIMALE POUR STAFF CLASSES
// ============================================

/**
 * Récupérer les classes gérées par un staff
 */
export async function getStaffClasses(staffId: string): Promise<any[]> {
  const query = `
    SELECT DISTINCT c.*
    FROM classes c
    JOIN class_staff cs ON c.id = cs.class_id
    WHERE cs.user_id = $1
    ORDER BY c.label
  `;

  const result = await pool.query(query, [staffId]);
  return result.rows;
}

// ============================================
// FONCTIONS STUBS (pour éviter erreurs TypeScript)
// ============================================

export async function getSessions(userId: string, role: string, date: Date): Promise<any[]> {
  return [];
}

export async function isTeacherOwnerOfSession(teacherId: string, sessionId: string): Promise<boolean> {
  return false;
}

export async function isStaffManagerOfSession(staffId: string, sessionId: string): Promise<boolean> {
  return false;
}

export async function getSessionDetails(sessionId: string, userId: string, role: string): Promise<any> {
  return null;
}

export async function getSessionById(sessionId: string): Promise<any> {
  return null;
}

export async function canModifyAttendance(sessionId: string, userId: string, role: string): Promise<boolean> {
  return false;
}

export async function upsertAttendanceRecords(sessionId: string, records: any[], recordedBy: string): Promise<any[]> {
  return [];
}

export async function updateAttendanceRecord(recordId: string, data: any, modifiedBy: string): Promise<any> {
  return null;
}

export async function getStudentAttendanceHistory(studentId: string, options: any): Promise<any[]> {
  return [];
}

export async function getStudentAttendanceStats(studentId: string, options: any): Promise<any> {
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

export const AttendanceModel = {
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