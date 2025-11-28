import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  // Handlers INSTANCES (mode DYNAMIC)
  getClassTimetableForWeekHandler,
  getTeacherTimetableForWeekHandler,
  createInstanceHandler,
  bulkCreateInstancesHandler,
  updateInstanceHandler,
  deleteInstanceHandler,
  copyWeekHandler,
  // Handlers TEMPLATES
  getTemplatesByClassHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  generateFromTemplatesHandler,
  // Handlers STAFF & UTILITAIRES
  getStaffClassesHandler,
  getAvailableCoursesHandler,
  checkConflictsHandler,
  // Handlers LEGACY (compatibility)
  getClassTimetableHandler,
  getTeacherTimetableHandler,
  createEntryHandler,
  bulkCreateEntriesHandler,
  updateEntryHandler,
  deleteEntryHandler,
  createFromTemplateHandler,
  duplicateTimetableHandler,
} from '../controllers/timetable.controller';

const router = Router();

// =========================
// VALIDATIONS
// =========================

const createInstanceValidation = [
  body('course_id').isUUID().withMessage('ID de cours invalide'),
  body('class_id').isUUID().withMessage('ID de classe invalide'),
  body('week_start_date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide (format YYYY-MM-DD)'),
  body('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide (1-7)'),
  body('start_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide (format HH:MM)'),
  body('end_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide (format HH:MM)'),
  body('room').optional().isString().withMessage('Salle invalide'),
  body('notes').optional().isString().withMessage('Notes invalides'),
];

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

const createTemplateValidation = [
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
  body('room').optional().isString().withMessage('Salle invalide'),
];

// =========================
// ROUTES INSTANCES (MODE DYNAMIC)
// =========================

/**
 * GET /api/timetable/class/:classId/week/:weekStartDate
 * Récupérer l'emploi du temps d'une classe pour une semaine spécifique
 * Accessible par : élèves, professeurs, staff, admin
 */
router.get(
  '/class/:classId/week/:weekStartDate',
  authenticate,
  authorize('student', 'teacher', 'staff', 'admin'),
  param('classId').isUUID().withMessage('ID de classe invalide'),
  param('weekStartDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide (format YYYY-MM-DD)'),
  validateRequest,
  getClassTimetableForWeekHandler
);

/**
 * GET /api/timetable/teacher/:teacherId/week/:weekStartDate
 * Récupérer l'emploi du temps d'un professeur pour une semaine spécifique
 * Accessible par : professeurs, staff, admin
 */
router.get(
  '/teacher/:teacherId/week/:weekStartDate',
  authenticate,
  authorize('teacher', 'staff', 'admin'),
  param('teacherId').isUUID().withMessage('ID de professeur invalide'),
  param('weekStartDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide (format YYYY-MM-DD)'),
  validateRequest,
  getTeacherTimetableForWeekHandler
);

/**
 * POST /api/timetable/instances
 * Créer une instance de cours
 */
router.post(
  '/instances',
  authenticate,
  authorize('staff', 'admin'),
  createInstanceValidation,
  validateRequest,
  createInstanceHandler
);

/**
 * POST /api/timetable/instances/bulk
 * Créer plusieurs instances en masse
 */
router.post(
  '/instances/bulk',
  authenticate,
  authorize('staff', 'admin'),
  body('instances').isArray({ min: 1 }).withMessage('Au moins une instance requise'),
  validateRequest,
  bulkCreateInstancesHandler
);

/**
 * PUT /api/timetable/instances/:id
 * Mettre à jour une instance
 */
router.put(
  '/instances/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID().withMessage('ID invalide'),
  validateRequest,
  updateInstanceHandler
);

/**
 * DELETE /api/timetable/instances/:id
 * Supprimer une instance
 */
router.delete(
  '/instances/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID().withMessage('ID invalide'),
  validateRequest,
  deleteInstanceHandler
);

/**
 * POST /api/timetable/instances/copy-week
 * Copier les instances d'une semaine vers une autre
 */
router.post(
  '/instances/copy-week',
  authenticate,
  authorize('staff', 'admin'),
  body('classId').isUUID().withMessage('ID de classe invalide'),
  body('sourceWeekStart')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date source invalide'),
  body('targetWeekStart')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date cible invalide'),
  validateRequest,
  copyWeekHandler
);

