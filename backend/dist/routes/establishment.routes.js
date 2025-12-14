"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const establishment_controller_1 = require("../controllers/establishment.controller");
const router = (0, express_1.Router)();
router.get('/timetable-config', auth_middleware_1.authenticate, establishment_controller_1.getTimetableConfigHandler);
router.put('/timetable-config', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), establishment_controller_1.updateTimetableConfigHandler);
router.get('/settings', auth_middleware_1.authenticate, establishment_controller_1.getEstablishmentSettingsHandler);
router.put('/settings', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), establishment_controller_1.updateEstablishmentSettingsHandler);
// Signature du directeur
router.get('/director-signature', auth_middleware_1.authenticate, establishment_controller_1.getDirectorSignature);
router.put('/director-signature', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), establishment_controller_1.updateDirectorSignature);
exports.default = router;
//# sourceMappingURL=establishment.routes.js.map