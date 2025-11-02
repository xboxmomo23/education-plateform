"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaffProfile = getStaffProfile;
exports.createStaffProfile = createStaffProfile;
const database_1 = require("../config/database");
async function getStaffProfile(userId) {
    const { rows } = await database_1.pool.query(`SELECT user_id, phone, department, office_room, employee_no, hire_date, created_at
     FROM staff_profiles WHERE user_id = $1`, [userId]);
    return rows[0] ?? null;
}
async function createStaffProfile(userId, profile) {
    const { phone, department, office_room, employee_no, hire_date } = profile;
    const { rows } = await database_1.pool.query(`INSERT INTO staff_profiles (user_id, phone, department, office_room, employee_no, hire_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, phone, department, office_room, employee_no, hire_date, created_at`, [userId, phone ?? null, department ?? null, office_room ?? null, employee_no ?? null, hire_date ?? null]);
    return rows[0];
}
//# sourceMappingURL=staff.model.js.map