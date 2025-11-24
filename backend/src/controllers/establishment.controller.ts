import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * GET /api/establishment/timetable-config
 * Récupérer la config emploi du temps
 */
export async function getTimetableConfigHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    // Récupérer l'établissement de l'utilisateur
    const query = `
      SELECT 
        e.timetable_mode,
        e.auto_generate_weeks,
        e.school_year_start_date,
        e.school_year_end_date
      FROM establishments e
      JOIN users u ON u.establishment_id = e.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur getTimetableConfigHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la configuration',
    });
  }
}

/**
 * PUT /api/establishment/timetable-config
 * Mettre à jour la config (admin uniquement)
 */
export async function updateTimetableConfigHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { timetable_mode, auto_generate_weeks, school_year_start_date, school_year_end_date } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs',
      });
    }

    // Récupérer l'establishment_id
    const userQuery = 'SELECT establishment_id FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const establishmentId = userResult.rows[0].establishment_id;

    // Mettre à jour
    const updateQuery = `
      UPDATE establishments
      SET 
        timetable_mode = COALESCE($1, timetable_mode),
        auto_generate_weeks = COALESCE($2, auto_generate_weeks),
        school_year_start_date = COALESCE($3, school_year_start_date),
        school_year_end_date = COALESCE($4, school_year_end_date)
      WHERE id = $5
      RETURNING timetable_mode, auto_generate_weeks, school_year_start_date, school_year_end_date
    `;

    const result = await pool.query(updateQuery, [
      timetable_mode || null,
      auto_generate_weeks !== undefined ? auto_generate_weeks : null,
      school_year_start_date || null,
      school_year_end_date || null,
      establishmentId,
    ]);

    return res.json({
      success: true,
      message: 'Configuration mise à jour',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur updateTimetableConfigHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour',
    });
  }
}