import pool from '../config/database';

function parseDate(dateStr: string): Date {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide: ${dateStr}`);
  }
  return date;
}

export interface TimetableInstance {
  id: string;
  class_id: string;
  course_id: string;
  week_start_date: string; // Format: YYYY-MM-DD
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  notes: string | null;
  status: string;
  created_from_template: boolean;
  template_entry_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface TimetableInstanceWithDetails extends TimetableInstance {
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name: string;
  teacher_id: string;
  class_label: string;
}

export interface CreateInstanceData {
  class_id: string;
  course_id: string;
  week_start_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  notes?: string;
  created_from_template?: boolean;
  template_entry_id?: string;
  created_by: string;
}

export const TimetableInstanceModel = {
  /**
   * Créer une instance
   */
  async create(data: CreateInstanceData): Promise<TimetableInstance> {
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

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Récupérer les instances d'une semaine pour une classe
   */
  async getInstancesForWeek(classId: string, weekStartDate: string): Promise<TimetableInstanceWithDetails[]> {
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

    const result = await pool.query(query, [classId, weekStartDate]);
    return result.rows;
  },

  /**
   * Récupérer une instance par ID
   */
  async getById(instanceId: string): Promise<TimetableInstanceWithDetails | null> {
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

    const result = await pool.query(query, [instanceId]);
    return result.rows[0] || null;
  },

  /**
   * Mettre à jour une instance
   */
  async update(instanceId: string, data: Partial<CreateInstanceData>): Promise<TimetableInstance> {
    const fields: string[] = [];
    const values: any[] = [];
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

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Supprimer une instance
   */
  async delete(instanceId: string): Promise<void> {
    await pool.query('DELETE FROM timetable_instances WHERE id = $1', [instanceId]);
  },

  /**
   * Générer les instances depuis le template
   */
  async generateFromTemplate(
    classId: string,
    sourceWeekStart: string,
    targetWeekStart: string,
    createdBy: string
  ): Promise<number> {
    const client = await pool.connect();
    const sourceDate = parseDate(sourceWeekStart);
    const targetDate = parseDate(targetWeekStart);

    // Empêcher la copie si les semaines ne commencent pas un dimanche
    if (sourceDate.getUTCDay() !== 0 || targetDate.getUTCDay() !== 0) {
      throw new Error('Les dates de semaine doivent être des dimanches (week start)');
    }

    try {
      await client.query('BEGIN');

      const sourceInstances = await client.query(
        `
          SELECT 
            class_id,
            course_id,
            day_of_week,
            start_time,
            end_time,
            room,
            notes,
            created_from_template,
            template_entry_id
          FROM timetable_instances
          WHERE class_id = $1
            AND week_start_date = $2
        `,
        [classId, sourceWeekStart]
      );

      if (sourceInstances.rowCount === 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      await client.query(
        `
          DELETE FROM timetable_instances
          WHERE class_id = $1
            AND week_start_date = $2
        `,
        [classId, targetWeekStart]
      );

      for (const instance of sourceInstances.rows) {
        await client.query(
          `
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
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            classId,
            instance.course_id,
            targetWeekStart,
            instance.day_of_week,
            instance.start_time,
            instance.end_time,
            instance.room,
            instance.notes,
            true,
            instance.template_entry_id,
            createdBy,
          ]
        );
      }

      await client.query('COMMIT');
      return sourceInstances.rowCount ?? 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Copier une semaine vers une autre
   */
  async copyWeek(classId: string, sourceWeek: string, targetWeek: string, createdBy: string): Promise<number> {
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

    const result = await pool.query(query, [classId, sourceWeek, targetWeek, createdBy]);
    return result.rows.length;
  },

  /**
   * Vérifier les conflits
   */
  async checkConflict(
    classId: string,
    weekStartDate: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    room: string,
    excludeId?: string
  ): Promise<{ hasConflict: boolean; conflictDetails?: any }> {
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
    if (excludeId) params.push(excludeId);

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      return {
        hasConflict: true,
        conflictDetails: result.rows[0],
      };
    }

    return { hasConflict: false };
  },
};
