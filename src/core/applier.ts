import { CalendarEvent } from "../types/index.js";
import { ICalendarService } from "../services/base.js";
import { ValidationError } from "./errors.js";
import { logger } from "./logger.js";

export interface ApplyOptions {
  dryRun?: boolean;
  sync?: boolean;
}

export interface ApplyResults {
  created: Partial<CalendarEvent>[];
  updated: { input: Partial<CalendarEvent>; existing: CalendarEvent; diffs: string[] }[];
  deleted: CalendarEvent[];
}

export class Applier {
  constructor(private service: ICalendarService) {}

  /**
   * カレンダーに予定を適用する
   */
  async apply(
    calendarId: string,
    inputEvents: Partial<CalendarEvent>[],
    timerange?: { start: Date; end: Date },
    options: ApplyOptions = {}
  ): Promise<ApplyResults> {
    // 1. バリデーション
    const errors: string[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < inputEvents.length; i++) {
      const event = inputEvents[i];
      const label = event.summary || `Event #${i + 1}`;

      if (event.id) {
        if (seenIds.has(event.id)) {
          errors.push(`Duplicate ID found: ${event.id} (${label})`);
        }
        seenIds.add(event.id);
      }

      if (event.start && event.end) {
        if (new Date(event.start) >= new Date(event.end)) {
          errors.push(`Invalid time range: ${label} (${event.start} - ${event.end})`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `入力イベントに不整合があります:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
        "重複ID・開始終了時刻の逆転を修正してから再実行してください。",
      );
    }

    let range = timerange;

    if (!range) {
      if (options.sync) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        range = { start, end };
        logger.info(`Sync range fallback applied: ${start.toISOString()} to ${end.toISOString()}`);
      }
    }

    if (!range) {
      // 範囲を特定できない場合は空の実行とする（安全のため全削除は行わない）
      return { created: [], updated: [], deleted: [] };
    }

    // 現在の予定を取得
    const existingEvents = await this.service.listEvents(calendarId, range.start, range.end);
    const existingMap = new Map(existingEvents.map((e) => [e.id, e]));

    const results: ApplyResults = {
      created: [],
      updated: [],
      deleted: [],
    };

    // 1. 追加・更新
    for (const input of inputEvents) {
      if (input.id && existingMap.has(input.id)) {
        // 更新
        const existing = existingMap.get(input.id)!;
        const diffs: string[] = [];
        
        if (input.summary && input.summary !== existing.summary) {
          diffs.push(`Summary: "${existing.summary}" -> "${input.summary}"`);
        }
        // Compare as timestamps to avoid false diffs from timezone format differences
        if (input.start && new Date(input.start).getTime() !== new Date(existing.start).getTime()) {
          diffs.push(`Start: ${existing.start} -> ${input.start}`);
        }
        if (input.end && new Date(input.end).getTime() !== new Date(existing.end).getTime()) {
          diffs.push(`End: ${existing.end} -> ${input.end}`);
        }

        if (diffs.length > 0) {
          if (options.dryRun) {
            logger.info(`[Dry Run] Update: ${input.summary || existing.summary} (${input.id})`);
            diffs.forEach(d => logger.info(`  └ ${d}`));
          } else {
            await this.service.updateEvent(calendarId, input.id, input);
          }
          results.updated.push({ input, existing, diffs });
        }
        existingMap.delete(input.id); // 処理済みとして削除
      } else {
        if (input.id) {
          logger.warn(
            `Event ID "${input.id}" (${input.summary || "(no title)"}) was not found in the fetched range — creating a new event. ` +
              "If you meant to update an existing event (e.g. after moving it to another day in the file), widen the fetch window with `calendit apply --start … --end …`.",
          );
        }
        // 新規作成
        if (options.dryRun) {
          logger.info(`[Dry Run] Create: ${input.summary}`);
        } else {
          // 型の整合性のために必要な情報を補完
          await this.service.createEvent(calendarId, {
            summary: input.summary || "(No Title)",
            start: input.start!,
            end: input.end!,
            location: input.location,
            description: input.description,
          });
        }
        results.created.push(input);
      }
    }

    // 2. 削除 (Sync モード時)
    if (options.sync) {
      for (const [id, event] of existingMap.entries()) {
        if (options.dryRun) {
          logger.info(`[Dry Run] Delete: ${event.summary} (${id})`);
        } else {
          await this.service.deleteEvent(calendarId, id!);
        }
        results.deleted.push(event);
      }
    }

    return results;
  }
}
