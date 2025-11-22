import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getClassTimetableHandler,
  getTeacherTimetableHandler,
  getAvailableCoursesHandler,
  createEntryHandler,
  bulkCreateEntriesHandler,
  updateEntryHandler,
  deleteEntryHandler,
  duplicateTimetableHandler,
  checkConflictsHandler,
} from '../controllers/timetable.controller';

const router = Router();

// =========================
// VALIDATIONS
// =========================

const createEntryValidation = [
  body('course_id').isUUID().withMessage('ID de cours invalide'),
  body('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide (1-7)'),
  body('start_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide (format HH:MM)'),
  body('end_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide (format HH:MM)'),
  body('week')
    .optional()
    .isIn(['A', 'B'])
    .withMessage('Semaine invalide (A ou B)'),
  body('room').optional().isString().withMessage('Salle invalide'),
  body('notes').optional().isString().withMessage('Notes invalides'),
];

const updateEntryValidation = [
  param('id').isUUID().withMessage('ID invalide'),
  body('day_of_week')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide (1-7)'),
  body('start_time')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide (format HH:MM)'),
  body('end_time')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide (format HH:MM)'),
  body('week')
    .optional()
    .isIn(['A', 'B', null])
    .withMessage('Semaine invalide (A, B ou null)'),
  body('room').optional().isString().withMessage('Salle invalide'),
  body('status')
    .optional()
    .isIn(['confirmed', 'cancelled', 'changed'])
    .withMessage('Statut invalide'),
  body('notes').optional().isString().withMessage('Notes invalides'),
];

// =========================
// ROUTES DE RÉCUPÉRATION
// =========================

/**
 * GET /api/timetable/class/:classId
 * Récupérer l'emploi du temps d'une classe
 */
router.get(
  '/class/:classId',
  authenticate,
  authorize('teacher', 'staff', 'admin', 'student'),
  param('classId').isUUID().withMessage('ID de classe invalide'),
  query('week').optional().isIn(['A', 'B']).withMessage('Semaine invalide'),
  validateRequest,
  getClassTimetableHandler
);

/**
 * GET /api/timetable/teacher/:teacherId
 * Récupérer l'emploi du temps d'un professeur
 */
router.get(
  '/teacher/:teacherId',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('teacherId').isUUID().withMessage('ID de professeur invalide'),
  query('week').optional().isIn(['A', 'B']).withMessage('Semaine invalide'),
  validateRequest,
  getTeacherTimetableHandler
);

/**
 * GET /api/timetable/courses/:classId
 * Récupérer les cours disponibles pour une classe
 */
router.get(
  '/courses/:classId',
  authenticate,
  authorize('staff', 'admin'),
  param('classId').isUUID().withMessage('ID de classe invalide'),
  validateRequest,
  getAvailableCoursesHandler
);

// =========================
// ROUTES DE CRÉATION
// =========================

/**
 * POST /api/timetable/entries
 * Créer un nouveau créneau
 */
router.post(
  '/entries',
  authenticate,
  authorize('staff', 'admin'),
  createEntryValidation,
  validateRequest,
  createEntryHandler
);

/**
 * POST /api/timetable/entries/bulk
 * Créer plusieurs créneaux en une fois
 */
router.post(
  '/entries/bulk',
  authenticate,
  authorize('staff', 'admin'),
  body('entries').isArray({ min: 1 }).withMessage('Au moins un créneau requis'),
  validateRequest,
  bulkCreateEntriesHandler
);

// =========================
// ROUTES DE MODIFICATION
// =========================

/**
 * PUT /api/timetable/entries/:id
 * Modifier un créneau
 */
router.put(
  '/entries/:id',
  authenticate,
  authorize('staff', 'admin'),
  updateEntryValidation,
  validateRequest,
  updateEntryHandler
);

// =========================
// ROUTES DE SUPPRESSION
// =========================

/**
 * DELETE /api/timetable/entries/:id
 * Supprimer un créneau
 */
router.delete(
  '/entries/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID().withMessage('ID invalide'),
  validateRequest,
  deleteEntryHandler
);

// =========================
// ROUTES DE DUPLICATION
// =========================

/**
 * POST /api/timetable/duplicate
 * Dupliquer l'emploi du temps d'une classe vers une autre
 */
router.post(
  '/duplicate',
  authenticate,
  authorize('staff', 'admin'),
  body('sourceClassId').isUUID().withMessage('ID de classe source invalide'),
  body('targetClassId').isUUID().withMessage('ID de classe cible invalide'),
  validateRequest,
  duplicateTimetableHandler
);

// =========================
// ROUTES DE VÉRIFICATION
// =========================

/**
 * POST /api/timetable/check-conflicts
 * Vérifier les conflits pour un créneau
 */
router.post(
  '/check-conflicts',
  authenticate,
  authorize('staff', 'admin'),
  body('course_id').isUUID().withMessage('ID de cours invalide'),
  body('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide'),
  body('start_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide'),
  body('end_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide'),
  body('room').optional().isString(),
  body('exclude_entry_id').optional().isUUID(),
  validateRequest,
  checkConflictsHandler
);


// =========================
// ROUTES STUDENT
// =========================

/**
 * GET /api/timetable/student/class
 * Récupérer la classe de l'élève connecté
 */
router.get(
  '/student/class',
  authenticate,
  authorize('student'),
  async (req: any, res) => {
    try {
      const userId = req.user.userId;
      
      const pool = (await import('../config/database')).default;
      const result = await pool.query(
        `SELECT s.class_id, c.label, c.level
         FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE s.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Élève non trouvé ou non assigné à une classe',
        });
      }

      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erreur récupération classe élève:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur',
      });
    }
  }
);


/**
 * GET /api/timetable/staff/classes
 * Classes gérées par le staff (temporaire)
 */
router.get(
  '/staff/classes',
  authenticate,
  authorize('staff', 'admin'),
  async (req: any, res) => {
    try {
      const pool = (await import('../config/database')).default;
      const result = await pool.query(
        `SELECT DISTINCT c.*
         FROM classes c
         JOIN class_staff cs ON c.id = cs.class_id
         WHERE cs.user_id = $1
         ORDER BY c.label`,
        [req.user.userId]
      );

      return res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Erreur:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur',
      });
    }
  }
);

export default router;