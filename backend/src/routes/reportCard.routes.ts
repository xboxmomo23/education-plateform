import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getReportCardStatus,
  validateReportCardHandler,
  unvalidateReportCardHandler,
  validateClassReportCards,
  setCouncilAppreciationHandler,
  getClassReportCardsHandler,
  setSubjectAppreciationHandler,
  getStudentAppreciationsHandler,
} from '../controllers/reportCard.controller';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// =========================
// ROUTES BULLETINS
// =========================

// Statut d'un bulletin
router.get(
  '/status/:studentId/:termId',
  [
    param('studentId').isUUID().withMessage('studentId invalide'),
    param('termId').isUUID().withMessage('termId invalide'),
  ],
  getReportCardStatus
);

// Valider un bulletin individuel
router.post(
  '/validate',
  authorize('admin', 'staff'),
  [
    body('studentId').isUUID().withMessage('studentId invalide'),
    body('termId').isUUID().withMessage('termId invalide'),
  ],
  validateReportCardHandler
);

// Annuler une validation (admin uniquement)
router.post(
  '/unvalidate',
  authorize('admin'),
  [
    body('studentId').isUUID().withMessage('studentId invalide'),
    body('termId').isUUID().withMessage('termId invalide'),
  ],
  unvalidateReportCardHandler
);

// Valider tous les bulletins d'une classe
router.post(
  '/validate-class',
  authorize('admin', 'staff'),
  [
    body('classId').isUUID().withMessage('classId invalide'),
    body('termId').isUUID().withMessage('termId invalide'),
  ],
  validateClassReportCards
);

// Ajouter/modifier l'appréciation du conseil
router.put(
  '/council-appreciation',
  authorize('admin', 'staff', 'teacher'),
  [
    body('studentId').isUUID().withMessage('studentId invalide'),
    body('termId').isUUID().withMessage('termId invalide'),
    body('appreciation').optional().isString(),
  ],
  setCouncilAppreciationHandler
);

// Liste des bulletins d'une classe
router.get(
  '/class/:classId/:termId',
  authorize('admin', 'staff', 'teacher'),
  [
    param('classId').isUUID().withMessage('classId invalide'),
    param('termId').isUUID().withMessage('termId invalide'),
  ],
  getClassReportCardsHandler
);

// =========================
// ROUTES APPRÉCIATIONS
// =========================

// Ajouter/modifier une appréciation par matière
router.post(
  '/appreciations/subject',
  authorize('admin', 'staff', 'teacher'),
  [
    body('studentId').isUUID().withMessage('studentId invalide'),
    body('termId').isUUID().withMessage('termId invalide'),
    body('courseId').isUUID().withMessage('courseId invalide'),
    body('appreciation').optional().isString(),
  ],
  setSubjectAppreciationHandler
);

// Récupérer les appréciations d'un élève
router.get(
  '/appreciations/student/:studentId/:termId',
  [
    param('studentId').isUUID().withMessage('studentId invalide'),
    param('termId').isUUID().withMessage('termId invalide'),
  ],
  getStudentAppreciationsHandler
);

export default router;