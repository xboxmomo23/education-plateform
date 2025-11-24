import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getTimetableConfigHandler,
  updateTimetableConfigHandler,
} from '../controllers/establishment.controller';

const router = Router();

router.get('/timetable-config', authenticate, getTimetableConfigHandler);
router.put('/timetable-config', authenticate, authorize('admin'), updateTimetableConfigHandler);

export default router;