import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  getAdminDashboardHandler,
  getAdminClassesHandler,
  createClassForAdminHandler,
  updateClassForAdminHandler,
  getAdminStudentsHandler,
  createStudentForAdminHandler,
  updateStudentStatusHandler,
  // 👇 Professeurs
  getAdminTeachersHandler,
  createTeacherForAdminHandler,
  updateTeacherForAdminHandler,
  updateTeacherStatusHandler,
  // 👇 Matières
  getAdminSubjectsHandler,
  createSubjectForAdminHandler,
  updateSubjectForAdminHandler,
  // 👇 Cours (affectations)
  getClassCoursesForAdminHandler,
  createCourseForAdminHandler,
  updateCourseForAdminHandler,
  // Staffs
  getAdminStaffHandler,
  createStaffForAdminHandler,
  updateStaffForAdminHandler,
  updateStaffStatusHandler,
} from "../controllers/admin.controller";


import { body } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();

// Toutes les routes /api/admin nécessitent un compte admin d'école connecté
router.use(authenticate, authorize("admin"));

// Dashboard
router.get("/dashboard", getAdminDashboardHandler);

// Classes
router.get("/classes", getAdminClassesHandler);

router.post(
  "/classes",
  [
    body("code")
      .isString()
      .notEmpty()
      .withMessage("Le code de la classe est obligatoire"),
    body("label")
      .isString()
      .notEmpty()
      .withMessage("Le libellé de la classe est obligatoire"),
    body("academic_year")
      .isInt()
      .withMessage("L'année scolaire (academic_year) doit être un entier"),
    body("level")
      .optional()
      .isString()
      .withMessage("Le niveau doit être une chaîne"),
    body("capacity")
      .optional()
      .isInt()
      .withMessage("La capacité doit être un entier"),
  ],
  validateRequest,
  createClassForAdminHandler
);

router.patch(
  "/classes/:id",
  [
    body("label").optional().isString(),
    body("capacity").optional().isInt(),
    body("room").optional().isString(),
    body("archived").optional().isBoolean(),
  ],
  validateRequest,
  updateClassForAdminHandler
);

// Élèves
router.get("/students", getAdminStudentsHandler);

router.post(
  "/students",
  [
    body("full_name")
      .isString()
      .notEmpty()
      .withMessage("Le nom complet de l'élève est obligatoire"),
    body("login_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de connexion invalide"),
    body("email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de connexion invalide"),
    body("contact_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de contact invalide"),
    body("class_id").isUUID().withMessage("class_id doit être un UUID valide"),
    body("student_number")
      .optional()
      .isString()
      .withMessage("student_number doit être une chaîne"),
    body("date_of_birth")
      .optional()
      .isISO8601()
      .withMessage("date_of_birth doit être une date valide (YYYY-MM-DD)"),
  ],
  validateRequest,
  createStudentForAdminHandler
);

router.patch(
  "/students/:userId/status",
  [
    body("active")
      .isBoolean()
      .withMessage("Le champ 'active' doit être un booléen"),
  ],
  validateRequest,
  updateStudentStatusHandler
);





/**
 * GET /api/admin/staff
 */
router.get(
  "/staff",
  authenticate,
  authorize("admin"),
  getAdminStaffHandler
);

/**
 * POST /api/admin/staff
 */
router.post(
  "/staff",
  [
    body("full_name")
      .notEmpty()
      .withMessage("Le nom complet est requis"),
    body("login_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de connexion invalide"),
    body("email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de connexion invalide"),
    body("contact_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de contact invalide"),
    body("phone")
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("Le téléphone doit être une chaîne"),
    body("department")
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("La fonction doit être une chaîne"),
  ],
  validateRequest,
  createStaffForAdminHandler
);

/**
 * PATCH /api/admin/staff/:staffId
 */
