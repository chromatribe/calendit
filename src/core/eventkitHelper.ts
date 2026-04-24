import { spawn } from "child_process";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { t } from "./i18n.js";

/** Same directory layout as native/eventkit-bridge (Swift). */
export function defaultCalenditDataDir(): string {
  const fromEnv = process.env.CALENDIT_CONFIG_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(os.homedir(), "Library", "Application Support", "calendit");
}

/** Unix socket path when `CALENDIT_EVENTKIT_BRIDGE=1`. */
export function defaultEventkitBridgeSocketPath(): string {
  return path.join(defaultCalenditDataDir(), "eventkit-bridge.sock");
}

export function bridgeTokenPath(): string {
  return path.join(defaultCalenditDataDir(), "bridge.token");
}

const BRIDGE_DISABLE = new Set(["0", "false", "no", "off"]);

function isBridgeExplicitlyDisabled(): boolean {
  const raw = process.env.CALENDIT_EVENTKIT_BRIDGE?.trim();
  if (raw === undefined) {
    return false;
  }
  if (raw === "") {
    return false;
  }
  return BRIDGE_DISABLE.has(raw.toLowerCase());
}

/**
 * If default socket + token exist and the socket file is a real Unix socket, use the bridge
 * (no env var required on darwin). Otherwise returns null to fall back to the helper.
 */
export function resolveAutoBridgeSocketPathIfReady(): string | null {
  if (process.platform !== "darwin") {
    return null;
  }
  const socketPath = defaultEventkitBridgeSocketPath();
  const tokenPath = bridgeTokenPath();
  if (!fs.existsSync(tokenPath)) {
    return null;
  }
  if (!fs.existsSync(socketPath)) {
    return null;
  }
  try {
    if (!fs.statSync(socketPath).isSocket()) {
      return null;
    }
  } catch {
    return null;
  }
  return socketPath;
}

/**
 * `CALENDIT_EVENTKIT_BRIDGE=1` / `true` or `unix:...` (explicit bridge only; no auto heuristics).
 */
function resolveExplicitBridgeOnly(): string | null {
  const raw = process.env.CALENDIT_EVENTKIT_BRIDGE?.trim();
  if (!raw || isBridgeExplicitlyDisabled()) {
    return null;
  }
  const v = raw.toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") {
    return defaultEventkitBridgeSocketPath();
  }
  if (v === "auto") {
    return null;
  }
  if (raw.startsWith("unix:")) {
    let rest = raw.slice("unix:".length);
    while (rest.startsWith("//")) {
      rest = rest.slice(1);
    }
    if (!rest) {
      return null;
    }
    return path.isAbsolute(rest) ? rest : path.resolve(process.cwd(), rest);
  }
  return null;
}

/**
 * Resolve which Unix socket the bridge is listening on for this run (if any).
 * - Explicit: `=1` / `unix:...` (always return path; missing token is an error on connect).
 * - `=0` / `false` / `no` / `off`: return null (always use helper process).
 * - Unset on darwin: auto if token + live socket file exist, else null.
 * - `=auto`: same as auto branch.
 */
export function resolveBridgeSocketPathForRun(): string | null {
  if (isBridgeExplicitlyDisabled()) {
    return null;
  }
  const explicit = resolveExplicitBridgeOnly();
  if (explicit) {
    return explicit;
  }
  const raw = process.env.CALENDIT_EVENTKIT_BRIDGE?.trim();
  if (raw === "auto" || !raw) {
    return process.platform === "darwin" ? resolveAutoBridgeSocketPathIfReady() : null;
  }
  return null;
}

/** @deprecated use resolveBridgeSocketPathForRun */
export function resolveBridgeSocketPath(): string | null {
  return resolveBridgeSocketPathForRun();
}

/** true if a helper binary exists, or a bridge socket path is in use (explicit or auto). */
export function hasEventkitTransport(): boolean {
  if (isBridgeExplicitlyDisabled()) {
    return resolveEventkitHelperPath() !== null;
  }
  return resolveEventkitHelperPath() !== null || resolveBridgeSocketPathForRun() !== null;
}

function readBridgeToken(): string {
  const p = bridgeTokenPath();
  if (!fs.existsSync(p)) {
    throw new Error(`${t("eventkit.bridge.tokenMissing", { path: p })} ${t("eventkit.bridge.hintStartBridge")}`);
  }
  return fs.readFileSync(p, "utf8").trim();
}

function buildBridgePayload(
  args: string[],
  stdin: string | undefined,
): { v: number; op: string; token: string; body: Record<string, unknown> } {
  const cmd = args[0];
  const token = readBridgeToken();
  if (cmd === "doctor") {
    return { v: 1, op: "doctor", token, body: {} };
  }
  if (cmd === "list-calendars") {
    return { v: 1, op: "list-calendars", token, body: {} };
  }
  if (cmd === "list-events") {
    if (args.length < 4) {
      throw new Error("list-events requires calendarId, start, end");
    }
    return {
      v: 1,
      op: "list-events",
      token,
      body: { calendarId: args[1], start: args[2], end: args[3] },
    };
  }
  if (cmd === "create-event") {
    let body: Record<string, unknown> = {};
    if (stdin !== undefined && stdin.length > 0) {
      body = JSON.parse(stdin) as Record<string, unknown>;
    }
    return { v: 1, op: "create-event", token, body };
  }
  if (cmd === "update-event") {
    let body: Record<string, unknown> = {};
    if (stdin !== undefined && stdin.length > 0) {
      body = JSON.parse(stdin) as Record<string, unknown>;
    }
    return { v: 1, op: "update-event", token, body };
  }
  if (cmd === "delete-event") {
    if (args.length < 3) {
      throw new Error("delete-event requires calendarId and eventId");
    }
    return {
      v: 1,
      op: "delete-event",
      token,
      body: { calendarId: args[1], eventId: args[2] },
    };
  }
  throw new Error(`Unknown EventKit command for bridge: ${cmd}`);
}

