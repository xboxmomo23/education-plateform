import { Request, Response } from 'express';
import { pool } from '../config/database';

// GET /api/classes
// Liste toutes les classes de l'établissement
export async function getAllClasses(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = req.user?.establishmentId || '18fdec95-29be-4d71-8669-21d67f3a4587';

    const result = await pool.query(
      `SELECT 
        id,
        label,
        level,
        academic_year
      FROM classes
      WHERE establishment_id = $1
      ORDER BY level, label`,
      [establishmentId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur récupération classes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des classes',
    });
  }
}