import * as fs from "fs";
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let currentLevel: LogLevel = process.env.DEBUG === "calendit" ? "debug" : "info";
let debugStream: fs.WriteStream | null = null;

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function setDebugDump(filePath: string) {
  if (debugStream) {
    debugStream.end();
    debugStream = null;
  }
  debugStream = fs.createWriteStream(filePath, { flags: "a" });
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function writeToDebugDump(line: string) {
  if (!debugStream) return;
  debugStream.write(`${line}\n`);
}

/** ログプレフィックスなしの標準出力（表形式のユーザー向け表示用） */
export function writeStdoutLine(line: string): void {
  writeToDebugDump(line);
  process.stdout.write(`${line}\n`);
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function emit(level: LogLevel, ...allArgs: unknown[]) {
  const timestamp = new Date().toISOString().slice(11, 23);
  const moduleOrMessage = allArgs[0];
  const args = allArgs.slice(1);
  const moduleTag = typeof moduleOrMessage === "string" && args.length > 0 ? `[${moduleOrMessage}]` : "";
  const payload = moduleTag ? args : [moduleOrMessage, ...args];
  const prefix = `[${level.toUpperCase()} ${timestamp}]${moduleTag}`;
  const lineForDump = `${prefix} ${stringifyArgs(payload)}`.trim();
  writeToDebugDump(lineForDump);

  if (!shouldLog(level)) return;
  if (level === "error") {
    console.error(prefix, ...payload);
    return;
  }
  if (level === "warn") {
    console.warn(prefix, ...payload);
    return;
  }
  console.log(prefix, ...payload);
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", ...args),
  info: (...args: unknown[]) => emit("info", ...args),
  warn: (...args: unknown[]) => emit("warn", ...args),
  error: (...args: unknown[]) => emit("error", ...args),
};
