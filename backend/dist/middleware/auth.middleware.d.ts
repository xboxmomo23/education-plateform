import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: UserRole;
                full_name: string;
                establishmentId?: string;
            };
        }
    }
}
/**
 * Vérifie qu'un utilisateur est authentifié
 * Future-proof: inclut le contexte establishment
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Vérifie que l'utilisateur a un des rôles autorisés
 */
export declare function authorize(...allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware combiné : authentification + autorisation
 */
export declare function requireRole(...roles: UserRole[]): ((req: Request, res: Response, next: NextFunction) => void)[];
/**
 * Authentifie l'utilisateur si un token est présent, mais continue sinon
 */
export declare function optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Vérifie que le compte n'est pas bloqué
 */
export declare function checkAccountStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware pour isoler les données par établissement
 * À activer lors de la migration multi-tenant
 */
//# sourceMappingURL=auth.middleware.d.ts.map