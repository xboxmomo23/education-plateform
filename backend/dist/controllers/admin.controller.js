"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboardHandler = getAdminDashboardHandler;
exports.getAdminClassesHandler = getAdminClassesHandler;
exports.createClassForAdminHandler = createClassForAdminHandler;
exports.updateClassForAdminHandler = updateClassForAdminHandler;
exports.getAdminStudentsHandler = getAdminStudentsHandler;
exports.createStudentForAdminHandler = createStudentForAdminHandler;
exports.updateStudentStatusHandler = updateStudentStatusHandler;
exports.updateStudentClassHandler = updateStudentClassHandler;
exports.resendStudentInviteHandler = resendStudentInviteHandler;
exports.getStudentClassChangesHandler = getStudentClassChangesHandler;
exports.scheduleStudentClassChangeHandler = scheduleStudentClassChangeHandler;
exports.deleteStudentClassChangeHandler = deleteStudentClassChangeHandler;
exports.applyStudentClassChangesForTermHandler = applyStudentClassChangesForTermHandler;
exports.getAdminStaffHandler = getAdminStaffHandler;
exports.createStaffForAdminHandler = createStaffForAdminHandler;
exports.updateStaffForAdminHandler = updateStaffForAdminHandler;
exports.updateStaffStatusHandler = updateStaffStatusHandler;
exports.updateStaffClassesHandler = updateStaffClassesHandler;
exports.resendStaffInviteHandler = resendStaffInviteHandler;
exports.getAdminTeachersHandler = getAdminTeachersHandler;
exports.createTeacherForAdminHandler = createTeacherForAdminHandler;
exports.updateTeacherForAdminHandler = updateTeacherForAdminHandler;
exports.updateTeacherStatusHandler = updateTeacherStatusHandler;
exports.resendTeacherInviteHandler = resendTeacherInviteHandler;
exports.updateTeacherClassesHandler = updateTeacherClassesHandler;
exports.getAdminSubjectsHandler = getAdminSubjectsHandler;
exports.createSubjectForAdminHandler = createSubjectForAdminHandler;
exports.updateSubjectForAdminHandler = updateSubjectForAdminHandler;
exports.getClassCoursesForAdminHandler = getClassCoursesForAdminHandler;
exports.createCourseForAdminHandler = createCourseForAdminHandler;
exports.updateCourseForAdminHandler = updateCourseForAdminHandler;
const database_1 = __importDefault(require("../config/database"));
const user_model_1 = require("../models/user.model");
const auth_controller_1 = require("./auth.controller");
const email_service_1 = require("../services/email.service");
const auth_utils_1 = require("../utils/auth.utils");
const identifier_utils_1 = require("../utils/identifier.utils");
const parent_model_1 = require("../models/parent.model");
/**
 * Helper : récupère l'établissement de l'admin connecté
 */
async function getAdminEstablishmentId(adminUserId) {
    const result = await database_1.default.query(`
    SELECT e.id
    FROM establishments e
    JOIN users u ON u.establishment_id = e.id
    WHERE u.id = $1
      AND e.deleted_at IS NULL
  `, [adminUserId]);
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0].id;
}
async function getEstablishmentName(establishmentId) {
    const result = await database_1.default.query(`SELECT name FROM establishments WHERE id = $1 LIMIT 1`, [establishmentId]);
    return result.rows[0]?.name || null;
}
async function getContactEmailForRole(userId, role) {
    let table = null;
    switch (role) {
        case "student":
            table = "student_profiles";
            break;
        case "teacher":
            table = "teacher_profiles";
            break;
        case "staff":
            table = "staff_profiles";
            break;
        default:
            table = null;
    }
    if (!table) {
        return null;
    }
    const res = await database_1.default.query(`SELECT contact_email FROM ${table} WHERE user_id = $1 LIMIT 1`, [userId]);
    return res.rows[0]?.contact_email || null;
}
async function processInviteResend(targetUserId, role, estId) {
    const userResult = await database_1.default.query(`
      SELECT id, email, full_name, must_change_password, last_login
      FROM users
      WHERE id = $1
        AND role = $2
        AND establishment_id = $3
    `, [targetUserId, role, estId]);
    if (userResult.rowCount === 0) {
        return { ok: false, status: 404, message: "Utilisateur introuvable pour cet établissement" };
    }
    const userRow = userResult.rows[0];
    if (!userRow.must_change_password || userRow.last_login) {
        return {
            ok: false,
            status: 400,
            message: "Ce compte est déjà activé, l'invitation ne peut pas être renvoyée",
        };
    }
    let inviteUrl;
    const existingTokenResult = await database_1.default.query(`
      SELECT token
      FROM password_reset_tokens
      WHERE user_id = $1
        AND purpose = 'invite'
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [userRow.id]);
    const existingCount = existingTokenResult?.rowCount ?? 0;
    if (existingCount > 0) {
        const token = existingTokenResult.rows[0].token;
        inviteUrl = (0, auth_controller_1.buildInviteUrl)(token);
        console.log("[INVITE] Réutilisation du lien d'activation pour", userRow.email, ":", inviteUrl);
    }
    else {
        const invite = await (0, auth_controller_1.createInviteTokenForUser)({
            id: userRow.id,
            email: userRow.email,
            full_name: userRow.full_name,
        });
        inviteUrl = invite.inviteUrl;
    }
    const contactEmail = await getContactEmailForRole(userRow.id, role);
    const establishmentName = await getEstablishmentName(estId);
    const targetEmail = contactEmail || userRow.email;
    if (targetEmail) {
        await (0, email_service_1.sendInviteEmail)({
            to: targetEmail,
            loginEmail: userRow.email,
            role,
            establishmentName: establishmentName || undefined,
            inviteUrl,
        }).catch((err) => {
            console.error("[MAIL] Erreur envoi email d'invitation:", err);
        });
    }
    return { ok: true, inviteUrl };
}
function normalizeParentsPayload(rawParents) {
    if (!Array.isArray(rawParents)) {
        return [];
    }
    const normalized = [];
    rawParents.forEach((parent) => {
        if (!parent || typeof parent !== "object") {
            return;
        }
        const firstName = typeof parent.firstName === "string" ? parent.firstName.trim() : "";
        const lastName = typeof parent.lastName === "string" ? parent.lastName.trim() : "";
        if (!firstName && !lastName) {
            return;
        }
        normalized.push({
            firstName,
            lastName,
            email: typeof parent.email === "string" && parent.email.trim().length > 0
                ? parent.email.trim().toLowerCase()
                : undefined,
            phone: typeof parent.phone === "string" && parent.phone.trim().length > 0
                ? parent.phone.trim()
                : undefined,
            address: typeof parent.address === "string" && parent.address.trim().length > 0
                ? parent.address.trim()
                : undefined,
            relation_type: typeof parent.relation_type === "string" &&
                parent.relation_type.trim().length > 0
                ? parent.relation_type.trim()
                : undefined,
            is_primary: typeof parent.is_primary === "boolean" ? parent.is_primary : undefined,
            can_view_grades: typeof parent.can_view_grades === "boolean"
                ? parent.can_view_grades
                : undefined,
            can_view_attendance: typeof parent.can_view_attendance === "boolean"
                ? parent.can_view_attendance
                : undefined,
            receive_notifications: typeof parent.receive_notifications === "boolean"
                ? parent.receive_notifications
                : undefined,
        });
    });
    return normalized;
}
async function sendParentInvitesForNewAccounts(parents, establishmentName) {
    for (const parent of parents) {
        if (!parent.isNewUser || !parent.email) {
            continue;
        }
        try {
            const invite = await (0, auth_controller_1.createInviteTokenForUser)({
                id: parent.parentUserId,
                email: parent.email,
                full_name: parent.full_name,
            });
            await (0, email_service_1.sendInviteEmail)({
                to: parent.email,
                loginEmail: parent.email,
                role: "parent",
                establishmentName: establishmentName || undefined,
                inviteUrl: invite.inviteUrl,
            });
        }
        catch (error) {
            console.error("[MAIL] Erreur envoi invitation parent:", error);
        }
    }
}
function handleParentSyncError(res, error) {
    if (!(error instanceof Error)) {
        return false;
    }
    const email = error?.email;
    if (error.message === "EMAIL_ALREADY_IN_USE") {
        res.status(409).json({
            success: false,
            error: email
                ? `L'adresse ${email} est déjà utilisée par un autre compte`
                : "Adresse email déjà utilisée",
        });
        return true;
    }
    if (error.message === "PARENT_BELONGS_TO_ANOTHER_ESTABLISHMENT") {
        res.status(400).json({
            success: false,
            error: email
                ? `Le parent avec l'adresse ${email} appartient à un autre établissement`
                : "Ce parent appartient à un autre établissement",
        });
        return true;
    }
    return false;
}
/**
 * GET /api/admin/dashboard
 */
