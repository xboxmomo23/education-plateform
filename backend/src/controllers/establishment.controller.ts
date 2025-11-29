import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * GET /api/establishment/timetable-config
 * Récupérer la config emploi du temps
 * 
 * MODE DYNAMIC UNIQUEMENT
 * Le champ timetable_mode a été supprimé de la réponse
 */
export async function getTimetableConfigHandler(req: Request, res: Response) {
  try {
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié',
      });
    }

    const userId = user.userId;

    // 1) Essayer de trouver l'établissement lié à l'utilisateur
    const query = `
      SELECT 
        e.auto_generate_weeks,
        e.school_year_start_date,
        e.school_year_end_date
      FROM establishments e
      JOIN users u ON u.establishment_id = e.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length > 0) {
      return res.json({
        success: true,
        data: result.rows[0],
      });
    }

    // 2) Fallback DEV : prendre le premier établissement existant
    const fallback = await pool.query(
      `SELECT auto_generate_weeks, school_year_start_date, school_year_end_date
       FROM establishments
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (fallback.rows.length > 0) {
      return res.json({
        success: true,
        data: fallback.rows[0],
      });
    }

    // 3) Cas extrême : vraiment aucun établissement
    return res.status(404).json({
      success: false,
      error: 'Établissement non trouvé',
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
 * 
 * MODE DYNAMIC UNIQUEMENT
 * Le champ timetable_mode n'est plus accepté/mis à jour
 */
export async function updateTimetableConfigHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { auto_generate_weeks, school_year_start_date, school_year_end_date } = req.body;

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

    // Mettre à jour (sans timetable_mode)
    const updateQuery = `
      UPDATE establishments
      SET 
        auto_generate_weeks = COALESCE($1, auto_generate_weeks),
        school_year_start_date = COALESCE($2, school_year_start_date),
        school_year_end_date = COALESCE($3, school_year_end_date)
      WHERE id = $4
      RETURNING auto_generate_weeks, school_year_start_date, school_year_end_date
    `;

    const result = await pool.query(updateQuery, [
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