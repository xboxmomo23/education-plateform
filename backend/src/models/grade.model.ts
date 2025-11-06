import { pool, getClient } from '../config/database';
import { QueryBuilder } from '../utils/query-builder';
import { UserRole } from '../types';

// =========================
// Types et Interfaces
// =========================

export interface Grade {
  id: string;
  evaluation_id: string;
  student_id: string;
  value: number | null;
  absent: boolean;
  normalized_value: number | null;
  comment: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface CreateGradeData {
  evaluationId: string;
  studentId: string;
  value?: number;
  absent?: boolean;
  comment?: string;
  createdBy: string;
}

export interface UpdateGradeData {
  value?: number;
  absent?: boolean;
  comment?: string;
}

export interface GradeFilters {
  id?: string;
  evaluationId?: string;
  studentId?: string;
  courseId?: string;
  termId?: string;
  classId?: string;
  includeAbsent?: boolean;
  establishmentId?: string;
}

export interface GradeWithDetails {
  // Champs de base de Grade
  id: string;
  evaluation_id: string;
  student_id: string;
  value: number | null;
  absent: boolean;
  normalized_value: number | null;
  comment: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date | null;
  
  // Informations élève
  student_name?: string;
  student_email?: string;
  student_no?: string;
  
  // Informations évaluation
  evaluation_title?: string;
  evaluation_type?: string;
  evaluation_coefficient?: number;
  evaluation_max_scale?: number;
  evaluation_date?: Date;
  evaluation_description?: string;
  
  // Informations cours
  course_id?: string;
  course_subject_name?: string;
  subject_name?: string;
  subject_code?: string;
  course_class_label?: string;
  class_label?: string;
  class_code?: string;
  
  // Informations création
  created_by_name?: string;
  created_by_role?: string;
}

export interface GradeHistory {
  id: string;
  grade_id: string;
  changed_by: string;
  role: UserRole;
  changed_at: Date;
  changes: Record<string, any>;
}

export interface StudentAverage {
  student_id: string;
  student_name: string;
  subject_id?: string;
  subject_name?: string;
  average: number;
  weighted_average: number;
  grades_count: number;
}

// =========================
// Création
// =========================

/**
 * Crée une seule note
 */
export async function createGrade(data: CreateGradeData): Promise<Grade> {
  const { evaluationId, studentId, value, absent = false, comment, createdBy } = data;

  // Vérifier qu'une note n'existe pas déjà pour cet élève et cette évaluation
  const existingCheck = await pool.query(
    'SELECT id FROM grades WHERE evaluation_id = $1 AND student_id = $2',
    [evaluationId, studentId]
  );

  if (existingCheck.rows.length > 0) {
    throw new Error('Une note existe déjà pour cet élève et cette évaluation');
  }

  const query = `
    INSERT INTO grades (
      evaluation_id, student_id, value, absent, comment, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
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

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Crée plusieurs notes en batch
 */
export async function createGrades(grades: CreateGradeData[]): Promise<Grade[]> {
  if (grades.length === 0) return [];

  const client = await getClient();

  try {
    await client.beginTransaction();

    const createdGrades: Grade[] = [];

    for (const gradeData of grades) {
      const { evaluationId, studentId, value, absent = false, comment, createdBy } = gradeData;

      // Vérifier/update si existe déjà
      const existingQuery = `
        SELECT id FROM grades 
        WHERE evaluation_id = $1 AND student_id = $2
      `;
      
      const existing = await client.query(existingQuery, [evaluationId, studentId]);

      if (existing.rows.length > 0) {
        // Mettre à jour la note existante
        const updateQuery = `
          UPDATE grades 
          SET value = $1, absent = $2, comment = $3, updated_at = NOW()
          WHERE evaluation_id = $4 AND student_id = $5
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [
          absent ? null : value,
          absent,
          comment || null,
          evaluationId,
          studentId,
        ]);
        
        createdGrades.push(result.rows[0]);

