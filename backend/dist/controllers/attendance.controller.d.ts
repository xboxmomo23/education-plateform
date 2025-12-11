import { Request, Response } from 'express';
/**
 * GET /api/attendance/week
 * Récupérer tous les cours d'un professeur pour une semaine avec statut présence
 */
export declare function getTeacherWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/session/:instanceId
 * Récupérer ou créer une session de présence pour une instance de cours
 */
export declare function getSessionHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/attendance/session/:sessionId/close
 * Fermer une session de présence
 */
export declare function closeSessionHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/attendance/mark
 * Marquer la présence d'un seul élève
 */
export declare function markAttendanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/attendance/bulk
 * Marquer la présence de plusieurs élèves en masse
 */
export declare function bulkMarkAttendanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/student/:studentId
 * Récupérer l'historique de présence d'un élève
 */
export declare function getStudentHistoryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/student/:studentId/stats
 * Récupérer les statistiques de présence d'un élève
 */
export declare function getStudentStatsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/instance/:instanceId/check
 * Vérifier si une session existe pour une instance (sans la créer)
 */
export declare function checkSessionExistsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=attendance.controller.d.ts.map