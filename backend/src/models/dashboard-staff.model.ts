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

export interface StaffAbsenceHistoryFilters {
  q?: string;
  classId?: string;
  status?: 'absent' | 'late' | 'excused' | 'all';
  justified?: 'true' | 'false' | 'all';
  from?: string;
  to?: string;
  sort?: 'date_desc' | 'date_asc' | 'student_asc' | 'class_asc';
}

export interface StaffAbsenceHistoryItem {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string | null;
  class_id: string;
  class_label: string;
  status: 'absent' | 'late' | 'excused';
  justified: boolean;
  session_date: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_color: string | null;
  teacher_name: string | null;
  comment: string | null;
  justification: string | null;
  justified_at: string | null;
  created_at: string;
  updated_at: string | null;
  late_minutes: number | null;
  school_year: string;
}

function normalizeClassIds(classIds?: string[] | null): string[] {
  if (!classIds) return [];
  return classIds.filter(Boolean);
}

function getOrderBy(sort?: string): string {
  switch (sort) {
    case 'date_asc':
      return 'ases.session_date ASC, ases.start_time ASC';
    case 'student_asc':
      return 'u.full_name ASC, ases.session_date DESC';
    case 'class_asc':
      return 'cl.label ASC, ases.session_date DESC';
    default:
      return 'ases.session_date DESC, ases.start_time DESC';
  }
}

function buildHistoryWhereClause(
  establishmentId: string,
  assignedClassIds: string[] | undefined,
  filters: StaffAbsenceHistoryFilters
) {
  const params: any[] = [establishmentId];
  const clauses: string[] = [
    'ases.establishment_id = $1',
    "ar.status IN ('absent','late','excused')",
    'u.deleted_at IS NULL',
  ];
  let paramIndex = 2;

  if (assignedClassIds && assignedClassIds.length > 0) {
    clauses.push(`cl.id = ANY($${paramIndex}::uuid[])`);
    params.push(assignedClassIds);
    paramIndex++;
  }

  if (filters.classId && filters.classId !== 'all') {
    clauses.push(`cl.id = $${paramIndex}`);
    params.push(filters.classId);
    paramIndex++;
  }

  if (filters.status && filters.status !== 'all') {
    clauses.push(`ar.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.justified === 'true') {
    clauses.push('COALESCE(ar.justified, false) = true');
  } else if (filters.justified === 'false') {
    clauses.push('COALESCE(ar.justified, false) = false');
  }

  if (filters.from) {
    clauses.push(`ases.session_date >= $${paramIndex}`);
    params.push(filters.from);
    paramIndex++;
  }

  if (filters.to) {
    clauses.push(`ases.session_date <= $${paramIndex}`);
    params.push(filters.to);
    paramIndex++;
  }

  if (filters.q) {
    clauses.push(`(
      u.full_name ILIKE $${paramIndex}
      OR cl.label ILIKE $${paramIndex}
      OR s.name ILIKE $${paramIndex}
      OR teacher.full_name ILIKE $${paramIndex}
    )`);
    params.push(`%${filters.q}%`);
    paramIndex++;
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
    nextParamIndex: paramIndex,
  };
}

const historySelect = `
  SELECT
    ar.id,
    ar.student_id,
    u.full_name AS student_name,
    sp.student_no AS student_number,
    cl.id AS class_id,
    cl.label AS class_label,
    ar.status,
    COALESCE(ar.justified, false) AS justified,
    ases.session_date,
    ases.start_time,
    ases.end_time,
    s.name AS subject_name,
    s.color AS subject_color,
    teacher.full_name AS teacher_name,
    ar.comment,
    ar.justification,
    ar.justified_at,
    ar.created_at,
    ar.updated_at,
    ar.late_minutes,
    CASE
      WHEN EXTRACT(MONTH FROM ases.session_date) >= 9
        THEN CONCAT(EXTRACT(YEAR FROM ases.session_date)::INT, '-', (EXTRACT(YEAR FROM ases.session_date)::INT + 1))
      ELSE CONCAT((EXTRACT(YEAR FROM ases.session_date)::INT - 1), '-', EXTRACT(YEAR FROM ases.session_date)::INT)
    END AS school_year
`;

const historyFrom = `
  FROM attendance_records ar
  JOIN attendance_sessions ases ON ases.id = ar.session_id
  JOIN classes cl ON ases.class_id = cl.id
  JOIN courses c ON ases.course_id = c.id
  JOIN subjects s ON c.subject_id = s.id
  JOIN users u ON ar.student_id = u.id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN users teacher ON teacher.id = c.teacher_id
`;

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

  async getAbsenceHistory(
    establishmentId: string,
    assignedClassIds: string[] | undefined,
    filters: StaffAbsenceHistoryFilters,
    page: number,
    limit: number
  ): Promise<{ items: StaffAbsenceHistoryItem[]; total: number }> {
    const { whereClause, params, nextParamIndex } = buildHistoryWhereClause(
      establishmentId,
      assignedClassIds,
      filters
    );

    const offset = (page - 1) * limit;
    const orderBy = getOrderBy(filters.sort);

    const dataQuery = `
      ${historySelect}
      ${historyFrom}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
    `;

    const dataParams = [...params, limit, offset];
    const result = await pool.query<StaffAbsenceHistoryItem>(dataQuery, dataParams);

    const countQuery = `
      SELECT COUNT(*) AS total
      ${historyFrom}
      ${whereClause}
    `;
    const countResult = await pool.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    return {
      items: result.rows,
      total,
    };
  },

  async getAbsencesForExport(
    establishmentId: string,
    assignedClassIds: string[] | undefined,
    filters: StaffAbsenceHistoryFilters,
    maxRows: number = 2000
  ): Promise<StaffAbsenceHistoryItem[]> {
    const { whereClause, params } = buildHistoryWhereClause(
      establishmentId,
      assignedClassIds,
      filters
    );
    const orderBy = getOrderBy(filters.sort);

    const exportQuery = `
      ${historySelect}
      ${historyFrom}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${Math.max(1, maxRows)}
    `;

    const result = await pool.query<StaffAbsenceHistoryItem>(exportQuery, params);
    return result.rows;
  },
};
