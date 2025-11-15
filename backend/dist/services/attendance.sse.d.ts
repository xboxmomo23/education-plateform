import { Response } from 'express';
interface AttendanceUpdate {
    type: 'bulk_update' | 'record_update';
    sessionId: string;
    updatedBy: string;
    recordId?: string;
    studentId?: string;
    count?: number;
    timestamp?: Date;
}
/**
 * Retirer un client SSE
 */
export declare function removeSSEClient(sessionId: string, clientId: string): void;
/**
 * Émettre une mise à jour à tous les clients d'une session
 */
export declare function emitAttendanceUpdate(sessionId: string, update: AttendanceUpdate): void;
/**
 * Obtenir le nombre de clients connectés par session
 */
export declare function getConnectedClientsCount(sessionId?: string): number;
/**
 * Handler SSE pour Express
 * GET /api/attendance/sessions/:id/stream
 */
export declare function sseStreamHandler(req: any, res: Response): void;
export {};
//# sourceMappingURL=attendance.sse.d.ts.map