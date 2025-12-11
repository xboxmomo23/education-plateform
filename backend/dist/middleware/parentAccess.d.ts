import { Request, Response, NextFunction } from 'express';
import { ParentAccessOptions } from '../models/parent.model';
export declare function requireParentAccessToStudent(options?: ParentAccessOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=parentAccess.d.ts.map