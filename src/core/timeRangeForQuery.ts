import { parseDateTime } from "./datetime.js";
import { ValidationError } from "./errors.js";
import type { CalendarEvent } from "../types/index.js";

/**
 * `query` と同じ解釈で期間を返す（`query` サブコマンド用）。
 * `start` が相対期間 `7d` 形式の場合は、当日 0 時から N 日後まで。
 * 絶対日付の場合で `end` 省略は `start` から 24h 後。
 */
export function parseTimeRangeForQuery(
  start: string | undefined,
  end: string | undefined,
  now: Date,
): { start: Date; end: Date } {
  if (start && /^\d+[dwm]$/.test(start)) {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const amount = parseInt(start, 10);
    const unit = start.slice(-1);
    const ms =
      unit === "d" ? amount * 24 * 3600 * 1000 : unit === "w" ? amount * 7 * 24 * 3600 * 1000 : amount * 30 * 24 * 3600 * 1000;
    return { start: s, end: new Date(s.getTime() + ms) };
  }
  const s = parseDateTime(start);
  const e = end ? parseDateTime(end) : new Date(s.getTime() + 24 * 60 * 60 * 1000);
  if (e <= s) {
    throw new ValidationError("Invalid time range: end must be after start.");
  }
  return { start: s, end: e };
}

/**
 * 入力予定の開始・終了の min–max から 1 日区切りの同期レンジを作る（`apply` 自動検知相当）。
 */
export function computeInputAutoRange(inputEvents: Partial<CalendarEvent>[]): { start: Date; end: Date } | undefined {
  if (inputEvents.length === 0) return undefined;

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const event of inputEvents) {
    if (event.start) {
      const t = new Date(event.start).getTime();
      if (t < minStart) minStart = t;
    }
    if (event.end) {
      const t = new Date(event.end).getTime();
      if (t > maxEnd) maxEnd = t;
    }
  }
  if (minStart === Infinity || maxEnd === -Infinity) return undefined;

  const start = new Date(minStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(maxEnd);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * 自動検知レンジと `apply --start/--end` レンジを和集合（最小幅に包含する端点）でまとめる。
 */
export function mergeApplySyncRanges(
  auto: { start: Date; end: Date } | undefined,
  cli: { start: Date; end: Date } | undefined,
): { start: Date; end: Date } | undefined {
  if (!auto && !cli) return undefined;
  if (!auto) return cli;
  if (!cli) return auto;
  return {
    start: new Date(Math.min(auto.start.getTime(), cli.start.getTime())),
    end: new Date(Math.max(auto.end.getTime(), cli.end.getTime())),
  };
}

/**
 * `apply` 専用: どちらも未指定なら `undefined`。
 * `--end` だけ（`--start` なし）なら不可。
 * 上記以外は `query` と同じ期間解釈。
 */
export function parseOptionalTimeRangeForApply(
  start: string | undefined,
  end: string | undefined,
  now: Date,
): { start: Date; end: Date } | undefined {
  if (!start && !end) return undefined;
  if (!start && end) {
    throw new ValidationError(
      "apply: --start is required when --end is set.",
      "Use --start and --end together, or omit both for auto-detected range from the input file.",
    );
  }
  return parseTimeRangeForQuery(start, end, now);
}
