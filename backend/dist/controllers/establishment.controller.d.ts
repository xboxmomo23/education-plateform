import { Request, Response } from 'express';
/**
 * GET /api/establishment/timetable-config
 * Récupérer la config emploi du temps
 *
 * MODE DYNAMIC UNIQUEMENT
 * Le champ timetable_mode a été supprimé de la réponse
 */
export declare function getTimetableConfigHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/establishment/timetable-config
 * Mettre à jour la config (admin uniquement)
 *
 * MODE DYNAMIC UNIQUEMENT
 * Le champ timetable_mode n'est plus accepté/mis à jour
 */
export declare function updateTimetableConfigHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateDirectorSignature(req: Request, res: Response): Promise<void>;
export declare function getDirectorSignature(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=establishment.controller.d.ts.map