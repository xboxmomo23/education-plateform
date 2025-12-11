import { Request, Response, NextFunction } from 'express';
import { assertParentCanAccessStudent, ParentAccessOptions } from '../models/parent.model';

export function requireParentAccessToStudent(options?: ParentAccessOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'parent') {
        res.status(403).json({
          success: false,
          error: 'Accès réservé aux parents',
        });
        return;
      }

      const studentId = (req.params.studentId as string) || (req.query.studentId as string);
      if (!studentId) {
        res.status(400).json({
          success: false,
          error: 'studentId is required',
        });
        return;
      }

      await assertParentCanAccessStudent(req.user.userId, studentId, options);
      next();
    } catch (error) {
      console.error('[ParentAccess] Forbidden', {
        parentId: req.user?.userId,
        requestedStudent: req.params.studentId || req.query.studentId,
        message: error instanceof Error ? error.message : error,
      });
      res.status(403).json({
        success: false,
        error: 'Forbidden: parent cannot access this student.',
      });
    }
  };
}
