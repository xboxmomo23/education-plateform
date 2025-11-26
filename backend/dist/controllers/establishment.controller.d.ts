import { Request, Response } from 'express';
/**
 * GET /api/establishment/timetable-config
 * Récupérer la config emploi du temps
 */
export declare function getTimetableConfigHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/establishment/timetable-config
 * Mettre à jour la config (admin uniquement)
 */
export declare function updateTimetableConfigHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=establishment.controller.d.ts.map