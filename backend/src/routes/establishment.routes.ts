import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getTimetableConfigHandler,
  updateDirectorSignature, 
  getDirectorSignature,
  updateTimetableConfigHandler,
  getEstablishmentSettingsHandler,
  updateEstablishmentSettingsHandler,
} from '../controllers/establishment.controller';

const router = Router();

router.get('/timetable-config', authenticate, getTimetableConfigHandler);
router.put('/timetable-config', authenticate, authorize('admin'), updateTimetableConfigHandler);

router.get('/settings', authenticate, getEstablishmentSettingsHandler);
router.put('/settings', authenticate, authorize('admin'), updateEstablishmentSettingsHandler);

// Signature du directeur
router.get('/director-signature', authenticate, getDirectorSignature);
router.put('/director-signature', authenticate, authorize('admin'), updateDirectorSignature);

export default router;
