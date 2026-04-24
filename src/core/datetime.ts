import { formatInTimeZone } from "date-fns-tz";
import { ValidationError } from "./errors.js";
import { logger } from "./logger.js";
import { t } from "./i18n.js";

/**
 * サポート形式:
 * - today
 * - tomorrow
 * - today HH:mm
 * - tomorrow HH:mm
 * - HH:mm
 * - YYYY-MM-DD
 * - YYYY-MM-DD HH:mm
 * - ISO 8601
 */
export function parseDateTime(input: string | undefined, defaultOffset: number = 0): Date {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const todayStr = formatInTimeZone(today, timeZone, "yyyy-MM-dd");
  const tomorrowStr = formatInTimeZone(tomorrow, timeZone, "yyyy-MM-dd");

  let date: Date;
  const raw = input?.trim();

  if (!raw || raw === "today") {
    date = new Date(today.getTime() + defaultOffset * 24 * 60 * 60 * 1000);
  } else if (raw === "tomorrow") {
    date = new Date(tomorrow.getTime() + defaultOffset * 24 * 60 * 60 * 1000);
  } else if (/^tomorrow\s+\d{1,2}:\d{2}$/.test(raw)) {
    const time = raw.split(/\s+/)[1];
    date = new Date(`${tomorrowStr}T${time}:00`);
  } else if (/^today\s+\d{1,2}:\d{2}$/.test(raw)) {
    const time = raw.split(/\s+/)[1];
    date = new Date(`${todayStr}T${time}:00`);
  } else if (/^\d{1,2}:\d{2}$/.test(raw)) {
    date = new Date(`${todayStr}T${raw}:00`);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    date = new Date(y, m - 1, d);
  } else if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}$/.test(raw)) {
    // YYYY-MM-DD HH:mm (スペース区切り)
    const [datePart, timePart] = raw.split(/\s+/);
    date = new Date(`${datePart}T${timePart}:00`);
  } else if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    date = new Date(raw);
  } else {
    throw new ValidationError(
      t("errors.datetime.invalidFormat", { input: input ?? "" }),
      "e.g. `today 10:00`, `tomorrow`, `2026-04-16`, `2026-04-16 10:00`, `2026-04-16T10:00:00+09:00`",
    );
  }

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(
      t("errors.datetime.invalidParse", { input: input ?? "" }),
      t("errors.datetime.invalidParseHint"),
    );
  }

  logger.debug("parseDateTime", { input, parsed: date.toISOString() });
  return date;
}