async function getAdminDashboardHandler(req, res) {
    try {
        const { userId } = req.user;
        const estResult = await database_1.default.query(`
      SELECT
        e.id,
        e.name,
        e.code,
        e.city,
        e.type,
        e.active,
        e.subscription_plan,
        e.subscription_start,
        e.subscription_end,
        e.created_at
      FROM establishments e
      JOIN users u ON u.establishment_id = e.id
      WHERE u.id = $1
        AND e.deleted_at IS NULL
    `, [userId]);
        if (estResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const establishment = estResult.rows[0];
        const estId = establishment.id;
        const [classesResult, studentsResult, teachersResult, staffResult] = await Promise.all([
            database_1.default.query(`SELECT COUNT(*)::int AS total_classes
           FROM classes
           WHERE establishment_id = $1`, [estId]),
            database_1.default.query(`SELECT COUNT(*)::int AS total_students
           FROM students s
           JOIN classes c ON s.class_id = c.id
           WHERE c.establishment_id = $1`, [estId]),
            database_1.default.query(`SELECT COUNT(*)::int AS total_teachers
           FROM users
           WHERE role = 'teacher'
             AND establishment_id = $1`, [estId]),
            database_1.default.query(`SELECT COUNT(*)::int AS total_staff
           FROM users
           WHERE role = 'staff'
             AND establishment_id = $1`, [estId]),
        ]);
        const stats = {
            total_classes: classesResult.rows[0]?.total_classes ?? 0,
            total_students: studentsResult.rows[0]?.total_students ?? 0,
            total_teachers: teachersResult.rows[0]?.total_teachers ?? 0,
            total_staff: staffResult.rows[0]?.total_staff ?? 0,
        };
        return res.json({
            success: true,
            data: {
                establishment,
                stats,
            },
        });
    }
    catch (error) {
        console.error("Erreur getAdminDashboardHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement du tableau de bord admin",
        });
    }
}
/**
 * GET /api/admin/classes
 */
async function getAdminClassesHandler(req, res) {
    try {
        const { userId } = req.user;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const classesResult = await database_1.default.query(`
      SELECT
        id,
        code,
        label,
        academic_year,
        level,
        capacity,
        current_size,
        room,
        archived,
        created_at
      FROM classes
      WHERE establishment_id = $1
      ORDER BY academic_year DESC, label ASC
    `, [estId]);
        return res.json({
            success: true,
            data: classesResult.rows,
        });
    }
    catch (error) {
        console.error("Erreur getAdminClassesHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des classes",
        });
    }
}
/**
 * POST /api/admin/classes
 */
async function createClassForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { code, label, academic_year, level, capacity, room } = req.body;
        if (!code || !label || !academic_year) {
            return res.status(400).json({
                success: false,
                error: "Les champs code, label et academic_year sont obligatoires",
            });
        }
        const academicYearNum = Number(academic_year);
        const capacityNum = capacity ? Number(capacity) : null;
        if (Number.isNaN(academicYearNum)) {
            return res.status(400).json({
                success: false,
                error: "academic_year doit être un nombre",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const insertResult = await database_1.default.query(`
      INSERT INTO classes (
        code,
        label,
        academic_year,
        level,
        capacity,
        room,
        establishment_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        code,
        label,
        academic_year,
        level,
        capacity,
        current_size,
        room,
        archived,
        created_at
    `, [code, label, academicYearNum, level || null, capacityNum, room || null, estId]);
        const newClass = insertResult.rows[0];
        return res.status(201).json({
            success: true,
            message: "Classe créée avec succès",
            data: newClass,
        });
    }
    catch (error) {
        console.error("Erreur createClassForAdminHandler:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                error: "Une classe avec ce code existe déjà pour cette année scolaire",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la création de la classe",
        });
    }
}
/**
 * PATCH /api/admin/classes/:id
 * (modifier label/capacity/room/archived)
 */
