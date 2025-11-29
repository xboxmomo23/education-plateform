import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getTeacherWeekHandler,
  getSessionHandler,
  closeSessionHandler,
  markAttendanceHandler,
  bulkMarkAttendanceHandler,
  getStudentHistoryHandler,
  getStudentStatsHandler,
  checkSessionExistsHandler,
} from '../controllers/attendance.controller';
import {
  getMyHistoryHandler,
  getAllAbsencesHandler,
  getAccessibleClassesHandler,
  justifyAbsenceHandler,
  getClassAttendanceStatsHandler,
} from '../controllers/attendance-extended.controller';

const router = Router();

// ============================================
// VALIDATIONS
// ============================================

const markAttendanceValidation = [
  body('sessionId').isUUID().withMessage('ID de session invalide'),
  body('studentId').isUUID().withMessage('ID d\'élève invalide'),
  body('status').isIn(['present', 'absent', 'late', 'excused', 'excluded', 'remote']).withMessage('Statut invalide'),
  body('comment').optional().isString().isLength({ max: 500 }),
  body('lateMinutes').optional().isInt({ min: 0, max: 1440 }),
];

const bulkMarkValidation = [
  body('sessionId').isUUID().withMessage('ID de session invalide'),
  body('records').isArray({ min: 1 }).withMessage('records doit être un tableau non vide'),
  body('records.*.studentId').isUUID().withMessage('ID d\'élève invalide'),
  body('records.*.status').isIn(['present', 'absent', 'late', 'excused', 'excluded', 'remote']).withMessage('Statut invalide'),
];

// ============================================
// ROUTES - SEMAINE PROFESSEUR
// ============================================

router.get(
  '/week',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  query('weekStart').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('weekStart invalide'),
  query('teacherId').optional().isUUID(),
  validateRequest,
  getTeacherWeekHandler
);

// ============================================
// ROUTES - ÉLÈVE (son propre historique)
// ============================================

router.get(
  '/my-history',
  authenticate,
  authorize('student'),
  query('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  validateRequest,
  getMyHistoryHandler
);

// ============================================
// ROUTES - SESSION
// ============================================

router.get(
  '/session/:instanceId',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('instanceId').isUUID(),
  validateRequest,
  getSessionHandler
);

router.post(
  '/session/:sessionId/close',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('sessionId').isUUID(),
  validateRequest,
  closeSessionHandler
);

router.get(
  '/instance/:instanceId/check',
  authenticate,
  param('instanceId').isUUID(),
  validateRequest,
  checkSessionExistsHandler
);

// ============================================
// ROUTES - MARQUAGE PRÉSENCE
// ============================================

router.post(
  '/mark',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  markAttendanceValidation,
  validateRequest,
  markAttendanceHandler
);

router.post(
  '/bulk',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  bulkMarkValidation,
  validateRequest,
  bulkMarkAttendanceHandler
);

// ============================================
// ROUTES - HISTORIQUE ÉLÈVE
// ============================================

router.get(
  '/student/:studentId',
  authenticate,
  param('studentId').isUUID(),
  query('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('courseId').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  getStudentHistoryHandler
);

router.get(
  '/student/:studentId/stats',
  authenticate,
  param('studentId').isUUID(),
  query('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('courseId').optional().isUUID(),
  validateRequest,
  getStudentStatsHandler
);

// ============================================
// ROUTES - STAFF (gestion des absences)
// ============================================

router.get(
  '/absences',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  query('classId').optional(),
  query('status').optional(),
  query('schoolYear').optional(),
  query('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('search').optional(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  getAllAbsencesHandler
);

router.get(
  '/classes',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  getAccessibleClassesHandler
);

router.put(
  '/absences/:recordId/justify',
  authenticate,
  authorize('staff', 'admin'),
  param('recordId').isUUID(),
  body('justification').isString().isLength({ min: 1, max: 500 }),
  body('documentUrl').optional().isString(),
  validateRequest,
  justifyAbsenceHandler
);

router.get(
  '/stats/class/:classId',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('classId').isUUID(),
  query('startDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('endDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  validateRequest,
  getClassAttendanceStatsHandler
);

export default router;