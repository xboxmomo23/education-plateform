import { PoolClient } from 'pg';
import { pool } from '../config/database';
import { ParentChildSummary, ParentForStudentInput, User } from '../types';
import { createUser } from './user.model';
import { generateTemporaryPassword } from '../utils/auth.utils';
import { generateLoginEmailFromName } from '../utils/identifier.utils';

export interface ParentAccessOptions {
  requireCanViewGrades?: boolean;
  requireCanViewAttendance?: boolean;
}

export interface SyncParentsResult {
  parentUserId: string;
  full_name: string;
  email: string | null;
  isNewUser: boolean;
  contactEmailOverride?: string | null;
}

function buildFullName(firstName?: string, lastName?: string): string {
  const parts = [firstName, lastName]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'Parent';
  }

  return parts.join(' ');
}

function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

type ParentChildrenOptions = {
  includeInactive?: boolean;
  includePendingActivation?: boolean;
};

export async function getChildrenForParent(
  parentId: string,
  options?: ParentChildrenOptions
): Promise<ParentChildSummary[]> {
  const includeInactive = options?.includeInactive ?? false;
  const includePendingActivation = options?.includePendingActivation ?? false;
  const clauses = ['rel.parent_id = $1', "child.role = 'student'"];
  const params: any[] = [parentId];

  if (!includeInactive) {
    clauses.push('child.active = TRUE');
  }

  if (!includePendingActivation) {
    clauses.push('child.must_change_password = FALSE');
  }

  const result = await pool.query(
    `
      SELECT
        rel.student_id AS id,
        child.full_name,
        child.email,
        stu.student_number,
        cls.id AS class_id,
        cls.label AS class_name,
        rel.relation_type,
        rel.is_primary,
        rel.receive_notifications,
        pp.can_view_grades AS profile_can_view_grades,
        pp.can_view_attendance AS profile_can_view_attendance
      FROM student_parents rel
      INNER JOIN users child ON child.id = rel.student_id
      LEFT JOIN students stu ON stu.user_id = rel.student_id
      LEFT JOIN classes cls ON cls.id = stu.class_id
      LEFT JOIN parent_profiles pp ON pp.user_id = rel.parent_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY child.full_name ASC
    `,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    student_number: row.student_number || null,
    class_id: row.class_id || null,
    class_name: row.class_name || null,
    relation_type: row.relation_type || null,
    is_primary: row.is_primary ?? null,
    can_view_grades: row.profile_can_view_grades ?? true,
    can_view_attendance: row.profile_can_view_attendance ?? true,
    receive_notifications: row.receive_notifications ?? null,
  }));
}

export async function assertParentCanAccessStudent(
  parentId: string,
  studentId: string,
  options: ParentAccessOptions = {}
): Promise<void> {
  const clauses = ['sp.parent_id = $1', 'sp.student_id = $2'];
  const values: Array<string | boolean> = [parentId, studentId];

  if (options.requireCanViewGrades) {
    clauses.push('(pp.can_view_grades IS NULL OR pp.can_view_grades = TRUE)');
  }

  if (options.requireCanViewAttendance) {
    clauses.push('(pp.can_view_attendance IS NULL OR pp.can_view_attendance = TRUE)');
  }

  clauses.push('stu.active = TRUE');
  clauses.push('stu.must_change_password = FALSE');
  clauses.push("stu.role = 'student'");

  const query = `
    SELECT 1
    FROM student_parents sp
    INNER JOIN users stu ON stu.id = sp.student_id
    LEFT JOIN parent_profiles pp ON pp.user_id = sp.parent_id
    WHERE ${clauses.join(' AND ')}
    LIMIT 1
  `;

  const result = await pool.query(query, values);
  if (result.rowCount === 0) {
    const error = new Error('PARENT_STUDENT_FORBIDDEN');
    error.name = 'ParentAccessDeniedError';
    throw error;
  }
}

