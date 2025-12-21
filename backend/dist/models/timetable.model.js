"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimetableModel = exports.TimetableInstanceModel = void 0;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// MODÈLE - INSTANCES (MODE DYNAMIC)
// ============================================
exports.TimetableInstanceModel = {
    /**
     * Récupérer les instances pour une classe et une semaine
     */
    async getInstancesForWeek(classId, weekStartDate) {
        const query = `
      SELECT 
        ti.*,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE ti.class_id = $1
        AND ti.week_start_date = $2
      ORDER BY ti.day_of_week, ti.start_time
    `;
        const result = await database_1.default.query(query, [classId, weekStartDate]);
        return result.rows;
    },
    /**
     * Récupérer les instances pour un professeur et une semaine
     */
    async getInstancesForTeacher(teacherId, weekStartDate) {
        const query = `
      SELECT 
        ti.*,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        cl.label as class_label,
        cl.id as class_id
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE c.teacher_id = $1
        AND ti.week_start_date = $2
      ORDER BY ti.day_of_week, ti.start_time
    `;
        const result = await database_1.default.query(query, [teacherId, weekStartDate]);
        return result.rows;
    },
    /**
     * Créer une instance
     */
    async createInstance(data) {
        const query = `
      INSERT INTO timetable_instances (
        course_id, class_id, week_start_date, day_of_week,
        start_time, end_time, room, notes,
        created_from_template, template_entry_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const values = [
            data.course_id,
            data.class_id,
            data.week_start_date,
            data.day_of_week,
            data.start_time,
            data.end_time,
            data.room || null,
            data.notes || null,
            data.created_from_template || false,
            data.template_entry_id || null,
            data.created_by
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Créer plusieurs instances en masse
     */
    async bulkCreateInstances(instances) {
        const client = await database_1.default.connect();
        const created = [];
        try {
            await client.query('BEGIN');
            for (const instanceData of instances) {
                const query = `
          INSERT INTO timetable_instances (
            course_id, class_id, week_start_date, day_of_week,
            start_time, end_time, room, notes,
            created_from_template, template_entry_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
                const values = [
                    instanceData.course_id,
                    instanceData.class_id,
                    instanceData.week_start_date,
                    instanceData.day_of_week,
                    instanceData.start_time,
                    instanceData.end_time,
                    instanceData.room || null,
                    instanceData.notes || null,
                    instanceData.created_from_template || false,
                    instanceData.template_entry_id || null,
                    instanceData.created_by
                ];
                const result = await client.query(query, values);
                created.push(result.rows[0]);
            }
            await client.query('COMMIT');
            return created;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    },
    /**
     * Mettre à jour une instance
     */
    async updateInstance(instanceId, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.day_of_week !== undefined) {
            updates.push(`day_of_week = $${paramIndex}`);
            params.push(data.day_of_week);
            paramIndex++;
        }
        if (data.start_time !== undefined) {
            updates.push(`start_time = $${paramIndex}`);
            params.push(data.start_time);
            paramIndex++;
        }
        if (data.end_time !== undefined) {
            updates.push(`end_time = $${paramIndex}`);
            params.push(data.end_time);
            paramIndex++;
        }
        if (data.room !== undefined) {
            updates.push(`room = $${paramIndex}`);
            params.push(data.room);
            paramIndex++;
        }
        if (data.notes !== undefined) {
            updates.push(`notes = $${paramIndex}`);
            params.push(data.notes);
            paramIndex++;
        }
        if (updates.length === 0) {
            throw new Error('Aucune donnée à mettre à jour');
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(instanceId);
        const query = `
      UPDATE timetable_instances
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await database_1.default.query(query, params);
        if (result.rows.length === 0) {
            throw new Error('Instance non trouvée');
        }
        return result.rows[0];
    },
    /**
     * Supprimer une instance
     */
    async deleteInstance(instanceId) {
        const query = 'DELETE FROM timetable_instances WHERE id = $1 RETURNING *';
        const result = await database_1.default.query(query, [instanceId]);
        if (result.rows.length === 0) {
            throw new Error('Instance non trouvée');
        }
        return result.rows[0];
    },
    /**
     * Copier les instances d'une semaine vers une autre
     */
    async copyWeekToWeek(classId, sourceWeekStart, targetWeekStart, userId) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Récupérer les instances de la semaine source
            const sourceQuery = `
        SELECT * FROM timetable_instances
        WHERE class_id = $1 AND week_start_date = $2
      `;
            const sourceResult = await client.query(sourceQuery, [classId, sourceWeekStart]);
            const copied = [];
            for (const instance of sourceResult.rows) {
                const insertQuery = `
          INSERT INTO timetable_instances (
            course_id, class_id, week_start_date, day_of_week,
            start_time, end_time, room, notes,
            created_from_template, template_entry_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
                const values = [
                    instance.course_id,
                    classId,
                    targetWeekStart,
                    instance.day_of_week,
                    instance.start_time,
                    instance.end_time,
                    instance.room,
                    instance.notes,
                    instance.created_from_template,
                    instance.template_entry_id,
                    userId
                ];
                const result = await client.query(insertQuery, values);
                copied.push(result.rows[0]);
            }
            await client.query('COMMIT');
            return copied;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
};
// ============================================
// MODÈLE - TEMPLATES (Pour génération rapide)
// ============================================
exports.TimetableModel = {
    /**
     * Récupérer les templates pour une classe
     */
    async getEntriesByClass(classId, week) {
        let query = `
      SELECT 
        t.*,
        c.id as course_id,
        c.title as course_title,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      JOIN subjects sub ON c.subject_id = sub.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN users u ON c.teacher_id = u.id
      WHERE cl.id = $1
        AND t.status != 'cancelled'
        AND (t.valid_to IS NULL OR t.valid_to >= CURRENT_DATE)
    `;
        const params = [classId];
        if (week) {
            query += ` AND (t.week IS NULL OR t.week = $2)`;
            params.push(week);
        }
        query += ` ORDER BY t.day_of_week, t.start_time`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
    /**
     * Récupérer les templates d'une journée (toutes classes) pour génération auto
     */
    async getEntriesByDayOfWeek(dayOfWeek, week) {
        let query = `
      SELECT 
        t.*,
        c.id as course_id,
        c.title as course_title,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.color as subject_color,
        cl.label as class_label,
        cl.id as class_id,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      JOIN subjects sub ON c.subject_id = sub.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN users u ON c.teacher_id = u.id
      WHERE t.day_of_week = $1
        AND t.status != 'cancelled'
        AND (t.valid_to IS NULL OR t.valid_to >= CURRENT_DATE)
    `;
        const params = [dayOfWeek];
        if (week) {
            query += ` AND (t.week IS NULL OR t.week = $2)`;
            params.push(week);
        }
        query += ` ORDER BY t.start_time`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
    /**
     * Créer un template
     */
    async createEntry(data) {
        const query = `
      INSERT INTO timetable_entries (
        course_id, day_of_week, start_time, end_time,
        week, room, status, valid_from, valid_to, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
        const values = [
            data.course_id,
            data.day_of_week,
            data.start_time,
            data.end_time,
            data.week || null,
            data.room || null,
            data.status || 'confirmed',
            data.valid_from || new Date().toISOString().split('T')[0],
            data.valid_to || null,
            data.notes || null
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Créer plusieurs templates en masse
     */
    async bulkCreateEntries(entries) {
        const created = [];
        for (const entryData of entries) {
            const entry = await exports.TimetableModel.createEntry(entryData);
            created.push(entry);
        }
        return created;
    },
    /**
     * Mettre à jour un template
     */
    async updateEntry(entryId, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.day_of_week !== undefined) {
            updates.push(`day_of_week = $${paramIndex}`);
            params.push(data.day_of_week);
            paramIndex++;
        }
        if (data.start_time !== undefined) {
            updates.push(`start_time = $${paramIndex}`);
            params.push(data.start_time);
            paramIndex++;
        }
        if (data.end_time !== undefined) {
            updates.push(`end_time = $${paramIndex}`);
            params.push(data.end_time);
            paramIndex++;
        }
        if (data.week !== undefined) {
            updates.push(`week = $${paramIndex}`);
            params.push(data.week);
            paramIndex++;
        }
        if (data.room !== undefined) {
            updates.push(`room = $${paramIndex}`);
            params.push(data.room);
            paramIndex++;
        }
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex}`);
            params.push(data.status);
            paramIndex++;
        }
        if (data.notes !== undefined) {
            updates.push(`notes = $${paramIndex}`);
            params.push(data.notes);
            paramIndex++;
        }
        if (updates.length === 0) {
            throw new Error('Aucune donnée à mettre à jour');
        }
        params.push(entryId);
        const query = `
      UPDATE timetable_entries
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await database_1.default.query(query, params);
        if (result.rows.length === 0) {
            throw new Error('Template non trouvé');
        }
        return result.rows[0];
    },
    /**
     * Supprimer un template
     */
    async deleteEntry(entryId) {
        const query = 'DELETE FROM timetable_entries WHERE id = $1 RETURNING *';
        const result = await database_1.default.query(query, [entryId]);
        if (result.rows.length === 0) {
            throw new Error('Template non trouvé');
        }
        return result.rows[0];
    },
    /**
     * Récupérer tous les cours disponibles pour une classe
     */
    async getAvailableCoursesForClass(classId) {
        const query = `
      SELECT 
        c.id as course_id,
        c.title,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM courses c
      JOIN subjects sub ON c.subject_id = sub.id
      JOIN users u ON c.teacher_id = u.id
      WHERE c.class_id = $1
        AND c.active = true
      ORDER BY sub.name
    `;
        const result = await database_1.default.query(query, [classId]);
        return result.rows;
    },
    /**
     * Vérifier les conflits de salle
     */
    async checkRoomConflict(classId, weekStartDate, dayOfWeek, startTime, endTime, room, excludeInstanceId) {
        let query = `
      SELECT 
        ti.*,
        s.name as subject_name,
        cl.label as class_label
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN classes cl ON ti.class_id = cl.id
      WHERE ti.week_start_date = $1
        AND ti.day_of_week = $2
        AND ti.room = $3
        AND (
          (ti.start_time < $5 AND ti.end_time > $4)
          OR (ti.start_time >= $4 AND ti.start_time < $5)
        )
    `;
        const params = [weekStartDate, dayOfWeek, room, startTime, endTime];
        if (excludeInstanceId) {
            query += ` AND ti.id != $6`;
            params.push(excludeInstanceId);
        }
        const result = await database_1.default.query(query, params);
        return {
            hasConflict: result.rows.length > 0,
            conflictType: result.rows.length > 0 ? 'room' : undefined,
            conflictDetails: result.rows[0] || null
        };
    },
    /**
     * Vérifier les conflits de professeur
     */
    async checkTeacherConflict(teacherId, weekStartDate, dayOfWeek, startTime, endTime, excludeInstanceId) {
        let query = `
      SELECT 
        ti.*,
        s.name as subject_name,
        cl.label as class_label
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN classes cl ON ti.class_id = cl.id
      WHERE c.teacher_id = $1
        AND ti.week_start_date = $2
        AND ti.day_of_week = $3
        AND (
          (ti.start_time < $5 AND ti.end_time > $4)
          OR (ti.start_time >= $4 AND ti.start_time < $5)
        )
    `;
        const params = [teacherId, weekStartDate, dayOfWeek, startTime, endTime];
        if (excludeInstanceId) {
            query += ` AND ti.id != $6`;
            params.push(excludeInstanceId);
        }
        const result = await database_1.default.query(query, params);
        return {
            hasConflict: result.rows.length > 0,
            conflictType: result.rows.length > 0 ? 'teacher' : undefined,
            conflictDetails: result.rows[0] || null
        };
    }
};
//# sourceMappingURL=timetable.model.js.map