async function updateClassForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const classId = req.params.id;
        const { label, capacity, room, archived } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      UPDATE classes
      SET
        label = COALESCE($1, label),
        capacity = COALESCE($2, capacity),
        room = COALESCE($3, room),
        archived = COALESCE($4, archived)
      WHERE id = $5
        AND establishment_id = $6
      RETURNING
        id,
        code,
        label,
        academic_year,
        level,
        capacity,
        current_size,
        room,
        archived,
        created_at
    `, [
            label ?? null,
            capacity ?? null,
            room ?? null,
            archived ?? null,
            classId,
            estId,
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Classe introuvable pour cet établissement",
            });
        }
        return res.json({
            success: true,
            message: "Classe mise à jour",
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateClassForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour de la classe",
        });
    }
}
/**
 * GET /api/admin/students
 */
async function getAdminStudentsHandler(req, res) {
    try {
        const { userId } = req.user;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const studentsResult = await database_1.default.query(`
      SELECT
        s.id AS student_id,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.active,
        u.must_change_password,
        u.last_login,
        sp.contact_email,
        s.student_number,
        s.date_of_birth,
        s.class_id,
        c.label AS class_label,
        c.code AS class_code,
        c.level,
        c.academic_year
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.establishment_id = $1
        AND u.role = 'student'
      ORDER BY
        c.academic_year DESC NULLS LAST,
        c.label ASC NULLS LAST,
        u.full_name ASC
    `, [estId]);
        return res.json({
            success: true,
            data: studentsResult.rows,
        });
    }
    catch (error) {
        console.error("Erreur getAdminStudentsHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des élèves",
        });
    }
}
/**
 * POST /api/admin/students
 */
async function createStudentForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { full_name, email, login_email, contact_email, class_id, student_number, date_of_birth, parents, } = req.body;
        if (!full_name) {
            return res.status(400).json({
                success: false,
                error: "Le champ full_name est obligatoire pour créer un élève",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const establishmentName = await getEstablishmentName(estId);
        const parentsPayload = normalizeParentsPayload(parents);
        let normalizedClassId = null;
        if (typeof class_id === "string" && class_id.trim().length > 0) {
            normalizedClassId = class_id.trim();
            const classResult = await database_1.default.query(`
        SELECT id
        FROM classes
        WHERE id = $1
          AND establishment_id = $2
      `, [normalizedClassId, estId]);
            if (classResult.rowCount === 0) {
                return res.status(400).json({
                    success: false,
                    error: "La classe choisie n'appartient pas à votre établissement ou n'existe pas",
                });
            }
        }
        let loginEmail = (login_email || email || "");
        if (typeof loginEmail === "string") {
            loginEmail = loginEmail.toLowerCase().trim();
        }
        else {
            loginEmail = "";
        }
        if (!loginEmail) {
            loginEmail = await (0, identifier_utils_1.generateLoginEmailFromName)({
                fullName: full_name,
                establishmentId: estId,
            });
        }
        const duplicateCheck = await database_1.default.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [loginEmail]);
        const duplicateCount = duplicateCheck?.rowCount ?? 0;
        if (duplicateCount > 0) {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        const contactEmail = typeof contact_email === "string" && contact_email.trim().length > 0
            ? contact_email.trim().toLowerCase()
            : null;
        let finalStudentNumber = null;
        if (typeof student_number === "string" && student_number.trim().length > 0) {
            finalStudentNumber = student_number.trim();
        }
        else if (typeof student_number === "number" &&
            Number.isFinite(student_number)) {
            finalStudentNumber = String(student_number);
        }
        if (!finalStudentNumber) {
            finalStudentNumber = await (0, identifier_utils_1.generateHumanCode)({
                establishmentId: estId,
                role: "student",
            });
        }
        const initialPassword = (0, auth_utils_1.generateTemporaryPassword)();
        const user = await (0, user_model_1.createUser)({
            email: loginEmail,
            password: initialPassword,
            role: "student",
            full_name,
            establishmentId: estId,
        });
        await database_1.default.query(`
        INSERT INTO student_profiles (
          user_id, student_no, contact_email
        ) VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET contact_email = EXCLUDED.contact_email,
                      student_no = COALESCE(EXCLUDED.student_no, student_profiles.student_no)
      `, [user.id, finalStudentNumber, contactEmail]);
        const studentInsert = await database_1.default.query(`
      INSERT INTO students (
        user_id,
        class_id,
        student_number,
        date_of_birth
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, class_id, student_number, date_of_birth, created_at
    `, [
            user.id,
            normalizedClassId,
            finalStudentNumber,
            date_of_birth ? new Date(date_of_birth) : null,
        ]);
        const student = studentInsert.rows[0];
        let parentResults = [];
        if (parentsPayload.length > 0) {
            try {
                parentResults = await (0, parent_model_1.syncParentsForStudent)({
                    studentId: user.id,
                    establishmentId: estId,
                    parents: parentsPayload,
                });
            }
            catch (error) {
                if (handleParentSyncError(res, error)) {
                    return;
                }
                throw error;
            }
        }
        const invite = await (0, auth_controller_1.createInviteTokenForUser)({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
        });
        const targetEmail = contactEmail || user.email;
        if (targetEmail) {
            await (0, email_service_1.sendInviteEmail)({
                to: targetEmail,
                loginEmail: user.email,
                role: "student",
                establishmentName: establishmentName || undefined,
                inviteUrl: invite.inviteUrl,
            }).catch((err) => {
                console.error("[MAIL] Erreur envoi email d'invitation élève:", err);
            });
        }
        if (parentResults.length > 0) {
            await sendParentInvitesForNewAccounts(parentResults, establishmentName);
        }
        return res.status(201).json({
            success: true,
            message: "Élève créé avec succès",
            data: {
                student,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    active: user.active,
                },
                contact_email: contactEmail,
                inviteUrl: invite.inviteUrl,
                parents: parentResults,
            },
        });
    }
    catch (error) {
        console.error("Erreur createStudentForAdminHandler:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la création de l'élève",
        });
    }
}
/**
 * PATCH /api/admin/students/:userId/status
 * (activer/désactiver un élève via users.active)
 */
async function updateStudentStatusHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const { active } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      UPDATE users
      SET active = $1
      WHERE id = $2
        AND role = 'student'
        AND establishment_id = $3
    `, [active, targetUserId, estId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Élève introuvable pour cet établissement",
            });
        }
        return res.json({
            success: true,
            message: "Statut de l'élève mis à jour",
        });
    }
    catch (error) {
        console.error("Erreur updateStudentStatusHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du statut de l'élève",
        });
    }
}
async function updateStudentClassHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const { class_id, parents } = req.body;
        const parentsPayload = normalizeParentsPayload(parents);
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const studentUserResult = await database_1.default.query(`
        SELECT id
        FROM users
        WHERE id = $1
          AND role = 'student'
          AND establishment_id = $2
      `, [targetUserId, estId]);
        if (studentUserResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Élève introuvable pour cet établissement",
            });
        }
        const shouldUpdateClass = Object.prototype.hasOwnProperty.call(req.body, "class_id");
        let normalizedClassId = undefined;
        if (shouldUpdateClass) {
            if (typeof class_id === "string" && class_id.trim().length > 0) {
                normalizedClassId = class_id.trim();
                const classResult = await database_1.default.query(`
            SELECT id
            FROM classes
            WHERE id = $1
              AND establishment_id = $2
          `, [normalizedClassId, estId]);
                if (classResult.rowCount === 0) {
                    return res.status(400).json({
                        success: false,
                        error: "La classe choisie n'appartient pas à votre établissement ou n'existe pas",
                    });
                }
            }
            else {
                normalizedClassId = null;
            }
            const updateResult = await database_1.default.query(`
          UPDATE students
          SET class_id = $1
          WHERE user_id = $2
        `, [normalizedClassId, targetUserId]);
            if (updateResult.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Impossible de mettre à jour la classe de cet élève",
                });
            }
        }
        let parentResults = [];
        if (parentsPayload.length > 0) {
            try {
                parentResults = await (0, parent_model_1.syncParentsForStudent)({
                    studentId: targetUserId,
                    establishmentId: estId,
                    parents: parentsPayload,
                });
            }
            catch (error) {
                if (handleParentSyncError(res, error)) {
                    return;
                }
                throw error;
            }
            const shouldInviteParents = parentResults.some((parent) => parent.isNewUser && parent.email);
            if (shouldInviteParents) {
                const establishmentName = await getEstablishmentName(estId);
                await sendParentInvitesForNewAccounts(parentResults, establishmentName);
            }
        }
        const messages = [];
        if (shouldUpdateClass) {
            messages.push("Classe de l'élève mise à jour");
        }
        if (parentsPayload.length > 0) {
            messages.push("Parents synchronisés");
        }
        return res.json({
            success: true,
            message: messages.length > 0 ? messages.join(" · ") : "Aucune modification appliquée",
            data: {
                ...(shouldUpdateClass ? { class_id: normalizedClassId ?? null } : {}),
                parents: parentResults,
            },
        });
    }
    catch (error) {
        console.error("Erreur updateStudentClassHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour de la classe de l'élève",
        });
    }
}
async function resendStudentInviteHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await processInviteResend(targetUserId, "student", estId);
        if (!result.ok) {
            return res.status(result.status).json({
                success: false,
                error: result.message,
            });
        }
        return res.json({
            success: true,
            inviteUrl: result.inviteUrl,
            message: "Invitation renvoyée avec succès",
        });
    }
    catch (error) {
        console.error("Erreur resendStudentInviteHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de l'envoi de la nouvelle invitation",
        });
    }
}
function mapClassChangeRow(row) {
    return {
        id: row.id,
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        old_class: row.old_class_id
            ? { id: row.old_class_id, label: row.old_class_label, code: row.old_class_code }
            : null,
        new_class: {
            id: row.new_class_id,
            label: row.new_class_label,
            code: row.new_class_code,
        },
        term: {
            id: row.effective_term_id,
            name: row.term_name,
            start_date: row.term_start,
            end_date: row.term_end,
            academic_year: row.academic_year,
        },
        reason: row.reason,
        created_at: row.created_at,
        created_by: row.created_by,
        applied_at: row.applied_at,
        applied_by: row.applied_by,
    };
}
async function getStudentClassChangesHandler(req, res) {
    try {
        const { userId } = req.user;
        const { status, termId, studentId } = req.query;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const clauses = ["scc.establishment_id = $1"];
        const values = [estId];
        let index = 2;
        if (typeof status === "string") {
            if (status === "pending") {
                clauses.push("scc.applied_at IS NULL");
            }
            else if (status === "applied") {
                clauses.push("scc.applied_at IS NOT NULL");
            }
        }
        if (typeof termId === "string" && termId.trim().length > 0) {
            clauses.push(`scc.effective_term_id = $${index++}`);
            values.push(termId.trim());
        }
        if (typeof studentId === "string" && studentId.trim().length > 0) {
            clauses.push(`scc.student_id = $${index++}`);
            values.push(studentId.trim());
        }
        const query = `
      SELECT
        scc.id,
        scc.student_id,
        scc.old_class_id,
        scc.new_class_id,
        scc.effective_term_id,
        scc.establishment_id,
        scc.reason,
        scc.created_at,
        scc.created_by,
        scc.applied_at,
        scc.applied_by,
        u.full_name AS student_name,
        u.email AS student_email,
        old_cls.label AS old_class_label,
        old_cls.code AS old_class_code,
        new_cls.label AS new_class_label,
        new_cls.code AS new_class_code,
        t.name AS term_name,
        t.start_date AS term_start,
        t.end_date AS term_end,
        t.academic_year
      FROM student_class_changes scc
      JOIN users u ON u.id = scc.student_id
      LEFT JOIN classes old_cls ON old_cls.id = scc.old_class_id
      LEFT JOIN classes new_cls ON new_cls.id = scc.new_class_id
      JOIN terms t ON t.id = scc.effective_term_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY
        CASE WHEN scc.applied_at IS NULL THEN 0 ELSE 1 END,
        t.start_date ASC,
        scc.created_at ASC
    `;
        const result = await database_1.default.query(query, values);
        return res.json({
            success: true,
            data: result.rows.map(mapClassChangeRow),
        });
    }
    catch (error) {
        console.error("Erreur getStudentClassChangesHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des changements de classe programmés",
        });
    }
}
async function scheduleStudentClassChangeHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const { new_class_id, effective_term_id, reason } = req.body;
        if (!new_class_id || !effective_term_id) {
            return res.status(400).json({
                success: false,
                error: "La nouvelle classe et la période sont obligatoires",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const studentResult = await database_1.default.query(`
        SELECT u.id, u.full_name, s.class_id
        FROM users u
        JOIN students s ON s.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'student'
          AND u.establishment_id = $2
      `, [targetUserId, estId]);
        if (studentResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Élève introuvable pour cet établissement",
            });
        }
        const studentRow = studentResult.rows[0];
        const classResult = await database_1.default.query(`
        SELECT id
        FROM classes
        WHERE id = $1
          AND establishment_id = $2
      `, [new_class_id, estId]);
        if (classResult.rowCount === 0) {
            return res.status(400).json({
                success: false,
                error: "La classe choisie n'appartient pas à votre établissement",
            });
        }
        if (studentRow.class_id && studentRow.class_id === new_class_id) {
            return res.status(400).json({
                success: false,
                error: "L'élève est déjà dans cette classe",
            });
        }
        const termResult = await database_1.default.query(`
        SELECT id, start_date
        FROM terms
        WHERE id = $1
          AND establishment_id = $2
      `, [effective_term_id, estId]);
        if (termResult.rowCount === 0) {
            return res.status(400).json({
                success: false,
                error: "La période choisie n'existe pas pour votre établissement",
            });
        }
        const termRow = termResult.rows[0];
        const now = new Date();
        const termStart = new Date(termRow.start_date);
        if (termStart <= now) {
            return res.status(400).json({
                success: false,
                error: "Vous ne pouvez programmer un changement que pour une période future.",
            });
        }
        const existingPending = await database_1.default.query(`
        SELECT id
        FROM student_class_changes
        WHERE student_id = $1
          AND effective_term_id = $2
          AND applied_at IS NULL
      `, [targetUserId, effective_term_id]);
        if ((existingPending?.rowCount ?? 0) > 0) {
            return res.status(409).json({
                success: false,
                error: "Un changement est déjà programmé pour cette période",
            });
        }
        const normalizedReason = typeof reason === "string" && reason.trim().length > 0
            ? reason.trim()
            : null;
        const insertResult = await database_1.default.query(`
        INSERT INTO student_class_changes (
          student_id,
          old_class_id,
          new_class_id,
          effective_term_id,
          establishment_id,
          created_by,
          reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
            targetUserId,
            studentRow.class_id || null,
            new_class_id,
            effective_term_id,
            estId,
            userId,
            normalizedReason,
        ]);
        const insertedId = insertResult.rows[0].id;
        const detailResult = await database_1.default.query(`
        SELECT
          scc.id,
          scc.student_id,
          scc.old_class_id,
          scc.new_class_id,
          scc.effective_term_id,
          scc.establishment_id,
          scc.reason,
          scc.created_at,
          scc.created_by,
          scc.applied_at,
          scc.applied_by,
          u.full_name AS student_name,
          u.email AS student_email,
          old_cls.label AS old_class_label,
          old_cls.code AS old_class_code,
          new_cls.label AS new_class_label,
          new_cls.code AS new_class_code,
          t.name AS term_name,
          t.start_date AS term_start,
          t.end_date AS term_end,
          t.academic_year
        FROM student_class_changes scc
        JOIN users u ON u.id = scc.student_id
        LEFT JOIN classes old_cls ON old_cls.id = scc.old_class_id
        LEFT JOIN classes new_cls ON new_cls.id = scc.new_class_id
        JOIN terms t ON t.id = scc.effective_term_id
        WHERE scc.id = $1
      `, [insertedId]);
        return res.status(201).json({
            success: true,
            data: mapClassChangeRow(detailResult.rows[0]),
        });
    }
    catch (error) {
        console.error("Erreur scheduleStudentClassChangeHandler:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                error: "Un changement est déjà programmé pour cette période",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la programmation du changement de classe",
        });
    }
}
async function deleteStudentClassChangeHandler(req, res) {
    try {
        const { userId } = req.user;
        const { changeId } = req.params;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const deleteResult = await database_1.default.query(`
        DELETE FROM student_class_changes
        WHERE id = $1
          AND establishment_id = $2
          AND applied_at IS NULL
        RETURNING id
      `, [changeId, estId]);
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Changement introuvable ou déjà appliqué",
            });
        }
        return res.json({
            success: true,
            message: "Changement de classe annulé",
        });
    }
    catch (error) {
        console.error("Erreur deleteStudentClassChangeHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la suppression du changement",
        });
    }
}
async function applyStudentClassChangesForTermHandler(req, res) {
    const client = await database_1.default.connect();
    try {
        const { userId } = req.user;
        const { term_id } = req.body;
        if (!term_id) {
            return res.status(400).json({
                success: false,
                error: "term_id est obligatoire",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const termResult = await database_1.default.query(`
        SELECT id, start_date, end_date
        FROM terms
        WHERE id = $1
          AND establishment_id = $2
      `, [term_id, estId]);
        if (termResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Période introuvable pour votre établissement",
            });
        }
        const termRow = termResult.rows[0];
        const now = new Date();
        const termStart = new Date(termRow.start_date);
        const termEnd = new Date(termRow.end_date);
        if (now < termStart) {
            return res.status(400).json({
                success: false,
                error: "Cette période n'a pas encore commencé, vous ne pouvez pas appliquer les changements.",
            });
        }
        if (now > termEnd) {
            return res.status(400).json({
                success: false,
                error: "Cette période est terminée, impossible d'appliquer les changements.",
            });
        }
        await client.query("BEGIN");
        const pendingResult = await client.query(`
        SELECT id, student_id, new_class_id
        FROM student_class_changes
        WHERE establishment_id = $1
          AND effective_term_id = $2
          AND applied_at IS NULL
        FOR UPDATE
      `, [estId, term_id]);
        if (pendingResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.json({
                success: true,
                message: "Aucun changement à appliquer pour cette période",
                appliedCount: 0,
            });
        }
        for (const change of pendingResult.rows) {
            await client.query(`
          UPDATE students
          SET class_id = $1
          WHERE user_id = $2
        `, [change.new_class_id, change.student_id]);
        }
        const changeIds = pendingResult.rows.map((row) => row.id);
        await client.query(`
        UPDATE student_class_changes
        SET applied_at = NOW(),
            applied_by = $3
        WHERE establishment_id = $1
          AND effective_term_id = $2
          AND id = ANY($4::uuid[])
      `, [estId, term_id, userId, changeIds]);
        await client.query("COMMIT");
        return res.json({
            success: true,
            appliedCount: pendingResult.rowCount,
            message: "Changements appliqués avec succès",
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("Erreur applyStudentClassChangesForTermHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de l'application des changements de classe",
        });
    }
    finally {
        client.release();
    }
}
/**
 * GET /api/admin/staff
 * Liste des comptes staff pour l'établissement de l'admin
 */
async function getAdminStaffHandler(req, res) {
    try {
        const { userId } = req.user;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      SELECT
        u.id AS staff_id,
        u.full_name,
        u.email,
        u.active,
        u.must_change_password,
        u.last_login,
        u.created_at,
        sp.contact_email,
        sp.phone,
        sp.department,
        sp.employee_no,
        sp.assigned_class_ids
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'staff'
        AND u.establishment_id = $1
      ORDER BY u.full_name ASC
      `, [estId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error("Erreur getAdminStaffHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des comptes staff",
        });
    }
}
/**
 * POST /api/admin/staff
 * Création d'un compte staff (user + établissement)
 */