const FALLBACK_PARENT_PHONE = '+0000000000'; // DB constraint: parent_profiles.phone NOT NULL

async function upsertParentProfile(params: {
  parentId: string;
  phone?: string | null;
  address?: string | null;
  relationType?: string | null;
  isPrimaryContact?: boolean;
  canViewGrades?: boolean;
  canViewAttendance?: boolean;
  contactEmail?: string | null;
  emergencyContactConsent?: boolean;
  client?: PoolClient;
}): Promise<void> {
  const {
    parentId,
    phone,
    address,
    relationType,
    isPrimaryContact,
    canViewGrades,
    canViewAttendance,
    contactEmail,
    emergencyContactConsent,
    client,
  } = params;

  const safePhone =
    typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : FALLBACK_PARENT_PHONE;
  const db = client ?? pool;

  await db.query(
    `
      INSERT INTO parent_profiles (
        user_id,
        phone,
        address,
        relation_type,
        is_primary_contact,
        can_view_grades,
        can_view_attendance,
        emergency_contact_consent,
        contact_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id)
      DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, parent_profiles.phone),
        address = COALESCE(EXCLUDED.address, parent_profiles.address),
        relation_type = COALESCE(EXCLUDED.relation_type, parent_profiles.relation_type),
        is_primary_contact = COALESCE(EXCLUDED.is_primary_contact, parent_profiles.is_primary_contact),
        can_view_grades = COALESCE(EXCLUDED.can_view_grades, parent_profiles.can_view_grades),
        can_view_attendance = COALESCE(EXCLUDED.can_view_attendance, parent_profiles.can_view_attendance),
        emergency_contact_consent = COALESCE(EXCLUDED.emergency_contact_consent, parent_profiles.emergency_contact_consent),
        contact_email = COALESCE(EXCLUDED.contact_email, parent_profiles.contact_email)
    `,
    [
      parentId,
      safePhone,
      address || null,
      relationType || null,
      isPrimaryContact ?? false,
      canViewGrades ?? true,
      canViewAttendance ?? true,
      emergencyContactConsent ?? false,
      contactEmail || null,
    ]
  );
}

async function upsertStudentParentRelation(params: {
  studentId: string;
  parentId: string;
  relationType?: string | null;
  isPrimary?: boolean;
  receiveNotifications?: boolean;
  client?: PoolClient;
}): Promise<void> {
  const { studentId, parentId, relationType, isPrimary, receiveNotifications, client } = params;
  const db = client ?? pool;

  await db.query(
    `
      INSERT INTO student_parents (
        student_id,
        parent_id,
        relation_type,
        is_primary,
        receive_notifications
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, parent_id)
      DO UPDATE SET
        relation_type = COALESCE(EXCLUDED.relation_type, student_parents.relation_type),
        is_primary = COALESCE(EXCLUDED.is_primary, student_parents.is_primary),
        receive_notifications = COALESCE(EXCLUDED.receive_notifications, student_parents.receive_notifications)
    `,
    [
      studentId,
      parentId,
      relationType || null,
      isPrimary ?? false,
      receiveNotifications ?? true,
    ]
  );
}

