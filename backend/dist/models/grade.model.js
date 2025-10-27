"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGrade = createGrade;
exports.createGrades = createGrades;
exports.findGrades = findGrades;
exports.findGradeById = findGradeById;
exports.findStudentGrades = findStudentGrades;
exports.findEvaluationGrades = findEvaluationGrades;
exports.findGradeByIdWithDetails = findGradeByIdWithDetails;
exports.updateGrade = updateGrade;
exports.deleteGrade = deleteGrade;
exports.getGradeHistory = getGradeHistory;
exports.getStudentAverages = getStudentAverages;
exports.getStudentOverallAverage = getStudentOverallAverage;
exports.getClassAverages = getClassAverages;
exports.getChildrenGrades = getChildrenGrades;
const database_1 = require("../config/database");
const query_builder_1 = require("../utils/query-builder");
// =========================
// Création
// =========================
/**
 * Crée une seule note
 */
async function createGrade(data) {
    const { evaluationId, studentId, value, absent = false, comment, createdBy } = data;
    // ✅ Utiliser ON CONFLICT au lieu de vérifier manuellement
    const query = `
    INSERT INTO grades (
      evaluation_id, student_id, value, absent, comment, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (student_id, evaluation_id)
    DO UPDATE SET
      value = EXCLUDED.value,
      absent = EXCLUDED.absent,
      comment = EXCLUDED.comment,
      updated_at = NOW()
    RETURNING *
  `;
    const values = [
        evaluationId,
        studentId,
        absent ? null : value,
        absent,
        comment || null,
        createdBy,
    ];
    const result = await database_1.pool.query(query, values);
    return result.rows[0];
}
/**
 * Crée plusieurs notes en batch
 */
async function createGrades(grades) {
    if (grades.length === 0)
        return [];
    const client = await (0, database_1.getClient)();
    try {
        await client.beginTransaction();
        const createdGrades = [];
        for (const gradeData of grades) {
            const { evaluationId, studentId, value, absent = false, comment, createdBy } = gradeData;
            // ✅ UTILISER ON CONFLICT pour gérer les doublons automatiquement
            const upsertQuery = `
        INSERT INTO grades (
          evaluation_id, student_id, value, absent, comment, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_id, evaluation_id)
        DO UPDATE SET
          value = EXCLUDED.value,
          absent = EXCLUDED.absent,
          comment = EXCLUDED.comment,
          updated_at = NOW()
        RETURNING *
      `;
            const result = await client.query(upsertQuery, [
                evaluationId,
                studentId,
                absent ? null : value,
                absent,
                comment || null,
                createdBy,
            ]);
            createdGrades.push(result.rows[0]);
            // Créer l'entrée d'historique si c'était une mise à jour
            if (result.rows[0].updated_at !== null) {
                await createGradeHistory(client, result.rows[0].id, createdBy, 'teacher', {
                    value: { from: null, to: value },
                    absent: { from: null, to: absent },
                    comment: { from: null, to: comment }
                });
            }
        }
        await client.commit();
        return createdGrades;
    }
    catch (error) {
        await client.rollback();
        throw error;
    }
    finally {
        client.release();
    }
}
// =========================
// Récupération
// =========================
/**
 * Trouve des notes avec filtres
 */
