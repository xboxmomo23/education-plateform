import { Request, Response } from 'express';
/**
 * Récupérer l'emploi du temps d'une classe pour une semaine spécifique
 * MODE DYNAMIC UNIQUEMENT
 */
export declare function getClassTimetableForWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Récupérer l'emploi du temps d'un professeur pour une semaine spécifique
 * MODE DYNAMIC UNIQUEMENT
 */
export declare function getTeacherTimetableForWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Créer une instance
 */
export declare function createInstanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Créer plusieurs instances en masse (génération depuis template)
 */
export declare function bulkCreateInstancesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Mettre à jour une instance
 */
export declare function updateInstanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Supprimer une instance
 */
export declare function deleteInstanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Copier les instances d'une semaine vers une autre
 */
export declare function copyWeekHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Récupérer les templates d'une classe
 */
export declare function getTemplatesByClassHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Créer un template
 */
/**
 * Créer un template (course_templates)
 */
export declare function createTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Mettre à jour un template
 */
/**
 * Mettre à jour un template
 */
export declare function updateTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Supprimer un template
 */
export declare function deleteTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Générer des instances depuis les templates pour une période
 */
export declare function generateFromTemplatesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Récupérer les classes gérées par le staff
 */
export declare function getStaffClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Récupérer les cours disponibles pour une classe
 */
export declare function getAvailableCoursesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Mettre à jour un cours (staff)
 */
export declare function updateCourseForStaffHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Désactiver un cours (staff)
 * -> on fait un "soft delete" en mettant active = false
 */
export declare function deleteCourseForStaffHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSubjectsForStaffHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getTeachersForStaffHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createCourseForStaffHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Vérifier les conflits
 */
export declare function checkConflictsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * @deprecated Utiliser getClassTimetableForWeekHandler à la place
 * Récupérer l'emploi du temps d'une classe (legacy)
 */
export declare function getClassTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * @deprecated Utiliser getTeacherTimetableForWeekHandler à la place
 * Récupérer l'emploi du temps d'un professeur (legacy)
 */
export declare function getTeacherTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function bulkCreateEntriesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteEntryHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createFromTemplateHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function duplicateTimetableHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=timetable.controller.d.ts.map