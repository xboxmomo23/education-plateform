import { pool } from '../config/database';

/**
 * Trouve automatiquement le term_id correspondant à une date d'évaluation
 * Cette fonction est appelée lors de la création d'une évaluation si aucun term_id n'est fourni
 */
export async function findTermIdByDate(
  evalDate: Date,
  establishmentId: string,
  academicYear?: number
): Promise<string | null> {
  // Déterminer l'année académique si non fournie
  // L'année académique correspond généralement à l'année de rentrée
  // ex: 2024-2025 -> academicYear = 2024
  const year = academicYear || (evalDate.getMonth() >= 8 
    ? evalDate.getFullYear() 
    : evalDate.getFullYear() - 1);

  const query = `
    SELECT id FROM terms
    WHERE establishment_id = $1
    AND $2::date BETWEEN start_date AND end_date
    AND academic_year = $3
    ORDER BY start_date ASC
    LIMIT 1
  `;

  try {
    const result = await pool.query(query, [establishmentId, evalDate, year]);
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Erreur recherche term_id:', error);
    return null;
  }
}

/**
 * Mise à jour de la fonction createEvaluation pour auto-attribuer le term_id
 * 
 * À intégrer dans evaluation.model.ts en modifiant la fonction createEvaluation existante
 */
export async function createEvaluationWithAutoTerm(data: {
  courseId: string;
  termId?: string;
  title: string;
  type: string;
  coefficient: number;
  maxScale?: number;
  evalDate: Date;
  description?: string;
  createdBy: string;
  establishmentId?: string;
}): Promise<any> {
  const {
    courseId,
    termId,
    title,
    type,
    coefficient,
    maxScale = 20,
    evalDate,
    description,
    createdBy,
    establishmentId,
  } = data;

  // Auto-attribution du term_id si non fourni et si establishmentId est disponible
  let finalTermId = termId || null;
  
  if (!finalTermId && establishmentId) {
    finalTermId = await findTermIdByDate(evalDate, establishmentId);
    if (finalTermId) {
      console.log(`[Evaluation] Auto-assigned term_id: ${finalTermId} for date: ${evalDate}`);
    }
  }

  const query = `
    INSERT INTO evaluations (
      course_id, term_id, title, type, coefficient, 
      max_scale, eval_date, description, created_by
      ${establishmentId ? ', establishment_id' : ''}
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 ${establishmentId ? ', $10' : ''})
    RETURNING *
  `;

  const values: any[] = [
    courseId,
    finalTermId,
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

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Met à jour les évaluations existantes sans term_id
 * Utilitaire de migration pour assigner les term_id rétroactivement
 */
export async function assignMissingTermIds(establishmentId: string): Promise<number> {
  // Récupérer toutes les évaluations sans term_id
  const evaluationsQuery = `
    SELECT e.id, e.eval_date, c.academic_year
    FROM evaluations e
    INNER JOIN courses c ON c.id = e.course_id
    WHERE e.term_id IS NULL
    AND (e.establishment_id = $1 OR e.establishment_id IS NULL)
  `;

  const evaluations = await pool.query(evaluationsQuery, [establishmentId]);
  let updatedCount = 0;

  for (const evaluation of evaluations.rows) {
    const termId = await findTermIdByDate(
      new Date(evaluation.eval_date),
      establishmentId,
      evaluation.academic_year
    );

    if (termId) {
      await pool.query(
        'UPDATE evaluations SET term_id = $1 WHERE id = $2',
        [termId, evaluation.id]
      );
      updatedCount++;
    }
  }

  console.log(`[Migration] Updated ${updatedCount} evaluations with term_id`);
  return updatedCount;
}