router.patch(
  "/staff/:staffId",
  authenticate,
  authorize("admin"),
  [
    body("full_name").optional().isString(),
    body("email").optional().isEmail().withMessage("Email invalide"),
    body("contact_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de contact invalide"),
    body("phone")
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("Le téléphone doit être une chaîne"),
    body("department")
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("La fonction doit être une chaîne"),
  ],
  validateRequest,
  updateStaffForAdminHandler
);

/**
 * PATCH /api/admin/staff/:staffId/status
 */
router.patch(
  "/staff/:staffId/status",
  authenticate,
  authorize("admin"),
  [
    body("active")
      .isBoolean()
      .withMessage("Le champ 'active' doit être un booléen"),
  ],
  validateRequest,
  updateStaffStatusHandler
);





// Matières
router.get("/subjects", getAdminSubjectsHandler);

router.post(
  "/subjects",
  [
    body("name")
      .isString()
      .notEmpty()
      .withMessage("Le nom de la matière est obligatoire"),
    body("short_code")
      .optional()
      .isString()
      .withMessage("short_code doit être une chaîne"),
    body("color")
      .optional()
      .isString()
      .withMessage("color doit être une chaîne"),
    body("level")
      .optional()
      .isString()
      .withMessage("level doit être une chaîne"),
  ],
  validateRequest,
  createSubjectForAdminHandler
);

router.patch(
  "/subjects/:subjectId",
  [
    body("name").optional().isString().withMessage("name doit être une chaîne"),
    body("short_code")
      .optional()
      .isString()
      .withMessage("short_code doit être une chaîne"),
    body("color")
      .optional()
      .isString()
      .withMessage("color doit être une chaîne"),
    body("level")
      .optional()
      .isString()
      .withMessage("level doit être une chaîne"),
  ],
  validateRequest,
  updateSubjectForAdminHandler
);

// Cours (affectations matière + prof + classe)
router.get(
  "/classes/:classId/courses",
  getClassCoursesForAdminHandler
);

router.post(
  "/courses",
  [
    body("class_id")
      .isUUID()
      .withMessage("class_id doit être un UUID valide"),
    body("subject_id")
      .isUUID()
      .withMessage("subject_id doit être un UUID valide"),
    body("teacher_id")
      .isUUID()
      .withMessage("teacher_id doit être un UUID valide"),
    body("default_room")
      .optional()
      .isString()
      .withMessage("default_room doit être une chaîne"),
  ],
  validateRequest,
  createCourseForAdminHandler
);

router.patch(
  "/courses/:courseId",
  [
    body("subject_id")
      .optional()
      .isUUID()
      .withMessage("subject_id doit être un UUID valide"),
    body("teacher_id")
      .optional()
      .isUUID()
      .withMessage("teacher_id doit être un UUID valide"),
    body("default_room")
      .optional()
      .isString()
      .withMessage("default_room doit être une chaîne"),
  ],
  validateRequest,
  updateCourseForAdminHandler
);


// Professeurs
router.get("/teachers", getAdminTeachersHandler);

router.post(
  "/teachers",
  [
    body("full_name")
      .isString()
      .notEmpty()
      .withMessage("Le nom complet du professeur est obligatoire"),
    body("login_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de connexion invalide"),
    body("email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de connexion invalide"),
    body("contact_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de contact invalide"),
    body("employee_no")
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("Le matricule doit être une chaîne"),
  ],
  validateRequest,
  createTeacherForAdminHandler
);

router.patch(
  "/teachers/:userId",
  [
    body("email")
      .optional()
      .isEmail()
      .withMessage("Email du professeur invalide"),
    body("contact_email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email de contact invalide"),
  ],
  validateRequest,
  updateTeacherForAdminHandler
);

router.patch(
  "/teachers/:userId/status",
  [
    body("active")
      .isBoolean()
      .withMessage("Le champ 'active' doit être un booléen"),
  ],
  validateRequest,
  updateTeacherStatusHandler
);

export default router;
