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
/**
 * Crée une nouvelle période
 */
export declare function createTerm(data: CreateTermData): Promise<Term>;
/**
 * Récupère les périodes d'un établissement
 */
export declare function findTerms(filters?: TermFilters): Promise<Term[]>;
/**
 * Récupère une période par ID
 */
export declare function findTermById(id: string, establishmentId?: string): Promise<Term | null>;
/**
 * Trouve la période correspondant à une date donnée
 * Utilisé pour l'auto-attribution du term_id aux évaluations
 */
export declare function findTermByDate(date: Date, establishmentId: string, academicYear?: number): Promise<Term | null>;
/**
 * Récupère la période courante d'un établissement
 */
export declare function getCurrentTerm(establishmentId: string): Promise<Term | null>;
/**
 * Met à jour une période
 */
export declare function updateTerm(id: string, data: UpdateTermData, establishmentId?: string): Promise<Term | null>;
/**
 * Supprime une période
 * Attention : les évaluations liées verront leur term_id mis à NULL
 */
export declare function deleteTerm(id: string, establishmentId?: string): Promise<boolean>;
/**
 * Vérifie si une date est dans une période donnée
 */
export declare function isDateInTerm(date: Date, term: Term): boolean;
/**
 * Génère une appréciation automatique basée sur la moyenne
 */
export declare function generateAppreciation(average: number): string;
//# sourceMappingURL=term.model.d.ts.map