async function createStaffForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { full_name, email, login_email, contact_email, phone, department, employee_no, } = req.body;
        if (!full_name) {
            return res.status(400).json({
                success: false,
                error: "Le nom complet est requis",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        let loginEmail = (login_email || email || "");
        if (typeof loginEmail === "string") {
            loginEmail = loginEmail.toLowerCase().trim();
        }
        else {
            loginEmail = "";
        }
        if (!loginEmail) {
            loginEmail = await (0, identifier_utils_1.generateLoginEmailFromName)({
                fullName: full_name,
                establishmentId: estId,
            });
        }
        const duplicateCheck = await database_1.default.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [loginEmail]);
        const duplicateCount = duplicateCheck?.rowCount ?? 0;
        if (duplicateCount > 0) {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        const contactEmail = typeof contact_email === "string" && contact_email.trim().length > 0
            ? contact_email.trim().toLowerCase()
            : null;
        const normalizedPhone = typeof phone === "string" ? phone.trim() || null : null;
        const normalizedDepartment = typeof department === "string" ? department.trim() || null : null;
        let finalStaffCode = typeof employee_no === "string" && employee_no.trim().length > 0
            ? employee_no.trim()
            : null;
        if (!finalStaffCode) {
            finalStaffCode = await (0, identifier_utils_1.generateHumanCode)({
                establishmentId: estId,
                role: "staff",
            });
        }
        // Vérifier email déjà utilisé
        const existing = await database_1.default.query(`
      SELECT id FROM users
      WHERE email = $1
      `, [loginEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        const initialPassword = (0, auth_utils_1.generateTemporaryPassword)();
        // Créer l'utilisateur staff
        const newUser = await (0, user_model_1.createUser)({
            email: loginEmail,
            password: initialPassword,
            role: "staff",
            full_name,
            establishmentId: estId,
        });
        await database_1.default.query(`
        INSERT INTO staff_profiles (
          user_id, phone, department, contact_email, employee_no
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          phone = COALESCE(EXCLUDED.phone, staff_profiles.phone),
          department = COALESCE(EXCLUDED.department, staff_profiles.department),
          contact_email = EXCLUDED.contact_email,
          employee_no = COALESCE(EXCLUDED.employee_no, staff_profiles.employee_no)
      `, [newUser.id, normalizedPhone, normalizedDepartment, contactEmail, finalStaffCode]);
        const invite = await (0, auth_controller_1.createInviteTokenForUser)({
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name,
        });
        const establishmentName = await getEstablishmentName(estId);
        const targetEmail = contactEmail || newUser.email;
        if (targetEmail) {
            await (0, email_service_1.sendInviteEmail)({
                to: targetEmail,
                loginEmail: newUser.email,
                role: "staff",
                establishmentName: establishmentName || undefined,
                inviteUrl: invite.inviteUrl,
            }).catch((err) => {
                console.error("[MAIL] Erreur envoi email d'invitation staff:", err);
            });
        }
        return res.status(201).json({
            success: true,
            data: {
                staff_id: newUser.id,
                full_name: newUser.full_name,
                email: newUser.email,
                contact_email: contactEmail,
                phone: normalizedPhone,
                department: normalizedDepartment,
                employee_no: finalStaffCode,
                active: newUser.active,
                created_at: newUser.created_at,
                assigned_class_ids: [],
                inviteUrl: invite.inviteUrl,
            },
        });
    }
    catch (error) {
        console.error("Erreur createStaffForAdminHandler:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la création du staff",
        });
    }
}
/**
 * PATCH /api/admin/staff/:staffId
 * Modifier les infos de base (nom, email)
 */
async function updateStaffForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { staffId } = req.params;
        const { full_name, email, contact_email, phone, department } = req.body;
        const contactEmail = typeof contact_email === "string" && contact_email.trim().length > 0
            ? contact_email.trim().toLowerCase()
            : null;
        const phoneProvided = typeof phone !== "undefined";
        const departmentProvided = typeof department !== "undefined";
        const normalizedPhone = phoneProvided
            ? (phone && phone.trim().length > 0 ? phone.trim() : null)
            : undefined;
        const normalizedDepartment = departmentProvided
            ? (department && department.trim().length > 0 ? department.trim() : null)
            : undefined;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        // Vérifier que le staff existe dans cet établissement
        const existing = await database_1.default.query(`
      SELECT id, email
      FROM users
      WHERE id = $1
        AND role = 'staff'
        AND establishment_id = $2
      `, [staffId, estId]);
        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Compte staff introuvable pour cet établissement",
            });
        }
        const current = existing.rows[0];
        // Vérifier conflit email si changement
        if (email && email !== current.email) {
            const emailCheck = await database_1.default.query(`
        SELECT id FROM users
        WHERE email = $1
          AND id <> $2
        `, [email, staffId]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: "Un utilisateur avec cet email existe déjà",
                });
            }
        }
        await database_1.default.query(`
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email)
      WHERE id = $3
        AND role = 'staff'
        AND establishment_id = $4
      `, [full_name ?? null, email ?? null, staffId, estId]);
        // ✅ À AJOUTER :
        const contactEmailProvided = typeof contactEmail === "string" && contactEmail.trim() !== "";
        const shouldUpdateProfile = phoneProvided || departmentProvided || contactEmailProvided;
        if (shouldUpdateProfile) {
            const profileCheck = await database_1.default.query(`SELECT user_id FROM staff_profiles WHERE user_id = $1 LIMIT 1`, [staffId]);
            if (profileCheck.rowCount === 0) {
                await database_1.default.query(`
            INSERT INTO staff_profiles (user_id, phone, department, contact_email)
            VALUES ($1, $2, $3, $4)
          `, [staffId, normalizedPhone ?? null, normalizedDepartment ?? null, contactEmail]);
            }
            else {
                const updates = [];
                const values = [];
                if (phoneProvided) {
                    updates.push(`phone = $${updates.length + 1}`);
                    values.push(normalizedPhone ?? null);
                }
                if (departmentProvided) {
                    updates.push(`department = $${updates.length + 1}`);
                    values.push(normalizedDepartment ?? null);
                }
                if (contactEmailProvided) {
                    updates.push(`contact_email = $${updates.length + 1}`);
                    values.push(contactEmail);
                }
                if (updates.length > 0) {
                    values.push(staffId);
                    await database_1.default.query(`UPDATE staff_profiles SET ${updates.join(", ")} WHERE user_id = $${values.length}`, values);
                }
            }
        }
        const final = await database_1.default.query(`
        SELECT
          u.id AS staff_id,
          u.full_name,
          u.email,
          u.active,
          u.created_at,
          sp.contact_email,
          sp.phone,
          sp.department,
          sp.assigned_class_ids
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'staff'
          AND u.establishment_id = $2
      `, [staffId, estId]);
        return res.json({
            success: true,
            data: final.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateStaffForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du compte staff",
        });
    }
}
/**
 * PATCH /api/admin/staff/:staffId/status
 * Activer / désactiver un compte staff
 */
