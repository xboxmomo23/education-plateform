"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimetableOverrideModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.TimetableOverrideModel = {
    /**
     * Créer une exception
     */
    async create(data) {
        const query = `
      INSERT INTO timetable_overrides (
        template_entry_id,
        override_date,
        override_type,
        new_start_time,
        new_end_time,
        new_room,
        new_course_id,
        replacement_teacher_id,
        replacement_subject,
        reason,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            data.template_entry_id,
            data.override_date,
            data.override_type,
            data.new_start_time || null,
            data.new_end_time || null,
            data.new_room || null,
            data.new_course_id || null,
            data.replacement_teacher_id || null,
            data.replacement_subject || null,
            data.reason || null,
            data.notes || null,
            data.created_by,
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Récupérer les overrides d'une semaine pour une classe
     */
    async getOverridesForWeek(classId, weekStartDate) {
        const query = `
      SELECT 
        o.*,
        s.name as template_subject_name,
        u.full_name as template_teacher_name,
        te.start_time as template_start_time,
        te.end_time as template_end_time,
        u2.full_name as replacement_teacher_name,
        s2.name as replacement_subject_name
      FROM timetable_overrides o
      JOIN timetable_entries te ON o.template_entry_id = te.id
      JOIN courses c ON te.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN users u2 ON o.replacement_teacher_id = u2.id
      LEFT JOIN courses c2 ON o.new_course_id = c2.id
      LEFT JOIN subjects s2 ON c2.subject_id = s2.id
      WHERE c.class_id = $1
        AND o.override_date >= $2
        AND o.override_date < ($2::DATE + INTERVAL '7 days')
      ORDER BY o.override_date, te.start_time
    `;
        const result = await database_1.default.query(query, [classId, weekStartDate]);
        return result.rows;
    },
    /**
     * Récupérer un override par ID
     */
    async getById(overrideId) {
        const query = `
      SELECT 
        o.*,
        s.name as template_subject_name,
        u.full_name as template_teacher_name,
        te.start_time as template_start_time,
        te.end_time as template_end_time
      FROM timetable_overrides o
      JOIN timetable_entries te ON o.template_entry_id = te.id
      JOIN courses c ON te.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE o.id = $1
    `;
        const result = await database_1.default.query(query, [overrideId]);
        return result.rows[0] || null;
    },
    /**
     * Mettre à jour un override
     */
    async update(overrideId, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.new_start_time !== undefined) {
            fields.push(`new_start_time = $${paramIndex++}`);
            values.push(data.new_start_time);
        }
        if (data.new_end_time !== undefined) {
            fields.push(`new_end_time = $${paramIndex++}`);
            values.push(data.new_end_time);
        }
        if (data.new_room !== undefined) {
            fields.push(`new_room = $${paramIndex++}`);
            values.push(data.new_room);
        }
        if (data.reason !== undefined) {
            fields.push(`reason = $${paramIndex++}`);
            values.push(data.reason);
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${paramIndex++}`);
            values.push(data.notes);
        }
        fields.push(`updated_at = NOW()`);
        values.push(overrideId);
        const query = `
      UPDATE timetable_overrides 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Supprimer un override
     */
    async delete(overrideId) {
        await database_1.default.query('DELETE FROM timetable_overrides WHERE id = $1', [overrideId]);
    },
    /**
     * Vérifier si un override existe pour un créneau et une date
     */
    async existsForEntryAndDate(templateEntryId, overrideDate) {
        const result = await database_1.default.query('SELECT 1 FROM timetable_overrides WHERE template_entry_id = $1 AND override_date = $2', [templateEntryId, overrideDate]);
        return result.rows.length > 0;
    },
};
//# sourceMappingURL=timetable-override.model.js.map