        // Créer l'entrée d'historique
        await createGradeHistory(
          client,
          existing.rows[0].id,
          createdBy,
          'teacher',
          { value: { from: null, to: value }, comment: { from: null, to: comment } }
        );
      } else {
        // Créer une nouvelle note
        const insertQuery = `
          INSERT INTO grades (
            evaluation_id, student_id, value, absent, comment, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          evaluationId,
          studentId,
          absent ? null : value,
          absent,
          comment || null,
          createdBy,
        ]);

        createdGrades.push(result.rows[0]);
      }
    }

    await client.commit();
    return createdGrades;
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}

// =========================
// Récupération
// =========================

/**
 * Trouve des notes avec filtres
 */
export async function findGrades(filters: GradeFilters = {}): Promise<GradeWithDetails[]> {
  const qb = new QueryBuilder();

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
  const result = await pool.query(query, values);
  
  return result.rows;
}



/**
 * Trouve une note par ID avec toutes les informations nécessaires
 * Version optimisée qui ne dépend pas de findGrades()
 */
export async function findGradeById(id: string): Promise<GradeWithDetails | null> {
  try {
    // ✅ Requête SQL directe sans QueryBuilder
    const query = `
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
        -- Infos évaluation
        e.title as evaluation_title,
        e.type as evaluation_type,
        e.coefficient as evaluation_coefficient,
        e.max_scale as evaluation_max_scale,
        e.eval_date as evaluation_date,
        e.description as evaluation_description,
        -- Infos cours (c.title au lieu de c.name)
        c.id as course_id,
        c.title as subject_name,
        c.subject_id,
        -- Infos étudiant
        u.full_name as student_name,
        u.email as student_email,
        -- Infos créateur
        creator.full_name as created_by_name
      FROM grades g
      INNER JOIN evaluations e ON g.evaluation_id = e.id
      INNER JOIN courses c ON e.course_id = c.id
      INNER JOIN users u ON g.student_id = u.id
      LEFT JOIN users creator ON g.created_by = creator.id
      WHERE g.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      console.log(`[findGradeById] Grade ${id} not found`);
      return null;
    }

    console.log(`[findGradeById] ✅ Grade ${id} found for ${result.rows[0].student_name}`);
    return result.rows[0];
  } catch (error) {
    console.error('[findGradeById] Error:', error);
    return null;
  }
}
/**
 * ✅ FONCTION CORRIGÉE - Trouve les notes d'un étudiant avec TOUTES les infos nécessaires
 * Cette fonction retourne les données complètes attendues par le frontend
 */
// ===================================================================
// PATCH DEBUG pour grade_model.ts
// ===================================================================
// Remplacez la fonction findStudentGrades (lignes 320-420)
// par cette version avec logs de debug
// ===================================================================

