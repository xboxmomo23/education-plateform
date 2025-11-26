import { Request, Response } from 'express';
/**
 * GET /api/timetable/class/:classId
 * Récupérer l'emploi du temps d'une classe
 */
export declare function getClassTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/timetable/teacher/:teacherId
 * Récupérer l'emploi du temps d'un professeur
 */
export declare function getTeacherTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/timetable/courses/:classId
 * Récupérer les cours disponibles pour une classe
 */
export declare function getAvailableCoursesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/timetable/templates/class/:classId
 * Récupérer les templates d'une classe
 */
export declare function getTemplatesByClassHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/templates
 * Créer un nouveau template
 */
export declare function createTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/timetable/templates/:id
 * Modifier un template
 */
export declare function updateTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/timetable/templates/:id
 * Supprimer un template
 */
export declare function deleteTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/entries/from-template
 * Créer un créneau à partir d'un template
 */
export declare function createEntryFromTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function bulkCreateEntriesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function duplicateTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function checkConflictsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/timetable/staff/classes
 * Récupérer les classes gérées par le staff
 */
export declare function getStaffClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=timetable.controller.d.ts.map