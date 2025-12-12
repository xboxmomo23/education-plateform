import { pool } from '../config/database';
import { hashPassword } from '../utils/auth.utils';

const ESTABLISHMENT_ID = '6d7b73e9-8433-4b3b-a257-0cdf528d046e';

const STUDENT_EMAIL = 'student.test@example.com';
const STUDENT_FULL_NAME = 'Élève Test';
const STUDENT_PASSWORD = 'Student123!';
const STUDENT_NUMBER = 'STU-TEST-001';

const PARENT_EMAIL = 'parent.test@example.com';
const PARENT_FULL_NAME = 'Parent Test';
const PARENT_PASSWORD = 'Parent123!';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
}

async function upsertUser(params: {
  email: string;
  fullName: string;
  role: 'student' | 'parent';
  password: string;
  mustChangePassword?: boolean;
}): Promise<UserRow> {
  const passwordHash = await hashPassword(params.password);

  const result = await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        role,
        full_name,
        establishment_id,
        active,
        email_verified,
        must_change_password
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, $6)
      ON CONFLICT (email)
      DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        establishment_id = EXCLUDED.establishment_id,
        password_hash = EXCLUDED.password_hash,
        must_change_password = EXCLUDED.must_change_password,
        active = TRUE,
        email_verified = TRUE
      RETURNING id, email, full_name
    `,
    [
      params.email,
      passwordHash,
      params.role,
      params.fullName,
      ESTABLISHMENT_ID,
      params.mustChangePassword ? true : false,
    ]
  );

  return result.rows[0];
}

async function ensureStudentData(studentUser: UserRow): Promise<void> {
  await pool.query(
    `
      INSERT INTO student_profiles (user_id, student_no, contact_email)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        student_no = EXCLUDED.student_no,
        contact_email = EXCLUDED.contact_email
    `,
    [studentUser.id, STUDENT_NUMBER, STUDENT_EMAIL]
  );

  await pool.query(
    `
      INSERT INTO students (user_id, class_id, student_number, date_of_birth)
      VALUES ($1, NULL, $2, NULL)
      ON CONFLICT (user_id)
      DO UPDATE SET
        student_number = EXCLUDED.student_number
    `,
    [studentUser.id, STUDENT_NUMBER]
  );
}

async function ensureParentData(parentUser: UserRow): Promise<void> {
  await pool.query(
    `
      INSERT INTO parent_profiles (
        user_id,
        phone,
        address,
        relation_type,
        is_primary_contact,
        can_view_grades,
        can_view_attendance,
        emergency_contact,
        contact_email
      )
      VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, FALSE, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        relation_type = EXCLUDED.relation_type,
        is_primary_contact = EXCLUDED.is_primary_contact,
        can_view_grades = EXCLUDED.can_view_grades,
        can_view_attendance = EXCLUDED.can_view_attendance,
        contact_email = COALESCE(EXCLUDED.contact_email, parent_profiles.contact_email)
    `,
    [parentUser.id, '+33600000000', '123 rue du Test 75000 Paris', 'Parent', PARENT_EMAIL]
  );
}

async function ensureLink(studentId: string, parentId: string): Promise<void> {
  await pool.query(
    `
      INSERT INTO student_parents (
        student_id,
        parent_id,
        relation_type,
        is_primary,
        receive_notifications
      )
      VALUES ($1, $2, $3, TRUE, TRUE)
      ON CONFLICT (student_id, parent_id)
      DO UPDATE SET
        relation_type = EXCLUDED.relation_type,
        is_primary = EXCLUDED.is_primary,
        receive_notifications = EXCLUDED.receive_notifications
    `,
    [studentId, parentId, 'Parent']
  );
}

async function main() {
  console.log('🚀 Création des données de test parent + élève...');

  await pool.query('BEGIN');
  try {
    const studentUser = await upsertUser({
      email: STUDENT_EMAIL,
      fullName: STUDENT_FULL_NAME,
      role: 'student',
      password: STUDENT_PASSWORD,
      mustChangePassword: false,
    });
    await ensureStudentData(studentUser);

    const parentUser = await upsertUser({
      email: PARENT_EMAIL,
      fullName: PARENT_FULL_NAME,
      role: 'parent',
      password: PARENT_PASSWORD,
      mustChangePassword: false,
    });
    await ensureParentData(parentUser);

    await ensureLink(studentUser.id, parentUser.id);

    await pool.query('COMMIT');

    console.log('✅ Données de test créées/actualisées avec succès');
    console.log('---');
    console.log(`Élève : ${STUDENT_FULL_NAME} (${STUDENT_EMAIL})`);
    console.log(`Parent : ${PARENT_FULL_NAME} (${PARENT_EMAIL})`);
    console.log(`Mot de passe parent : ${PARENT_PASSWORD}`);
    console.log('---');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Erreur lors de la création des données de test :', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
