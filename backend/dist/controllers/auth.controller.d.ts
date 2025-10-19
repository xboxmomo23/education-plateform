import { Request, Response } from 'express';
/**
 * Authentifie un utilisateur et génère un token JWT
 */
export declare function login(req: Request, res: Response): Promise<void>;
/**
 * Déconnecte un utilisateur en révoquant sa session
 */
export declare function logout(req: Request, res: Response): Promise<void>;
/**
 * Révoque toutes les sessions d'un utilisateur
 */
export declare function logoutAll(req: Request, res: Response): Promise<void>;
/**
 * Rafraîchit un token JWT expiré
 */
export declare function refreshToken(req: Request, res: Response): Promise<void>;
/**
 * Récupère les informations de l'utilisateur connecté
 */
export declare function getCurrentUser(req: Request, res: Response): Promise<void>;
/**
 * Crée un nouvel utilisateur (réservé aux admins)
 */
export declare function register(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map