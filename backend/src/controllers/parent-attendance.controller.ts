import { Request, Response } from 'express';
import { AttendanceModel } from '../models/attendance.model';

/**
 * GET /api/parent/students/:studentId/attendance
 * Retourne l'historique d'assiduité + stats pour un élève donné
 * (utilise la même logique que le flux élève)
 */
export async function getParentStudentAttendanceHandler(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const history = await AttendanceModel.getStudentAttendanceHistory(studentId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    const stats = await AttendanceModel.getStudentAttendanceStats(studentId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    return res.json({
      success: true,
      data: {
        history,
        stats,
      },
    });
  } catch (error) {
    console.error('Erreur getParentStudentAttendanceHandler:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération de l'assiduité",
    });
  }
}