async function findGrades(filters = {}) {
    const qb = new query_builder_1.QueryBuilder();
    // Joins pour récupérer les détails
    qb.addJoin('INNER', 'evaluations e', 'e.id = g.evaluation_id');
    qb.addJoin('INNER', 'courses c', 'c.id = e.course_id');
    qb.addJoin('INNER', 'subjects s', 's.id = c.subject_id');
    qb.addJoin('INNER', 'classes cl', 'cl.id = c.class_id');
    qb.addJoin('INNER', 'student_profiles sp', 'sp.user_id = g.student_id');
    qb.addJoin('INNER', 'users u', 'u.id = g.student_id');
    // Filtres
    if (filters.id) {
        qb.addCondition('g.id', filters.id);
    }
    if (filters.evaluationId) {
        qb.addCondition('g.evaluation_id', filters.evaluationId);
    }
    if (filters.studentId) {
        qb.addCondition('g.student_id', filters.studentId);
    }
    if (filters.courseId) {
        qb.addCondition('e.course_id', filters.courseId);
    }
    if (filters.termId) {
        qb.addCondition('e.term_id', filters.termId);
    }
    if (filters.classId) {
        qb.addCondition('c.class_id', filters.classId);
    }
    if (!filters.includeAbsent) {
        qb.addCondition('g.absent', false);
    }
    // Future: Multi-tenant
    qb.addEstablishmentFilter(filters.establishmentId, 'e');
    // Ordre par défaut
    qb.addOrderBy('e.eval_date', 'DESC');
    qb.addOrderBy('u.full_name', 'ASC');
    // ✅ Construction de la requête avec buildFull()
    const { fullQuery, values } = qb.buildFull();
    const baseQuery = `
    SELECT 
      g.*,
      u.full_name as student_name,
      e.title as evaluation_title,
      e.type as evaluation_type,
      e.coefficient as evaluation_coefficient,
      e.eval_date as evaluation_date,
      s.name as course_subject_name,
      cl.label as course_class_label
    FROM grades g
  `;
    const query = fullQuery(baseQuery);
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Trouve une note par ID
 */
async function findGradeById(id) {
    const grades = await findGrades({ id });
    return grades[0] || null;
}
/**
 * ✅ FONCTION CORRIGÉE - Trouve les notes d'un étudiant avec TOUTES les infos nécessaires
 * Cette fonction retourne les données complètes attendues par le frontend
 */
async function findStudentGrades(studentId, filters = {}) {
    // Construire les conditions WHERE
    const conditions = ['g.student_id = $1', 'g.absent = false OR g.absent = true'];
    const values = [studentId];
    let paramIndex = 2;
    if (filters.termId) {
        conditions.push(`e.term_id = $${paramIndex}`);
        values.push(filters.termId);
        paramIndex++;
    }
    if (filters.courseId) {
        conditions.push(`c.id = $${paramIndex}`);
        values.push(filters.courseId);
        paramIndex++;
    }
    if (filters.establishmentId) {
        conditions.push(`e.establishment_id = $${paramIndex}`);
        values.push(filters.establishmentId);
        paramIndex++;
    }
    const whereClause = conditions.join(' AND ');
    // ✅ REQUÊTE COMPLÈTE avec toutes les statistiques de classe
    const query = `
    SELECT DISTINCT ON (g.id)
      -- Informations de la note
      g.id,
      g.evaluation_id,
      g.student_id,
      g.value,
      g.absent,
      g.normalized_value,
      g.comment,
      g.created_by,
      g.created_at,
      g.updated_at,
      
      -- Informations de l'évaluation
      e.title as evaluation_title,
      e.type as evaluation_type,
      e.coefficient,
      e.max_scale,
      e.eval_date,
      e.description as evaluation_description,
      
      -- Informations du cours et de la matière
      c.id as course_id,
      s.name as subject_name,
      s.code as subject_code,
      cl.label as class_label,
      cl.code as class_code,
      
      -- ✅ STATISTIQUES DE CLASSE (moyenne, min, max)
      (
        SELECT AVG(g2.normalized_value)
        FROM grades g2
        WHERE g2.evaluation_id = g.evaluation_id
        AND g2.absent = false
        AND g2.normalized_value IS NOT NULL
      ) as class_average,
      (
        SELECT MIN(g2.normalized_value)
        FROM grades g2
        WHERE g2.evaluation_id = g.evaluation_id
        AND g2.absent = false
        AND g2.normalized_value IS NOT NULL
      ) as class_min,
      (
        SELECT MAX(g2.normalized_value)
        FROM grades g2
        WHERE g2.evaluation_id = g.evaluation_id
        AND g2.absent = false
        AND g2.normalized_value IS NOT NULL
      ) as class_max,
      
      -- Informations de l'élève
      u.full_name as student_name,
      u.email as student_email,
      sp.student_no
      
    FROM grades g
    INNER JOIN evaluations e ON e.id = g.evaluation_id
    INNER JOIN courses c ON c.id = e.course_id
    INNER JOIN subjects s ON s.id = c.subject_id
    INNER JOIN classes cl ON cl.id = c.class_id
    INNER JOIN users u ON u.id = g.student_id
    INNER JOIN student_profiles sp ON sp.user_id = u.id
    WHERE ${whereClause}
    ORDER BY g.id, e.eval_date DESC, s.name ASC
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Trouve les notes d'une évaluation
 */
async function findEvaluationGrades(evaluationId, includeAbsent = true) {
    return findGrades({ evaluationId, includeAbsent });
}
/**
 * Récupère une note par son ID avec tous les détails nécessaires pour l'édition
 * Utilisé par l'endpoint GET /api/grades/:id
 */
async function findGradeByIdWithDetails(gradeId, establishmentId) {
    const qb = new query_builder_1.QueryBuilder();
    // Joins pour récupérer tous les détails
    qb.addJoin('INNER', 'evaluations e', 'e.id = g.evaluation_id');
    qb.addJoin('INNER', 'courses c', 'c.id = e.course_id');
    qb.addJoin('INNER', 'subjects s', 's.id = c.subject_id');
    qb.addJoin('INNER', 'classes cl', 'cl.id = c.class_id');
    qb.addJoin('INNER', 'student_profiles sp', 'sp.user_id = g.student_id');
    qb.addJoin('INNER', 'users u', 'u.id = g.student_id');
    qb.addJoin('INNER', 'users creator', 'creator.id = g.created_by');
    // Filtres
    qb.addCondition('g.id', gradeId);
    qb.addEstablishmentFilter(establishmentId, 'e');
    const { fullQuery, values } = qb.buildFull();
    const baseQuery = `
    SELECT 
      g.id,
      g.evaluation_id,
      g.student_id,
      g.value,
      g.absent,
      g.normalized_value,
      g.comment,
      g.created_by,
      g.created_at,
      g.updated_at,
      
      -- Informations de l'élève
      u.full_name as student_name,
      u.email as student_email,
      sp.student_no,
      
      -- Informations de l'évaluation
      e.title as evaluation_title,
      e.type as evaluation_type,
      e.coefficient as evaluation_coefficient,
      e.max_scale as evaluation_max_scale,
      e.eval_date as evaluation_date,
      e.description as evaluation_description,
      
      -- Informations du cours
      c.id as course_id,
      s.name as subject_name,
      s.code as subject_code,
      cl.label as class_label,
      cl.code as class_code,
      
      -- Informations de création
      creator.full_name as created_by_name,
      creator.role as created_by_role
      
    FROM grades g
  `;
    const query = fullQuery(baseQuery);
    const result = await database_1.pool.query(query, values);
    return result.rows[0] || null;
}
// =========================
// Mise à jour
// =========================
/**
 * Met à jour une note avec historique
 */
async function updateGrade(id, data, updatedBy, updatedByRole) {
    const client = await (0, database_1.getClient)();
    try {
        await client.beginTransaction();
        // Récupérer l'ancienne valeur
        const oldGradeQuery = 'SELECT * FROM grades WHERE id = $1';
        const oldGradeResult = await client.query(oldGradeQuery, [id]);
        if (oldGradeResult.rows.length === 0) {
            await client.rollback();
            return null;
        }
        const oldGrade = oldGradeResult.rows[0];
        // Préparer les changements pour l'historique
        const changes = {};
        if (data.value !== undefined && data.value !== oldGrade.value) {
            changes.value = { from: oldGrade.value, to: data.value };
        }
        if (data.absent !== undefined && data.absent !== oldGrade.absent) {
            changes.absent = { from: oldGrade.absent, to: data.absent };
        }
        if (data.comment !== undefined && data.comment !== oldGrade.comment) {
            changes.comment = { from: oldGrade.comment, to: data.comment };
        }
        // Si aucun changement, retourner la note actuelle
        if (Object.keys(changes).length === 0) {
            await client.rollback();
            return oldGrade;
        }
        // Mettre à jour la note
        const updateQuery = `
      UPDATE grades
      SET 
        value = COALESCE($1, value),
        absent = COALESCE($2, absent),
        comment = COALESCE($3, comment),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
        const updateValues = [
            data.value !== undefined ? (data.absent ? null : data.value) : oldGrade.value,
            data.absent !== undefined ? data.absent : oldGrade.absent,
            data.comment !== undefined ? data.comment : oldGrade.comment,
            id,
        ];
        const result = await client.query(updateQuery, updateValues);
        // Créer l'entrée d'historique
        await createGradeHistory(client, id, updatedBy, updatedByRole, changes);
        await client.commit();
        return result.rows[0];
    }
    catch (error) {
        await client.rollback();
        throw error;
    }
    finally {
        client.release();
    }
}
// =========================
// Suppression
// =========================
/**
 * Supprime une note
 */
