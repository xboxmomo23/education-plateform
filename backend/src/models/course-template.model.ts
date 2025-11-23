import pool from '../config/database';

export interface CourseTemplate {
  id: string;
  course_id: string;
  default_duration: number;
  default_room: string | null;
  display_order: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CourseTemplateWithDetails extends CourseTemplate {
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name: string;
  class_label: string;
  class_id: string;
}

export interface CreateTemplateData {
  course_id: string;
  default_duration?: number;
  default_room?: string;
  display_order?: number;
  created_by: string;
}

export interface UpdateTemplateData {
  default_duration?: number;
  default_room?: string;
  display_order?: number;
}

export const CourseTemplateModel = {
  /**
   * Récupérer les templates d'une classe (via les cours)
   */
  async getTemplatesByClass(classId: string): Promise<CourseTemplateWithDetails[]> {
    const query = `
      SELECT 
        ct.*,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        cl.label as class_label,
        c.class_id
      FROM course_templates ct
      JOIN courses c ON ct.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE c.class_id = $1
        AND c.active = true
      ORDER BY ct.display_order, s.name
    `;
    
    const result = await pool.query(query, [classId]);
    return result.rows;
  },

  /**
   * Créer un nouveau template
   */
  async create(data: CreateTemplateData): Promise<CourseTemplate> {
    const query = `
      INSERT INTO course_templates (
        course_id, 
        default_duration, 
        default_room, 
        display_order,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      data.course_id,
      data.default_duration || 90,
      data.default_room || null,
      data.display_order || 0,
      data.created_by,
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Récupérer un template par ID
   */
  async getById(templateId: string): Promise<CourseTemplateWithDetails | null> {
    const query = `
      SELECT 
        ct.*,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        cl.label as class_label,
        c.class_id,
        c.teacher_id
      FROM course_templates ct
      JOIN courses c ON ct.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE ct.id = $1
    `;
    
    const result = await pool.query(query, [templateId]);
    return result.rows[0] || null;
  },

  /**
   * Mettre à jour un template
   */
  async update(templateId: string, data: UpdateTemplateData): Promise<CourseTemplate> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.default_duration !== undefined) {
      fields.push(`default_duration = $${paramIndex++}`);
      values.push(data.default_duration);
    }
    if (data.default_room !== undefined) {
      fields.push(`default_room = $${paramIndex++}`);
      values.push(data.default_room);
    }
    if (data.display_order !== undefined) {
      fields.push(`display_order = $${paramIndex++}`);
      values.push(data.display_order);
    }

    fields.push(`updated_at = NOW()`);
    values.push(templateId);

    const query = `
      UPDATE course_templates 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Supprimer un template
   */
  async delete(templateId: string): Promise<void> {
    await pool.query('DELETE FROM course_templates WHERE id = $1', [templateId]);
  },

  /**
   * Vérifier si un template existe pour un cours
   */
  async existsForCourse(courseId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM course_templates WHERE course_id = $1 LIMIT 1',
      [courseId]
    );
    return result.rows.length > 0;
  },
};