async function updateStaffStatusHandler(req, res) {
    try {
        const { userId } = req.user;
        const staffId = req.params.staffId;
        const { active } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      UPDATE users
      SET active = $1
      WHERE id = $2
        AND role = 'staff'
        AND establishment_id = $3
      `, [active, staffId, estId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Compte staff introuvable pour cet établissement",
            });
        }
        return res.json({
            success: true,
            message: "Statut du staff mis à jour",
        });
    }
    catch (error) {
        console.error("Erreur updateStaffStatusHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du statut du staff",
        });
    }
}
async function updateStaffClassesHandler(req, res) {
    try {
        const { userId } = req.user;
        const staffId = req.params.staffId;
        const { assigned_class_ids } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const staffUser = await database_1.default.query(`
        SELECT id
        FROM users
        WHERE id = $1
          AND role = 'staff'
          AND establishment_id = $2
      `, [staffId, estId]);
        if (staffUser.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Compte staff introuvable pour cet établissement",
            });
        }
        const normalizedIds = Array.isArray(assigned_class_ids)
            ? Array.from(new Set(assigned_class_ids.filter(Boolean)))
            : [];
        if (normalizedIds.length > 0) {
            const classCheck = await database_1.default.query(`
          SELECT id
          FROM classes
          WHERE establishment_id = $1
            AND id = ANY($2::uuid[])
        `, [estId, normalizedIds]);
            if (classCheck.rowCount !== normalizedIds.length) {
                return res.status(400).json({
                    success: false,
                    error: "Certaines classes sélectionnées n'appartiennent pas à votre établissement",
                });
            }
        }
        await database_1.default.query(`
        UPDATE staff_profiles
        SET assigned_class_ids = $1
        WHERE user_id = $2
      `, [normalizedIds.length > 0 ? normalizedIds : null, staffId]);
        const final = await database_1.default.query(`
        SELECT
          u.id AS staff_id,
          u.full_name,
          u.email,
          u.active,
          u.created_at,
          sp.contact_email,
          sp.phone,
          sp.department,
          sp.employee_no,
          sp.assigned_class_ids
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        WHERE u.id = $1
      `, [staffId]);
        return res.json({
            success: true,
            data: final.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateStaffClassesHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour des classes du staff",
        });
    }
}
async function resendStaffInviteHandler(req, res) {
    try {
        const { userId } = req.user;
        const staffId = req.params.staffId;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await processInviteResend(staffId, "staff", estId);
        if (!result.ok) {
            return res.status(result.status).json({
                success: false,
                error: result.message,
            });
        }
        return res.json({
            success: true,
            inviteUrl: result.inviteUrl,
            message: "Invitation renvoyée avec succès",
        });
    }
    catch (error) {
        console.error("Erreur resendStaffInviteHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de l'envoi de la nouvelle invitation",
        });
    }
}
/**
 * GET /api/admin/teachers
 * Liste des professeurs de l'établissement de l'admin
 */
async function getAdminTeachersHandler(req, res) {
    try {
        const { userId } = req.user;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.active,
        u.must_change_password,
        u.last_login,
        tp.employee_no,
        tp.hire_date,
        tp.specialization,
        tp.phone,
        tp.office_room,
        tp.contact_email,
        tp.assigned_class_ids
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      WHERE u.role = 'teacher'
        AND u.establishment_id = $1
      ORDER BY u.full_name ASC
    `, [estId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error("Erreur getAdminTeachersHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des professeurs",
        });
    }
}
/**
 * POST /api/admin/teachers
 * Création d'un professeur (user + teacher_profile)
 */
