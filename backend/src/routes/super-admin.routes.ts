import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getEstablishmentsForSuperAdminHandler,
  createEstablishmentWithAdminHandler,
  getSchoolAdminsHandler,
  createSchoolAdminHandler,
  updateEstablishmentStatusHandler,   
  softDeleteEstablishmentHandler,
  updateSchoolAdminStatusHandler,
} from '../controllers/super-admin.controller';

const router = Router();

// Toutes les routes super-admin : user doit être connecté + super_admin
router.use(authenticate, authorize('super_admin'));

// GET /api/super-admin/establishments
router.get('/establishments', getEstablishmentsForSuperAdminHandler);

// POST /api/super-admin/establishments
router.post(
  "/establishments",
  [
    body("name").isString().notEmpty().withMessage("Nom obligatoire"),
    body("code").isString().notEmpty().withMessage("Code obligatoire"),
    body("email").isEmail().withMessage("Email d'établissement invalide"),
    body("admin_email").isEmail().withMessage("Email admin d'école invalide"),
    body("admin_full_name")
      .isString()
      .notEmpty()
      .withMessage("Nom complet admin obligatoire"),
  ],
  validateRequest,
  createEstablishmentWithAdminHandler
);

// PATCH /api/super-admin/establishments/:id/status
router.patch(
  "/establishments/:id/status",
  [
    body("active")
      .isBoolean()
      .withMessage("Le champ 'active' doit être un booléen"),
  ],
  validateRequest,
  updateEstablishmentStatusHandler
);

// DELETE /api/super-admin/establishments/:id
router.delete("/establishments/:id", softDeleteEstablishmentHandler);

// GET /api/super-admin/school-admins
router.get('/school-admins', getSchoolAdminsHandler);

// POST /api/super-admin/school-admins
router.post(
  "/school-admins",
  [
    body("establishment_id")
      .isUUID()
      .withMessage("establishment_id doit être un UUID valide"),
    body("admin_email")
      .isEmail()
      .withMessage("Email admin d'école invalide"),
    body("admin_full_name")
      .isString()
      .notEmpty()
      .withMessage("Nom complet admin obligatoire"),
  ],
  validateRequest,
  createSchoolAdminHandler
);

// PATCH /api/super-admin/school-admins/:id/status   ← tu AJOUTES
router.patch(
  "/school-admins/:id/status",
  [
    body("active")
      .isBoolean()
      .withMessage("Le champ 'active' doit être un booléen"),
  ],
  validateRequest,
  updateSchoolAdminStatusHandler
);

export default router;
