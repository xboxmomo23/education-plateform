import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getTimetableConfigHandler,
  updateDirectorSignature, 
  getDirectorSignature,
  updateTimetableConfigHandler,
} from '../controllers/establishment.controller';

const router = Router();

router.get('/timetable-config', authenticate, getTimetableConfigHandler);
router.put('/timetable-config', authenticate, authorize('admin'), updateTimetableConfigHandler);


// Signature du directeur
router.get('/director-signature', authenticate, getDirectorSignature);
router.put('/director-signature', authenticate, authorize('admin'), updateDirectorSignature);

export default router;