async function createTeacherForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { full_name, email, login_email, contact_email, employee_no, hire_date, specialization, phone, office_room, } = req.body;
        if (!full_name) {
            return res.status(400).json({
                success: false,
                error: "Le champ 'full_name' est obligatoire",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        let loginEmail = (login_email || email || "");
        if (typeof loginEmail === "string") {
            loginEmail = loginEmail.toLowerCase().trim();
        }
        else {
            loginEmail = "";
        }
        if (!loginEmail) {
            loginEmail = await (0, identifier_utils_1.generateLoginEmailFromName)({
                fullName: full_name,
                establishmentId: estId,
            });
        }
        const contactEmail = typeof contact_email === "string" && contact_email.trim().length > 0
            ? contact_email.trim().toLowerCase()
            : null;
        let finalEmployeeNo = typeof employee_no === "string" && employee_no.trim().length > 0
            ? employee_no.trim()
            : null;
        if (!finalEmployeeNo) {
            finalEmployeeNo = await (0, identifier_utils_1.generateHumanCode)({
                establishmentId: estId,
                role: "teacher",
            });
        }
        const initialPassword = (0, auth_utils_1.generateTemporaryPassword)();
        // Création du user
        const user = await (0, user_model_1.createUser)({
            email: loginEmail,
            password: initialPassword,
            role: "teacher",
            full_name,
            establishmentId: estId,
        });
        // Création du profil professeur
        const profileInsert = await database_1.default.query(`
      INSERT INTO teacher_profiles (
        user_id,
        employee_no,
        hire_date,
        specialization,
        phone,
        office_room,
        contact_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, employee_no, hire_date, specialization, phone, office_room, contact_email
    `, [
            user.id,
            finalEmployeeNo,
            hire_date ? new Date(hire_date) : null,
            specialization || null,
            phone || null,
            office_room || null,
            contactEmail,
        ]);
        const profile = profileInsert.rows[0];
        const invite = await (0, auth_controller_1.createInviteTokenForUser)({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
        });
        const establishmentName = await getEstablishmentName(estId);
        const targetEmail = profile.contact_email || user.email;
        if (targetEmail) {
            await (0, email_service_1.sendInviteEmail)({
                to: targetEmail,
                loginEmail: user.email,
                role: "teacher",
                establishmentName: establishmentName || undefined,
                inviteUrl: invite.inviteUrl,
            }).catch((err) => {
                console.error("[MAIL] Erreur envoi email d'invitation professeur:", err);
            });
        }
        const teacherPayload = {
            user_id: user.id,
            full_name: user.full_name,
            email: user.email,
            active: user.active,
            employee_no: profile.employee_no || finalEmployeeNo,
            hire_date: profile.hire_date,
            specialization: profile.specialization,
            phone: profile.phone,
            office_room: profile.office_room,
            contact_email: profile.contact_email,
            assigned_class_ids: [],
        };
        return res.status(201).json({
            success: true,
            message: "Professeur créé avec succès",
            teacher: teacherPayload,
            inviteUrl: invite.inviteUrl,
        });
    }
    catch (error) {
        console.error("Erreur createTeacherForAdminHandler:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la création du professeur",
        });
    }
}
/**
 * PATCH /api/admin/teachers/:userId
 * Mise à jour du profil + user (nom, email, téléphone, spécialité, etc.)
 */
