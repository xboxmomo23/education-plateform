"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const reportCard_controller_1 = require("../controllers/reportCard.controller");
const router = (0, express_1.Router)();
// Toutes les routes nécessitent une authentification
router.use(auth_middleware_1.authenticate);
// =========================
// ROUTES BULLETINS
// =========================
// Statut d'un bulletin
router.get('/status/:studentId/:termId', [
    (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId invalide'),
    (0, express_validator_1.param)('termId').isUUID().withMessage('termId invalide'),
], reportCard_controller_1.getReportCardStatus);
// Valider un bulletin individuel
router.post('/validate', (0, auth_middleware_1.authorize)('admin', 'staff'), [
    (0, express_validator_1.body)('studentId').isUUID().withMessage('studentId invalide'),
    (0, express_validator_1.body)('termId').isUUID().withMessage('termId invalide'),
], reportCard_controller_1.validateReportCardHandler);
// Annuler une validation (admin uniquement)
router.post('/unvalidate', (0, auth_middleware_1.authorize)('admin'), [
    (0, express_validator_1.body)('studentId').isUUID().withMessage('studentId invalide'),
    (0, express_validator_1.body)('termId').isUUID().withMessage('termId invalide'),
], reportCard_controller_1.unvalidateReportCardHandler);
// Valider tous les bulletins d'une classe
router.post('/validate-class', (0, auth_middleware_1.authorize)('admin', 'staff'), [
    (0, express_validator_1.body)('classId').isUUID().withMessage('classId invalide'),
    (0, express_validator_1.body)('termId').isUUID().withMessage('termId invalide'),
], reportCard_controller_1.validateClassReportCards);
// Ajouter/modifier l'appréciation du conseil
router.put('/council-appreciation', (0, auth_middleware_1.authorize)('admin', 'staff', 'teacher'), [
    (0, express_validator_1.body)('studentId').isUUID().withMessage('studentId invalide'),
    (0, express_validator_1.body)('termId').isUUID().withMessage('termId invalide'),
    (0, express_validator_1.body)('appreciation').optional().isString(),
], reportCard_controller_1.setCouncilAppreciationHandler);
// Liste des bulletins d'une classe
router.get('/class/:classId/:termId', (0, auth_middleware_1.authorize)('admin', 'staff', 'teacher'), [
    (0, express_validator_1.param)('classId').isUUID().withMessage('classId invalide'),
    (0, express_validator_1.param)('termId').isUUID().withMessage('termId invalide'),
], reportCard_controller_1.getClassReportCardsHandler);
// =========================
// ROUTES APPRÉCIATIONS
// =========================
// Ajouter/modifier une appréciation par matière
router.post('/appreciations/subject', (0, auth_middleware_1.authorize)('admin', 'staff', 'teacher'), [
    (0, express_validator_1.body)('studentId').isUUID().withMessage('studentId invalide'),
    (0, express_validator_1.body)('termId').isUUID().withMessage('termId invalide'),
    (0, express_validator_1.body)('courseId').isUUID().withMessage('courseId invalide'),
    (0, express_validator_1.body)('appreciation').optional().isString(),
], reportCard_controller_1.setSubjectAppreciationHandler);
// Récupérer les appréciations d'un élève
router.get('/appreciations/student/:studentId/:termId', [
    (0, express_validator_1.param)('studentId').isUUID().withMessage('studentId invalide'),
    (0, express_validator_1.param)('termId').isUUID().withMessage('termId invalide'),
], reportCard_controller_1.getStudentAppreciationsHandler);
exports.default = router;
//# sourceMappingURL=reportCard.routes.js.map