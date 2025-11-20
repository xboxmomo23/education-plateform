"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimetableModel = void 0;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// MODÈLE
// ============================================
exports.TimetableModel = {
    /**
     * Récupérer les créneaux d'emploi du temps pour un cours
     */
    async getEntriesByCourse(courseId) {
        const query = `
      SELECT 
        t.*,
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
      WHERE t.course_id = $1
        AND (t.valid_to IS NULL OR t.valid_to >= CURRENT_DATE)
      ORDER BY t.day_of_week, t.start_time
    `;
        const result = await database_1.default.query(query, [courseId]);
        return result.rows;
    },
    /**
     * Récupérer les créneaux pour une classe
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
     * Récupérer les créneaux pour un professeur
     */
    async getEntriesByTeacher(teacherId, week) {
        let query = `
      SELECT 
        t.*,
        c.id as course_id,
        c.title as course_title,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.color as subject_color,
        cl.label as class_label,
        cl.id as class_id
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      JOIN subjects sub ON c.subject_id = sub.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE c.teacher_id = $1
        AND t.status != 'cancelled'
        AND (t.valid_to IS NULL OR t.valid_to >= CURRENT_DATE)
    `;
        const params = [teacherId];
        if (week) {
            query += ` AND (t.week IS NULL OR t.week = $2)`;
            params.push(week);
        }
        query += ` ORDER BY t.day_of_week, t.start_time`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
    /**
     * Récupérer les créneaux pour un jour spécifique
     */
    async getEntriesByDayOfWeek(dayOfWeek, week) {
        let query = `
      SELECT 
        t.*,
        c.id as course_id,
        c.title as course_title,
        c.class_id,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.color as subject_color,
        cl.label as class_label,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      JOIN subjects sub ON c.subject_id = sub.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN users u ON c.teacher_id = u.id
      WHERE t.day_of_week = $1
        AND t.status = 'confirmed'
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
     * Créer un nouveau créneau
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
     * Mettre à jour un créneau
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
            throw new Error('Créneau non trouvé');
        }
        return result.rows[0];
    },
    /**
     * Supprimer un créneau
     */
    async deleteEntry(entryId) {
        const query = 'DELETE FROM timetable_entries WHERE id = $1 RETURNING *';
        const result = await database_1.default.query(query, [entryId]);
        if (result.rows.length === 0) {
            throw new Error('Créneau non trouvé');
        }
        return result.rows[0];
    },
    /**
     * Vérifier les conflits de salle
     */
    async checkRoomConflict(dayOfWeek, startTime, endTime, room, excludeEntryId) {
        let query = `
      SELECT 
        t.*,
        c.title as course_title,
        cl.label as class_label
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE t.day_of_week = $1
        AND t.room = $2
        AND t.status != 'cancelled'
        AND (
          (t.start_time < $4 AND t.end_time > $3)
          OR (t.start_time >= $3 AND t.start_time < $4)
        )
    `;
        const params = [dayOfWeek, room, startTime, endTime];
        if (excludeEntryId) {
            query += ` AND t.id != $5`;
            params.push(excludeEntryId);
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
    async checkTeacherConflict(teacherId, dayOfWeek, startTime, endTime, excludeEntryId) {
        let query = `
      SELECT 
        t.*,
        c.title as course_title,
        cl.label as class_label
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE c.teacher_id = $1
        AND t.day_of_week = $2
        AND t.status != 'cancelled'
        AND (
          (t.start_time < $4 AND t.end_time > $3)
          OR (t.start_time >= $3 AND t.start_time < $4)
        )
    `;
        const params = [teacherId, dayOfWeek, startTime, endTime];
        if (excludeEntryId) {
            query += ` AND t.id != $5`;
            params.push(excludeEntryId);
        }
        const result = await database_1.default.query(query, params);
        return {
            hasConflict: result.rows.length > 0,
            conflictType: result.rows.length > 0 ? 'teacher' : undefined,
            conflictDetails: result.rows[0] || null
        };
    },
    /**
     * Dupliquer les créneaux d'une classe vers une autre
     */
    async duplicateToClass(sourceClassId, targetClassId) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Récupérer les cours de la classe source
            const sourceCourses = await client.query('SELECT id, subject_id, teacher_id FROM courses WHERE class_id = $1', [sourceClassId]);
            // Pour chaque cours source, trouver le cours équivalent dans la classe cible
            const courseMapping = new Map();
            for (const sourceCourse of sourceCourses.rows) {
                const targetCourseResult = await client.query(`SELECT id FROM courses 
           WHERE class_id = $1 AND subject_id = $2`, [targetClassId, sourceCourse.subject_id]);
                if (targetCourseResult.rows.length > 0) {
                    courseMapping.set(sourceCourse.id, targetCourseResult.rows[0].id);
                }
            }
            // Récupérer les créneaux de la classe source
            const entriesResult = await client.query(`SELECT t.* FROM timetable_entries t
         JOIN courses c ON t.course_id = c.id
         WHERE c.class_id = $1`, [sourceClassId]);
            const duplicated = [];
            for (const entry of entriesResult.rows) {
                const targetCourseId = courseMapping.get(entry.course_id);
                if (targetCourseId) {
                    const insertResult = await client.query(`INSERT INTO timetable_entries (
              course_id, day_of_week, start_time, end_time,
              week, room, status, valid_from, valid_to, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`, [
                        targetCourseId,
                        entry.day_of_week,
                        entry.start_time,
                        entry.end_time,
                        entry.week,
                        entry.room,
                        entry.status,
                        entry.valid_from,
                        entry.valid_to,
                        entry.notes
                    ]);
                    duplicated.push(insertResult.rows[0]);
                }
            }
            await client.query('COMMIT');
            return duplicated;
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
    }
};
//# sourceMappingURL=timetable.model.js.map