async function updateTeacherForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const { full_name, email, employee_no, hire_date, specialization, phone, office_room, contact_email, } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        // Vérifier que le user est bien un prof de cet établissement
        const teacherResult = await database_1.default.query(`
      SELECT id, role, establishment_id
      FROM users
      WHERE id = $1
        AND establishment_id = $2
        AND role = 'teacher'
    `, [targetUserId, estId]);
        if (teacherResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Professeur introuvable pour cet établissement",
            });
        }
        // Mise à jour de la table users (nom / email)
        if (full_name || email) {
            await database_1.default.query(`
        UPDATE users
        SET
          full_name = COALESCE($1, full_name),
          email = COALESCE($2, email)
        WHERE id = $3
      `, [full_name ?? null, email ?? null, targetUserId]);
        }
        // Vérifier si un profil professeur existe déjà
        const profileResult = await database_1.default.query(`SELECT user_id FROM teacher_profiles WHERE user_id = $1 LIMIT 1`, [targetUserId]);
        let profileRow;
        if (profileResult.rowCount === 0) {
            // Pas de profil => INSERT
            const insertProfile = await database_1.default.query(`
        INSERT INTO teacher_profiles (
          user_id,
          employee_no,
          hire_date,
          specialization,
          phone,
          office_room,
          contact_email
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id, employee_no, hire_date, specialization, phone, office_room, contact_email
      `, [
                targetUserId,
                employee_no || null,
                hire_date ? new Date(hire_date) : null,
                specialization || null,
                phone || null,
                office_room || null,
                contact_email ? contact_email.toLowerCase().trim() : null,
            ]);
            profileRow = insertProfile.rows[0];
        }
        else {
            // Profil existe => UPDATE
            const updateProfile = await database_1.default.query(`
        UPDATE teacher_profiles
        SET
          employee_no = COALESCE($2, employee_no),
          hire_date = COALESCE($3, hire_date),
          specialization = COALESCE($4, specialization),
          phone = COALESCE($5, phone),
          office_room = COALESCE($6, office_room),
          contact_email = COALESCE($7, contact_email)
        WHERE user_id = $1
        RETURNING user_id, employee_no, hire_date, specialization, phone, office_room, contact_email
      `, [
                targetUserId,
                employee_no || null,
                hire_date ? new Date(hire_date) : null,
                specialization || null,
                phone || null,
                office_room || null,
                contact_email ? contact_email.toLowerCase().trim() : null,
            ]);
            profileRow = updateProfile.rows[0];
        }
        // Retourner les données à jour
        const finalResult = await database_1.default.query(`
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.active,
        tp.employee_no,
        tp.hire_date,
        tp.specialization,
        tp.phone,
        tp.office_room,
        tp.contact_email,
        tp.assigned_class_ids
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      WHERE u.id = $1
    `, [targetUserId]);
        return res.json({
            success: true,
            message: "Professeur mis à jour avec succès",
            data: finalResult.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateTeacherForAdminHandler:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                error: "Un utilisateur avec cet email existe déjà",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du professeur",
        });
    }
}
/**
 * PATCH /api/admin/teachers/:userId/status
 * Activer / désactiver un professeur
 */
