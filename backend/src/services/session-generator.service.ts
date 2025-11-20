import pool from '../config/database';
import { TimetableModel } from '../models/timetable.model';

/**
 * Service de génération automatique de sessions d'appel
 * à partir des créneaux d'emploi du temps
 */

// =========================
// TYPES
// =========================

interface GenerationResult {
  generated: number;
  skipped: number;
  errors: Array<{ date: string; error: string }>;
}

// =========================
// FONCTIONS UTILITAIRES
// =========================

/**
 * Obtenir le numéro de la semaine (1-53) pour une date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Déterminer si on est en semaine A ou B
 * (Convention : semaines paires = A, impaires = B)
 */
function getCurrentWeekType(date: Date): 'A' | 'B' {
  const weekNum = getWeekNumber(date);
  return weekNum % 2 === 0 ? 'A' : 'B';
}

/**
 * Vérifier si une session existe déjà
 */
async function sessionExists(
  courseId: string,
  sessionDate: string,
  startTime: string
): Promise<boolean> {
  const query = `
    SELECT 1 FROM attendance_sessions
    WHERE course_id = $1
      AND session_date = $2
      AND scheduled_start = $3
  `;
  const result = await pool.query(query, [courseId, sessionDate, startTime]);
  return result.rows.length > 0;
}

// =========================
// GÉNÉRATION DE SESSIONS
// =========================

/**
 * Générer les sessions pour un jour spécifique
 */
export async function generateSessionsForDay(date: Date): Promise<GenerationResult> {
  const result: GenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1=Lundi, 7=Dimanche
    const weekType = getCurrentWeekType(date);
    const dateStr = date.toISOString().split('T')[0];

    // Récupérer tous les créneaux pour ce jour
    const entries = await TimetableModel.getEntriesByDayOfWeek(dayOfWeek, weekType);

    for (const entry of entries) {
      try {
        // Vérifier si la session existe déjà
        const exists = await sessionExists(
          entry.course_id,
          dateStr,
          entry.start_time
        );

        if (exists) {
          result.skipped++;
          continue;
        }

        // Créer la session
        await pool.query(
          `INSERT INTO attendance_sessions (
            course_id, session_date, scheduled_start, scheduled_end,
            status, establishment_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            entry.course_id,
            dateStr,
            entry.start_time,
            entry.end_time,
            'confirmed',
            null, // L'establishment_id sera géré par un trigger ou valeur par défaut
          ]
        );

        result.generated++;
      } catch (error) {
        result.errors.push({
          date: dateStr,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }

    console.log(`[Session Generator] ${dateStr}: ${result.generated} générées, ${result.skipped} ignorées`);

    return result;
  } catch (error) {
    console.error('[Session Generator] Erreur:', error);
    result.errors.push({
      date: date.toISOString().split('T')[0],
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
    return result;
  }
}

/**
 * Générer les sessions pour une semaine
 */
export async function generateSessionsForWeek(startDate: Date): Promise<GenerationResult> {
  const result: GenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  // Générer pour chaque jour de la semaine (Lundi à Vendredi)
  for (let i = 0; i < 5; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dayResult = await generateSessionsForDay(date);

    result.generated += dayResult.generated;
    result.skipped += dayResult.skipped;
    result.errors.push(...dayResult.errors);
  }

  console.log(
    `[Session Generator] Semaine: ${result.generated} générées, ${result.skipped} ignorées`
  );

  return result;
}

/**
 * Générer les sessions pour un mois
 */
export async function generateSessionsForMonth(year: number, month: number): Promise<GenerationResult> {
  const result: GenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  // Générer pour chaque jour du mois
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);

    // Ignorer les week-ends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const dayResult = await generateSessionsForDay(date);

    result.generated += dayResult.generated;
    result.skipped += dayResult.skipped;
    result.errors.push(...dayResult.errors);
  }

  console.log(
    `[Session Generator] Mois ${month + 1}/${year}: ${result.generated} générées, ${result.skipped} ignorées`
  );

  return result;
}

/**
 * Générer les sessions pour une classe spécifique
 */
export async function generateSessionsForClass(
  classId: string,
  startDate: Date,
  endDate: Date
): Promise<GenerationResult> {
  const result: GenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer tous les créneaux de la classe
    const entries = await TimetableModel.getEntriesByClass(classId);

    // Pour chaque jour entre startDate et endDate
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      const weekType = getCurrentWeekType(currentDate);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Ignorer les week-ends
      if (dayOfWeek === 6 || dayOfWeek === 7) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Filtrer les créneaux pour ce jour
      const dayEntries = entries.filter(
        (entry) =>
          entry.day_of_week === dayOfWeek &&
          (!entry.week || entry.week === weekType)
      );

      for (const entry of dayEntries) {
        try {
          const exists = await sessionExists(
            entry.course_id,
            dateStr,
            entry.start_time
          );

          if (exists) {
            result.skipped++;
            continue;
          }

          await pool.query(
            `INSERT INTO attendance_sessions (
              course_id, session_date, scheduled_start, scheduled_end,
              status, establishment_id
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              entry.course_id,
              dateStr,
              entry.start_time,
              entry.end_time,
              'confirmed',
              null,
            ]
          );

          result.generated++;
        } catch (error) {
          result.errors.push({
            date: dateStr,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(
      `[Session Generator] Classe ${classId}: ${result.generated} générées, ${result.skipped} ignorées`
    );

    return result;
  } catch (error) {
    console.error('[Session Generator] Erreur:', error);
    result.errors.push({
      date: startDate.toISOString().split('T')[0],
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
    return result;
  }
}

// =========================
// GÉNÉRATION AUTOMATIQUE
// =========================

/**
 * Générer automatiquement les sessions si aucune n'existe pour une date
 */
export async function autoGenerateIfNeeded(date: Date): Promise<boolean> {
  try {
    const dateStr = date.toISOString().split('T')[0];

    // Vérifier si des sessions existent déjà pour ce jour
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM attendance_sessions
      WHERE session_date = $1
    `;
    const checkResult = await pool.query(checkQuery, [dateStr]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      // Des sessions existent déjà
      return false;
    }

    // Générer les sessions
    await generateSessionsForDay(date);
    return true;
  } catch (error) {
    console.error('[Auto Generator] Erreur:', error);
    return false;
  }
}

// =========================
// TÂCHE CRON (Optionnel)
// =========================

/**
 * Fonction à exécuter quotidiennement pour générer les sessions de la semaine suivante
 * À configurer avec node-cron ou similaire
 */
export async function dailySessionGeneration(): Promise<void> {
  try {
    console.log('[Daily Generator] Démarrage...');

    // Générer pour les 7 prochains jours
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      await generateSessionsForDay(date);
    }

    console.log('[Daily Generator] Terminé avec succès');
  } catch (error) {
    console.error('[Daily Generator] Erreur:', error);
  }
}

// Exemple d'utilisation avec node-cron :
/*
import cron from 'node-cron';

// Exécuter tous les jours à 00:00
cron.schedule('0 0 * * *', async () => {
  await dailySessionGeneration();
});
*/