// =========================
// ROUTES TEMPLATES
// =========================

/**
 * GET /api/timetable/templates/class/:classId
 * Récupérer les templates d'une classe
 */
router.get(
  '/templates/class/:classId',
  authenticate,
  authorize('staff', 'admin'),
  param('classId').isUUID().withMessage('ID de classe invalide'),
  validateRequest,
  getTemplatesByClassHandler
);

/**
 * POST /api/timetable/templates
 * Créer un nouveau template
 */
router.post(
  '/templates',
  authenticate,
  authorize('staff', 'admin'),
  createTemplateValidation,
  validateRequest,
  createTemplateHandler
);

/**
 * PUT /api/timetable/templates/:id
 * Modifier un template
 */
router.put(
  '/templates/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID().withMessage('ID de template invalide'),
  validateRequest,
  updateTemplateHandler
);

/**
 * DELETE /api/timetable/templates/:id
 * Supprimer un template
 */
router.delete(
  '/templates/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID().withMessage('ID de template invalide'),
  validateRequest,
  deleteTemplateHandler
);

/**
 * POST /api/timetable/templates/generate
 * Générer des instances depuis les templates pour une période
 */
router.post(
  '/templates/generate',
  authenticate,
  authorize('staff', 'admin'),
  body('classId').isUUID().withMessage('ID de classe invalide'),
  body('startDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date de début invalide'),
  body('endDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date de fin invalide'),
  validateRequest,
  generateFromTemplatesHandler
);

// =========================
// ROUTES STAFF & UTILITAIRES
// =========================

/**
 * GET /api/timetable/staff/classes
 * Récupérer les classes gérées par le staff
 */
router.get(
  '/staff/classes',
  authenticate,
  authorize('staff', 'admin'),
  getStaffClassesHandler
);

/**
 * GET /api/timetable/student/class
 * Récupérer la classe d'un élève
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

/**
 * POST /api/timetable/check-conflicts
 * Vérifier les conflits
 */
router.post(
  '/check-conflicts',
  authenticate,
  authorize('staff', 'admin'),
  body('course_id').isUUID().withMessage('ID de cours invalide'),
  body('class_id').isUUID().withMessage('ID de classe invalide'),
  body('week_start_date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide'),
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
  body('exclude_instance_id').optional().isUUID(),
  validateRequest,
  checkConflictsHandler
);

// =========================
// ROUTES ENTRIES (Templates - Compatibilité)
// =========================

/**
 * POST /api/timetable/entries/bulk
 * Créer plusieurs créneaux
 */
router.post(
  '/entries/bulk',
  authenticate,
  authorize('staff', 'admin'),
  body('entries').isArray({ min: 1 }).withMessage('Au moins un créneau requis'),
  validateRequest,
  bulkCreateEntriesHandler
);

/**
 * POST /api/timetable/entries/from-template
 * Créer un créneau à partir d'un template
 */
router.post(
  '/entries/from-template',
  authenticate,
  authorize('staff', 'admin'),
  body('template_id').isUUID().withMessage('ID de template invalide'),
  body('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Jour de la semaine invalide'),
  body('start_time')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide'),
  body('room').optional().isString(),
  body('notes').optional().isString(),
  validateRequest,
  createFromTemplateHandler
);

/**
 * POST /api/timetable/entries
 * Créer un créneau
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
 * PUT /api/timetable/entries/:id
 * Modifier un créneau
 */
router.put(
  '/entries/:id',
  authenticate,
  authorize('staff', 'admin'),
  param('id').isUUID().withMessage('ID invalide'),
  validateRequest,
  updateEntryHandler
);

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
// ROUTES LEGACY (Compatibilité)
// =========================

/**
 * POST /api/timetable/duplicate
 * Dupliquer un emploi du temps (DEPRECATED)
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

/**
 * GET /api/timetable/class/:classId
 * Récupérer l'emploi du temps d'une classe (LEGACY)
 * @deprecated Utiliser /class/:classId/week/:weekStartDate à la place
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
 * Récupérer l'emploi du temps d'un professeur (LEGACY)
 * @deprecated Utiliser /teacher/:teacherId/week/:weekStartDate à la place
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

export default router;