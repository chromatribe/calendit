import type { ContextConfig } from "../types/index.js";
import type { OutlookCredentials } from "../types/index.js";
import type { AuthManager } from "./auth.js";
import { buildAuthStatusRows, type AuthTokenColumn } from "./authStatus.js";
import {
  eventkitDoctorJson,
  eventkitListCalendarsJson,
  hasEventkitTransport,
} from "./eventkitHelper.js";

/** 全サービス共通の接続・利用可否の要約（OAuth トークンに限定しない） */
export type AccountConnectionState =
  | AuthTokenColumn
  | "N/A (non-macOS)"
  | "NO HELPER"
  | "HELPER ERROR"
  | "NO CALENDAR ACCESS"
  | "CALENDAR NOT FOUND"
  | "OK (bridge)";

export interface AccountStatusRow {
  context: string;
  service: string;
  calendar: string;
  account: string;
  connection: AccountConnectionState;
}

async function evaluateMacosContext(ctx: ContextConfig): Promise<{
  connection: AccountConnectionState;
  account: string;
}> {
  const fallbackAccount = ctx.accountId ?? "(default)";
  if (process.env.CALENDIT_MOCK === "true") {
    return { connection: "OK", account: fallbackAccount };
  }
  if (process.platform !== "darwin") {
    return { connection: "N/A (non-macOS)", account: fallbackAccount };
  }
  if (!hasEventkitTransport()) {
    return { connection: "NO HELPER", account: fallbackAccount };
  }
  try {
    const doc = await eventkitDoctorJson();
    if (!doc.ok) {
      return { connection: "HELPER ERROR", account: fallbackAccount };
    }
    if (doc.calendarAccess !== "authorized") {
      return { connection: "NO CALENDAR ACCESS", account: fallbackAccount };
    }
    const list = await eventkitListCalendarsJson();
    const cal = list.calendars?.find((c) => c.calendarIdentifier === ctx.calendarId);
    const viaBridge = doc.transport === "bridge";
    const connection: AccountConnectionState = cal
      ? viaBridge
        ? "OK (bridge)"
        : "OK"
      : "CALENDAR NOT FOUND";
    const sourceLike = cal?.sourceTitle?.trim() || cal?.title?.trim();
    const account = sourceLike || fallbackAccount;
    return { connection, account };
  } catch {
    return { connection: "HELPER ERROR", account: fallbackAccount };
  }
}

export async function buildAccountStatusRows(
  contexts: Record<string, ContextConfig>,
  deps: {
    auth: AuthManager;
    outlookCreds?: OutlookCredentials;
  },
): Promise<AccountStatusRow[]> {
  const entries = Object.entries(contexts).sort(([a], [b]) => a.localeCompare(b));
  const rows: AccountStatusRow[] = [];
  for (const [contextName, ctx] of entries) {
    const account = ctx.accountId ?? "(default)";
    if (ctx.service === "macos") {
      const { connection, account: macosAccount } = await evaluateMacosContext(ctx);
      rows.push({
        context: contextName,
        service: "macos",
        calendar: ctx.calendarId,
        account: macosAccount,
        connection,
      });
      continue;
    }
    const single = await buildAuthStatusRows({ [contextName]: ctx }, deps);
    const r = single[0]!;
    rows.push({
      context: r.context,
      service: r.service,
      calendar: r.calendar,
      account: r.account,
      connection: r.token as AccountConnectionState,
    });
  }
  return rows;
}

export function formatAccountStatusTable(rows: AccountStatusRow[]): string {
  const headers = ["CONTEXT", "SERVICE", "CALENDAR", "ACCOUNT", "CONNECTION"];
  const dataRows = rows.map((r) => [r.context, r.service, r.calendar, r.account, r.connection]);
  const all = [headers, ...dataRows.map((cols) => cols.map(String))];
  const widths = headers.map((_, colIdx) => Math.max(...all.map((row) => row[colIdx].length)));
  const sep = widths.map((w) => "-".repeat(w)).join("   ");
  const fmt = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("   ");
  return [fmt(headers), sep, ...dataRows.map((cols) => fmt(cols.map(String)))].join("\n");
}
