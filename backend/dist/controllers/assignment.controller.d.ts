import { Request, Response } from 'express';
/**
 * GET /api/assignments/teacher/courses
 * Récupérer les cours du professeur connecté
 * (Pour pouvoir créer des devoirs)
 */
export declare function getTeacherCoursesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/assignments/teacher
 * Récupérer les devoirs d'un enseignant avec filtres
 */
export declare function getTeacherAssignmentsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/assignments/teacher
 * Créer un nouveau devoir
 */
export declare function createAssignmentHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/assignments/teacher/:id
 * Modifier un devoir existant
 */
export declare function updateAssignmentHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/assignments/teacher/:id
 * Supprimer (archiver) un devoir
 */
export declare function deleteAssignmentHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/assignments/student
 * Récupérer les devoirs pour un élève
 */
export declare function getStudentAssignmentsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/assignments/student/:id
 * Récupérer un devoir spécifique pour un élève
 */
export declare function getStudentAssignmentByIdHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=assignment.controller.d.ts.map