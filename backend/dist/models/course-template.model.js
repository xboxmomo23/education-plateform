"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseTemplateModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.CourseTemplateModel = {
    /**
     * Récupérer les templates d'une classe (via les cours)
     */
    async getTemplatesByClass(classId) {
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
        const result = await database_1.default.query(query, [classId]);
        return result.rows;
    },
    /**
     * Créer un nouveau template
     */
    async create(data) {
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
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Récupérer un template par ID
     */
    async getById(templateId) {
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
        const result = await database_1.default.query(query, [templateId]);
        return result.rows[0] || null;
    },
    /**
     * Mettre à jour un template
     */
    async update(templateId, data) {
        const fields = [];
        const values = [];
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
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    },
    /**
     * Supprimer un template
     */
    async delete(templateId) {
        await database_1.default.query('DELETE FROM course_templates WHERE id = $1', [templateId]);
    },
    /**
     * Vérifier si un template existe pour un cours
     */
    async existsForCourse(courseId) {
        const result = await database_1.default.query('SELECT 1 FROM course_templates WHERE course_id = $1 LIMIT 1', [courseId]);
        return result.rows.length > 0;
    },
};
//# sourceMappingURL=course-template.model.js.map