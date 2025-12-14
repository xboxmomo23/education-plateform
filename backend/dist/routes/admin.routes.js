"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
// Toutes les routes /api/admin nécessitent un compte admin d'école connecté
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin"));
// Dashboard
router.get("/dashboard", admin_controller_1.getAdminDashboardHandler);
// Classes
router.get("/classes", admin_controller_1.getAdminClassesHandler);
router.post("/classes", [
    (0, express_validator_1.body)("code")
        .isString()
        .notEmpty()
        .withMessage("Le code de la classe est obligatoire"),
    (0, express_validator_1.body)("label")
        .isString()
        .notEmpty()
        .withMessage("Le libellé de la classe est obligatoire"),
    (0, express_validator_1.body)("academic_year")
        .isInt()
        .withMessage("L'année scolaire (academic_year) doit être un entier"),
    (0, express_validator_1.body)("level")
        .optional()
        .isString()
        .withMessage("Le niveau doit être une chaîne"),
    (0, express_validator_1.body)("capacity")
        .optional()
        .isInt()
        .withMessage("La capacité doit être un entier"),
], validation_middleware_1.validateRequest, admin_controller_1.createClassForAdminHandler);
router.patch("/classes/:id", [
    (0, express_validator_1.body)("label").optional().isString(),
    (0, express_validator_1.body)("capacity").optional().isInt(),
    (0, express_validator_1.body)("room").optional().isString(),
    (0, express_validator_1.body)("archived").optional().isBoolean(),
], validation_middleware_1.validateRequest, admin_controller_1.updateClassForAdminHandler);
// Élèves
router.get("/students", admin_controller_1.getAdminStudentsHandler);
router.get("/student-class-changes", admin_controller_1.getStudentClassChangesHandler);
router.post("/students", [
    (0, express_validator_1.body)("full_name")
        .isString()
        .notEmpty()
        .withMessage("Le nom complet de l'élève est obligatoire"),
    (0, express_validator_1.body)("login_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de connexion invalide"),
    (0, express_validator_1.body)("email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de connexion invalide"),
    (0, express_validator_1.body)("contact_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de contact invalide"),
    (0, express_validator_1.body)("class_id")
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage("class_id doit être un UUID valide"),
    (0, express_validator_1.body)("student_number")
        .optional()
        .isString()
        .withMessage("student_number doit être une chaîne"),
    (0, express_validator_1.body)("date_of_birth")
        .optional()
        .isISO8601()
        .withMessage("date_of_birth doit être une date valide (YYYY-MM-DD)"),
    (0, express_validator_1.body)("parents")
        .optional({ nullable: true })
        .isArray()
        .withMessage("parents doit être un tableau"),
    (0, express_validator_1.body)("parents.*.firstName")
        .isString()
        .withMessage("firstName est obligatoire")
        .bail()
        .notEmpty()
        .withMessage("firstName est obligatoire"),
    (0, express_validator_1.body)("parents.*.lastName")
        .isString()
        .withMessage("lastName est obligatoire")
        .bail()
        .notEmpty()
        .withMessage("lastName est obligatoire"),
    (0, express_validator_1.body)("parents.*.email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email parent invalide"),
    (0, express_validator_1.body)("parents.*.phone")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("phone doit être une chaîne"),
    (0, express_validator_1.body)("parents.*.relation_type")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("relation_type doit être une chaîne"),
    (0, express_validator_1.body)("parents.*.is_primary")
        .optional()
        .isBoolean()
        .withMessage("is_primary doit être un booléen"),
    (0, express_validator_1.body)("parents.*.can_view_grades")
        .optional()
        .isBoolean()
        .withMessage("can_view_grades doit être un booléen"),
    (0, express_validator_1.body)("parents.*.can_view_attendance")
        .optional()
        .isBoolean()
        .withMessage("can_view_attendance doit être un booléen"),
    (0, express_validator_1.body)("parents.*.receive_notifications")
        .optional()
        .isBoolean()
        .withMessage("receive_notifications doit être un booléen"),
], validation_middleware_1.validateRequest, admin_controller_1.createStudentForAdminHandler);
router.patch("/students/:userId/status", [
    (0, express_validator_1.body)("active")
        .isBoolean()
        .withMessage("Le champ 'active' doit être un booléen"),
], validation_middleware_1.validateRequest, admin_controller_1.updateStudentStatusHandler);
router.patch("/students/:userId", [
    (0, express_validator_1.body)("class_id")
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage("class_id doit être un UUID valide"),
    (0, express_validator_1.body)("parents")
        .optional({ nullable: true })
        .isArray()
        .withMessage("parents doit être un tableau"),
    (0, express_validator_1.body)("parents.*.firstName")
        .isString()
        .withMessage("firstName est obligatoire")
        .bail()
        .notEmpty()
        .withMessage("firstName est obligatoire"),
    (0, express_validator_1.body)("parents.*.lastName")
        .isString()
        .withMessage("lastName est obligatoire")
        .bail()
        .notEmpty()
        .withMessage("lastName est obligatoire"),
    (0, express_validator_1.body)("parents.*.email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email parent invalide"),
    (0, express_validator_1.body)("parents.*.phone")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("phone doit être une chaîne"),
    (0, express_validator_1.body)("parents.*.relation_type")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("relation_type doit être une chaîne"),
    (0, express_validator_1.body)("parents.*.is_primary")
        .optional()
        .isBoolean()
        .withMessage("is_primary doit être un booléen"),
    (0, express_validator_1.body)("parents.*.can_view_grades")
        .optional()
        .isBoolean()
        .withMessage("can_view_grades doit être un booléen"),
    (0, express_validator_1.body)("parents.*.can_view_attendance")
        .optional()
        .isBoolean()
        .withMessage("can_view_attendance doit être un booléen"),
    (0, express_validator_1.body)("parents.*.receive_notifications")
        .optional()
        .isBoolean()
        .withMessage("receive_notifications doit être un booléen"),
], validation_middleware_1.validateRequest, admin_controller_1.updateStudentClassHandler);
router.post("/students/:userId/class-changes", [
    (0, express_validator_1.body)("new_class_id")
        .isUUID()
        .withMessage("new_class_id doit être un UUID valide"),
    (0, express_validator_1.body)("effective_term_id")
        .isUUID()
        .withMessage("effective_term_id doit être un UUID valide"),
    (0, express_validator_1.body)("reason").optional().isString(),
], validation_middleware_1.validateRequest, admin_controller_1.scheduleStudentClassChangeHandler);
router.post("/students/:userId/resend-invite", admin_controller_1.resendStudentInviteHandler);
router.post("/students/:userId/resend-parent-invite", admin_controller_1.resendParentInviteHandler);
router.get("/parents", [
    (0, express_validator_1.query)("search").optional().isString().withMessage("search doit être une chaîne"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("limit doit être un entier entre 1 et 50"),
], validation_middleware_1.validateRequest, admin_controller_1.searchParentsForAdminHandler);
router.delete("/student-class-changes/:changeId", admin_controller_1.deleteStudentClassChangeHandler);
router.post("/student-class-changes/apply", [
    (0, express_validator_1.body)("term_id")
        .isUUID()
        .withMessage("term_id doit être un UUID valide"),
], validation_middleware_1.validateRequest, admin_controller_1.applyStudentClassChangesForTermHandler);
/**
 * GET /api/admin/staff
 */
router.get("/staff", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin"), admin_controller_1.getAdminStaffHandler);
/**
 * POST /api/admin/staff
 */
router.post("/staff", [
    (0, express_validator_1.body)("full_name")
        .notEmpty()
        .withMessage("Le nom complet est requis"),
    (0, express_validator_1.body)("login_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de connexion invalide"),
    (0, express_validator_1.body)("email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de connexion invalide"),
    (0, express_validator_1.body)("contact_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de contact invalide"),
    (0, express_validator_1.body)("phone")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("Le téléphone doit être une chaîne"),
    (0, express_validator_1.body)("department")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("La fonction doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.createStaffForAdminHandler);
router.post("/staff/:staffId/resend-invite", admin_controller_1.resendStaffInviteHandler);
router.put("/staff/:staffId/classes", [
    (0, express_validator_1.body)("assigned_class_ids")
        .isArray()
        .withMessage("assigned_class_ids doit être un tableau"),
    (0, express_validator_1.body)("assigned_class_ids.*")
        .isUUID()
        .withMessage("Chaque class_id doit être un UUID valide"),
], validation_middleware_1.validateRequest, admin_controller_1.updateStaffClassesHandler);
/**
 * PATCH /api/admin/staff/:staffId
 */
router.patch("/staff/:staffId", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin"), [
    (0, express_validator_1.body)("full_name").optional().isString(),
    (0, express_validator_1.body)("email").optional().isEmail().withMessage("Email invalide"),
    (0, express_validator_1.body)("contact_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de contact invalide"),
    (0, express_validator_1.body)("phone")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("Le téléphone doit être une chaîne"),
    (0, express_validator_1.body)("department")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("La fonction doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.updateStaffForAdminHandler);
/**
 * PATCH /api/admin/staff/:staffId/status
 */
router.patch("/staff/:staffId/status", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin"), [
    (0, express_validator_1.body)("active")
        .isBoolean()
        .withMessage("Le champ 'active' doit être un booléen"),
], validation_middleware_1.validateRequest, admin_controller_1.updateStaffStatusHandler);
// Matières
router.get("/subjects", admin_controller_1.getAdminSubjectsHandler);
router.post("/subjects", [
    (0, express_validator_1.body)("name")
        .isString()
        .notEmpty()
        .withMessage("Le nom de la matière est obligatoire"),
    (0, express_validator_1.body)("short_code")
        .optional()
        .isString()
        .withMessage("short_code doit être une chaîne"),
    (0, express_validator_1.body)("color")
        .optional()
        .isString()
        .withMessage("color doit être une chaîne"),
    (0, express_validator_1.body)("level")
        .optional()
        .isString()
        .withMessage("level doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.createSubjectForAdminHandler);
router.patch("/subjects/:subjectId", [
    (0, express_validator_1.body)("name").optional().isString().withMessage("name doit être une chaîne"),
    (0, express_validator_1.body)("short_code")
        .optional()
        .isString()
        .withMessage("short_code doit être une chaîne"),
    (0, express_validator_1.body)("color")
        .optional()
        .isString()
        .withMessage("color doit être une chaîne"),
    (0, express_validator_1.body)("level")
        .optional()
        .isString()
        .withMessage("level doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.updateSubjectForAdminHandler);
// Cours (affectations matière + prof + classe)
router.get("/classes/:classId/courses", admin_controller_1.getClassCoursesForAdminHandler);
router.post("/courses", [
    (0, express_validator_1.body)("class_id")
        .isUUID()
        .withMessage("class_id doit être un UUID valide"),
    (0, express_validator_1.body)("subject_id")
        .isUUID()
        .withMessage("subject_id doit être un UUID valide"),
    (0, express_validator_1.body)("teacher_id")
        .isUUID()
        .withMessage("teacher_id doit être un UUID valide"),
    (0, express_validator_1.body)("default_room")
        .optional()
        .isString()
        .withMessage("default_room doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.createCourseForAdminHandler);
router.patch("/courses/:courseId", [
    (0, express_validator_1.body)("subject_id")
        .optional()
        .isUUID()
        .withMessage("subject_id doit être un UUID valide"),
    (0, express_validator_1.body)("teacher_id")
        .optional()
        .isUUID()
        .withMessage("teacher_id doit être un UUID valide"),
    (0, express_validator_1.body)("default_room")
        .optional()
        .isString()
        .withMessage("default_room doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.updateCourseForAdminHandler);
// Professeurs
router.get("/teachers", admin_controller_1.getAdminTeachersHandler);
router.post("/teachers", [
    (0, express_validator_1.body)("full_name")
        .isString()
        .notEmpty()
        .withMessage("Le nom complet du professeur est obligatoire"),
    (0, express_validator_1.body)("login_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de connexion invalide"),
    (0, express_validator_1.body)("email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de connexion invalide"),
    (0, express_validator_1.body)("contact_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de contact invalide"),
    (0, express_validator_1.body)("employee_no")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("Le matricule doit être une chaîne"),
], validation_middleware_1.validateRequest, admin_controller_1.createTeacherForAdminHandler);
router.patch("/teachers/:userId", [
    (0, express_validator_1.body)("email")
        .optional()
        .isEmail()
        .withMessage("Email du professeur invalide"),
    (0, express_validator_1.body)("contact_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Email de contact invalide"),
], validation_middleware_1.validateRequest, admin_controller_1.updateTeacherForAdminHandler);
router.patch("/teachers/:userId/status", [
    (0, express_validator_1.body)("active")
        .isBoolean()
        .withMessage("Le champ 'active' doit être un booléen"),
], validation_middleware_1.validateRequest, admin_controller_1.updateTeacherStatusHandler);
router.post("/teachers/:userId/resend-invite", admin_controller_1.resendTeacherInviteHandler);
router.put("/teachers/:userId/classes", [
    (0, express_validator_1.body)("assigned_class_ids")
        .isArray()
        .withMessage("assigned_class_ids doit être un tableau"),
    (0, express_validator_1.body)("assigned_class_ids.*")
        .isUUID()
        .withMessage("Chaque class_id doit être un UUID valide"),
], validation_middleware_1.validateRequest, admin_controller_1.updateTeacherClassesHandler);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map