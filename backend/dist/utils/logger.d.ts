interface LogPayload {
    context?: string;
    requestId?: string;
    event?: string;
    msg?: string;
    [key: string]: unknown;
}
export declare function logInfo(payload: LogPayload): void;
export declare function logWarn(payload: LogPayload): void;
export declare function logError(payload: LogPayload): void;
export {};
//# sourceMappingURL=logger.d.ts.map