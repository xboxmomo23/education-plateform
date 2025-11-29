import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import {
  getEstablishmentsHandler,
  createEstablishmentHandler,
  updateEstablishmentHandler,
  toggleEstablishmentActiveHandler,
} from "../controllers/super-admin.controller";

const router = Router();

// Toutes les routes super-admin nécessitent une authentification
router.use(authenticate);

// GET /api/super-admin/establishments
router.get("/establishments", getEstablishmentsHandler);

// POST /api/super-admin/establishments
router.post(
  "/establishments",
  [
    body("name").isString().notEmpty().withMessage("Nom obligatoire"),
    body("code").isString().notEmpty().withMessage("Code obligatoire"),
    body("email").isEmail().withMessage("Email invalide"),
    body("max_students").optional().isInt({ min: 1 }).withMessage("Capacité max invalide"),
  ],
  validateRequest,
  createEstablishmentHandler
);

// PUT /api/super-admin/establishments/:id
router.put(
  "/establishments/:id",
  [param("id").isUUID().withMessage("ID d'établissement invalide")],
  validateRequest,
  updateEstablishmentHandler
);

// PATCH /api/super-admin/establishments/:id/toggle-active
router.patch(
  "/establishments/:id/toggle-active",
  [param("id").isUUID().withMessage("ID d'établissement invalide")],
  validateRequest,
  toggleEstablishmentActiveHandler
);

export default router;
