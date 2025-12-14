import { Request, Response, NextFunction } from 'express';
export declare function demoReadOnlyGuard(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function demoDataMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=demo.middleware.d.ts.map