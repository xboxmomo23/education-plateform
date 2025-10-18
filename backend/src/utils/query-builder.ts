/**
 * Query Builder pour requêtes SQL extensibles
 * Prépare le multi-tenant sans casser le code actuel
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
  addEstablishmentFilter(establishmentId?: string): this {
    // Future: Multi-tenant filter
    // Décommenter quand le multi-tenant sera activé
    /*
    if (establishmentId) {
      this.conditions.push(`establishment_id = $${this.paramIndex++}`);
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
  
  /**
   * Construit la clause WHERE et retourne les valeurs
   */
  build(): { where: string; values: any[] } {
    const where = this.conditions.length > 0 
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';
    
    return { where, values: this.values };
  }
  
  /**
   * Réinitialise le builder
   */
  reset(): this {
    this.conditions = [];
    this.values = [];
    this.paramIndex = 1;
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