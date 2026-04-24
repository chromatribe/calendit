import * as fs from "fs/promises";
import type { ContextConfig } from "../types/index.js";
import type { OutlookCredentials } from "../types/index.js";
import type { AuthManager } from "./auth.js";
import { getGoogleTokenFilePath } from "./config.js";

export type AuthTokenColumn = "OK" | "NOT LOGGED IN" | "EXPIRED" | "NOT CONFIGURED";

export interface AuthStatusRow {
  context: string;
  service: string;
  calendar: string;
  account: string;
  token: AuthTokenColumn;
}

/** `getServiceForContext` と同じトークンキー */
export function googleTokenKeyForContext(contextName: string, ctx: ContextConfig): string | undefined {
  return contextName || ctx.accountId;
}

export async function evaluateGoogleToken(tokenPath: string): Promise<AuthTokenColumn> {
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    const data = JSON.parse(raw) as { expiry_date?: number; refresh_token?: string };
    const now = Date.now();
    if (data.expiry_date !== undefined && data.expiry_date > now) {
      return "OK";
    }
    if (data.refresh_token) {
      return "OK";
    }
    if (data.expiry_date !== undefined && data.expiry_date <= now) {
      return "EXPIRED";
    }
    return "NOT LOGGED IN";
  } catch {
    return "NOT LOGGED IN";
  }
}

export async function evaluateOutlookToken(
  auth: AuthManager,
  creds: OutlookCredentials,
  ctx: ContextConfig,
): Promise<AuthTokenColumn> {
  const pca = await auth.getOutlookClient(creds.id, creds.tenantId);
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length === 0) {
    return "NOT LOGGED IN";
  }
  if (!ctx.accountId) {
    return "OK";
  }
  const match = accounts.find((a) => a.username === ctx.accountId || a.homeAccountId === ctx.accountId);
  return match ? "OK" : "NOT LOGGED IN";
}

export function buildAuthStatusRows(
  contexts: Record<string, ContextConfig>,
  deps: {
    auth: AuthManager;
    outlookCreds?: OutlookCredentials;
  },
): Promise<AuthStatusRow[]> {
  const entries = Object.entries(contexts).sort(([a], [b]) => a.localeCompare(b));
  return Promise.all(
    entries.map(async ([contextName, ctx]) => {
      const account = ctx.accountId ?? "(default)";
      if (ctx.service === "google") {
        const tokenKey = googleTokenKeyForContext(contextName, ctx);
        const tokenPath = getGoogleTokenFilePath(tokenKey);
        const token = await evaluateGoogleToken(tokenPath);
        return {
          context: contextName,
          service: "google",
          calendar: ctx.calendarId,
          account,
          token,
        };
      }
      if (!deps.outlookCreds) {
        return {
          context: contextName,
          service: "outlook",
          calendar: ctx.calendarId,
          account,
          token: "NOT CONFIGURED",
        };
      }
      const token = await evaluateOutlookToken(deps.auth, deps.outlookCreds, ctx);
      return {
        context: contextName,
        service: "outlook",
        calendar: ctx.calendarId,
        account,
        token,
      };
    }),
  );
}

export function formatAuthStatusTable(rows: AuthStatusRow[]): string {
  const headers = ["CONTEXT", "SERVICE", "CALENDAR", "ACCOUNT", "TOKEN"];
  const dataRows = rows.map((r) => [r.context, r.service, r.calendar, r.account, r.token]);
  const all = [headers, ...dataRows.map((cols) => cols.map(String))];
  const widths = headers.map((_, colIdx) => Math.max(...all.map((row) => row[colIdx].length)));
  const sep = widths.map((w) => "-".repeat(w)).join("   ");
  const fmt = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("   ");
  return [fmt(headers), sep, ...dataRows.map((cols) => fmt(cols.map(String)))].join("\n");
}
