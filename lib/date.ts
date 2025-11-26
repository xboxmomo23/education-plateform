/**
 * 📅 Utilitaire de gestion des dates pour l'emploi du temps
 * 
 * ✅ RÈGLES STRICTES :
 * - Tous les calculs sont en UTC (pas de timezone locale)
 * - Le dimanche est le jour 0 (début de semaine académique)
 * - Format de retour : YYYY-MM-DD (ISO 8601)
 * - Déterministe : même entrée → même sortie
 * 
 * ⚠️ NE PAS utiliser `new Date()` sans référence dans les composants
 * ⚠️ Toujours utiliser ces fonctions pour les calculs de semaines
 */

import { startOfWeek, addWeeks, format, parseISO, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
/**
 * Obtenir le dimanche (début de semaine) d'une date donnée
 * 
 * @param reference - Date de référence (string YYYY-MM-DD ou Date)
 * @returns Date du dimanche au format YYYY-MM-DD
 * 
 * @example
 * getWeekStart() // Dimanche de la semaine actuelle
 * getWeekStart('2025-11-25') // Dimanche de la semaine contenant le 25 nov
 */
export function getWeekStart(reference?: string | Date): string {
  // Si aucune référence, utiliser aujourd'hui (UTC)
  const refDate = reference 
    ? (typeof reference === 'string' ? parseISO(reference) : reference)
    : new Date()

  // Obtenir le dimanche (jour 0) en UTC
  const sunday = startOfWeek(refDate, { weekStartsOn: 0 })
  
  // Retourner au format YYYY-MM-DD
  return format(sunday, 'yyyy-MM-dd')
}

/**
 * Ajouter ou retrancher des semaines à partir d'un dimanche de référence
 * 
 * @param weekStart - Date du dimanche (YYYY-MM-DD)
 * @param count - Nombre de semaines (positif = futur, négatif = passé)
 * @returns Nouveau dimanche au format YYYY-MM-DD
 * 
 * @example
 * addWeeksToStart('2025-11-24', 1)  // Dimanche suivant
 * addWeeksToStart('2025-11-24', -1) // Dimanche précédent
 */
export function addWeeksToStart(weekStart: string, count: number): string {
  const date = parseISO(weekStart)
  const newDate = addWeeks(date, count)
  return format(newDate, 'yyyy-MM-dd')
}

/**
 * Obtenir la date complète d'un jour de la semaine
 * 
 * @param weekStart - Date du dimanche (YYYY-MM-DD)
 * @param dayOfWeek - Jour (1=Dimanche, 2=Lundi, ..., 5=Jeudi)
 * @returns Date complète au format YYYY-MM-DD
 * 
 * @example
 * getDateForDay('2025-11-24', 1) // 2025-11-24 (dimanche)
 * getDateForDay('2025-11-24', 2) // 2025-11-25 (lundi)
 */
export function getDateForDay(weekStart: string, dayOfWeek: number): string {
  const sunday = parseISO(weekStart)
  const targetDate = addDays(sunday, dayOfWeek - 1)
  return format(targetDate, 'yyyy-MM-dd')
}

/**
 * Formater un label de semaine lisible
 * 
 * @param weekStart - Date du dimanche (YYYY-MM-DD)
 * @returns Label formaté (ex: "Semaine du 24 novembre au 28 novembre")
 * 
 * @example
 * formatWeekLabel('2025-11-24') // "Semaine du 24 novembre au 28 novembre"
 */
export function formatWeekLabel(weekStart: string): string {
  const sunday = parseISO(weekStart)
  const thursday = addDays(sunday, 4) // Dimanche + 4 = Jeudi
  
  const startFormatted = format(sunday, 'd MMMM', { locale: fr })
  const endFormatted = format(thursday, 'd MMMM', { locale: fr })
  
  return `Semaine du ${startFormatted} au ${endFormatted}`
}

/**
 * Vérifier si une date est un dimanche
 * 
 * @param date - Date à vérifier (YYYY-MM-DD)
 * @returns true si dimanche, false sinon
 * 
 * @example
 * isSunday('2025-11-24') // true
 * isSunday('2025-11-25') // false
 */
export function isSunday(date: string): boolean {
  const d = parseISO(date)
  return d.getUTCDay() === 0
}

/**
 * Obtenir le dimanche le plus proche d'une date
 * (arrondir au dimanche précédent si pas dimanche)
 * 
 * @param date - Date quelconque (YYYY-MM-DD)
 * @returns Dimanche précédent ou égal au format YYYY-MM-DD
 * 
 * @example
 * getNearestSunday('2025-11-26') // 2025-11-24 (dimanche précédent)
 * getNearestSunday('2025-11-24') // 2025-11-24 (déjà dimanche)
 */
export function getNearestSunday(date: string): string {
  return getWeekStart(date)
}

/**
 * Valider qu'une string est un dimanche au format YYYY-MM-DD
 * 
 * @param weekStart - String à valider
 * @returns true si valide ET dimanche, false sinon
 * 
 * @example
 * isValidWeekStart('2025-11-24') // true (dimanche)
 * isValidWeekStart('2025-11-25') // false (lundi)
 * isValidWeekStart('invalid')    // false
 */
export function isValidWeekStart(weekStart: string): boolean {
  try {
    // Vérifier format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return false
    }
    
    // Vérifier que c'est un dimanche
    return isSunday(weekStart)
  } catch {
    return false
  }
}

/**
 * Obtenir le nombre de semaines entre deux dimanches
 * 
 * @param startWeek - Premier dimanche (YYYY-MM-DD)
 * @param endWeek - Deuxième dimanche (YYYY-MM-DD)
 * @returns Nombre de semaines (positif si endWeek > startWeek)
 * 
 * @example
 * getWeeksBetween('2025-11-24', '2025-12-01') // 1
 * getWeeksBetween('2025-12-01', '2025-11-24') // -1
 */
export function getWeeksBetween(startWeek: string, endWeek: string): number {
  const start = parseISO(startWeek)
  const end = parseISO(endWeek)
  const diffMs = end.getTime() - start.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.round(diffDays / 7)
}