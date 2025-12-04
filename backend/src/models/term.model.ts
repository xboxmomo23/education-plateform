import { pool } from '../config/database';

// =========================
// Types et Interfaces
// =========================

export interface Term {
  id: string;
  academic_year: number;
  name: string;
  start_date: Date;
  end_date: Date;
  is_current: boolean;
  establishment_id: string | null;
}

export interface CreateTermData {
  academicYear: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
  establishmentId: string;
}

export interface UpdateTermData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent?: boolean;
}

export interface TermFilters {
  academicYear?: number;
  establishmentId?: string;
  isCurrent?: boolean;
}

// =========================
// Création
// =========================

/**
 * Crée une nouvelle période
 */
export async function createTerm(data: CreateTermData): Promise<Term> {
  const { academicYear, name, startDate, endDate, isCurrent = false, establishmentId } = data;

  // Si cette période est marquée comme courante, désactiver les autres
  if (isCurrent) {
    await pool.query(
      `UPDATE terms SET is_current = false 
       WHERE establishment_id = $1 AND academic_year = $2`,
      [establishmentId, academicYear]
    );
  }

  const query = `
    INSERT INTO terms (academic_year, name, start_date, end_date, is_current, establishment_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const result = await pool.query(query, [
    academicYear,
    name,
    startDate,
    endDate,
    isCurrent,
    establishmentId,
  ]);

  return result.rows[0];
}

// =========================
// Récupération
// =========================

/**
 * Récupère les périodes d'un établissement
 */
export async function findTerms(filters: TermFilters = {}): Promise<Term[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (filters.establishmentId) {
    conditions.push(`establishment_id = $${paramIndex++}`);
    values.push(filters.establishmentId);
  }

  if (filters.academicYear) {
    conditions.push(`academic_year = $${paramIndex++}`);
    values.push(filters.academicYear);
  }

  if (filters.isCurrent !== undefined) {
    conditions.push(`is_current = $${paramIndex++}`);
    values.push(filters.isCurrent);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT * FROM terms
    ${whereClause}
    ORDER BY academic_year DESC, start_date ASC
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Récupère une période par ID
 */
export async function findTermById(id: string, establishmentId?: string): Promise<Term | null> {
  let query = 'SELECT * FROM terms WHERE id = $1';
  const values: any[] = [id];

  if (establishmentId) {
    query += ' AND establishment_id = $2';
    values.push(establishmentId);
  }

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Trouve la période correspondant à une date donnée
 * Utilisé pour l'auto-attribution du term_id aux évaluations
 */
export async function findTermByDate(
  date: Date,
  establishmentId: string,
  academicYear?: number
): Promise<Term | null> {
  const year = academicYear || new Date().getFullYear();
  
  const query = `
    SELECT * FROM terms
    WHERE establishment_id = $1
    AND $2 BETWEEN start_date AND end_date
    AND academic_year = $3
    ORDER BY start_date ASC
    LIMIT 1
  `;

  const result = await pool.query(query, [establishmentId, date, year]);
  return result.rows[0] || null;
}

/**
 * Récupère la période courante d'un établissement
 */
export async function getCurrentTerm(establishmentId: string): Promise<Term | null> {
  const query = `
    SELECT * FROM terms
    WHERE establishment_id = $1 AND is_current = true
    LIMIT 1
  `;

  const result = await pool.query(query, [establishmentId]);
  return result.rows[0] || null;
}

// =========================
// Mise à jour
// =========================

/**
 * Met à jour une période
 */
export async function updateTerm(
  id: string,
  data: UpdateTermData,
  establishmentId?: string
): Promise<Term | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCounter = 1;

  // Construire dynamiquement les champs à mettre à jour
  if (data.name !== undefined) {
    fields.push(`name = $${paramCounter++}`);
    values.push(data.name);
  }

  if (data.startDate !== undefined) {
    fields.push(`start_date = $${paramCounter++}`);
    values.push(data.startDate);
  }

  if (data.endDate !== undefined) {
    fields.push(`end_date = $${paramCounter++}`);
    values.push(data.endDate);
  }

  if (data.isCurrent !== undefined) {
    fields.push(`is_current = $${paramCounter++}`);
    values.push(data.isCurrent);
  }

  if (fields.length === 0) {
    return findTermById(id, establishmentId);
  }

  // Si on active cette période comme courante, désactiver les autres
  if (data.isCurrent === true && establishmentId) {
    // Récupérer l'année académique de cette période
    const term = await findTermById(id);
    if (term) {
      await pool.query(
        `UPDATE terms SET is_current = false 
         WHERE establishment_id = $1 AND academic_year = $2 AND id != $3`,
        [establishmentId, term.academic_year, id]
      );
    }
  }

  values.push(id);
  const whereId = `$${paramCounter++}`;

  let establishmentCondition = '';
  if (establishmentId) {
    values.push(establishmentId);
    establishmentCondition = ` AND establishment_id = $${paramCounter}`;
  }

  const query = `
    UPDATE terms
    SET ${fields.join(', ')}
    WHERE id = ${whereId}${establishmentCondition}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

// =========================
// Suppression
// =========================

/**
 * Supprime une période
 * Attention : les évaluations liées verront leur term_id mis à NULL
 */
export async function deleteTerm(id: string, establishmentId?: string): Promise<boolean> {
  let query = 'DELETE FROM terms WHERE id = $1';
  const values: any[] = [id];

  if (establishmentId) {
    query += ' AND establishment_id = $2';
    values.push(establishmentId);
  }

  query += ' RETURNING id';

  const result = await pool.query(query, values);
  return result.rowCount !== null && result.rowCount > 0;
}

// =========================
// Utilitaires
// =========================

/**
 * Vérifie si une date est dans une période donnée
 */
export function isDateInTerm(date: Date, term: Term): boolean {
  const d = new Date(date);
  const start = new Date(term.start_date);
  const end = new Date(term.end_date);
  return d >= start && d <= end;
}

/**
 * Génère une appréciation automatique basée sur la moyenne
 */
export function generateAppreciation(average: number): string {
  if (average >= 16) return 'Excellent travail';
  if (average >= 14) return 'Très bon travail';
  if (average >= 12) return 'Bon travail';
  if (average >= 10) return 'Travail satisfaisant';
  if (average >= 8) return 'Travail insuffisant';
  return 'Travail très insuffisant';
}