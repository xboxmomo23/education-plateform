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
 * POST /api/timetable/entries
 * Créer un nouveau créneau
 */
export declare function createEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/entries/bulk
 * Créer plusieurs créneaux en une fois
 */
export declare function bulkCreateEntriesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/timetable/entries/:id
 * Modifier un créneau
 */
export declare function updateEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/timetable/entries/:id
 * Supprimer un créneau
 */
export declare function deleteEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/duplicate
 * Dupliquer l'emploi du temps d'une classe vers une autre
 */
export declare function duplicateTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/timetable/check-conflicts
 * Vérifier les conflits pour un créneau
 */
export declare function checkConflictsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=timetable.controller.d.ts.map