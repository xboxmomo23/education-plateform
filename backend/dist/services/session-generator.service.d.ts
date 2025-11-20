/**
 * Service de génération automatique de sessions d'appel
 * à partir des créneaux d'emploi du temps
 */
interface GenerationResult {
    generated: number;
    skipped: number;
    errors: Array<{
        date: string;
        error: string;
    }>;
}
/**
 * Générer les sessions pour un jour spécifique
 */
export declare function generateSessionsForDay(date: Date): Promise<GenerationResult>;
/**
 * Générer les sessions pour une semaine
 */
export declare function generateSessionsForWeek(startDate: Date): Promise<GenerationResult>;
/**
 * Générer les sessions pour un mois
 */
export declare function generateSessionsForMonth(year: number, month: number): Promise<GenerationResult>;
/**
 * Générer les sessions pour une classe spécifique
 */
export declare function generateSessionsForClass(classId: string, startDate: Date, endDate: Date): Promise<GenerationResult>;
/**
 * Générer automatiquement les sessions si aucune n'existe pour une date
 */
export declare function autoGenerateIfNeeded(date: Date): Promise<boolean>;
/**
 * Fonction à exécuter quotidiennement pour générer les sessions de la semaine suivante
 * À configurer avec node-cron ou similaire
 */
export declare function dailySessionGeneration(): Promise<void>;
export {};
//# sourceMappingURL=session-generator.service.d.ts.map