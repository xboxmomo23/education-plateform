"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvaluation = createEvaluation;
exports.findEvaluations = findEvaluations;
exports.findEvaluationById = findEvaluationById;
exports.findTeacherEvaluations = findTeacherEvaluations;
exports.findCourseEvaluations = findCourseEvaluations;
exports.updateEvaluation = updateEvaluation;
exports.deleteEvaluation = deleteEvaluation;
exports.getEvaluationStats = getEvaluationStats;
exports.canTeacherModifyEvaluation = canTeacherModifyEvaluation;
const database_1 = require("../config/database");
const query_builder_1 = require("../utils/query-builder");
// =========================
// Création
// =========================
/**
 * Crée une nouvelle évaluation
 */
async function createEvaluation(data) {
    const { courseId, termId, title, type, coefficient, maxScale = 20, evalDate, description, createdBy, establishmentId, } = data;
    const query = `
    INSERT INTO evaluations (
      course_id, term_id, title, type, coefficient, 
      max_scale, eval_date, description, created_by
      ${establishmentId ? ', establishment_id' : ''}
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 ${establishmentId ? ', $10' : ''})
    RETURNING *
  `;
    const values = [
        courseId,
        termId || null,
        title,
        type,
        coefficient,
        maxScale,
        evalDate,
        description || null,
        createdBy,
    ];
    if (establishmentId) {
        values.push(establishmentId);
    }
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
// =========================
// Récupération
// =========================
/**
 * Trouve des évaluations avec filtres
 */
async function findEvaluations(filters = {}) {
    const qb = new query_builder_1.QueryBuilder();
    // Joins pour récupérer les détails
    qb.addJoin('INNER', 'courses c', 'c.id = e.course_id');
    qb.addJoin('INNER', 'subjects s', 's.id = c.subject_id');
    qb.addJoin('INNER', 'classes cl', 'cl.id = c.class_id');
    qb.addJoin('INNER', 'teacher_profiles tp', 'tp.user_id = c.teacher_id');
    qb.addJoin('INNER', 'users u', 'u.id = tp.user_id');
    qb.addJoin('LEFT', 'grades g', 'g.evaluation_id = e.id');
    // Filtres
    if (filters.id) {
        qb.addCondition('e.id', filters.id);
    }
    if (filters.courseId) {
        qb.addCondition('e.course_id', filters.courseId);
    }
    if (filters.termId) {
        qb.addCondition('e.term_id', filters.termId);
    }
    if (filters.teacherId) {
        qb.addCondition('c.teacher_id', filters.teacherId);
    }
    if (filters.type) {
        qb.addCondition('e.type', filters.type);
    }
    // Filtre par date
    qb.addDateRangeFilter('e.eval_date', filters.startDate, filters.endDate);
    // Future: Multi-tenant
    qb.addEstablishmentFilter(filters.establishmentId, 'e');
    // Group by pour les agrégations
    qb.addGroupBy('e.id');
    qb.addGroupBy('s.name');
    qb.addGroupBy('cl.label');
    qb.addGroupBy('u.full_name');
    // Ordre par défaut
    qb.addOrderBy('e.eval_date', 'DESC');
    qb.addOrderBy('e.created_at', 'DESC');
    const { fullQuery, values } = qb.buildFull(); // ✅ buildFull() au lieu de build()
    const baseQuery = `
    SELECT 
      e.*,
      s.name as course_subject_name,
      cl.label as course_class_label,
      u.full_name as teacher_name,
      COUNT(g.id) as grades_count,
      AVG(g.value) as average_grade
    FROM evaluations e
  `;
    const query = fullQuery(baseQuery); // ✅ Appelle fullQuery avec baseQuery
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Trouve une évaluation par ID avec détails
 */
async function findEvaluationById(id, establishmentId) {
    const evaluations = await findEvaluations({ id, establishmentId });
    return evaluations[0] || null;
}
/**
 * Trouve les évaluations d'un professeur
 */
async function findTeacherEvaluations(teacherId, filters = {}) {
    return findEvaluations({ ...filters, teacherId });
}
/**
 * Trouve les évaluations d'un cours
 */
async function findCourseEvaluations(courseId, establishmentId) {
    const qb = new query_builder_1.QueryBuilder();
    qb.addCondition('course_id', courseId);
    qb.addEstablishmentFilter(establishmentId);
    qb.addOrderBy('eval_date', 'DESC');
    const { where, values } = qb.build();
    const query = `
    SELECT * FROM evaluations
    ${where}
    ORDER BY eval_date DESC
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
// =========================
// Mise à jour
// =========================
/**
 * Met à jour une évaluation
 */
async function updateEvaluation(id, data, establishmentId) {
    const fields = [];
    const values = [];
    let paramCounter = 1;
    // Construire dynamiquement les champs à mettre à jour
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            fields.push(`${snakeKey} = $${paramCounter++}`);
            values.push(value);
        }
    });
    if (fields.length === 0) {
        return findEvaluationById(id, establishmentId);
    }
    // Ajouter l'ID pour la condition WHERE
    values.push(id);
    const whereId = `$${paramCounter++}`;
    // Future: Multi-tenant
    let establishmentCondition = '';
    if (establishmentId) {
        // values.push(establishmentId);
        // establishmentCondition = ` AND establishment_id = $${paramCounter++}`;
    }
    const query = `
    UPDATE evaluations
    SET ${fields.join(', ')}
    WHERE id = ${whereId}${establishmentCondition}
    RETURNING *
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows[0] || null;
}
// =========================
// Suppression
// =========================
/**
 * Supprime une évaluation (et ses notes en cascade)
 */
async function deleteEvaluation(id, establishmentId) {
    const qb = new query_builder_1.QueryBuilder();
    qb.addCondition('id', id);
    qb.addEstablishmentFilter(establishmentId);
    const { where, values } = qb.build();
    const query = `
    DELETE FROM evaluations
    ${where}
    RETURNING id
  `;
    const result = await database_1.pool.query(query, values);
    return result.rowCount !== null && result.rowCount > 0;
}
// =========================
// Statistiques
// =========================
/**
 * Récupère les statistiques d'une évaluation
 */
async function getEvaluationStats(evaluationId, establishmentId) {
    const query = `
    SELECT 
      COUNT(DISTINCT sp.user_id) as total,
      COUNT(DISTINCT g.student_id) FILTER (WHERE g.value IS NOT NULL) as completed,
      AVG(g.value) as average,
      MIN(g.value) as min,
      MAX(g.value) as max,
      COUNT(DISTINCT g.student_id) FILTER (WHERE g.absent = true) as absent
    FROM evaluations e
    INNER JOIN courses c ON c.id = e.course_id
    INNER JOIN enrollments en ON en.class_id = c.class_id
    INNER JOIN student_profiles sp ON sp.user_id = en.student_id
    LEFT JOIN grades g ON g.evaluation_id = e.id AND g.student_id = sp.user_id
    WHERE e.id = $1
    ${establishmentId ? 'AND e.establishment_id = $2' : ''}
  `;
    const values = [evaluationId];
    if (establishmentId) {
        values.push(establishmentId);
    }
    const result = await database_1.pool.query(query, values);
    return result.rows[0] || null;
}
/**
 * Vérifie si un professeur peut modifier une évaluation
 */
async function canTeacherModifyEvaluation(evaluationId, teacherId, establishmentId) {
    const query = `
    SELECT COUNT(*) as count
    FROM evaluations e
    INNER JOIN courses c ON c.id = e.course_id
    WHERE e.id = $1 
    AND c.teacher_id = $2
    ${establishmentId ? 'AND e.establishment_id = $3' : ''}
  `;
    const values = [evaluationId, teacherId];
    if (establishmentId) {
        values.push(establishmentId);
    }
    const result = await database_1.pool.query(query, values);
    return parseInt(result.rows[0].count) > 0;
}
//# sourceMappingURL=evaluation.model.js.map