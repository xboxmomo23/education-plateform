"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChildrenForParent = getChildrenForParent;
exports.assertParentCanAccessStudent = assertParentCanAccessStudent;
exports.syncParentsForStudent = syncParentsForStudent;
const database_1 = require("../config/database");
const user_model_1 = require("./user.model");
const auth_utils_1 = require("../utils/auth.utils");
const identifier_utils_1 = require("../utils/identifier.utils");
function buildFullName(firstName, lastName) {
    const parts = [firstName, lastName]
        .map((value) => value?.trim())
        .filter(Boolean);
    if (parts.length === 0) {
        return 'Parent';
    }
    return parts.join(' ');
}
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return null;
    }
    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}
async function getChildrenForParent(parentId) {
    const result = await database_1.pool.query(`
      SELECT
        rel.student_id AS id,
        child.full_name,
        child.email,
        stu.student_number,
        cls.id AS class_id,
        cls.label AS class_name,
        rel.relation_type,
        rel.is_primary,
        rel.can_view_grades,
        rel.can_view_attendance,
        rel.receive_notifications
      FROM student_parents rel
      INNER JOIN users child ON child.id = rel.student_id
      LEFT JOIN students stu ON stu.user_id = rel.student_id
      LEFT JOIN classes cls ON cls.id = stu.class_id
      WHERE rel.parent_id = $1
      ORDER BY child.full_name ASC
    `, [parentId]);
    return result.rows.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        student_number: row.student_number || null,
        class_id: row.class_id || null,
        class_name: row.class_name || null,
        relation_type: row.relation_type || null,
        is_primary: row.is_primary ?? null,
        can_view_grades: row.can_view_grades ?? null,
        can_view_attendance: row.can_view_attendance ?? null,
        receive_notifications: row.receive_notifications ?? null,
    }));
}
async function assertParentCanAccessStudent(parentId, studentId, options = {}) {
    const clauses = ['parent_id = $1', 'student_id = $2'];
    const values = [parentId, studentId];
    let paramIndex = 3;
    if (options.requireCanViewGrades) {
        clauses.push(`can_view_grades = TRUE`);
    }
    if (options.requireCanViewAttendance) {
        clauses.push(`can_view_attendance = TRUE`);
    }
    const query = `
    SELECT 1
    FROM student_parents
    WHERE ${clauses.join(' AND ')}
    LIMIT 1
  `;
    const result = await database_1.pool.query(query, values);
    if (result.rowCount === 0) {
        const error = new Error('PARENT_STUDENT_FORBIDDEN');
        error.name = 'ParentAccessDeniedError';
        throw error;
    }
}
async function upsertParentProfile(params) {
    const { parentId, phone, address, relationType, isPrimaryContact, canViewGrades, canViewAttendance, } = params;
    await database_1.pool.query(`
      INSERT INTO parent_profiles (
        user_id,
        phone,
        address,
        relation_type,
        is_primary_contact,
        can_view_grades,
        can_view_attendance,
        is_emergency_contact
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
      ON CONFLICT (user_id)
      DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, parent_profiles.phone),
        address = COALESCE(EXCLUDED.address, parent_profiles.address),
        relation_type = COALESCE(EXCLUDED.relation_type, parent_profiles.relation_type),
        is_primary_contact = COALESCE(EXCLUDED.is_primary_contact, parent_profiles.is_primary_contact),
        can_view_grades = COALESCE(EXCLUDED.can_view_grades, parent_profiles.can_view_grades),
        can_view_attendance = COALESCE(EXCLUDED.can_view_attendance, parent_profiles.can_view_attendance)
    `, [
        parentId,
        phone || null,
        address || null,
        relationType || null,
        isPrimaryContact ?? false,
        canViewGrades ?? true,
        canViewAttendance ?? true,
    ]);
}
async function upsertStudentParentRelation(params) {
    const { studentId, parentId, relationType, isPrimary, canViewGrades, canViewAttendance, receiveNotifications, } = params;
    await database_1.pool.query(`
      INSERT INTO student_parents (
        student_id,
        parent_id,
        relation_type,
        is_primary,
        can_view_grades,
        can_view_attendance,
        receive_notifications
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (student_id, parent_id)
      DO UPDATE SET
        relation_type = COALESCE(EXCLUDED.relation_type, student_parents.relation_type),
        is_primary = COALESCE(EXCLUDED.is_primary, student_parents.is_primary),
        can_view_grades = COALESCE(EXCLUDED.can_view_grades, student_parents.can_view_grades),
        can_view_attendance = COALESCE(EXCLUDED.can_view_attendance, student_parents.can_view_attendance),
        receive_notifications = COALESCE(EXCLUDED.receive_notifications, student_parents.receive_notifications)
    `, [
        studentId,
        parentId,
        relationType || null,
        isPrimary ?? false,
        canViewGrades ?? true,
        canViewAttendance ?? true,
        receiveNotifications ?? true,
    ]);
}
async function findParentUserByEmail(email, establishmentId) {
    const userResult = await database_1.pool.query(`
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email]);
    const user = userResult.rows[0];
    if (!user) {
        return null;
    }
    if (user.role !== 'parent') {
        const error = new Error('EMAIL_ALREADY_IN_USE');
        error.email = email;
        throw error;
    }
    if (user.establishment_id && user.establishment_id !== establishmentId) {
        const error = new Error('PARENT_BELONGS_TO_ANOTHER_ESTABLISHMENT');
        error.email = email;
        throw error;
    }
    return user;
}
async function syncParentsForStudent(params) {
    const { studentId, establishmentId, parents } = params;
    if (!parents || parents.length === 0) {
        return [];
    }
    const results = [];
    const seenParentIds = new Set();
    for (const parentPayload of parents) {
        const firstName = parentPayload.firstName?.trim();
        const lastName = parentPayload.lastName?.trim();
        if (!firstName && !lastName) {
            continue;
        }
        let email = normalizeEmail(parentPayload.email);
        let user = null;
        let isNewUser = false;
        if (email) {
            user = await findParentUserByEmail(email, establishmentId);
        }
        if (!user) {
            const fullName = buildFullName(firstName, lastName);
            const loginEmail = email ||
                (await (0, identifier_utils_1.generateLoginEmailFromName)({
                    fullName,
                    establishmentId,
                }));
            const tempPassword = (0, auth_utils_1.generateTemporaryPassword)();
            user = await (0, user_model_1.createUser)({
                email: loginEmail,
                password: tempPassword,
                role: 'parent',
                full_name: fullName,
                establishmentId,
                mustChangePassword: true,
            });
            isNewUser = true;
            email = user.email;
        }
        if (seenParentIds.has(user.id)) {
            continue;
        }
        const relationType = parentPayload.relation_type || null;
        const isPrimary = parentPayload.is_primary ?? false;
        const canViewGrades = parentPayload.can_view_grades ?? true;
        const canViewAttendance = parentPayload.can_view_attendance ?? true;
        const receiveNotifications = parentPayload.receive_notifications ?? true;
        const phone = parentPayload.phone?.trim() || null;
        const address = parentPayload.address?.trim() || null;
        await upsertParentProfile({
            parentId: user.id,
            phone,
            address,
            relationType,
            isPrimaryContact: isPrimary,
            canViewGrades,
            canViewAttendance,
        });
        await upsertStudentParentRelation({
            studentId,
            parentId: user.id,
            relationType,
            isPrimary,
            canViewGrades,
            canViewAttendance,
            receiveNotifications,
        });
        seenParentIds.add(user.id);
        results.push({
            parentUserId: user.id,
            full_name: user.full_name,
            email: email || null,
            isNewUser,
        });
    }
    return results;
}
//# sourceMappingURL=parent.model.js.map