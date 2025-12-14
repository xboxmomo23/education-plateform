import { Request, Response } from 'express';
/**
 * GET /api/parent/students/:studentId/attendance
 * Retourne l'historique d'assiduité + stats pour un élève donné
 * (utilise la même logique que le flux élève)
 */
export declare function getParentStudentAttendanceHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=parent-attendance.controller.d.ts.map