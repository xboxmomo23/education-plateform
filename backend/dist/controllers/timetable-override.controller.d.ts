import { Request, Response } from 'express';
/**
 * POST /api/timetable/overrides
 * Créer une exception (annulation, modification, remplacement)
 */
export declare function createOverrideHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/timetable/overrides/class/:classId/week/:weekStartDate
 * Récupérer les overrides d'une semaine pour une classe
 */
export declare function getOverridesForWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/timetable/overrides/:id
 * Modifier un override
 */
export declare function updateOverrideHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/timetable/overrides/:id
 * Supprimer un override
 */
export declare function deleteOverrideHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=timetable-override.controller.d.ts.map