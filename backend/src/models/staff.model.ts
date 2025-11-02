import { pool } from '../config/database';
import { StaffProfile } from '../types';

export async function getStaffProfile(userId: string): Promise<StaffProfile | null> {
  const { rows } = await pool.query(
    `SELECT user_id, phone, department, office_room, employee_no, hire_date, created_at
     FROM staff_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function createStaffProfile(
  userId: string,
  profile: Partial<StaffProfile>
): Promise<StaffProfile> {
  const { phone, department, office_room, employee_no, hire_date } = profile;

  const { rows } = await pool.query(
    `INSERT INTO staff_profiles (user_id, phone, department, office_room, employee_no, hire_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, phone, department, office_room, employee_no, hire_date, created_at`,
    [userId, phone ?? null, department ?? null, office_room ?? null, employee_no ?? null, hire_date ?? null]
  );

  return rows[0];
}
