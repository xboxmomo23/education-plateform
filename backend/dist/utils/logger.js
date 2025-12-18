"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
function writeLog(level, payload) {
    const { stack, ...rest } = payload;
    const baseEntry = {
        level,
        timestamp: new Date().toISOString(),
        ...rest,
    };
    if (stack && process.env.NODE_ENV !== "production") {
        baseEntry.stack = stack;
    }
    const serialized = JSON.stringify(baseEntry);
    if (level === "error") {
        console.error(serialized);
        return;
    }
    if (level === "warn") {
        console.warn(serialized);
        return;
    }
    console.log(serialized);
}
function logInfo(payload) {
    writeLog("info", payload);
}
function logWarn(payload) {
    writeLog("warn", payload);
}
function logError(payload) {
    writeLog("error", payload);
}
//# sourceMappingURL=logger.js.map