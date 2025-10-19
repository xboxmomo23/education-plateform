/**
 * Query Builder pour requêtes SQL extensibles
 * Préparé le multi-tenant sans casser le code actuel
 * VERSION AMÉLIORÉE (garde ton code de base, ajoute juste ces méthodes)
 */
export interface BaseFilters {
    establishmentId?: string;
    active?: boolean;
    includeDeleted?: boolean;
}
export declare class QueryBuilder {
    private conditions;
    private values;
    private paramIndex;
    private joins;
    private orderBys;
    private groupBys;
    constructor(baseConditions?: string[]);
    /**
     * Ajoute une condition avec sa valeur
     */
    addCondition(field: string, value?: any, operator?: string): this;
    /**
     * Ajoute le filtre establishment_id (préparé pour multi-tenant)
     * Pour l'instant commenté, à activer plus tard
     */
    addEstablishmentFilter(establishmentId?: string, tableAlias?: string): this;
    /**
     * Filtre pour exclure les éléments supprimés (soft delete)
     */
    addDeletedFilter(includeDeleted?: boolean): this;
    /**
     * Filtre sur le statut actif/inactif
     */
    addActiveFilter(active?: boolean): this;
    /**
     * Ajoute une condition IN
     */
    addInCondition(field: string, values?: any[]): this;
    addJoin(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, condition: string): this;
    addOrderBy(field: string, direction?: 'ASC' | 'DESC'): this;
    addGroupBy(field: string): this;
    addDateRangeFilter(field: string, startDate?: Date, endDate?: Date): this;
    /**
     * Construit la clause WHERE et retourne les valeurs
     */
    build(): {
        where: string;
        values: any[];
    };
    buildFull(): {
        fullQuery: (baseQuery: string) => string;
        values: any[];
    };
    /**
     * Réinitialise le builder
     */
    reset(): this;
}
/**
 * Helper function pour créer rapidement un QueryBuilder
 */
export declare function createQueryBuilder(baseConditions?: string[]): QueryBuilder;
/**
 * Helper pour ajouter les filtres de base communs
 */
export declare function addBaseFilters(qb: QueryBuilder, filters?: BaseFilters): QueryBuilder;
//# sourceMappingURL=query-builder.d.ts.map