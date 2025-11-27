/**
 * Utilitaires pour les calculs de dates et semaines
 * Utilisé par GenerateFromTemplateModal pour générer les listes de semaines
 */

import { parseISO, format, addWeeks, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';

/**
 * Générer toutes les semaines (dimanches) entre deux dates
 * @param start - Date de début (format 'yyyy-MM-dd')
 * @param end - Date de fin (format 'yyyy-MM-dd')
 * @returns Liste des dimanches au format 'yyyy-MM-dd'
 */
export function generateWeeksBetween(start: string, end: string): string[] {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  
  // Obtenir le premier dimanche (début de semaine)
  const firstSunday = startOfWeek(startDate, { weekStartsOn: 0 });
  const lastSunday = startOfWeek(endDate, { weekStartsOn: 0 });
  
  const weeks: string[] = [];
  let current = firstSunday;
  
  while (current <= lastSunday) {
    weeks.push(format(current, 'yyyy-MM-dd'));
    current = addWeeks(current, 1);
  }
  
  return weeks;
}

/**
 * Obtenir les semaines selon un preset prédéfini
 * @param preset - Type de preset ('end-of-year' | 'semester-2' | 'full-year')
 * @param referenceDate - Date de référence (par défaut: aujourd'hui)
 * @returns Liste des dimanches au format 'yyyy-MM-dd'
 */
export function getPresetWeeks(preset: string, referenceDate: Date = new Date()): string[] {
  const today = referenceDate;
  const currentYear = today.getFullYear();
  
  switch (preset) {
    case 'end-of-year': {
      // De maintenant jusqu'au 31 décembre de l'année en cours
      const endOfYear = new Date(currentYear, 11, 31); // 31 décembre
      return generateWeeksBetween(
        format(today, 'yyyy-MM-dd'),
        format(endOfYear, 'yyyy-MM-dd')
      );
    }
    
    case 'semester-2': {
      // Janvier à Juin de l'année suivante (ou actuelle si on est avant juin)
      const targetYear = today.getMonth() >= 6 ? currentYear + 1 : currentYear;
      const startSemester2 = new Date(targetYear, 0, 1); // 1er janvier
      const endSemester2 = new Date(targetYear, 5, 30); // 30 juin
      return generateWeeksBetween(
        format(startSemester2, 'yyyy-MM-dd'),
        format(endSemester2, 'yyyy-MM-dd')
      );
    }
    
    case 'full-year': {
      // Année scolaire complète : Septembre à Juin
      const startSchoolYear = new Date(currentYear, 8, 1); // 1er septembre
      const endSchoolYear = new Date(currentYear + 1, 5, 30); // 30 juin année suivante
      return generateWeeksBetween(
        format(startSchoolYear, 'yyyy-MM-dd'),
        format(endSchoolYear, 'yyyy-MM-dd')
      );
    }
    
    case 'next-month': {
      // Le mois prochain (4-5 semaines)
      const startNextMonth = addWeeks(today, 1);
      const endNextMonth = addWeeks(today, 5);
      return generateWeeksBetween(
        format(startNextMonth, 'yyyy-MM-dd'),
        format(endNextMonth, 'yyyy-MM-dd')
      );
    }
    
    case 'next-quarter': {
      // Les 3 prochains mois (12-13 semaines)
      const startQuarter = addWeeks(today, 1);
      const endQuarter = addWeeks(today, 13);
      return generateWeeksBetween(
        format(startQuarter, 'yyyy-MM-dd'),
        format(endQuarter, 'yyyy-MM-dd')
      );
    }
    
    default:
      return [];
  }
}

/**
 * Obtenir le nom d'affichage d'un preset
 */
export function getPresetLabel(preset: string): string {
  const labels: Record<string, string> = {
    'end-of-year': "Jusqu'à la fin d'année",
    'semester-2': 'Janvier-Juin (Semestre 2)',
    'full-year': 'Année scolaire complète (Sept-Juin)',
    'next-month': 'Le mois prochain',
    'next-quarter': 'Les 3 prochains mois',
  };
  return labels[preset] || preset;
}

/**
 * Calculer le nombre de cours qui seront générés
 * @param weeksCount - Nombre de semaines
 * @param coursesPerWeek - Nombre de cours par semaine (défaut: 20)
 */
export function calculateTotalCourses(weeksCount: number, coursesPerWeek: number = 20): number {
  return weeksCount * coursesPerWeek;
}

/**
 * Formatter une période pour l'affichage
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  const startFormatted = format(start, 'dd/MM/yyyy');
  const endFormatted = format(end, 'dd/MM/yyyy');
  
  return `${startFormatted} → ${endFormatted}`;
}

/**
 * Vérifier si une date est un dimanche
 */
export function isSunday(dateStr: string): boolean {
  const date = parseISO(dateStr);
  return date.getDay() === 0;
}

/**
 * Obtenir le dimanche le plus proche (suivant si samedi, précédent sinon)
 */
export function getNearestSunday(dateStr: string): string {
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 0) {
    // Déjà dimanche
    return format(date, 'yyyy-MM-dd');
  } else if (dayOfWeek === 6) {
    // Samedi → dimanche suivant
    return format(addWeeks(startOfWeek(date, { weekStartsOn: 0 }), 1), 'yyyy-MM-dd');
  } else {
    // Autres jours → dimanche de cette semaine
    return format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
  }
}