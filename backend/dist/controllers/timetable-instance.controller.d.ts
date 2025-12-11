import { Request, Response } from 'express';
/**
 * GET /api/timetable/instances/class/:classId/week/:weekStartDate
 * Récupérer les instances d'une semaine
 */
export declare function getInstancesForWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/instances
 * Créer une instance (cours pour une semaine spécifique)
 */
export declare function createInstanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/instances/generate-from-template
 * Générer les instances d'une semaine depuis le template
 */
export declare function generateFromTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * ✨ NOUVEAU : POST /api/timetable/instances/generate-bulk
 * Générer les instances de PLUSIEURS semaines depuis le template
 */
export declare function generateFromTemplateBulkHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/instances/copy-week
 * Copier une semaine vers une autre
 */
export declare function copyWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/timetable/instances/:id
 * Modifier une instance
 */
export declare function updateInstanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/timetable/instances/:id
 * Supprimer une instance
 */
export declare function deleteInstanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=timetable-instance.controller.d.ts.map