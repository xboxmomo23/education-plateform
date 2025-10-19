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

export class QueryBuilder {
  private conditions: string[] = [];
  private values: any[] = [];
  private paramIndex = 1;
  
  // ✅ NOUVEAU: Pour supporter les JOINs (utilisé dans tes models)
  private joins: string[] = [];
  private orderBys: string[] = [];
  private groupBys: string[] = [];
  
  constructor(baseConditions: string[] = []) {
    this.conditions = [...baseConditions];
  }
  
  /**
   * Ajoute une condition avec sa valeur
   */
  addCondition(field: string, value?: any, operator: string = '='): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(`${field} ${operator} $${this.paramIndex++}`);
      this.values.push(value);
    }
    return this;
  }
  
  /**
   * Ajoute le filtre establishment_id (préparé pour multi-tenant)
   * Pour l'instant commenté, à activer plus tard
   */
  addEstablishmentFilter(establishmentId?: string, tableAlias?: string): this {
    // Future: Multi-tenant filter
    // Décommenter quand le multi-tenant sera activé
    /*
    if (establishmentId) {
      const field = tableAlias ? `${tableAlias}.establishment_id` : 'establishment_id';
      this.conditions.push(`${field} = $${this.paramIndex++}`);
      this.values.push(establishmentId);
    }
    */
    return this;
  }
  
  /**
   * Filtre pour exclure les éléments supprimés (soft delete)
   */
  addDeletedFilter(includeDeleted = false): this {
    if (!includeDeleted) {
      this.conditions.push('deleted_at IS NULL');
    }
    return this;
  }
  
  /**
   * Filtre sur le statut actif/inactif
   */
  addActiveFilter(active?: boolean): this {
    if (active !== undefined) {
      this.conditions.push(`active = $${this.paramIndex++}`);
      this.values.push(active);
    }
    return this;
  }
  
  /**
   * Ajoute une condition IN
   */
  addInCondition(field: string, values?: any[]): this {
    if (values && values.length > 0) {
      const placeholders = values.map(() => `$${this.paramIndex++}`).join(', ');
      this.conditions.push(`${field} IN (${placeholders})`);
      this.values.push(...values);
    }
    return this;
  }
  
  // ✅ NOUVEAU: Support des JOINs (utilisé dans grade.model.ts et evaluation.model.ts)
  addJoin(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, condition: string): this {
    this.joins.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }
  
  // ✅ NOUVEAU: Support ORDER BY (utilisé partout dans tes models)
  addOrderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderBys.push(`${field} ${direction}`);
    return this;
  }
  
  // ✅ NOUVEAU: Support GROUP BY (utilisé dans grade.model.ts)
  addGroupBy(field: string): this {
    if (!this.groupBys.includes(field)) {
      this.groupBys.push(field);
    }
    return this;
  }
  
  // ✅ NOUVEAU: Filtre par date range (utile pour les évaluations)
  addDateRangeFilter(field: string, startDate?: Date, endDate?: Date): this {
    if (startDate) {
      this.conditions.push(`${field} >= $${this.paramIndex++}`);
      this.values.push(startDate);
    }
    if (endDate) {
      this.conditions.push(`${field} <= $${this.paramIndex++}`);
      this.values.push(endDate);
    }
    return this;
  }
  
  /**
   * Construit la clause WHERE et retourne les valeurs
   */
  build(): { where: string; values: any[] } {
    const where = this.conditions.length > 0 
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';
    
    return { where, values: this.values };
  }
  
  // ✅ NOUVEAU: Build complet avec JOINs, ORDER BY, GROUP BY (pour tes models complexes)
  buildFull(): { 
    fullQuery: (baseQuery: string) => string; 
    values: any[] 
  } {
    const { where, values } = this.build();
    
    const fullQuery = (baseQuery: string): string => {
      let query = baseQuery;
      
      // Ajouter les JOINs
      if (this.joins.length > 0) {
        query += '\n' + this.joins.join('\n');
      }
      
      // Ajouter WHERE
      if (where) {
        query += '\n' + where;
      }
      
      // Ajouter GROUP BY
      if (this.groupBys.length > 0) {
        query += '\nGROUP BY ' + this.groupBys.join(', ');
      }
      
      // Ajouter ORDER BY
      if (this.orderBys.length > 0) {
        query += '\nORDER BY ' + this.orderBys.join(', ');
      }
      
      return query;
    };
    
    return { fullQuery, values };
  }
  
  /**
   * Réinitialise le builder
   */
  reset(): this {
    this.conditions = [];
    this.values = [];
    this.paramIndex = 1;
    this.joins = [];
    this.orderBys = [];
    this.groupBys = [];
    return this;
  }
}

/**
 * Helper function pour créer rapidement un QueryBuilder
 */
export function createQueryBuilder(baseConditions?: string[]): QueryBuilder {
  return new QueryBuilder(baseConditions);
}

/**
 * Helper pour ajouter les filtres de base communs
 */
export function addBaseFilters(
  qb: QueryBuilder,
  filters: BaseFilters = {}
): QueryBuilder {
  return qb
    .addEstablishmentFilter(filters.establishmentId)
    .addDeletedFilter(filters.includeDeleted)
    .addActiveFilter(filters.active);
}