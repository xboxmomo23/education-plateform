import { pool } from '../config/database';
import { User, UserRole, StudentProfile, TeacherProfile, ResponsableProfile } from '../types';
import { hashPassword } from '../utils/auth.utils';

// =========================
// Création d'utilisateurs
// =========================

export interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
  full_name: string;
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const { email, password, role, full_name } = userData;
  
  const password_hash = await hashPassword(password);
  
  const query = `
    INSERT INTO users (email, password_hash, role, full_name, email_verified)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const values = [email, password_hash, role, full_name, false];
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
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function createTeacherProfile(
  userId: string,
  profileData: Partial<TeacherProfile>
): Promise<TeacherProfile> {
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
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function createResponsableProfile(
  userId: string,
  profileData: Partial<ResponsableProfile>
): Promise<ResponsableProfile> {
  const query = `
    INSERT INTO responsable_profiles (
      user_id, phone, address, relation_type, is_primary_contact,
      can_view_grades, can_view_attendance, emergency_contact
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
    profileData.emergency_contact ?? false,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// =========================
// Recherche d'utilisateurs
// =========================

export async function findUserByEmail(email: string): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE email = $1 AND deleted_at IS NULL
  `;
  
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE id = $1 AND deleted_at IS NULL
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function getUserWithProfile(userId: string, role: UserRole) {
  const user = await findUserById(userId);
  if (!user) return null;
  
  let profile: StudentProfile | TeacherProfile | ResponsableProfile | null = null;
  
  switch (role) {
    case 'student':
      profile = await getStudentProfile(userId);
      break;
    case 'teacher':
      profile = await getTeacherProfile(userId);
      break;
    case 'responsable':
      profile = await getResponsableProfile(userId);
      break;
    case 'admin':
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

export async function getResponsableProfile(userId: string): Promise<ResponsableProfile | null> {
  const query = `SELECT * FROM responsable_profiles WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
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
    SET password_hash = $1, password_changed_at = NOW()
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