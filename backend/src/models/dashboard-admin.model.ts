import pool from '../config/database';

export interface AdminDashboardKpis {
  students_active: number;
  teachers_active: number;
  staff_active: number;
  parents_active: number;
  absences_today_total: number;
  absences_today_not_justified: number;
  date: string;
}

export interface AdminPerformanceOptions {
  termId?: string | null;
  classId?: string | null;
}

export interface AdminPerformanceData {
  establishment: {
    avg: number;
    studentCount: number;
    passRate: number;
  };
  distribution: {
    lt10: number;
    b10_12: number;
    b12_14: number;
    b14_16: number;
    gte16: number;
  };
  classes: Array<{
    class_id: string;
    class_label: string;
    student_count: number;
    avg: number;
    passRate: number;
  }>;
  topStudents: Array<{
    student_id: string;
    full_name: string;
    class_label: string;
    avg: number;
  }>;
}

export async function getAdminKpis(
  establishmentId: string,
  date: string
): Promise<AdminDashboardKpis> {
  const countsQuery = `
    SELECT
      COUNT(*) FILTER (
        WHERE role = 'student'
          AND active = true
          AND deleted_at IS NULL
      )::INTEGER AS students_active,
      COUNT(*) FILTER (
        WHERE role = 'teacher'
          AND active = true
          AND deleted_at IS NULL
      )::INTEGER AS teachers_active,
      COUNT(*) FILTER (
        WHERE role = 'staff'
          AND active = true
          AND deleted_at IS NULL
      )::INTEGER AS staff_active,
      COUNT(*) FILTER (
        WHERE role = 'parent'
          AND active = true
          AND deleted_at IS NULL
      )::INTEGER AS parents_active
    FROM users
    WHERE establishment_id = $1
  `;

  const countsResult = await pool.query(countsQuery, [establishmentId]);
  const counts = countsResult.rows[0] || {
    students_active: 0,
    teachers_active: 0,
    staff_active: 0,
    parents_active: 0,
  };

  const absencesQuery = `
    SELECT
      COUNT(*) FILTER (
        WHERE ar.status IN ('absent', 'late', 'excused')
      )::INTEGER AS total,
      COUNT(*) FILTER (
        WHERE ar.status IN ('absent', 'late')
          AND COALESCE(ar.justified, false) = false
      )::INTEGER AS not_justified
    FROM attendance_records ar
    JOIN attendance_sessions ases ON ases.id = ar.session_id
    JOIN classes cl ON cl.id = ases.class_id
    WHERE ases.session_date = $2
      AND cl.establishment_id = $1
  `;

  const absencesResult = await pool.query(absencesQuery, [establishmentId, date]);
  const absences = absencesResult.rows[0] || { total: 0, not_justified: 0 };

  return {
    students_active: counts.students_active ?? 0,
    teachers_active: counts.teachers_active ?? 0,
    staff_active: counts.staff_active ?? 0,
    parents_active: counts.parents_active ?? 0,
    absences_today_total: absences.total ?? 0,
    absences_today_not_justified: absences.not_justified ?? 0,
    date,
  };
}

