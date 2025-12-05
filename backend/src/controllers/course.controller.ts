import { Request, Response } from 'express';
import { pool } from '../config/database';

/**
 * GET /api/courses/my-courses
 * Récupère tous les cours du professeur connecté
 */
export async function getMyCoursesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const query = `
      SELECT 
        c.id,
        c.title,
        c.academic_year,
        s.name as subject_name,
        s.code as subject_code,
        cl.label as class_label,
        cl.code as class_code,
        cl.level as class_level
      FROM courses c
      INNER JOIN subjects s ON s.id = c.subject_id
      INNER JOIN classes cl ON cl.id = c.class_id
      WHERE c.teacher_id = $1
        AND c.active = TRUE
      ORDER BY cl.label, s.name
    `;

    const result = await pool.query(query, [req.user.userId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur récupération cours:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des cours',
    });
  }
}



// GET /api/courses/:courseId/students
// Récupérer les élèves d'un cours
export async function getCourseStudents(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;

    // Récupérer les élèves inscrits dans la classe du cours
    const result = await pool.query(
      `SELECT DISTINCT 
        u.id,
        u.full_name,
        u.email
      FROM users u
      INNER JOIN enrollments e ON e.student_id = u.id
      INNER JOIN courses c ON c.class_id = e.class_id
      WHERE c.id = $1
        AND e.end_date IS NULL
        AND u.role = 'student'
      ORDER BY u.full_name`,
      [courseId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur récupération élèves du cours:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des élèves',
    });
  }
}