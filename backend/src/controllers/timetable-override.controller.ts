import { Request, Response } from 'express';
import { TimetableOverrideModel } from '../models/timetable-override.model';
import pool from '../config/database';

/**
 * POST /api/timetable/overrides
 * Créer une exception (annulation, modification, remplacement)
 */
export async function createOverrideHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { template_entry_id, override_date, override_type, ...overrideData } = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    // Vérifier que le template entry existe et récupérer la classe
    const entryQuery = `
      SELECT c.class_id
      FROM timetable_entries te
      JOIN courses c ON te.course_id = c.id
      WHERE te.id = $1
    `;
    const entryResult = await pool.query(entryQuery, [template_entry_id]);

    if (entryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Créneau non trouvé',
      });
    }

    const classId = entryResult.rows[0].class_id;

    // Si staff, vérifier qu'il gère cette classe
    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [classId, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    // Vérifier si un override existe déjà
    const exists = await TimetableOverrideModel.existsForEntryAndDate(template_entry_id, override_date);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'Une exception existe déjà pour ce créneau à cette date',
      });
    }

    // Créer l'override
    const override = await TimetableOverrideModel.create({
      template_entry_id,
      override_date,
      override_type,
      ...overrideData,
      created_by: userId,
    });

    return res.json({
      success: true,
      message: 'Exception créée avec succès',
      data: override,
    });
  } catch (error) {
    console.error('Erreur createOverrideHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'exception',
    });
  }
}

/**
 * GET /api/timetable/overrides/class/:classId/week/:weekStartDate
 * Récupérer les overrides d'une semaine pour une classe
 */
export async function getOverridesForWeekHandler(req: Request, res: Response) {
  try {
    const { classId, weekStartDate } = req.params;

    const overrides = await TimetableOverrideModel.getOverridesForWeek(classId, weekStartDate);

    return res.json({
      success: true,
      data: overrides,
    });
  } catch (error) {
    console.error('Erreur getOverridesForWeekHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des exceptions',
    });
  }
}

/**
 * PUT /api/timetable/overrides/:id
 * Modifier un override
 */
export async function updateOverrideHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: overrideId } = req.params;
    const updateData = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    // Vérifier que l'override existe
    const override = await TimetableOverrideModel.getById(overrideId);
    if (!override) {
      return res.status(404).json({
        success: false,
        error: 'Exception non trouvée',
      });
    }

    // Vérifier les permissions
    const entryQuery = `
      SELECT c.class_id
      FROM timetable_entries te
      JOIN courses c ON te.course_id = c.id
      WHERE te.id = $1
    `;
    const entryResult = await pool.query(entryQuery, [override.template_entry_id]);
    const classId = entryResult.rows[0].class_id;

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [classId, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    const updated = await TimetableOverrideModel.update(overrideId, updateData);

    return res.json({
      success: true,
      message: 'Exception mise à jour',
      data: updated,
    });
  } catch (error) {
    console.error('Erreur updateOverrideHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour',
    });
  }
}

/**
 * DELETE /api/timetable/overrides/:id
 * Supprimer un override
 */
export async function deleteOverrideHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: overrideId } = req.params;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const override = await TimetableOverrideModel.getById(overrideId);
    if (!override) {
      return res.status(404).json({
        success: false,
        error: 'Exception non trouvée',
      });
    }

    // Vérifier les permissions
    const entryQuery = `
      SELECT c.class_id
      FROM timetable_entries te
      JOIN courses c ON te.course_id = c.id
      WHERE te.id = $1
    `;
    const entryResult = await pool.query(entryQuery, [override.template_entry_id]);
    const classId = entryResult.rows[0].class_id;

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [classId, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    await TimetableOverrideModel.delete(overrideId);

    return res.json({
      success: true,
      message: 'Exception supprimée',
    });
  } catch (error) {
    console.error('Erreur deleteOverrideHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression',
    });
  }
}