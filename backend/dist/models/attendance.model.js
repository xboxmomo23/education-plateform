"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAttendanceSession = createAttendanceSession;
exports.getSessionById = getSessionById;
exports.getTeacherSessionsByDate = getTeacherSessionsByDate;
exports.getStaffSessionsByDate = getStaffSessionsByDate;
exports.getOrCreateSession = getOrCreateSession;
exports.createAttendanceRecord = createAttendanceRecord;
exports.updateAttendanceRecord = updateAttendanceRecord;
exports.upsertAttendanceRecords = upsertAttendanceRecords;
exports.getSessionStudentsWithAttendance = getSessionStudentsWithAttendance;
exports.getStudentAttendanceHistory = getStudentAttendanceHistory;
exports.canModifyAttendance = canModifyAttendance;
exports.isTeacherOwnerOfSession = isTeacherOwnerOfSession;
exports.isStaffManagerOfSession = isStaffManagerOfSession;
exports.deleteAttendanceRecord = deleteAttendanceRecord;
exports.getStudentAttendanceStats = getStudentAttendanceStats;
const database_1 = require("../config/database");
// =========================
// SESSIONS - CRUD
// =========================
async function createAttendanceSession(data) {
    const query = `
    INSERT INTO attendance_sessions (
      course_id, session_date, scheduled_start, scheduled_end, 
      recorded_by, establishment_id, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
    RETURNING *
  `;
    const result = await database_1.pool.query(query, [
        data.course_id,
        data.session_date,
        data.scheduled_start,
        data.scheduled_end,
        data.recorded_by || null,
        data.establishment_id || null,
    ]);
    return result.rows[0];
}
async function getSessionById(sessionId) {
    const query = `SELECT * FROM attendance_sessions WHERE id = $1`;
    const result = await database_1.pool.query(query, [sessionId]);
    return result.rows[0] || null;
}
async function getTeacherSessionsByDate(teacherId, date) {
    const query = `
    SELECT 
      ats.*,
      c.title AS course_title,
      s.name AS subject_name,
      s.code AS subject_code,
      cl.label AS class_label,
      cl.id AS class_id,
      u.full_name AS teacher_name,
      u.id AS teacher_id
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN subjects s ON c.subject_id = s.id
    JOIN classes cl ON c.class_id = cl.id
    JOIN teacher_profiles tp ON c.teacher_id = tp.user_id
    JOIN users u ON tp.user_id = u.id
    WHERE c.teacher_id = $1 
      AND ats.session_date = $2
      AND c.active = TRUE
    ORDER BY ats.scheduled_start ASC
  `;
    const result = await database_1.pool.query(query, [teacherId, date]);
    return result.rows;
}
async function getStaffSessionsByDate(staffId, date) {
    const query = `
    SELECT DISTINCT
      ats.*,
      c.title AS course_title,
      s.name AS subject_name,
      s.code AS subject_code,
      cl.label AS class_label,
      cl.id AS class_id,
      u.full_name AS teacher_name,
      u.id AS teacher_id
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN subjects s ON c.subject_id = s.id
    JOIN classes cl ON c.class_id = cl.id
    JOIN class_staff cs ON cl.id = cs.class_id
    JOIN teacher_profiles tp ON c.teacher_id = tp.user_id
    JOIN users u ON tp.user_id = u.id
    WHERE cs.user_id = $1 
      AND ats.session_date = $2
      AND c.active = TRUE
    ORDER BY cl.label, ats.scheduled_start ASC
  `;
    const result = await database_1.pool.query(query, [staffId, date]);
    return result.rows;
}
async function getOrCreateSession(data) {
    const checkQuery = `
    SELECT * FROM attendance_sessions 
    WHERE course_id = $1 
      AND session_date = $2 
      AND scheduled_start = $3 
      AND scheduled_end = $4
  `;
    const existing = await database_1.pool.query(checkQuery, [
        data.course_id,
        data.session_date,
        data.scheduled_start,
        data.scheduled_end,
    ]);
    if (existing.rows.length > 0) {
        return existing.rows[0];
    }
    return createAttendanceSession(data);
}
// =========================
// RECORDS - CRUD
// =========================
async function createAttendanceRecord(data) {
    const query = `
    INSERT INTO attendance_records (
      session_id, student_id, status, late_minutes, 
      justification, recorded_by, recorded_at, last_modified_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $6)
    RETURNING *
  `;
    const result = await database_1.pool.query(query, [
        data.session_id,
        data.student_id,
        data.status,
        data.late_minutes || null,
        data.justification || null,
        data.recorded_by,
    ]);
    return result.rows[0];
}
async function updateAttendanceRecord(recordId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    if (data.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(data.status);
    }
    if (data.late_minutes !== undefined) {
        fields.push(`late_minutes = $${paramCount++}`);
        values.push(data.late_minutes);
    }
    if (data.justification !== undefined) {
        fields.push(`justification = $${paramCount++}`);
        values.push(data.justification);
    }
    fields.push(`last_modified_by = $${paramCount++}`);
    values.push(data.modified_by);
    values.push(recordId);
    const query = `
    UPDATE attendance_records 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
async function upsertAttendanceRecords(sessionId, records, recordedBy) {
    const client = await database_1.pool.connect();
    try {
        await client.query('BEGIN');
        const results = [];
        for (const record of records) {
            const query = `
        INSERT INTO attendance_records (
          session_id, student_id, status, late_minutes, 
          justification, recorded_by, last_modified_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        ON CONFLICT (session_id, student_id) 
        DO UPDATE SET
          status = EXCLUDED.status,
          late_minutes = EXCLUDED.late_minutes,
          justification = EXCLUDED.justification,
          last_modified_by = EXCLUDED.last_modified_by,
          last_modified_at = NOW()
        RETURNING *
      `;
            const result = await client.query(query, [
                sessionId,
                record.student_id,
                record.status,
                record.late_minutes || null,
                record.justification || null,
                recordedBy,
            ]);
            results.push(result.rows[0]);
        }
        await client.query('COMMIT');
        return results;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
async function getSessionStudentsWithAttendance(sessionId) {
    const query = `
    SELECT 
      sp.user_id AS student_id,
      u.full_name AS student_name,
      sp.student_no,
      ar.id AS record_id,
      ar.status,
      ar.late_minutes,
      ar.justification
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN enrollments e ON c.class_id = e.class_id AND c.academic_year = e.academic_year
    JOIN student_profiles sp ON e.student_id = sp.user_id
    JOIN users u ON sp.user_id = u.id
    LEFT JOIN attendance_records ar ON ats.id = ar.session_id AND sp.user_id = ar.student_id
    WHERE ats.id = $1 
      AND e.end_date IS NULL
      AND u.active = TRUE
    ORDER BY u.full_name ASC
  `;
    const result = await database_1.pool.query(query, [sessionId]);
    return result.rows;
}
async function getStudentAttendanceHistory(studentId, options) {
    let query = `
    SELECT 
      ar.*,
      u.full_name AS student_name,
      sp.student_no,
      ats.session_date,
      ats.scheduled_start,
      ats.scheduled_end,
      s.name AS subject_name,
      cl.label AS class_label
    FROM attendance_records ar
    JOIN attendance_sessions ats ON ar.session_id = ats.id
    JOIN student_profiles sp ON ar.student_id = sp.user_id
    JOIN users u ON sp.user_id = u.id
    JOIN courses c ON ats.course_id = c.id
    JOIN subjects s ON c.subject_id = s.id
    JOIN classes cl ON c.class_id = cl.id
    WHERE ar.student_id = $1
  `;
    const values = [studentId];
    let paramCount = 2;
    if (options?.startDate) {
        query += ` AND ats.session_date >= $${paramCount++}`;
        values.push(options.startDate);
    }
    if (options?.endDate) {
        query += ` AND ats.session_date <= $${paramCount++}`;
        values.push(options.endDate);
    }
    query += ` ORDER BY ats.session_date DESC, ats.scheduled_start DESC`;
    if (options?.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit);
    }
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
async function canModifyAttendance(userId, userRole, sessionId) {
    const query = `
    SELECT can_modify_attendance($1, $2, ats.session_date, ats.scheduled_start) AS can_modify
    FROM attendance_sessions ats
    WHERE ats.id = $3
  `;
    const result = await database_1.pool.query(query, [userId, userRole, sessionId]);
    return result.rows[0]?.can_modify || false;
}
async function isTeacherOwnerOfSession(teacherId, sessionId) {
    const query = `
    SELECT COUNT(*) as count
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    WHERE ats.id = $1 AND c.teacher_id = $2
  `;
    const result = await database_1.pool.query(query, [sessionId, teacherId]);
    return parseInt(result.rows[0].count) > 0;
}
async function isStaffManagerOfSession(staffId, sessionId) {
    const query = `
    SELECT COUNT(*) as count
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN class_staff cs ON c.class_id = cs.class_id
    WHERE ats.id = $1 AND cs.user_id = $2
  `;
    const result = await database_1.pool.query(query, [sessionId, staffId]);
    return parseInt(result.rows[0].count) > 0;
}
async function deleteAttendanceRecord(recordId) {
    const query = `DELETE FROM attendance_records WHERE id = $1`;
    await database_1.pool.query(query, [recordId]);
}
async function getStudentAttendanceStats(studentId, startDate, endDate) {
    let query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused,
      SUM(CASE WHEN status = 'remote' THEN 1 ELSE 0 END) as remote,
      SUM(CASE WHEN status = 'excluded' THEN 1 ELSE 0 END) as excluded
    FROM attendance_records ar
    JOIN attendance_sessions ats ON ar.session_id = ats.id
    WHERE ar.student_id = $1
  `;
    const values = [studentId];
    let paramCount = 2;
    if (startDate) {
        query += ` AND ats.session_date >= $${paramCount++}`;
        values.push(startDate);
    }
    if (endDate) {
        query += ` AND ats.session_date <= $${paramCount++}`;
        values.push(endDate);
    }
    const result = await database_1.pool.query(query, values);
    const stats = result.rows[0];
    const presentCount = parseInt(stats.present) + parseInt(stats.late) + parseInt(stats.remote);
    const total = parseInt(stats.total);
    const attendance_rate = total > 0 ? (presentCount / total) * 100 : 0;
    return {
        total,
        present: parseInt(stats.present),
        absent: parseInt(stats.absent),
        late: parseInt(stats.late),
        excused: parseInt(stats.excused),
        remote: parseInt(stats.remote),
        excluded: parseInt(stats.excluded),
        attendance_rate: Math.round(attendance_rate * 100) / 100,
    };
}
//# sourceMappingURL=attendance.model.js.map