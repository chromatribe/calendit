import { CalendarEvent } from "../types/index.js";
export interface ParseResult {
    events: Partial<CalendarEvent>[];
    warnings: string[];
}
export declare class Formatter {
    /**
     * 予定の配列を CSV 文字列に変換
     */
    static toCsv(events: CalendarEvent[]): string;
    /**
     * CSV 文字列を予定の配列に変換
     */
    static fromCsv(csv: string): CalendarEvent[];
    /**
     * 予定の配列を Markdown 文字列に変換
     */
    static toMarkdown(events: CalendarEvent[]): string;
    /**
     * Markdown 文字列から予定を抽出
     * 形式: - [ ] **Title** (HH:mm - HH:mm) (ID: id)
     * インデントされた行は説明文として扱う
     */
    static fromMarkdown(md: string, strict?: boolean): ParseResult;
    private static groupByDate;
    private static formatTime;
}
