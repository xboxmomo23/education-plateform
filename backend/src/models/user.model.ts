import { pool } from '../config/database';
import { User, UserRole, StudentProfile, TeacherProfile, StaffProfile, ParentProfile } from '../types';
import { hashPassword } from '../utils/auth.utils';
import { QueryBuilder, addBaseFilters } from '../utils/query-builder';
// ✅ CORRECTION : Supprimer createStaffProfile de l'import pour éviter le conflit
import { getStaffProfile } from './staff.model';


// =========================
// Interfaces de filtres
// =========================

export interface UserFilters {
  id?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
  includeDeleted?: boolean;
  // Future: Multi-tenant
  establishmentId?: string;
}

// =========================
// Création d'utilisateurs
// =========================

export interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
  full_name: string;
  establishmentId?: string;  // Future: Obligatoire
  mustChangePassword?: boolean;
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const { email, password, role, full_name, establishmentId, mustChangePassword } = userData;
  
  const password_hash = await hashPassword(password);
  const must_change_password = mustChangePassword ?? true;
  
  const query = `
    INSERT INTO users (
      email, password_hash, role, full_name, email_verified, must_change_password
      ${establishmentId ? ', establishment_id' : ''}
    )
    VALUES ($1, $2, $3, $4, $5, $6 ${establishmentId ? ', $7' : ''})
    RETURNING *
  `;
  
  const values = [email, password_hash, role, full_name, false, must_change_password];
  if (establishmentId) values.push(establishmentId);
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function createStudentProfile(
  userId: string,
  profileData: Partial<StudentProfile>
): Promise<StudentProfile> {
  const query = `
    INSERT INTO student_profiles (
      user_id, student_no, birthdate, address, phone, 
      emergency_contact, medical_notes, photo_url, contact_email
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    profileData.contact_email || null,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function createTeacherProfile(
  userId: string,
  profileData: Partial<TeacherProfile>
): Promise<TeacherProfile> {
  const query = `
    INSERT INTO teacher_profiles (
      user_id, employee_no, hire_date, specialization, phone, office_room, contact_email
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [
    userId,
    profileData.employee_no || null,
    profileData.hire_date || null,
    profileData.specialization || null,
    profileData.phone || null,
    profileData.office_room || null,
    profileData.contact_email || null,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// ✅ CORRECTION : Cette fonction insère dans staff_profiles (pas responsable_profiles)
export async function createStaffProfile(
  userId: string,
  profileData: Partial<StaffProfile>
): Promise<StaffProfile> {
  const query = `
    INSERT INTO staff_profiles (
      user_id, phone, department, office_room, employee_no, hire_date, contact_email
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING user_id, phone, department, office_room, employee_no, hire_date, contact_email, created_at
  `;
  
  const values = [
    userId,
    profileData.phone || null,
    profileData.department || null,
    profileData.office_room || null,
    profileData.employee_no || null,
    profileData.hire_date || null,
    profileData.contact_email || null,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// ✅ NOUVEAU : Fonction pour créer un profil parent (si vous avez une table parent_profiles)
export async function createParentProfile(
  userId: string,
  profileData: Partial<ParentProfile>
): Promise<ParentProfile> {
  // Si vous avez créé une table parent_profiles
  const query = `
    INSERT INTO parent_profiles (
      user_id, phone, address, relation_type, is_primary_contact,
      can_view_grades, can_view_attendance, emergency_contact, contact_email
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    profileData.emergency_contact ?? false,
    profileData.contact_email || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// =========================
// Recherche d'utilisateurs (REFACTORÉ)
// =========================

/**
 * Trouve des utilisateurs avec filtres extensibles
 * Future-proof pour multi-tenant
 */
export async function findUsers(filters: UserFilters = {}): Promise<User[]> {
  const qb = new QueryBuilder();
  
  // Ajouter les filtres standards
  addBaseFilters(qb, {
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
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Trouve un utilisateur par email
 * Wrapper pour compatibilité avec l'ancien code
 */
export async function findUserByEmail(email: string, establishmentId?: string): Promise<User | null> {
  const users = await findUsers({ email, establishmentId });
  return users[0] || null;
}

/**
 * Trouve un utilisateur par ID
 */
export async function findUserById(id: string, establishmentId?: string): Promise<User | null> {
  const users = await findUsers({ id, establishmentId });
  return users[0] || null;
}

/**
 * Récupère un utilisateur avec son profil
 */
export async function getUserWithProfile(userId: string, role: UserRole, establishmentId?: string) {
  const user = await findUserById(userId, establishmentId);
  if (!user) return null;
  
  let profile: StudentProfile | TeacherProfile | StaffProfile | null = null;
  
  switch (role) {
    case 'student':
      profile = await getStudentProfile(userId);
      break;
    case 'teacher':
      profile = await getTeacherProfile(userId);
      break;
    case 'staff':
      profile = await getStaffProfile(userId);
      break;
    case 'parent':
      profile = await getParentProfile(userId);
      break;
    case 'admin':
      break;
    case 'super_admin':
      break;
  }
  return { user, profile };
}

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const query = `SELECT * FROM student_profiles WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

export async function getTeacherProfile(userId: string): Promise<TeacherProfile | null> {
  const query = `SELECT * FROM teacher_profiles WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

// ✅ NOUVEAU : Fonction pour récupérer un profil parent
export async function getParentProfile(userId: string): Promise<StaffProfile | null> {
  const query = `SELECT * FROM parent_profiles WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

// ✅ Alias pour compatibilité (si vous aviez du code qui utilisait getResponsableProfile)
export async function getResponsableProfile(userId: string): Promise<StaffProfile | null> {
  // Décidez si vous voulez chercher dans staff_profiles ou parent_profiles
  return getParentProfile(userId);
}

// =========================
// Mise à jour utilisateur
// =========================

export async function updateLastLogin(userId: string): Promise<void> {
  const query = `
    UPDATE users 
    SET last_login = NOW(), failed_login_attempts = 0
    WHERE id = $1
  `;
  await pool.query(query, [userId]);
}

export async function incrementFailedAttempts(userId: string): Promise<number> {
  const query = `
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = $1
    RETURNING failed_login_attempts
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0].failed_login_attempts;
}

export async function lockAccount(userId: string, durationMinutes: number = 30): Promise<void> {
  const query = `
    UPDATE users 
    SET account_locked_until = NOW() + INTERVAL '${durationMinutes} minutes'
    WHERE id = $1
  `;
  await pool.query(query, [userId]);
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  const query = `
    SELECT account_locked_until 
    FROM users 
    WHERE id = $1
  `;
  const result = await pool.query(query, [userId]);
  const user = result.rows[0];
  
  if (!user || !user.account_locked_until) {
    return false;
  }
  
  return new Date(user.account_locked_until) > new Date();
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const password_hash = await hashPassword(newPassword);
  
  const query = `
    UPDATE users 
    SET password_hash = $1, 
        password_changed_at = NOW(),
        must_change_password = FALSE,
        failed_login_attempts = 0
    WHERE id = $2
  `;
  await pool.query(query, [password_hash, userId]);
}

export async function activateUser(userId: string): Promise<void> {
  const query = `
    UPDATE users 
    SET active = TRUE, email_verified = TRUE
    WHERE id = $1
  `;
  await pool.query(query, [userId]);
}

export async function deactivateUser(userId: string): Promise<void> {
  const query = `
    UPDATE users 
    SET active = FALSE, deleted_at = NOW()
    WHERE id = $1
  `;
  await pool.query(query, [userId]);
}