async function deleteGrade(id) {
    const query = `
    DELETE FROM grades
    WHERE id = $1
    RETURNING id
  `;
    const result = await database_1.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
}
// =========================
// Historique
// =========================
/**
 * Crée une entrée d'historique
 */
async function createGradeHistory(client, gradeId, changedBy, role, changes) {
    const query = `
    INSERT INTO grades_history (grade_id, changed_by, role, changes)
    VALUES ($1, $2, $3, $4)
  `;
    await client.query(query, [gradeId, changedBy, role, JSON.stringify(changes)]);
}
/**
 * Récupère l'historique d'une note
 */
async function getGradeHistory(gradeId) {
    const query = `
    SELECT * FROM grades_history
    WHERE grade_id = $1
    ORDER BY changed_at DESC
  `;
    const result = await database_1.pool.query(query, [gradeId]);
    return result.rows;
}
// =========================
// Calculs et statistiques
// =========================
/**
 * Calcule les moyennes d'un étudiant
 */
async function getStudentAverages(studentId, termId, establishmentId) {
    const termCondition = termId ? 'AND e.term_id = $2' : '';
    const establishmentCondition = establishmentId ? `AND e.establishment_id = ${termId ? '$3' : '$2'}` : '';
    const values = [studentId];
    if (termId)
        values.push(termId);
    if (establishmentId)
        values.push(establishmentId);
    const query = `
    SELECT 
      g.student_id,
      u.full_name as student_name,
      s.id as subject_id,
      s.name as subject_name,
      AVG(g.value) as average,
      SUM(g.value * e.coefficient) / SUM(e.coefficient) as weighted_average,
      COUNT(g.id) as grades_count
    FROM grades g
    INNER JOIN evaluations e ON e.id = g.evaluation_id
    INNER JOIN courses c ON c.id = e.course_id
    INNER JOIN subjects s ON s.id = c.subject_id
    INNER JOIN users u ON u.id = g.student_id
    WHERE g.student_id = $1
    AND g.absent = false
    AND g.value IS NOT NULL
    ${termCondition}
    ${establishmentCondition}
    GROUP BY g.student_id, u.full_name, s.id, s.name
    ORDER BY s.name
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Calcule la moyenne générale d'un étudiant
 */
async function getStudentOverallAverage(studentId, termId, establishmentId) {
    const averages = await getStudentAverages(studentId, termId, establishmentId);
    if (averages.length === 0)
        return 0;
    const totalWeighted = averages.reduce((sum, avg) => sum + avg.weighted_average, 0);
    return totalWeighted / averages.length;
}
/**
 * Calcule les moyennes d'une classe
 */
async function getClassAverages(classId, termId, establishmentId) {
    const termCondition = termId ? 'AND e.term_id = $2' : '';
    const establishmentCondition = establishmentId ? `AND e.establishment_id = ${termId ? '$3' : '$2'}` : '';
    const values = [classId];
    if (termId)
        values.push(termId);
    if (establishmentId)
        values.push(establishmentId);
    const query = `
    SELECT 
      cl.id as class_id,
      cl.label as class_label,
      s.id as subject_id,
      s.name as subject_name,
      AVG(g.value) as average,
      MIN(g.value) as min,
      MAX(g.value) as max,
      COUNT(DISTINCT g.student_id) as students_count
    FROM grades g
    INNER JOIN evaluations e ON e.id = g.evaluation_id
    INNER JOIN courses c ON c.id = e.course_id
    INNER JOIN subjects s ON s.id = c.subject_id
    INNER JOIN classes cl ON cl.id = c.class_id
    WHERE cl.id = $1
    AND g.absent = false
    AND g.value IS NOT NULL
    ${termCondition}
    ${establishmentCondition}
    GROUP BY cl.id, cl.label, s.id, s.name
    ORDER BY s.name
  `;
    const result = await database_1.pool.query(query, values);
    return result.rows;
}
/**
 * Récupère les notes des enfants d'un responsable
 */
async function getChildrenGrades(responsableId, filters = {}) {
    // Construction de la requête SQL avec TOUS les détails
    let query = `
    SELECT 
      g.id,
      g.evaluation_id,
      g.student_id,
      g.value,
      g.absent,
      g.normalized_value,
      g.comment,
      g.created_at,
      g.created_by,
      
      -- Infos évaluation
      e.title as evaluation_title,
      e.type as evaluation_type,
      e.coefficient,
      e.max_scale,
      e.eval_date,
      
      -- Infos matière
      s.id as subject_id,
      s.name as subject_name,
      s.code as subject_code,
      
      -- Infos classe
      cl.label as class_name,
      
      -- ✅ IMPORTANT : Infos élève
      u.full_name as student_name,
      u.email as student_email,
      
      -- Statistiques de classe
      (
        SELECT AVG(g2.normalized_value)
        FROM grades g2
        WHERE g2.evaluation_id = g.evaluation_id
        AND g2.absent = false
        AND g2.normalized_value IS NOT NULL
      ) as class_average,
      (
        SELECT MIN(g2.normalized_value)
        FROM grades g2
        WHERE g2.evaluation_id = g.evaluation_id
        AND g2.absent = false
        AND g2.normalized_value IS NOT NULL
      ) as class_min,
      (
        SELECT MAX(g2.normalized_value)
        FROM grades g2
        WHERE g2.evaluation_id = g.evaluation_id
        AND g2.absent = false
        AND g2.normalized_value IS NOT NULL
      ) as class_max
      
    FROM grades g
    INNER JOIN evaluations e ON e.id = g.evaluation_id
    INNER JOIN courses c ON c.id = e.course_id
    INNER JOIN subjects s ON s.id = c.subject_id
    INNER JOIN classes cl ON cl.id = c.class_id
    INNER JOIN users u ON u.id = g.student_id
    INNER JOIN student_responsables sr ON sr.student_id = g.student_id
    
    WHERE sr.responsable_id = $1
    AND sr.can_view_grades = true
  `;
    const params = [responsableId];
    let paramIndex = 2;
    // Filtre par trimestre
    if (filters.termId) {
        query += ` AND e.term_id = $${paramIndex}`;
        params.push(filters.termId);
        paramIndex++;
    }
    // Filtre par étudiant spécifique
    if (filters.studentId) {
        query += ` AND g.student_id = $${paramIndex}`;
        params.push(filters.studentId);
        paramIndex++;
    }
    // Filtre par établissement
    if (filters.establishmentId) {
        query += ` AND c.establishment_id = $${paramIndex}`;
        params.push(filters.establishmentId);
        paramIndex++;
    }
    query += ` ORDER BY e.eval_date DESC, s.name ASC`;
    const result = await database_1.pool.query(query, params);
    return result.rows;
}
//# sourceMappingURL=grade.model.js.map