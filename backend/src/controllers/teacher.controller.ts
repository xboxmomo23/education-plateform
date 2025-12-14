import { Request, Response } from 'express';
import { TeacherModel } from '../models/teacher.model';

export async function getTeacherClassesSummaryHandler(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux professeurs',
      });
    }

    const teacherId = req.user.userId;
    const establishmentId = req.user.establishmentId;

    const summaries = await TeacherModel.getClassesSummary(teacherId, establishmentId);

    return res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('[Teacher] getClassesSummary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des classes du professeur',
    });
  }
}
