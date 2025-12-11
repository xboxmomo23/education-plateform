import { Request, Response } from 'express';
/**
 * GET /api/attendance/my-history
 * Récupérer l'historique de présence de l'élève connecté
 * (Utilisé par la page /student/assiduite)
 */
export declare function getMyHistoryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/absences
 * Récupérer toutes les absences avec filtres (staff uniquement)
 * (Utilisé par la page /staff/absences)
 */
export declare function getAllAbsencesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/classes
 * Récupérer les classes accessibles à l'utilisateur (pour les filtres)
 */
export declare function getAccessibleClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/attendance/absences/:recordId/justify
 * Justifier une absence
 */
export declare function justifyAbsenceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/stats/class/:classId
 * Statistiques de présence pour une classe
 */
export declare function getClassAttendanceStatsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateRecordStatusHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=attendance-extended.controller.d.ts.map