async function updateTeacherStatusHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const { active } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      UPDATE users
      SET active = $1
      WHERE id = $2
        AND role = 'teacher'
        AND establishment_id = $3
    `, [active, targetUserId, estId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Professeur introuvable pour cet établissement",
            });
        }
        return res.json({
            success: true,
            message: "Statut du professeur mis à jour",
        });
    }
    catch (error) {
        console.error("Erreur updateTeacherStatusHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du statut du professeur",
        });
    }
}
async function resendTeacherInviteHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await processInviteResend(targetUserId, "teacher", estId);
        if (!result.ok) {
            return res.status(result.status).json({
                success: false,
                error: result.message,
            });
        }
        return res.json({
            success: true,
            inviteUrl: result.inviteUrl,
            message: "Invitation renvoyée avec succès",
        });
    }
    catch (error) {
        console.error("Erreur resendTeacherInviteHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de l'envoi de la nouvelle invitation",
        });
    }
}
async function updateTeacherClassesHandler(req, res) {
    try {
        const { userId } = req.user;
        const targetUserId = req.params.userId;
        const { assigned_class_ids } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const teacherResult = await database_1.default.query(`
        SELECT id
        FROM users
        WHERE id = $1
          AND establishment_id = $2
          AND role = 'teacher'
      `, [targetUserId, estId]);
        if (teacherResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Professeur introuvable pour cet établissement",
            });
        }
        const normalizedIds = Array.isArray(assigned_class_ids)
            ? Array.from(new Set(assigned_class_ids.filter(Boolean)))
            : [];
        if (normalizedIds.length > 0) {
            const classCheck = await database_1.default.query(`
          SELECT id
          FROM classes
          WHERE establishment_id = $1
            AND id = ANY($2::uuid[])
        `, [estId, normalizedIds]);
            if (classCheck.rowCount !== normalizedIds.length) {
                return res.status(400).json({
                    success: false,
                    error: "Certaines classes sélectionnées n'appartiennent pas à votre établissement",
                });
            }
        }
        await database_1.default.query(`
        UPDATE teacher_profiles
        SET assigned_class_ids = $1
        WHERE user_id = $2
      `, [normalizedIds.length > 0 ? normalizedIds : null, targetUserId]);
        const finalResult = await database_1.default.query(`
        SELECT
          u.id AS user_id,
          u.full_name,
          u.email,
          u.active,
          tp.employee_no,
          tp.hire_date,
          tp.specialization,
          tp.phone,
          tp.office_room,
          tp.contact_email,
          tp.assigned_class_ids
        FROM users u
        LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
        WHERE u.id = $1
      `, [targetUserId]);
        return res.json({
            success: true,
            data: finalResult.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateTeacherClassesHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour des classes du professeur",
        });
    }
}
/**
 * GET /api/admin/subjects
 * Liste des matières de l'établissement de l'admin
 */
async function getAdminSubjectsHandler(req, res) {
    try {
        const { userId } = req.user;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const result = await database_1.default.query(`
      SELECT
        id,
        name,
        short_code,
        color,
        level,
        establishment_id,
        created_at
      FROM subjects
      WHERE establishment_id = $1
      ORDER BY name ASC
    `, [estId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error("Erreur getAdminSubjectsHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des matières",
        });
    }
}
/**
 * POST /api/admin/subjects
 * Création d'une matière
 */
async function createSubjectForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { name, short_code, color, level } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Le nom de la matière est obligatoire",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const insertResult = await database_1.default.query(`
      INSERT INTO subjects (
        name,
        short_code,
        color,
        level,
        establishment_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, short_code, color, level, establishment_id, created_at
    `, [name, short_code || null, color || null, level || null, estId]);
        return res.status(201).json({
            success: true,
            data: insertResult.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur createSubjectForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la création de la matière",
        });
    }
}
/**
 * PATCH /api/admin/subjects/:subjectId
 * Mise à jour d'une matière
 */
async function updateSubjectForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const subjectId = req.params.subjectId;
        const { name, short_code, color, level } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const subjectCheck = await database_1.default.query(`SELECT id FROM subjects WHERE id = $1 AND establishment_id = $2`, [subjectId, estId]);
        if (subjectCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Matière introuvable pour cet établissement",
            });
        }
        const updateResult = await database_1.default.query(`
      UPDATE subjects
      SET
        name = COALESCE($1, name),
        short_code = COALESCE($2, short_code),
        color = COALESCE($3, color),
        level = COALESCE($4, level)
      WHERE id = $5
      RETURNING id, name, short_code, color, level, establishment_id, created_at
    `, [name ?? null, short_code ?? null, color ?? null, level ?? null, subjectId]);
        return res.json({
            success: true,
            data: updateResult.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateSubjectForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour de la matière",
        });
    }
}
/**
 * GET /api/admin/classes/:classId/courses
 * Liste des cours (matière + prof) d'une classe
 */
async function getClassCoursesForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const classId = req.params.classId;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const classCheck = await database_1.default.query(`SELECT id FROM classes WHERE id = $1 AND establishment_id = $2`, [classId, estId]);
        if (classCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Classe introuvable pour cet établissement",
            });
        }
        const result = await database_1.default.query(`
      SELECT
        c.id,
        c.class_id,
        c.subject_id,
        c.teacher_id,
        c.default_room,
        s.name AS subject_name,
        s.short_code AS subject_short_code,
        s.color AS subject_color,
        u.full_name AS teacher_name
      FROM courses c
      JOIN subjects s ON s.id = c.subject_id
      JOIN users u ON u.id = c.teacher_id
      WHERE c.class_id = $1
        AND c.establishment_id = $2
      ORDER BY s.name ASC
    `, [classId, estId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error("Erreur getClassCoursesForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors du chargement des cours de la classe",
        });
    }
}
/**
 * POST /api/admin/courses
 * Création d'un cours (classe + matière + professeur)
 */
async function createCourseForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const { class_id, subject_id, teacher_id, default_room } = req.body;
        if (!class_id || !subject_id || !teacher_id) {
            return res.status(400).json({
                success: false,
                error: "Les champs class_id, subject_id et teacher_id sont obligatoires",
            });
        }
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const classCheck = await database_1.default.query(`SELECT id FROM classes WHERE id = $1 AND establishment_id = $2`, [class_id, estId]);
        if (classCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Classe introuvable pour cet établissement",
            });
        }
        const subjectCheck = await database_1.default.query(`SELECT id FROM subjects WHERE id = $1 AND establishment_id = $2`, [subject_id, estId]);
        if (subjectCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Matière introuvable pour cet établissement",
            });
        }
        const teacherCheck = await database_1.default.query(`SELECT id FROM users WHERE id = $1 AND establishment_id = $2 AND role = 'teacher'`, [teacher_id, estId]);
        if (teacherCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Professeur introuvable pour cet établissement",
            });
        }
        const insertResult = await database_1.default.query(`
      INSERT INTO courses (
        class_id,
        subject_id,
        teacher_id,
        default_room,
        establishment_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, class_id, subject_id, teacher_id, default_room, establishment_id, created_at
    `, [class_id, subject_id, teacher_id, default_room || null, estId]);
        const courseRow = insertResult.rows[0];
        const finalResult = await database_1.default.query(`
      SELECT
        c.id,
        c.class_id,
        c.subject_id,
        c.teacher_id,
        c.default_room,
        s.name AS subject_name,
        s.short_code AS subject_short_code,
        s.color AS subject_color,
        u.full_name AS teacher_name
      FROM courses c
      JOIN subjects s ON s.id = c.subject_id
      JOIN users u ON u.id = c.teacher_id
      WHERE c.id = $1
    `, [courseRow.id]);
        return res.status(201).json({
            success: true,
            data: finalResult.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur createCourseForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la création du cours",
        });
    }
}
/**
 * PATCH /api/admin/courses/:courseId
 * Mise à jour d'un cours
 */
async function updateCourseForAdminHandler(req, res) {
    try {
        const { userId } = req.user;
        const courseId = req.params.courseId;
        const { subject_id, teacher_id, default_room } = req.body;
        const estId = await getAdminEstablishmentId(userId);
        if (!estId) {
            return res.status(404).json({
                success: false,
                error: "Établissement non trouvé pour cet admin",
            });
        }
        const courseCheck = await database_1.default.query(`SELECT id FROM courses WHERE id = $1 AND establishment_id = $2`, [courseId, estId]);
        if (courseCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Cours introuvable pour cet établissement",
            });
        }
        if (subject_id) {
            const subjectCheck = await database_1.default.query(`SELECT id FROM subjects WHERE id = $1 AND establishment_id = $2`, [subject_id, estId]);
            if (subjectCheck.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Matière introuvable pour cet établissement",
                });
            }
        }
        if (teacher_id) {
            const teacherCheck = await database_1.default.query(`SELECT id FROM users WHERE id = $1 AND establishment_id = $2 AND role = 'teacher'`, [teacher_id, estId]);
            if (teacherCheck.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Professeur introuvable pour cet établissement",
                });
            }
        }
        const updateResult = await database_1.default.query(`
      UPDATE courses
      SET
        subject_id = COALESCE($1, subject_id),
        teacher_id = COALESCE($2, teacher_id),
        default_room = COALESCE($3, default_room)
      WHERE id = $4
        AND establishment_id = $5
      RETURNING id, class_id, subject_id, teacher_id, default_room, establishment_id, created_at
    `, [
            subject_id ?? null,
            teacher_id ?? null,
            default_room ?? null,
            courseId,
            estId,
        ]);
        const courseRow = updateResult.rows[0];
        const finalResult = await database_1.default.query(`
      SELECT
        c.id,
        c.class_id,
        c.subject_id,
        c.teacher_id,
        c.default_room,
        s.name AS subject_name,
        s.short_code AS subject_short_code,
        s.color AS subject_color,
        u.full_name AS teacher_name
      FROM courses c
      JOIN subjects s ON s.id = c.subject_id
      JOIN users u ON u.id = c.teacher_id
      WHERE c.id = $1
    `, [courseRow.id]);
        return res.json({
            success: true,
            data: finalResult.rows[0],
        });
    }
    catch (error) {
        console.error("Erreur updateCourseForAdminHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du cours",
        });
    }
}
//# sourceMappingURL=admin.controller.js.map