export async function findStudentGrades(
  studentId: string,
  filters: Partial<GradeFilters> = {}
): Promise<any[]> {
  // Construire les conditions WHERE
  const conditions = ['g.student_id = $1'];  
  const values: any[] = [studentId];
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
    SELECT 
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
    ORDER BY e.eval_date DESC, s.name ASC
  `;

  // ===================================================================
  // ✅ AJOUT : LOGS DE DEBUG
  // ===================================================================
  console.log('');
  console.log('='.repeat(70));
  console.log('[DEBUG] findStudentGrades() called');
  console.log('='.repeat(70));
  console.log('[DEBUG] Input studentId:', studentId);
  console.log('[DEBUG] Input filters:', JSON.stringify(filters, null, 2));
  console.log('[DEBUG] WHERE clause:', whereClause);
  console.log('[DEBUG] SQL values:', values);
  console.log('='.repeat(70));

  const result = await pool.query(query, values);
  
  // ===================================================================
  // ✅ AJOUT : VÉRIFICATION DES RÉSULTATS
  // ===================================================================
  console.log('[DEBUG] SQL query returned:', result.rows.length, 'rows');
  console.log('');
  
  if (result.rows.length > 0) {
    console.log('[DEBUG] Rows details:');
    result.rows.forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, {
        gradeId: row.id?.substring(0, 8) + '...',
        studentId: row.student_id?.substring(0, 8) + '...',
        evaluationTitle: row.evaluation_title,
        subjectName: row.subject_name,
        absent: row.absent,
        value: row.value,
      });
      
      // ✅ SÉCURITÉ : Détecter si un student_id ne correspond pas
      if (row.student_id !== studentId) {
        console.error('');
        console.error('🚨 '.repeat(35));
        console.error('[ERROR] SECURITY VIOLATION!');
        console.error(`[ERROR] Row ${index + 1} has student_id: ${row.student_id}`);
        console.error(`[ERROR] Expected student_id: ${studentId}`);
        console.error('[ERROR] This row belongs to another student!');
        console.error('[ERROR] Full row:', JSON.stringify(row, null, 2));
        console.error('🚨 '.repeat(35));
        console.error('');
      }
    });
  } else {
    console.log('[DEBUG] No rows returned');
  }
  
  console.log('='.repeat(70));
  console.log('');
  
  return result.rows;
}

/**
 * Trouve les notes d'une évaluation
 */
export async function findEvaluationGrades(
  evaluationId: string,
  includeAbsent: boolean = true
): Promise<GradeWithDetails[]> {
  return findGrades({ evaluationId, includeAbsent });
}

/**
 * Récupère une note par son ID avec tous les détails nécessaires pour l'édition
 * Utilisé par l'endpoint GET /api/grades/:id
 */
export async function findGradeByIdWithDetails(
  gradeId: string,
  establishmentId?: string
): Promise<GradeWithDetails | null> {
  const qb = new QueryBuilder();

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
  const result = await pool.query(query, values);

  return result.rows[0] || null;
}

// =========================
// Mise à jour
// =========================

/**
 * Met à jour une note avec historique
 */
export async function updateGrade(
  id: string,
  data: UpdateGradeData,
  updatedBy: string,
  updatedByRole: UserRole
): Promise<Grade | null> {
  const client = await getClient();

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
    const changes: Record<string, any> = {};
    
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
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}

// =========================
// Suppression
// =========================

/**
 * Supprime une note
 */
export async function deleteGrade(id: string): Promise<boolean> {
  const query = `
    DELETE FROM grades
    WHERE id = $1
    RETURNING id
  `;

  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

// =========================
// Historique
// =========================

/**
 * Crée une entrée d'historique
 */
async function createGradeHistory(
  client: any,
  gradeId: string,
  changedBy: string,
  role: UserRole,
  changes: Record<string, any>
): Promise<void> {
  const query = `
    INSERT INTO grades_history (grade_id, changed_by, role, changes)
    VALUES ($1, $2, $3, $4)
  `;

  await client.query(query, [gradeId, changedBy, role, JSON.stringify(changes)]);
}

/**
 * Récupère l'historique d'une note
 */
export async function getGradeHistory(gradeId: string): Promise<GradeHistory[]> {
  const query = `
    SELECT * FROM grades_history
    WHERE grade_id = $1
    ORDER BY changed_at DESC
  `;

  const result = await pool.query(query, [gradeId]);
  return result.rows;
}

// =========================
// Calculs et statistiques
// =========================

/**
 * Calcule les moyennes d'un étudiant
 */
export async function getStudentAverages(
  studentId: string,
  termId?: string,
  establishmentId?: string
): Promise<StudentAverage[]> {
  const termCondition = termId ? 'AND e.term_id = $2' : '';
  const establishmentCondition = establishmentId ? `AND e.establishment_id = ${termId ? '$3' : '$2'}` : '';
  
  const values = [studentId];
  if (termId) values.push(termId);
  if (establishmentId) values.push(establishmentId);

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

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Calcule la moyenne générale d'un étudiant
 */
export async function getStudentOverallAverage(
  studentId: string,
  termId?: string,
  establishmentId?: string
): Promise<number> {
  const averages = await getStudentAverages(studentId, termId, establishmentId);
  
  if (averages.length === 0) return 0;

  const totalWeighted = averages.reduce((sum, avg) => sum + avg.weighted_average, 0);
  return totalWeighted / averages.length;
}

/**
 * Calcule les moyennes d'une classe
 */
export async function getClassAverages(
  classId: string,
  termId?: string,
  establishmentId?: string
): Promise<{
  class_id: string;
  class_label: string;
  subject_id: string;
  subject_name: string;
  average: number;
  min: number;
  max: number;
  students_count: number;
}[]> {
  const termCondition = termId ? 'AND e.term_id = $2' : '';
  const establishmentCondition = establishmentId ? `AND e.establishment_id = ${termId ? '$3' : '$2'}` : '';
  
  const values = [classId];
  if (termId) values.push(termId);
  if (establishmentId) values.push(establishmentId);

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

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Récupère les notes des enfants d'un responsable
 */
export async function getChildrenGrades(
  responsableId: string,
  filters: Partial<GradeFilters> = {}
): Promise<GradeWithDetails[]> {
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

  const params: any[] = [responsableId];
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

  const result = await pool.query(query, params);
  return result.rows;
}