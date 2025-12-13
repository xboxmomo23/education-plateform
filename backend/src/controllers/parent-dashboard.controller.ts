import { Request, Response } from 'express';
import pool from '../config/database';
import { AssignmentModel } from '../models/assignment.model';
import { TimetableInstanceModel } from '../models/timetable.model';
import { AttendanceModel } from '../models/attendance.model';
import { assertParentCanAccessStudent } from '../models/parent.model';

type RecentGradeDto = {
  id: string;
  value: number;
  max_value: number;
  coefficient: number;
  subject_name: string;
  subject_color: string;
  evaluation_title: string;
  date: string;
};

type UpcomingHomeworkDto = {
  id: string;
  title: string;
  subject_name?: string;
  subject_color?: string;
  class_label?: string;
  due_at: string;
  description?: string | null;
  max_points?: number | null;
};

type UpcomingLessonDto = {
  id: string;
  subject_name: string;
  subject_color: string;
  teacher_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string | null;
};

export async function getParentStudentDashboardHandler(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux parents',
      });
    }

    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId requis',
      });
    }

    await assertParentCanAccessStudent(req.user.userId, studentId);

    const studentResult = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          sp.student_no,
          c.id AS class_id,
          c.label AS class_label,
          c.code AS class_code
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE u.id = $1
          AND u.role = 'student'
        LIMIT 1
      `,
      [studentId]
    );

    if (studentResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Élève introuvable',
      });
    }

    const studentRow = studentResult.rows[0];
    const classId: string | null = studentRow.class_id || null;

    const [recentGrades, upcomingHomework, nextSessions, attendanceStats] = await Promise.all([
      fetchRecentGrades(studentId),
      fetchUpcomingHomework(studentId),
      fetchUpcomingLessons(classId),
      fetchAttendanceStats(studentId),
    ]);

    return res.json({
      success: true,
      data: {
        student: {
          id: studentRow.id,
          full_name: studentRow.full_name,
          student_number: studentRow.student_no || null,
          class_id: classId,
          class_label: studentRow.class_label || studentRow.class_code || null,
        },
        recent_grades: recentGrades,
        upcoming_homework: upcomingHomework,
        next_sessions: nextSessions,
        attendance_stats: attendanceStats,
      },
    });
  } catch (error) {
    console.error('[ParentDashboard] getParentStudentDashboardHandler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement du tableau de bord parent',
    });
  }
}

async function fetchRecentGrades(studentId: string): Promise<RecentGradeDto[]> {
  const query = `
    SELECT 
      g.id,
      g.value,
      g.normalized_value,
      e.title AS evaluation_title,
      e.eval_date,
      e.max_scale,
      e.coefficient,
      s.name AS subject_name,
      s.color AS subject_color
    FROM grades g
    JOIN evaluations e ON g.evaluation_id = e.id
    JOIN courses c ON e.course_id = c.id
    JOIN subjects s ON c.subject_id = s.id
    WHERE g.student_id = $1
    ORDER BY e.eval_date DESC NULLS LAST, g.created_at DESC
    LIMIT 5
  `;

  const result = await pool.query(query, [studentId]);

  return result.rows
    .filter((row) => row.normalized_value !== null || row.value !== null)
    .map((row) => {
      const normalized = row.normalized_value ?? row.value;
      return {
        id: row.id,
        value: normalized !== null ? Number(normalized) : 0,
        max_value: row.max_scale ? Number(row.max_scale) : 20,
        coefficient: row.coefficient ? Number(row.coefficient) : 1,
        subject_name: row.subject_name,
        subject_color: row.subject_color || '#6b7280',
        evaluation_title: row.evaluation_title,
        date: row.eval_date,
      };
    });
}

async function fetchUpcomingHomework(studentId: string): Promise<UpcomingHomeworkDto[]> {
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const assignments = await AssignmentModel.getForStudent(studentId, {
    fromDueAt: todayIso,
  });

  return assignments
    .filter((assignment) => assignment.due_at && new Date(assignment.due_at) >= today)
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, 5)
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      subject_name: assignment.subject_name,
      subject_color: assignment.subject_color,
      class_label: assignment.class_label,
      due_at: assignment.due_at,
      description: assignment.description,
      max_points: assignment.max_points,
    }));
}

async function fetchUpcomingLessons(classId: string | null): Promise<UpcomingLessonDto[]> {
  if (!classId) {
    return [];
  }

  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const nextWeekStart = getWeekStart(addDays(now, 7));

  const [currentWeek, nextWeek] = await Promise.all([
    TimetableInstanceModel.getInstancesForWeek(classId, currentWeekStart),
    TimetableInstanceModel.getInstancesForWeek(classId, nextWeekStart),
  ]);

  const sessions = [...currentWeek, ...nextWeek].map((session: any) => {
    const sessionDate = addDays(new Date(session.week_start_date), session.day_of_week || 0);
    return {
      id: session.id,
      subject_name: session.subject_name,
      subject_color: session.subject_color || '#6b7280',
      teacher_name: session.teacher_name,
      date: sessionDate.toISOString().split('T')[0],
      start_time: session.start_time,
      end_time: session.end_time,
      room: session.room,
      startDateTime: new Date(`${sessionDate.toISOString().split('T')[0]}T${session.start_time}`),
    };
  });

  return sessions
    .filter((session) => session.startDateTime >= now)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime())
    .slice(0, 5)
    .map(({ startDateTime, ...rest }) => rest);
}

async function fetchAttendanceStats(studentId: string) {
  const { start, end } = getCurrentSchoolYearRange();
  return AttendanceModel.getStudentAttendanceStats(studentId, {
    startDate: start,
    endDate: end,
  });
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 (dimanche) -> 6 (samedi)
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getCurrentSchoolYearRange() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-07-31`,
  };
}
