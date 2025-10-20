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