async function findParentUserByEmail(email: string, establishmentId: string, client?: PoolClient) {
  const db = client ?? pool;
  const userResult = await db.query(
    `
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  const user: User | undefined = userResult.rows[0];
  if (!user) {
    return null;
  }

  if (user.role !== 'parent') {
    const error: any = new Error('EMAIL_ALREADY_IN_USE');
    error.email = email;
    throw error;
  }

  if (user.establishment_id && user.establishment_id !== establishmentId) {
    const error: any = new Error('PARENT_BELONGS_TO_ANOTHER_ESTABLISHMENT');
    error.email = email;
    throw error;
  }

  return user;
}

export async function syncParentsForStudent(params: {
  studentId: string;
  establishmentId: string;
  parents: ParentForStudentInput[];
  client?: PoolClient;
}): Promise<SyncParentsResult[]> {
  const { studentId, establishmentId, parents, client } = params;
  if (!parents || parents.length === 0) {
    return [];
  }

  const results: SyncParentsResult[] = [];
  const seenParentIds = new Set<string>();

  for (const parentPayload of parents) {
    const firstName = parentPayload.firstName?.trim();
    const lastName = parentPayload.lastName?.trim();
    if (!firstName && !lastName) {
      continue;
    }

    let email = normalizeEmail(parentPayload.email);

    let user: User | null = null;
    let isNewUser = false;

    if (email) {
      user = await findParentUserByEmail(email, establishmentId, client);
    }

    if (!user) {
      const normalizedFirstName = firstName || '';
      const normalizedLastName = lastName || '';
      const fullName = buildFullName(normalizedFirstName, normalizedLastName);
      const loginNameLast = normalizedLastName || 'parent';
      const loginNameFirst = normalizedFirstName || 'principal';
      const loginFullName = `${loginNameLast} ${loginNameFirst}`.trim();
      const loginEmail =
        email ||
        (await generateLoginEmailFromName({
          fullName: loginFullName || fullName,
          establishmentId,
          forceDomainSuffix: ".dz",
        }));
      const tempPassword = generateTemporaryPassword();

      user = await createUser(
        {
          email: loginEmail,
          password: tempPassword,
          role: 'parent',
          full_name: fullName,
          establishmentId,
          mustChangePassword: true,
        },
        client
      );

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
      contactEmail: parentPayload.contact_email || null,
      client,
    });

    await upsertStudentParentRelation({
      studentId,
      parentId: user.id,
      relationType,
      isPrimary,
      receiveNotifications,
      client,
    });

    seenParentIds.add(user.id);

    results.push({
      parentUserId: user.id,
      full_name: user.full_name,
      email: email || null,
      isNewUser,
      contactEmailOverride: parentPayload.contact_email || null,
    });
  }

  return results;
}

export async function linkExistingParentToStudent(params: {
  studentId: string;
  parentId: string;
  relationType?: string | null;
  isPrimary?: boolean;
  receiveNotifications?: boolean;
  canViewGrades?: boolean;
  canViewAttendance?: boolean;
  contactEmail?: string | null;
  client?: PoolClient;
}): Promise<void> {
  const {
    studentId,
    parentId,
    relationType = 'guardian',
    isPrimary = true,
    receiveNotifications = true,
    canViewGrades = true,
    canViewAttendance = true,
    contactEmail = null,
    client,
  } = params;

  await upsertParentProfile({
    parentId,
    relationType,
    isPrimaryContact: isPrimary,
    canViewGrades,
    canViewAttendance,
    contactEmail: contactEmail || null,
    client,
  });

  await upsertStudentParentRelation({
    studentId,
    parentId,
    relationType,
    isPrimary,
    receiveNotifications,
    client,
  });
}

export async function recomputeParentActiveStatus(parentId: string): Promise<{ activeChildren: number; deactivated: boolean }> {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM student_parents sp
      JOIN users stu ON stu.id = sp.student_id
      WHERE sp.parent_id = $1
        AND stu.active = TRUE
    `,
    [parentId]
  );

  const activeChildren = Number(result.rows[0]?.count || 0);
  let deactivated = false;

  if (activeChildren === 0) {
    const updateResult = await pool.query(
      `
        UPDATE users
        SET active = FALSE
        WHERE id = $1
          AND role = 'parent'
          AND active = TRUE
        RETURNING id
      `,
      [parentId]
    );

    const affectedRows = updateResult.rowCount ?? 0

    if (affectedRows > 0) {
      deactivated = true;
    }
  }

  console.log(
    `[PARENT_STATUS] parent=${parentId} active_children=${activeChildren} -> ${deactivated ? 'set_active=false' : 'keep_current'}`
  );

  return { activeChildren, deactivated };
}
