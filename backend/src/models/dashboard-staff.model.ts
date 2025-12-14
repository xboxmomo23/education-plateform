import pool from '../config/database';

export interface StaffClassInfo {
  class_id: string;
  class_label: string;
  level: string | null;
  students_count: number;
}

export interface StaffClassAttendanceStats {
  class_id: string;
  absent_count: number;
  late_count: number;
  not_justified_count: number;
}

export interface StaffPendingAbsence {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string | null;
  class_id: string;
  class_label: string;
  status: 'absent' | 'late';
  session_date: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_color: string | null;
  justified: boolean;
  late_minutes: number | null;
}

function normalizeClassIds(classIds?: string[] | null): string[] {
  if (!classIds) return [];
  return classIds.filter(Boolean);
}

export const DashboardStaffModel = {
  async getAccessibleClasses(
    establishmentId: string,
    assignedClassIds?: string[] | null
  ): Promise<StaffClassInfo[]> {
    const scopedClassIds = normalizeClassIds(assignedClassIds);

    const params: any[] = [establishmentId];
    let whereClause = 'cl.establishment_id = $1';

    if (scopedClassIds.length > 0) {
      params.push(scopedClassIds);
      whereClause += ` AND cl.id = ANY($${params.length}::uuid[])`;
    }

    const query = `
      SELECT
        cl.id AS class_id,
        cl.label AS class_label,
        cl.level,
        COUNT(*) FILTER (
          WHERE u.id IS NOT NULL
            AND u.active = true
            AND u.deleted_at IS NULL
        )::INTEGER AS students_count
      FROM classes cl
      LEFT JOIN students st ON st.class_id = cl.id
      LEFT JOIN users u ON u.id = st.user_id
      WHERE ${whereClause}
        AND cl.archived = false
      GROUP BY cl.id
      ORDER BY cl.label
    `;

    const result = await pool.query(query, params);
    return result.rows;
  },

  async getClassAttendanceStats(
    establishmentId: string,
    classIds: string[],
    date: string
  ): Promise<StaffClassAttendanceStats[]> {
    const scopedClassIds = normalizeClassIds(classIds);
    if (scopedClassIds.length === 0) {
      return [];
    }

    const query = `
      SELECT
        st.class_id,
        COUNT(*) FILTER (WHERE ar.status = 'absent')::INTEGER AS absent_count,
        COUNT(*) FILTER (WHERE ar.status = 'late')::INTEGER AS late_count,
        COUNT(*) FILTER (
          WHERE (ar.status = 'absent' OR ar.status = 'late')
            AND COALESCE(ar.justified, false) = false
        )::INTEGER AS not_justified_count
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ases.id = ar.session_id
      JOIN students st ON st.user_id = ar.student_id
      JOIN classes cl ON cl.id = st.class_id
      WHERE ases.session_date = $1
        AND cl.establishment_id = $2
        AND st.class_id = ANY($3::uuid[])
      GROUP BY st.class_id
    `;

    const result = await pool.query(query, [date, establishmentId, scopedClassIds]);
    return result.rows;
  },

  async getPendingAbsences(
    establishmentId: string,
    classIds: string[],
    date: string,
    limit: number
  ): Promise<StaffPendingAbsence[]> {
    const scopedClassIds = normalizeClassIds(classIds);
    if (scopedClassIds.length === 0) {
      return [];
    }

    const query = `
      SELECT
        ar.id,
        ar.student_id,
        u.full_name AS student_name,
        sp.student_no AS student_number,
        cl.id AS class_id,
        cl.label AS class_label,
        ar.status,
        ases.session_date,
        ases.start_time,
        ases.end_time,
        s.name AS subject_name,
        s.color AS subject_color,
        COALESCE(ar.justified, false) AS justified,
        ar.late_minutes
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ases.id = ar.session_id
      JOIN timetable_instances ti ON ti.id = ases.instance_id
      JOIN courses c ON c.id = ti.course_id
      JOIN subjects s ON s.id = c.subject_id
      JOIN students st ON st.user_id = ar.student_id
      JOIN users u ON u.id = ar.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = ar.student_id
      JOIN classes cl ON cl.id = st.class_id
      WHERE ases.session_date = $1
        AND cl.establishment_id = $2
        AND st.class_id = ANY($3::uuid[])
        AND ar.status IN ('absent', 'late')
        AND COALESCE(ar.justified, false) = false
      ORDER BY ases.start_time DESC
      LIMIT $4
    `;

    const result = await pool.query(query, [date, establishmentId, scopedClassIds, limit]);
    return result.rows;
  },
};
