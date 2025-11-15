import { Request, Response } from 'express';
/**
 * GET /api/attendance/sessions
 * Récupérer les sessions du jour pour le professeur ou le staff
 */
export declare function getSessionsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/sessions/:id
 * Récupérer les élèves d'une session pour faire l'appel
 */
export declare function getSessionStudentsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/attendance/sessions/:id/records/bulk
 * Sauvegarder l'appel complet (batch)
 */
export declare function bulkCreateRecordsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/attendance/records/:id
 * Modifier une présence individuelle
 */
export declare function updateRecordHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/students/:id/records
 * Historique des présences d'un élève
 */
export declare function getStudentRecordsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/students/:id/stats
 * Statistiques de présence d'un élève
 */
export declare function getStudentStatsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/attendance/staff/classes
 * Classes gérées par le staff
 */
export declare function getStaffClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=attendance.controller.d.ts.map