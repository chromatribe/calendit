import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";
import { z } from "zod";
import { ValidationError } from "./errors.js";
import { logger } from "./logger.js";
const partialEventSchema = z.object({
    id: z.string().optional(),
    summary: z.string().min(1, "summary is required"),
    start: z.string().datetime({ local: true }),
    end: z.string().datetime({ local: true }),
    location: z.string().optional(),
    description: z.string().optional(),
});
export class Formatter {
    /**
     * 予定の配列を CSV 文字列に変換
     */
    static toCsv(events) {
        return stringifyCsv(events, {
            header: true,
            columns: ["id", "summary", "start", "end", "location", "description", "service", "calendarId"],
        });
    }
    /**
     * CSV 文字列を予定の配列に変換
     */
    static fromCsv(csv) {
        const records = parseCsv(csv, {
            columns: true,
            skip_empty_lines: true,
        });
        return records;
    }
    /**
     * 予定の配列を Markdown 文字列に変換
     */
    static toMarkdown(events) {
        let md = "# 予定一覧\n\n";
        const grouped = this.groupByDate(events);
        for (const [date, dayEvents] of Object.entries(grouped)) {
            md += `## ${date}\n`;
            for (const e of dayEvents) {
                const timeRange = `${this.formatTime(e.start)} - ${this.formatTime(e.end)}`;
                md += `- [ ] **${e.summary}** (${timeRange}) (ID: ${e.id || "new"})\n`;
                if (e.description)
                    md += `  - ${e.description.replace(/\n/g, "\n    ")}\n`;
            }
            md += "\n";
        }
        return md;
    }
    /**
     * Markdown 文字列から予定を抽出
     * 形式: - [ ] **Title** (HH:mm - HH:mm) (ID: id)
     * インデントされた行は説明文として扱う
     */
    static fromMarkdown(md, strict = false) {
        const events = [];
        const warnings = [];
        const lines = md.split("\n");
        let currentDate = "";
        let currentEvent = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                currentDate = dateMatch[1];
                currentEvent = null;
                continue;
            }
            // イベント行のパース: - [ ] **Summary** (HH:mm - HH:mm) (ID: id)
            // より柔軟に、末尾の (ID: ...) を優先的に探す。ID内のスペースや末尾のスペースを許容。
            const eventRowMatch = line.match(/^-\s+\[.\]\s+(.+)\((ID:\s*[^)]+)\)\s*$/);
            if (eventRowMatch && currentDate) {
                const fullContent = eventRowMatch[1].trim();
                const idPart = eventRowMatch[2];
                const idMatch = idPart.match(/ID:\s+(.+)/);
                const id = idMatch ? idMatch[1] : undefined;
                // タイトルと時間帯を分離: **Summary** (HH:mm - HH:mm)
                // 後ろから最初の (XX:XX - XX:XX) を探す
                const timeMatch = fullContent.match(/\((?:\d{1,2}:\d{2})\s*-\s*(?:\d{1,2}:\d{2})\)$/);
                if (timeMatch) {
                    const timeRangeStr = timeMatch[0];
                    const summaryPart = fullContent.replace(timeRangeStr, "").trim();
                    const summary = summaryPart.replace(/^\*\*(.+)\*\*$/, "$1"); // ** で囲まれていれば外す
                    const times = timeRangeStr.slice(1, -1).split("-").map(t => t.trim());
                    const start = `${currentDate}T${times[0]}:00`;
                    let end = `${currentDate}T${times[1]}:00`;
                    if (times[1] < times[0]) {
                        // End time is earlier than start time -> assume next day
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() + 1);
                        const nextDay = d.toISOString().split("T")[0];
                        end = `${nextDay}T${times[1]}:00`;
                    }
                    currentEvent = {
                        id: id === "new" ? undefined : id,
                        summary,
                        start,
                        end,
                        description: "",
                    };
                    events.push(currentEvent);
                }
                else {
                    warnings.push(`[Line ${i + 1}] Skip: Time range format is invalid.`);
                }
                continue;
            }
            else if (line.trim().startsWith("- [ ]")) {
                warnings.push(`[Line ${i + 1}] Skip: Line matches event pattern but ID or Date is missing.`);
            }
            // 説明文のパース: インデントされた行 かつ 直前にイベントがある場合
            if (currentEvent && line.startsWith("  ")) {
                const descMatch = line.match(/^\s+-\s+(.+)$/);
                const descLine = descMatch ? descMatch[1] : line.trim();
                if (currentEvent.description) {
                    currentEvent.description += "\n" + descLine;
                }
                else {
                    currentEvent.description = descLine;
                }
            }
            else {
                // それ以外の行はイベントの説明文モードを終了
                if (line.trim() !== "" && !line.startsWith("- ")) {
                    // currentEvent = null;
                }
            }
        }
        for (const [index, event] of events.entries()) {
            const parsed = partialEventSchema.safeParse(event);
            if (!parsed.success) {
                const detail = parsed.error.issues.map((issue) => issue.message).join(", ");
                const message = `Event #${index + 1} validation failed: ${detail}`;
                if (strict) {
                    throw new ValidationError(message, "Markdown の予定行と時刻形式を確認してください。");
                }
                warnings.push(message);
            }
        }
        warnings.forEach((warning) => logger.warn(warning));
        return { events, warnings };
    }
    static groupByDate(events) {
        const groups = {};
        for (const e of events) {
            const date = e.start.split("T")[0];
            if (!groups[date])
                groups[date] = [];
            groups[date].push(e);
        }
        return groups;
    }
    static formatTime(iso) {
        if (!iso)
            return "??:??";
        const date = new Date(iso);
        // システムのタイムゾーンで HH:mm 形式にする
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }
}
