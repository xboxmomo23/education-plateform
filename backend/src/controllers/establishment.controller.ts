import { Request, Response } from 'express';
import pool from '../config/database';
import {
  getEstablishmentSettings as fetchEstablishmentSettings,
  upsertEstablishmentSettings,
  getDefaultEstablishmentSettings,
} from '../models/establishmentSettings.model';

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



// PUT /api/establishment/director-signature
// Met à jour la signature et le nom du directeur
export async function updateDirectorSignature(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    // Seul l'admin peut modifier
    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
      return;
    }

    const { directorName, directorSignature } = req.body;
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const result = await pool.query(
      `UPDATE establishments 
       SET director_name = $1, director_signature = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, director_name`,
      [directorName, directorSignature, establishmentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Établissement non trouvé' });
      return;
    }

    res.json({
      success: true,
      message: 'Signature du directeur mise à jour',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur mise à jour signature directeur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour',
    });
  }
}

export async function getEstablishmentSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const establishmentId = req.user.establishmentId;
    const settings = establishmentId
      ? await fetchEstablishmentSettings(establishmentId)
      : getDefaultEstablishmentSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Erreur getEstablishmentSettingsHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des paramètres établissement',
    });
  }
}

export async function updateEstablishmentSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
      return;
    }

    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({ success: false, error: 'Aucun établissement associé à ce compte' });
      return;
    }

    const { display_name, contact_email, school_year } = req.body || {};

    if (
      typeof display_name === 'undefined' &&
      typeof contact_email === 'undefined' &&
      typeof school_year === 'undefined'
    ) {
      res.status(400).json({
        success: false,
        error: 'Aucun champ à mettre à jour',
      });
      return;
    }

    const payload = {
      displayName:
        typeof display_name === 'string' ? display_name.trim() || null : display_name === null ? null : undefined,
      contactEmail:
        typeof contact_email === 'string'
          ? contact_email.trim().toLowerCase() || null
          : contact_email === null
            ? null
            : undefined,
      schoolYear:
        typeof school_year === 'string' ? school_year.trim() || null : school_year === null ? null : undefined,
    };

    const filteredPayload: Record<string, string | null> = {};
    (['displayName', 'contactEmail', 'schoolYear'] as const).forEach((key) => {
      const value = payload[key];
      if (value !== undefined) {
        filteredPayload[key] = value;
      }
    });

    if (Object.keys(filteredPayload).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucun champ à mettre à jour',
      });
      return;
    }

    const updated = await upsertEstablishmentSettings(establishmentId, filteredPayload);
    res.json({
      success: true,
      message: 'Paramètres mis à jour',
      data: updated,
    });
  } catch (error) {
    console.error('Erreur updateEstablishmentSettingsHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des paramètres',
    });
  }
}

// GET /api/establishment/director-signature
// Récupère la signature et le nom du directeur
export async function getDirectorSignature(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const result = await pool.query(
      `SELECT director_name, director_signature FROM establishments WHERE id = $1`,
      [establishmentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Établissement non trouvé' });
      return;
    }

    res.json({
      success: true,
      data: {
        directorName: result.rows[0].director_name,
        directorSignature: result.rows[0].director_signature,
      },
    });
  } catch (error) {
    console.error('Erreur récupération signature directeur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération',
    });
  }
}
