"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.TeacherModel = {
    async getClassesSummary(teacherId, establishmentId) {
        const params = [teacherId];
        let establishmentClause = '';
        if (establishmentId) {
            params.push(establishmentId);
            establishmentClause = 'AND cl.establishment_id = $2';
        }
        const query = `
      WITH teacher_classes AS (
        SELECT DISTINCT
          cl.id,
          cl.label,
          cl.level
        FROM classes cl
        JOIN courses c ON c.class_id = cl.id
        WHERE c.teacher_id = $1
          AND c.active = true
          AND cl.archived = false
          ${establishmentClause}
      )
      SELECT
        tc.id AS class_id,
        tc.label AS class_label,
        tc.level,
        COALESCE((
          SELECT COUNT(*)
          FROM students st
          JOIN users u ON u.id = st.user_id
          WHERE st.class_id = tc.id
            AND u.deleted_at IS NULL
            AND u.active = true
        ), 0) AS student_count,
        COALESCE((
          SELECT COUNT(*)
          FROM attendance_records ar
          JOIN attendance_sessions ases ON ar.session_id = ases.id
          WHERE ases.class_id = tc.id
            AND ases.teacher_id = $1
            AND ases.session_date = CURRENT_DATE
            AND ar.status = 'absent'
        ), 0) AS absent_today,
        COALESCE((
          SELECT COUNT(*)
          FROM attendance_records ar
          JOIN attendance_sessions ases ON ar.session_id = ases.id
          WHERE ases.class_id = tc.id
            AND ases.teacher_id = $1
            AND ases.session_date = CURRENT_DATE
            AND ar.status = 'late'
        ), 0) AS late_today,
        COALESCE((
          SELECT COUNT(*)
          FROM assignments a
          JOIN courses c2 ON a.course_id = c2.id
          WHERE c2.class_id = tc.id
            AND a.created_by = $1
            AND a.status = 'published'
            AND a.due_at < NOW()
        ), 0) AS pending_assignments,
        (
          SELECT MAX((ti.week_start_date + ((ti.day_of_week - 1) || ' days')::interval)::date)
          FROM timetable_instances ti
          JOIN courses c3 ON ti.course_id = c3.id
          WHERE c3.class_id = tc.id
            AND c3.teacher_id = $1
        ) AS last_session_date
      FROM teacher_classes tc
      ORDER BY tc.label
    `;
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
};
//# sourceMappingURL=teacher.model.js.map