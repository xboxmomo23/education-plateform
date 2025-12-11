"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentModel = void 0;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// MODÈLE - ASSIGNMENTS
// ============================================
exports.AssignmentModel = {
    /**
     * Récupérer les devoirs d'un enseignant avec filtres
     * Ne retourne que les devoirs :
     * - créés par ce teacherId
     * - du même establishment_id
     * - reliés à des courses.active = true
     */
    async getByTeacher(teacherId, filters = {}) {
        const params = [teacherId];
        let paramIndex = 2;
        let query = `
      SELECT 
        a.id,
        a.course_id,
        a.title,
        a.description,
        a.due_at,
        a.status,
        a.resource_url,
        a.max_points,
        a.created_by,
        a.created_at,
        a.updated_at,
        a.establishment_id,
        c.class_id,
        cl.label as class_label,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON a.created_by = u.id
      WHERE a.created_by = $1
        AND c.active = true
        AND a.status != 'archived'
    `;
        // Filtre par courseId
        if (filters.courseId) {
            query += ` AND a.course_id = $${paramIndex}`;
            params.push(filters.courseId);
            paramIndex++;
        }
        // Filtre par classId (via courses.class_id OU assignment_targets)
        if (filters.classId) {
            query += ` AND (c.class_id = $${paramIndex} OR EXISTS (
        SELECT 1 FROM assignment_targets at WHERE at.assignment_id = a.id AND at.class_id = $${paramIndex}
      ))`;
            params.push(filters.classId);
            paramIndex++;
        }
        // Filtre par status
        if (filters.status) {
            query += ` AND a.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }
        // Filtre par date de début (due_at >= fromDueAt)
        if (filters.fromDueAt) {
            query += ` AND a.due_at >= $${paramIndex}`;
            params.push(filters.fromDueAt);
            paramIndex++;
        }
        // Filtre par date de fin (due_at <= toDueAt)
        if (filters.toDueAt) {
            query += ` AND a.due_at <= $${paramIndex}`;
            params.push(filters.toDueAt);
            paramIndex++;
        }
        query += ` ORDER BY a.due_at ASC`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
    /**
     * Récupérer un devoir par son ID
     */
    async getById(assignmentId) {
        const query = `
      SELECT 
        a.id,
        a.course_id,
        a.title,
        a.description,
        a.due_at,
        a.status,
        a.resource_url,
        a.max_points,
        a.created_by,
        a.created_at,
        a.updated_at,
        a.establishment_id,
        c.class_id,
        cl.label as class_label,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON a.created_by = u.id
      WHERE a.id = $1
    `;
        const result = await database_1.default.query(query, [assignmentId]);
        return result.rows[0] || null;
    },
    /**
     * Créer un nouveau devoir
     * - Insère dans assignments
     * - Récupère class_id via courses
     * - Insère une entrée dans assignment_targets
     */
    async create(data) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // 1. Récupérer class_id du cours
            const courseQuery = `
        SELECT class_id FROM courses WHERE id = $1
      `;
            const courseResult = await client.query(courseQuery, [data.course_id]);
            if (courseResult.rows.length === 0) {
                throw new Error('Cours non trouvé');
            }
            const classId = courseResult.rows[0].class_id;
            // 2. Insérer le devoir
            const insertQuery = `
        INSERT INTO assignments (
          course_id, title, description, due_at, status,
          resource_url, max_points, created_by, establishment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
            const values = [
                data.course_id,
                data.title,
                data.description || null,
                data.due_at,
                data.status || 'draft',
                data.resource_url || null,
                data.max_points || null,
                data.created_by,
                data.establishment_id,
            ];
            const insertResult = await client.query(insertQuery, values);
            const assignment = insertResult.rows[0];
            // 3. Insérer dans assignment_targets
            const targetQuery = `
        INSERT INTO assignment_targets (assignment_id, class_id)
        VALUES ($1, $2)
      `;
            await client.query(targetQuery, [assignment.id, classId]);
            await client.query('COMMIT');
            // 4. Récupérer le devoir enrichi
            const enrichedAssignment = await exports.AssignmentModel.getById(assignment.id);
            return enrichedAssignment;
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
     * Mettre à jour un devoir
     * - Vérifie que le devoir appartient au teacherId
     * - Met à jour les champs modifiables
     * - Si course_id change, met à jour assignment_targets
     */
    async updateByTeacher(assignmentId, teacherId, data) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // 1. Vérifier que le devoir appartient au prof
            const checkQuery = `
        SELECT a.*, c.class_id as old_class_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.id = $1 AND a.created_by = $2
      `;
            const checkResult = await client.query(checkQuery, [assignmentId, teacherId]);
            if (checkResult.rows.length === 0) {
                throw new Error('Devoir non trouvé ou non autorisé');
            }
            const oldClassId = checkResult.rows[0].old_class_id;
            // 2. Construire la requête de mise à jour dynamique
            const updates = [];
            const params = [];
            let paramIndex = 1;
            if (data.title !== undefined) {
                updates.push(`title = $${paramIndex}`);
                params.push(data.title);
                paramIndex++;
            }
            if (data.description !== undefined) {
                updates.push(`description = $${paramIndex}`);
                params.push(data.description);
                paramIndex++;
            }
            if (data.due_at !== undefined) {
                updates.push(`due_at = $${paramIndex}`);
                params.push(data.due_at);
                paramIndex++;
            }
            if (data.status !== undefined) {
                updates.push(`status = $${paramIndex}`);
                params.push(data.status);
                paramIndex++;
            }
            if (data.resource_url !== undefined) {
                updates.push(`resource_url = $${paramIndex}`);
                params.push(data.resource_url);
                paramIndex++;
            }
            if (data.max_points !== undefined) {
                updates.push(`max_points = $${paramIndex}`);
                params.push(data.max_points);
                paramIndex++;
            }
            if (data.course_id !== undefined) {
                updates.push(`course_id = $${paramIndex}`);
                params.push(data.course_id);
                paramIndex++;
            }
            if (updates.length === 0) {
                throw new Error('Aucune donnée à mettre à jour');
            }
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            params.push(assignmentId);
            const updateQuery = `
        UPDATE assignments
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            await client.query(updateQuery, params);
            // 3. Si course_id a changé, mettre à jour assignment_targets
            if (data.course_id) {
                const newCourseQuery = `SELECT class_id FROM courses WHERE id = $1`;
                const newCourseResult = await client.query(newCourseQuery, [data.course_id]);
                if (newCourseResult.rows.length === 0) {
                    throw new Error('Nouveau cours non trouvé');
                }
                const newClassId = newCourseResult.rows[0].class_id;
                if (newClassId !== oldClassId) {
                    // Supprimer l'ancienne cible et ajouter la nouvelle
                    await client.query(`DELETE FROM assignment_targets WHERE assignment_id = $1`, [assignmentId]);
                    await client.query(`INSERT INTO assignment_targets (assignment_id, class_id) VALUES ($1, $2)`, [assignmentId, newClassId]);
                }
            }
            await client.query('COMMIT');
            // 4. Récupérer le devoir enrichi
            const enrichedAssignment = await exports.AssignmentModel.getById(assignmentId);
            return enrichedAssignment;
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
     * Récupérer les devoirs pour un élève
     * - Récupère la classe de l'élève via students/enrollments
     * - Retourne les devoirs status = 'published'
     * - Pour la classe de l'élève (via assignment_targets ou courses.class_id)
     * - Même establishment_id
     */
    async getForStudent(studentId, filters = {}) {
        // 1. Récupérer la classe de l'élève et son establishment
        const studentQuery = `
      SELECT 
        s.class_id,
        u.establishment_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1
    `;
        const studentResult = await database_1.default.query(studentQuery, [studentId]);
        if (studentResult.rows.length === 0) {
            // Essayer avec enrollments si students est vide
            const enrollmentQuery = `
        SELECT 
          e.class_id,
          u.establishment_id
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.student_id = $1
        ORDER BY e.start_date DESC
        LIMIT 1
      `;
            const enrollmentResult = await database_1.default.query(enrollmentQuery, [studentId]);
            if (enrollmentResult.rows.length === 0) {
                return [];
            }
            var classId = enrollmentResult.rows[0].class_id;
            var establishmentId = enrollmentResult.rows[0].establishment_id;
        }
        else {
            var classId = studentResult.rows[0].class_id;
            var establishmentId = studentResult.rows[0].establishment_id;
        }
        // 2. Construire la requête pour récupérer les devoirs
        const params = [classId, establishmentId];
        let paramIndex = 3;
        let query = `
      SELECT 
        a.id,
        a.course_id,
        a.title,
        a.description,
        a.due_at,
        a.status,
        a.resource_url,
        a.max_points,
        a.created_by,
        a.created_at,
        a.updated_at,
        a.establishment_id,
        c.class_id,
        cl.label as class_label,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON a.created_by = u.id
      WHERE a.status = 'published'
        AND a.establishment_id = $2
        AND c.active = true
        AND (
          c.class_id = $1
          OR EXISTS (
            SELECT 1 FROM assignment_targets at 
            WHERE at.assignment_id = a.id AND at.class_id = $1
          )
        )
    `;
        // Filtre par matière
        if (filters.subjectId) {
            query += ` AND c.subject_id = $${paramIndex}`;
            params.push(filters.subjectId);
            paramIndex++;
        }
        // Filtre par date de début
        if (filters.fromDueAt) {
            query += ` AND a.due_at >= $${paramIndex}`;
            params.push(filters.fromDueAt);
            paramIndex++;
        }
        // Filtre par date de fin
        if (filters.toDueAt) {
            query += ` AND a.due_at <= $${paramIndex}`;
            params.push(filters.toDueAt);
            paramIndex++;
        }
        query += ` ORDER BY a.due_at ASC`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
    /**
     * Vérifier qu'un cours appartient à un enseignant
     */
    async verifyCourseOwnership(courseId, teacherId, establishmentId) {
        const query = `
      SELECT 1 FROM courses
      WHERE id = $1 
        AND teacher_id = $2 
        AND establishment_id = $3
        AND active = true
    `;
        const result = await database_1.default.query(query, [courseId, teacherId, establishmentId]);
        return result.rows.length > 0;
    },
    /**
     * Récupérer l'establishment_id d'un utilisateur
     */
    async getUserEstablishment(userId) {
        const query = `SELECT establishment_id FROM users WHERE id = $1`;
        const result = await database_1.default.query(query, [userId]);
        return result.rows[0]?.establishment_id || null;
    },
};
//# sourceMappingURL=assignment.model.js.map