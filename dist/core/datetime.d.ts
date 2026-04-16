/**
 * サポート形式:
 * - today
 * - tomorrow
 * - today HH:mm
 * - tomorrow HH:mm
 * - HH:mm
 * - YYYY-MM-DD
 * - ISO 8601
 */
export declare function parseDateTime(input: string | undefined, defaultOffset?: number): Date;