export async function getAdminPerformanceMetrics(
  establishmentId: string,
  options: AdminPerformanceOptions
): Promise<AdminPerformanceData> {
  const { termId = null, classId = null } = options;

  const query = `
    WITH filtered_grades AS (
      SELECT
        g.student_id,
        u.full_name,
        COALESCE(st_class.id, course_class.id) AS class_id,
        COALESCE(st_class.label, course_class.label) AS class_label,
        g.normalized_value,
        e.coefficient
      FROM grades g
      JOIN evaluations e ON e.id = g.evaluation_id
      JOIN courses c ON c.id = e.course_id
      JOIN classes course_class ON course_class.id = c.class_id
      JOIN users u ON u.id = g.student_id
      LEFT JOIN students st ON st.user_id = g.student_id
      LEFT JOIN classes st_class ON st_class.id = st.class_id
      WHERE u.establishment_id = $1
        AND g.absent = false
        AND g.normalized_value IS NOT NULL
        AND ($2::uuid IS NULL OR e.term_id = $2)
        AND ($3::uuid IS NULL OR COALESCE(st_class.id, course_class.id) = $3)
    ),
    student_averages AS (
      SELECT
        fg.student_id,
        fg.full_name,
        fg.class_id,
        fg.class_label,
        SUM(fg.normalized_value * fg.coefficient) / NULLIF(SUM(fg.coefficient), 0) AS avg
      FROM filtered_grades fg
      GROUP BY fg.student_id, fg.full_name, fg.class_id, fg.class_label
    ),
    class_stats AS (
      SELECT
        sa.class_id,
        sa.class_label,
        COUNT(*)::INTEGER AS student_count,
        COALESCE(AVG(sa.avg), 0) AS avg,
        COALESCE(ROUND(COUNT(*) FILTER (WHERE sa.avg >= 10)::numeric / NULLIF(COUNT(*), 0) * 100, 2), 0) AS pass_rate
      FROM student_averages sa
      WHERE sa.class_id IS NOT NULL
      GROUP BY sa.class_id, sa.class_label
    ),
    establishment_stats AS (
      SELECT
        COALESCE(AVG(sa.avg), 0) AS establishment_avg,
        COUNT(sa.student_id)::INTEGER AS student_count,
        COALESCE(ROUND(COUNT(sa.student_id) FILTER (WHERE sa.avg >= 10)::numeric / NULLIF(COUNT(sa.student_id), 0) * 100, 2), 0) AS establishment_pass_rate,
        COALESCE(SUM(CASE WHEN sa.avg < 10 THEN 1 ELSE 0 END), 0)::INTEGER AS lt10,
        COALESCE(SUM(CASE WHEN sa.avg >= 10 AND sa.avg < 12 THEN 1 ELSE 0 END), 0)::INTEGER AS b10_12,
        COALESCE(SUM(CASE WHEN sa.avg >= 12 AND sa.avg < 14 THEN 1 ELSE 0 END), 0)::INTEGER AS b12_14,
        COALESCE(SUM(CASE WHEN sa.avg >= 14 AND sa.avg < 16 THEN 1 ELSE 0 END), 0)::INTEGER AS b14_16,
        COALESCE(SUM(CASE WHEN sa.avg >= 16 THEN 1 ELSE 0 END), 0)::INTEGER AS gte16
      FROM student_averages sa
    ),
    top_students AS (
      SELECT
        sa.student_id,
        sa.full_name,
        sa.class_label,
        sa.avg
      FROM student_averages sa
      ORDER BY sa.avg DESC NULLS LAST, sa.full_name ASC
      LIMIT 10
    )
    SELECT
      es.establishment_avg,
      es.student_count,
      es.establishment_pass_rate,
      es.lt10,
      es.b10_12,
      es.b12_14,
      es.b14_16,
      es.gte16,
      COALESCE((SELECT json_agg(cs ORDER BY cs.avg DESC NULLS LAST, cs.class_label)
                FROM class_stats cs), '[]') AS classes,
      COALESCE((SELECT json_agg(ts ORDER BY ts.avg DESC NULLS LAST, ts.full_name)
                FROM top_students ts), '[]') AS top_students
    FROM establishment_stats es
  `;

  const result = await pool.query(query, [establishmentId, termId, classId]);
  const row = result.rows[0];

  const classes: AdminPerformanceData['classes'] = row?.classes || [];
  const topStudents: AdminPerformanceData['topStudents'] = row?.top_students || [];

  const classLogUnique = new Set(classes.map((cls: any) => cls.class_id)).size;
  const studentLogUnique = new Set(topStudents.map((student: any) => student.student_id)).size;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AdminPerformance] classes total/unique:', classes.length, '/', classLogUnique);
    console.log('[AdminPerformance] topStudents total/unique:', topStudents.length, '/', studentLogUnique);
  }

  return {
    establishment: {
      avg: Number(row?.establishment_avg ?? 0),
      studentCount: Number(row?.student_count ?? 0),
      passRate: Number(row?.establishment_pass_rate ?? 0),
    },
    distribution: {
      lt10: Number(row?.lt10 ?? 0),
      b10_12: Number(row?.b10_12 ?? 0),
      b12_14: Number(row?.b12_14 ?? 0),
      b14_16: Number(row?.b14_16 ?? 0),
      gte16: Number(row?.gte16 ?? 0),
    },
    classes: classes.map((cls: any) => ({
      class_id: cls.class_id,
      class_label: cls.class_label,
      student_count: Number(cls.student_count ?? 0),
      avg: Number(cls.avg ?? 0),
      passRate: Number(cls.pass_rate ?? 0),
    })),
    topStudents: topStudents.map((student: any) => ({
      student_id: student.student_id,
      full_name: student.full_name,
      class_label: student.class_label,
      avg: Number(student.avg ?? 0),
    })),
  };
}
