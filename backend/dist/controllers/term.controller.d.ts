import { Request, Response } from 'express';
/**
 * POST /api/terms
 * Crée une nouvelle période (trimestre/semestre)
 */
export declare function createTermHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/terms
 * Liste les périodes de l'établissement
 */
export declare function getTermsHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/terms/current
 * Récupère la période courante
 */
export declare function getCurrentTermHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/terms/:id
 * Récupère une période par ID
 */
export declare function getTermByIdHandler(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/terms/:id
 * Modifie une période
 */
export declare function updateTermHandler(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/terms/:id
 * Supprime une période
 */
export declare function deleteTermHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=term.controller.d.ts.map