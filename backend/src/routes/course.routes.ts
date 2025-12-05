import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getMyCoursesHandler } from '../controllers/course.controller';
import { getCourseStudents } from '../controllers/course.controller';

const router = Router();

/**
 * GET /api/courses/my-courses
 * Liste des cours du professeur connecté
 */
router.get(
  '/my-courses',
  authenticate,
  authorize('teacher', 'admin'),
  getMyCoursesHandler
);

router.get('/:courseId/students', authenticate, getCourseStudents);

export default router;