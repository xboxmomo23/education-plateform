"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const super_admin_controller_1 = require("../controllers/super-admin.controller");
const router = (0, express_1.Router)();
// Toutes les routes super-admin : user doit être connecté + super_admin
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('super_admin'));
// GET /api/super-admin/establishments
router.get('/establishments', super_admin_controller_1.getEstablishmentsForSuperAdminHandler);
// POST /api/super-admin/establishments
router.post("/establishments", [
    (0, express_validator_1.body)("name").isString().notEmpty().withMessage("Nom obligatoire"),
    (0, express_validator_1.body)("code").isString().notEmpty().withMessage("Code obligatoire"),
    (0, express_validator_1.body)("email").isEmail().withMessage("Email d'établissement invalide"),
    (0, express_validator_1.body)("admin_email").isEmail().withMessage("Email admin d'école invalide"),
    (0, express_validator_1.body)("admin_full_name")
        .isString()
        .notEmpty()
        .withMessage("Nom complet admin obligatoire"),
], validation_middleware_1.validateRequest, super_admin_controller_1.createEstablishmentWithAdminHandler);
// PATCH /api/super-admin/establishments/:id/status
router.patch("/establishments/:id/status", [
    (0, express_validator_1.body)("active")
        .isBoolean()
        .withMessage("Le champ 'active' doit être un booléen"),
], validation_middleware_1.validateRequest, super_admin_controller_1.updateEstablishmentStatusHandler);
// DELETE /api/super-admin/establishments/:id
router.delete("/establishments/:id", super_admin_controller_1.softDeleteEstablishmentHandler);
// GET /api/super-admin/school-admins
router.get('/school-admins', super_admin_controller_1.getSchoolAdminsHandler);
// POST /api/super-admin/school-admins
router.post("/school-admins", [
    (0, express_validator_1.body)("establishment_id")
        .isUUID()
        .withMessage("establishment_id doit être un UUID valide"),
    (0, express_validator_1.body)("admin_email")
        .isEmail()
        .withMessage("Email admin d'école invalide"),
    (0, express_validator_1.body)("admin_full_name")
        .isString()
        .notEmpty()
        .withMessage("Nom complet admin obligatoire"),
], validation_middleware_1.validateRequest, super_admin_controller_1.createSchoolAdminHandler);
// PATCH /api/super-admin/school-admins/:id/status   ← tu AJOUTES
router.patch("/school-admins/:id/status", [
    (0, express_validator_1.body)("active")
        .isBoolean()
        .withMessage("Le champ 'active' doit être un booléen"),
], validation_middleware_1.validateRequest, super_admin_controller_1.updateSchoolAdminStatusHandler);
exports.default = router;
//# sourceMappingURL=super-admin.routes.js.map