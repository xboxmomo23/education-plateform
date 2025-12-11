/**
 * Trouve automatiquement le term_id correspondant à une date d'évaluation
 * Cette fonction est appelée lors de la création d'une évaluation si aucun term_id n'est fourni
 */
export declare function findTermIdByDate(evalDate: Date, establishmentId: string, academicYear?: number): Promise<string | null>;
/**
 * Mise à jour de la fonction createEvaluation pour auto-attribuer le term_id
 *
 * À intégrer dans evaluation.model.ts en modifiant la fonction createEvaluation existante
 */
export declare function createEvaluationWithAutoTerm(data: {
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
}): Promise<any>;
/**
 * Met à jour les évaluations existantes sans term_id
 * Utilitaire de migration pour assigner les term_id rétroactivement
 */
export declare function assignMissingTermIds(establishmentId: string): Promise<number>;
//# sourceMappingURL=term-utils.d.ts.map