"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimetableInstanceModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.TimetableInstanceModel = {
    /**
     * Créer une instance
     */
    async create(data) {
        const query = `
      INSERT INTO timetable_instances (
        class_id,
        course_id,
        week_start_date,
        day_of_week,
        start_time,
        end_time,
        room,
        notes,
        created_from_template,
        template_entry_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const values = [
            data.class_id,
            data.course_id,
            data.week_start_date,
            data.day_of_week,
            data.start_time,
            data.end_time,
            data.room || null,
            data.notes || null,
            data.created_from_template || false,
            data.template_entry_id || null,
            data.created_by,
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Récupérer les instances d'une semaine pour une classe
     */
    async getInstancesForWeek(classId, weekStartDate) {
        const query = `
      SELECT 
        ti.*,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id,
        cl.label as class_label
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      JOIN classes cl ON ti.class_id = cl.id
      WHERE ti.class_id = $1
        AND ti.week_start_date = $2
      ORDER BY ti.day_of_week, ti.start_time
    `;
        const result = await database_1.default.query(query, [classId, weekStartDate]);
        return result.rows;
    },
    /**
     * Récupérer une instance par ID
     */
    async getById(instanceId) {
        const query = `
      SELECT 
        ti.*,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        c.teacher_id
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE ti.id = $1
    `;
        const result = await database_1.default.query(query, [instanceId]);
        return result.rows[0] || null;
    },
    /**
     * Mettre à jour une instance
     */
    async update(instanceId, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.day_of_week !== undefined) {
            fields.push(`day_of_week = $${paramIndex++}`);
            values.push(data.day_of_week);
        }
        if (data.start_time !== undefined) {
            fields.push(`start_time = $${paramIndex++}`);
            values.push(data.start_time);
        }
        if (data.end_time !== undefined) {
            fields.push(`end_time = $${paramIndex++}`);
            values.push(data.end_time);
        }
        if (data.room !== undefined) {
            fields.push(`room = $${paramIndex++}`);
            values.push(data.room);
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${paramIndex++}`);
            values.push(data.notes);
        }
        fields.push(`updated_at = NOW()`);
        values.push(instanceId);
        const query = `
      UPDATE timetable_instances 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Supprimer une instance
     */
    async delete(instanceId) {
        await database_1.default.query('DELETE FROM timetable_instances WHERE id = $1', [instanceId]);
    },
    /**
     * Générer les instances depuis le template
     */
    async generateFromTemplate(classId, weekStartDate, createdBy) {
        const result = await database_1.default.query('SELECT generate_instances_from_template($1, $2, $3) as count', [classId, weekStartDate, createdBy]);
        return result.rows[0].count;
    },
    /**
     * Copier une semaine vers une autre
     */
    async copyWeek(classId, sourceWeek, targetWeek, createdBy) {
        const query = `
      INSERT INTO timetable_instances (
        class_id,
        course_id,
        week_start_date,
        day_of_week,
        start_time,
        end_time,
        room,
        notes,
        created_from_template,
        template_entry_id,
        created_by
      )
      SELECT 
        class_id,
        course_id,
        $3 as week_start_date,
        day_of_week,
        start_time,
        end_time,
        room,
        notes,
        created_from_template,
        template_entry_id,
        $4 as created_by
      FROM timetable_instances
      WHERE class_id = $1
        AND week_start_date = $2
      RETURNING id
    `;
        const result = await database_1.default.query(query, [classId, sourceWeek, targetWeek, createdBy]);
        return result.rows.length;
    },
    /**
     * Vérifier les conflits
     */
    async checkConflict(classId, weekStartDate, dayOfWeek, startTime, endTime, room, excludeId) {
        const query = `
      SELECT ti.*, s.name as subject_name, u.full_name as teacher_name
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE ti.class_id = $1
        AND ti.week_start_date = $2
        AND ti.day_of_week = $3
        AND ti.room = $4
        AND (
          (ti.start_time < $6 AND ti.end_time > $5) OR
          (ti.start_time >= $5 AND ti.start_time < $6)
        )
        ${excludeId ? 'AND ti.id != $7' : ''}
    `;
        const params = [classId, weekStartDate, dayOfWeek, room, startTime, endTime];
        if (excludeId)
            params.push(excludeId);
        const result = await database_1.default.query(query, params);
        if (result.rows.length > 0) {
            return {
                hasConflict: true,
                conflictDetails: result.rows[0],
            };
        }
        return { hasConflict: false };
    },
};
//# sourceMappingURL=timetable-instance.model.js.map