import { Request, Response } from 'express';
export declare function getInboxHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSentMessagesHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getUnreadCountHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMessageHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function markAsReadHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function markMultipleAsReadHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteMessageHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendMessageHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getRecipientsHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=message.controller.d.ts.map