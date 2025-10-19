import { Request, Response } from 'express';
/**
 * POST /api/grades/evaluations
 * Crée une nouvelle évaluation
 */
export declare function createEvaluationHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/evaluations
 * Liste les évaluations du professeur
 */
export declare function getTeacherEvaluationsHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/evaluations/:id
 * Détails d'une évaluation avec toutes les notes
 */
export declare function getEvaluationDetailsHandler(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/grades/evaluations/:id
 * Modifie une évaluation
 */
export declare function updateEvaluationHandler(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/grades/evaluations/:id
 * Supprime une évaluation
 */
export declare function deleteEvaluationHandler(req: Request, res: Response): Promise<void>;
/**
 * POST /api/grades
 * Saisie/modification de notes en batch
 */
export declare function createOrUpdateGradesHandler(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/grades/:id
 * Modifie une note individuelle
 */
export declare function updateGradeHandler(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/grades/:id
 * Supprime une note
 */
export declare function deleteGradeHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/:id
 * Récupère les détails complets d'une note pour l'édition
 */
export declare function getGradeByIdHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/:id/history
 * Récupère l'historique d'une note
 */
export declare function getGradeHistoryHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/student/:studentId
 * Récupère toutes les notes d'un élève
 */
export declare function getStudentGradesHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/student/:studentId/averages
 * Récupère les moyennes d'un élève
 */
export declare function getStudentAveragesHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/children
 * Récupère les notes des enfants d'un responsable
 */
export declare function getChildrenGradesHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/course/:courseId
 * Récupère toutes les notes d'un cours
 */
export declare function getCourseGradesHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/grades/class/:classId/averages
 * Récupère les moyennes d'une classe
 */
export declare function getClassAveragesHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=grade.controller.d.ts.map