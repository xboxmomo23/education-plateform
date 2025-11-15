"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.createStudentProfile = createStudentProfile;
exports.createTeacherProfile = createTeacherProfile;
exports.createStaffProfile = createStaffProfile;
exports.createParentProfile = createParentProfile;
exports.findUsers = findUsers;
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.getUserWithProfile = getUserWithProfile;
exports.getStudentProfile = getStudentProfile;
exports.getTeacherProfile = getTeacherProfile;
exports.getParentProfile = getParentProfile;
exports.getResponsableProfile = getResponsableProfile;
exports.updateLastLogin = updateLastLogin;
exports.incrementFailedAttempts = incrementFailedAttempts;
exports.lockAccount = lockAccount;
exports.isAccountLocked = isAccountLocked;
exports.updatePassword = updatePassword;
exports.activateUser = activateUser;
exports.deactivateUser = deactivateUser;
const database_1 = require("../config/database");
const auth_utils_1 = require("../utils/auth.utils");
const query_builder_1 = require("../utils/query-builder");
// ✅ CORRECTION : Supprimer createStaffProfile de l'import pour éviter le conflit
const staff_model_1 = require("./staff.model");
async function createUser(userData) {
    const { email, password, role, full_name, establishmentId } = userData;
    const password_hash = await (0, auth_utils_1.hashPassword)(password);
    const query = `
    INSERT INTO users (
      email, password_hash, role, full_name, email_verified
      ${establishmentId ? ', establishment_id' : ''}
    )
    VALUES ($1, $2, $3, $4, $5 ${establishmentId ? ', $6' : ''})
    RETURNING *
  `;
    const values = [email, password_hash, role, full_name, false];
    if (establishmentId)
        values.push(establishmentId);
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
async function createStudentProfile(userId, profileData) {
    const query = `
    INSERT INTO student_profiles (
      user_id, student_no, birthdate, address, phone, 
      emergency_contact, medical_notes, photo_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
    const values = [
        userId,
        profileData.student_no || null,
        profileData.birthdate || null,
        profileData.address || null,
        profileData.phone || null,
        profileData.emergency_contact || null,
        profileData.medical_notes || null,
        profileData.photo_url || null,
    ];
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
async function createTeacherProfile(userId, profileData) {
    const query = `
    INSERT INTO teacher_profiles (
      user_id, employee_no, hire_date, specialization, phone, office_room
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
    const values = [
        userId,
        profileData.employee_no || null,
        profileData.hire_date || null,
        profileData.specialization || null,
        profileData.phone || null,
        profileData.office_room || null,
    ];
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
// ✅ CORRECTION : Cette fonction insère dans staff_profiles (pas responsable_profiles)
async function createStaffProfile(userId, profileData) {
    const query = `
    INSERT INTO staff_profiles (
      user_id, phone, department, office_room, employee_no, hire_date
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING user_id, phone, department, office_room, employee_no, hire_date, created_at
  `;
    const values = [
        userId,
        profileData.phone || null,
        profileData.department || null,
        profileData.office_room || null,
        profileData.employee_no || null,
        profileData.hire_date || null,
    ];
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
// ✅ NOUVEAU : Fonction pour créer un profil parent (si vous avez une table parent_profiles)
async function createParentProfile(userId, profileData) {
    // Si vous avez créé une table parent_profiles
    const query = `
    INSERT INTO parent_profiles (
      user_id, phone, address, relation_type, is_primary_contact,
      can_view_grades, can_view_attendance, is_emergency_contact
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
    const values = [
        userId,
        profileData.phone || '',
        profileData.address || null,
        profileData.relation_type || null,
        profileData.is_primary_contact ?? true,
        profileData.can_view_grades ?? true,
        profileData.can_view_attendance ?? true,
        profileData.is_emergency_contact ?? false,
    ];
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
// =========================
// Recherche d'utilisateurs (REFACTORÉ)
// =========================
/**
 * Trouve des utilisateurs avec filtres extensibles
 * Future-proof pour multi-tenant
 */
async function findUsers(filters = {}) {
    const qb = new query_builder_1.QueryBuilder();
    // Ajouter les filtres standards
    (0, query_builder_1.addBaseFilters)(qb, {
        establishmentId: filters.establishmentId,
        active: filters.active,
        includeDeleted: filters.includeDeleted,
    });
    // Ajouter les filtres spécifiques
    if (filters.id) {
        qb.addCondition('id', filters.id);
    }
    if (filters.email) {
        qb.addCondition('email', filters.email);
    }
    if (filters.role) {
        qb.addCondition('role', filters.role);
    }
    const { where, values } = qb.build();
    const query = `
    SELECT * FROM users 
    ${where}
    ORDER BY created_at DESC
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Trouve un utilisateur par email
 * Wrapper pour compatibilité avec l'ancien code
 */
async function findUserByEmail(email, establishmentId) {
    const users = await findUsers({ email, establishmentId });
    return users[0] || null;
}
/**
 * Trouve un utilisateur par ID
 */
async function findUserById(id, establishmentId) {
    const users = await findUsers({ id, establishmentId });
    return users[0] || null;
}
/**
 * Récupère un utilisateur avec son profil
 */
async function getUserWithProfile(userId, role, establishmentId) {
    const user = await findUserById(userId, establishmentId);
    if (!user)
        return null;
    let profile = null;
    switch (role) {
        case 'student':
            profile = await getStudentProfile(userId);
            break;
        case 'teacher':
            profile = await getTeacherProfile(userId);
            break;
        case 'staff':
            profile = await (0, staff_model_1.getStaffProfile)(userId);
            break;
        case 'parent':
            profile = await getParentProfile(userId);
            break;
        case 'admin':
            break;
    }
    return { user, profile };
}
async function getStudentProfile(userId) {
    const query = `SELECT * FROM student_profiles WHERE user_id = $1`;
    const result = await database_1.pool.query(query, [userId]);
    return result.rows[0] || null;
}
async function getTeacherProfile(userId) {
    const query = `SELECT * FROM teacher_profiles WHERE user_id = $1`;
    const result = await database_1.pool.query(query, [userId]);
    return result.rows[0] || null;
}
// ✅ NOUVEAU : Fonction pour récupérer un profil parent
async function getParentProfile(userId) {
    const query = `SELECT * FROM parent_profiles WHERE user_id = $1`;
    const result = await database_1.pool.query(query, [userId]);
    return result.rows[0] || null;
}
// ✅ Alias pour compatibilité (si vous aviez du code qui utilisait getResponsableProfile)
async function getResponsableProfile(userId) {
    // Décidez si vous voulez chercher dans staff_profiles ou parent_profiles
    return getParentProfile(userId);
}
// =========================
// Mise à jour utilisateur
// =========================
async function updateLastLogin(userId) {
    const query = `
    UPDATE users 
    SET last_login = NOW(), failed_login_attempts = 0
    WHERE id = $1
  `;
    await database_1.pool.query(query, [userId]);
}
async function incrementFailedAttempts(userId) {
    const query = `
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = $1
    RETURNING failed_login_attempts
  `;
    const result = await database_1.pool.query(query, [userId]);
    return result.rows[0].failed_login_attempts;
}
async function lockAccount(userId, durationMinutes = 30) {
    const query = `
    UPDATE users 
    SET account_locked_until = NOW() + INTERVAL '${durationMinutes} minutes'
    WHERE id = $1
  `;
    await database_1.pool.query(query, [userId]);
}
async function isAccountLocked(userId) {
    const query = `
    SELECT account_locked_until 
    FROM users 
    WHERE id = $1
  `;
    const result = await database_1.pool.query(query, [userId]);
    const user = result.rows[0];
    if (!user || !user.account_locked_until) {
        return false;
    }
    return new Date(user.account_locked_until) > new Date();
}
async function updatePassword(userId, newPassword) {
    const password_hash = await (0, auth_utils_1.hashPassword)(newPassword);
    const query = `
    UPDATE users 
    SET password_hash = $1, password_changed_at = NOW()
    WHERE id = $2
  `;
    await database_1.pool.query(query, [password_hash, userId]);
}
async function activateUser(userId) {
    const query = `
    UPDATE users 
    SET active = TRUE, email_verified = TRUE
    WHERE id = $1
  `;
    await database_1.pool.query(query, [userId]);
}
async function deactivateUser(userId) {
    const query = `
    UPDATE users 
    SET active = FALSE, deleted_at = NOW()
    WHERE id = $1
  `;
    await database_1.pool.query(query, [userId]);
}
//# sourceMappingURL=user.model.js.map