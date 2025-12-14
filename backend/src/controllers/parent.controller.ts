import { Request, Response } from 'express';
import pool from '../config/database';
import { getChildrenForParent, assertParentCanAccessStudent } from '../models/parent.model';

export async function getParentChildrenHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'parent') {
      res.status(403).json({
        success: false,
        error: 'Accès réservé aux parents',
      });
      return;
    }

    const includeInactive = typeof req.query.includeInactive === 'string' && req.query.includeInactive === 'true';
    const includePendingActivation =
      typeof req.query.includePendingActivation === 'string' && req.query.includePendingActivation === 'true';
    const children = await getChildrenForParent(req.user.userId, {
      includeInactive,
      includePendingActivation,
    });
    res.status(200).json({
      success: true,
      data: children,
    });
  } catch (error) {
    console.error('[ParentController] getParentChildrenHandler error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des enfants',
    });
  }
}

export async function checkParentChildAccessHandler(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      ok: true,
      studentId: req.params.studentId,
    },
  });
}

export async function getParentStudentSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'parent') {
      res.status(403).json({
        success: false,
        error: 'Accès réservé aux parents',
      });
      return;
    }

    const studentId = req.params.studentId;
    if (!studentId) {
      res.status(400).json({
        success: false,
        error: 'studentId requis',
      });
      return;
    }

    await assertParentCanAccessStudent(req.user.userId, studentId);

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          s.class_id,
          c.label AS class_label,
          c.code AS class_code,
          c.level AS class_level
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE u.id = $1
          AND u.role = 'student'
        LIMIT 1
      `,
      [studentId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Élève introuvable',
      });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        class_id: row.class_id || null,
        class_label: row.class_label || row.class_code || null,
        class_level: row.class_level || null,
      },
    });
  } catch (error) {
    console.error('[ParentController] getParentStudentSummaryHandler error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des informations élève',
    });
  }
}
