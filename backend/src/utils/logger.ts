type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  context?: string;
  requestId?: string;
  event?: string;
  msg?: string;
  [key: string]: unknown;
}

function writeLog(level: LogLevel, payload: LogPayload): void {
  const { stack, ...rest } = payload;
  const baseEntry: Record<string, unknown> = {
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

export function logInfo(payload: LogPayload): void {
  writeLog("info", payload);
}

export function logWarn(payload: LogPayload): void {
  writeLog("warn", payload);
}

export function logError(payload: LogPayload): void {
  writeLog("error", payload);
}