function runEventkitBridgeSocket(
  socketPath: string,
  args: string[],
  options: { stdin?: string; timeoutMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options.timeoutMs ?? 120_000;
  const payload = buildBridgePayload(args, options.stdin);
  const line = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const client = net.createConnection({ path: socketPath });
    let buf = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.destroy();
      reject(new Error(t("eventkit.bridge.timeout", { ms: String(timeout) })));
    }, timeout);

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.destroy();
      reject(err);
    };

    const ok = (stdout: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.end();
      resolve({ stdout, stderr: "" });
    };

    client.on("error", (err: Error) => {
      fail(
        new Error(
          `${t("eventkit.bridge.connectFailed", { path: socketPath, message: err.message })} ${t("eventkit.bridge.hintStartBridge")}`,
        ),
      );
    });

    client.on("connect", () => {
      client.write(`${line}\n`);
    });

    client.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      const nl = buf.indexOf("\n");
      if (nl === -1) {
        return;
      }
      const responseLine = buf.slice(0, nl).trim();
      try {
        const parsed = JSON.parse(responseLine) as Record<string, unknown>;
        if (parsed.bridgeError === true) {
          fail(new Error(String(parsed.error ?? t("eventkit.bridge.bridgeError"))));
          return;
        }
        ok(responseLine);
      } catch {
        fail(new Error(t("eventkit.bridge.invalidJson", { line: responseLine.slice(0, 200) })));
      }
    });

    client.on("close", () => {
      if (settled) return;
      if (!buf.includes("\n")) {
        fail(new Error(t("eventkit.bridge.closedWithoutResponse")));
      }
    });
  });
}

function isRetryableBridgeError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  return /could not connect|ECONNREFUSED|not connect|connect ECONNREFUSED/i.test(err.message);
}

async function runEventkitBridgeSocketWithRetry(
  socketPath: string,
  args: string[],
  options: { stdin?: string; timeoutMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  const maxAttempts = 4;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
      return await runEventkitBridgeSocket(socketPath, args, options);
    } catch (e) {
      last = e;
      if (!isRetryableBridgeError(e) || attempt === maxAttempts - 1) {
        break;
      }
    }
  }
  throw last;
}

async function runEventkitHelperSpawn(
  args: string[],
  options: { stdin?: string; timeoutMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  const exe = resolveEventkitHelperPath();
  if (!exe) {
    return Promise.reject(new Error(`${t("eventkit.helper.missing")} ${t("eventkit.helper.hintBuild")}`));
  }
  const timeout = options.timeoutMs ?? 120_000;
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    if (options.stdin !== undefined) {
      child.stdin?.write(options.stdin, "utf8");
    }
    child.stdin?.end();

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(t("eventkit.helper.timeout", { ms: String(timeout) })));
    }, timeout);

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || t("eventkit.helper.exitCode", { code: String(code ?? "null") })));
      }
    });
  });
}

/** 優先: CALENDIT_EVENTKIT_HELPER → リポジトリ直下の release ビルド */
export function resolveEventkitHelperPath(): string | null {
  const fromEnv = process.env.CALENDIT_EVENTKIT_HELPER?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }
  const rel = path.join(
    process.cwd(),
    "native",
    "eventkit-helper",
    ".build",
    "release",
    "eventkit-helper",
  );
  if (fs.existsSync(rel)) {
    return rel;
  }
  return null;
}

/**
 * Run EventKit helper: **bridge** when a socket is resolved, else spawn `eventkit-helper`.
 * Fallback to spawn only if `CALENDIT_EVENTKIT_BRIDGE_FALLBACK=1`.
 */
export function runEventkitHelper(
  args: string[],
  options: { stdin?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  const socketPath = resolveBridgeSocketPathForRun();
  if (socketPath) {
    return runEventkitBridgeSocketWithRetry(socketPath, args, options).catch((err: unknown) => {
      if (process.env.CALENDIT_EVENTKIT_BRIDGE_FALLBACK === "1") {
        return runEventkitHelperSpawn(args, options);
      }
      throw err;
    });
  }
  return runEventkitHelperSpawn(args, options);
}

export async function eventkitDoctorJson(): Promise<{
  ok: boolean;
  platform?: string;
  calendarAccess?: string;
  helperVersion?: number;
  transport?: string;
}> {
  const { stdout } = await runEventkitHelper(["doctor"], { timeoutMs: 120_000 });
  return JSON.parse(stdout.trim()) as {
    ok: boolean;
    platform?: string;
    calendarAccess?: string;
    helperVersion?: number;
    transport?: string;
  };
}

export async function eventkitListCalendarsJson(): Promise<{
  calendars: Array<{
    calendarIdentifier: string;
    title: string;
    sourceTitle: string;
    allowsContentModification: boolean;
  }>;
}> {
  const { stdout } = await runEventkitHelper(["list-calendars"], { timeoutMs: 120_000 });
  return JSON.parse(stdout.trim()) as {
    calendars: Array<{
      calendarIdentifier: string;
      title: string;
      sourceTitle: string;
      allowsContentModification: boolean;
    }>;
  };
}
