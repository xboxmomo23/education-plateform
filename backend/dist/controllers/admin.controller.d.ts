import { Request, Response } from "express";
export declare function searchParentsForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/dashboard
 */
export declare function getAdminDashboardHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/classes
 */
export declare function getAdminClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/classes
 */
export declare function createClassForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/classes/:id
 * (modifier label/capacity/room/archived)
 */
export declare function updateClassForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/students
 */
export declare function getAdminStudentsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/students
 */
export declare function createStudentForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PATCH /api/admin/students/:userId/status
 * (activer/désactiver un élève via users.active)
 */
export declare function updateStudentStatusHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateStudentClassHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function resendStudentInviteHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resendParentInviteHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getStudentClassChangesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function scheduleStudentClassChangeHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteStudentClassChangeHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function applyStudentClassChangesForTermHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/staff
 * Liste des comptes staff pour l'établissement de l'admin
 */
export declare function getAdminStaffHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/staff
 * Création d'un compte staff (user + établissement)
 */
export declare function createStaffForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/staff/:staffId
 * Modifier les infos de base (nom, email)
 */
export declare function updateStaffForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/staff/:staffId/status
 * Activer / désactiver un compte staff
 */
export declare function updateStaffStatusHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateStaffClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resendStaffInviteHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/teachers
 * Liste des professeurs de l'établissement de l'admin
 */
export declare function getAdminTeachersHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/teachers
 * Création d'un professeur (user + teacher_profile)
 */
export declare function createTeacherForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/teachers/:userId
 * Mise à jour du profil + user (nom, email, téléphone, spécialité, etc.)
 */
export declare function updateTeacherForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/teachers/:userId/status
 * Activer / désactiver un professeur
 */
export declare function updateTeacherStatusHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resendTeacherInviteHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateTeacherClassesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/subjects
 * Liste des matières de l'établissement de l'admin
 */
export declare function getAdminSubjectsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/subjects
 * Création d'une matière
 */
export declare function createSubjectForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/subjects/:subjectId
 * Mise à jour d'une matière
 */
export declare function updateSubjectForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/classes/:classId/courses
 * Liste des cours (matière + prof) d'une classe
 */
export declare function getClassCoursesForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/courses
 * Création d'un cours (classe + matière + professeur)
 */
export declare function createCourseForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/admin/courses/:courseId
 * Mise à jour d'un cours
 */
export declare function updateCourseForAdminHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=admin.controller.d.ts.map