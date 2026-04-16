export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let currentLevel: LogLevel = process.env.DEBUG === "calendit" ? "debug" : "info";

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function emit(level: LogLevel, ...args: unknown[]) {
  if (!shouldLog(level)) return;
  const prefix = `[${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(prefix, ...args);
    return;
  }
  if (level === "warn") {
    console.warn(prefix, ...args);
    return;
  }
  console.log(prefix, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", ...args),
  info: (...args: unknown[]) => emit("info", ...args),
  warn: (...args: unknown[]) => emit("warn", ...args),
  error: (...args: unknown[]) => emit("error", ...args),
};
