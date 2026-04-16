import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";
export interface ICalendarService {
    getProviderId(): string;
    getCapabilities(): ProviderCapabilities;
    /**
     * カレンダーの一覧を取得
     */
    listCalendars(): Promise<CalendarInfo[]>;
    /**
     * カレンダーを作成
     */
    createCalendar(name: string): Promise<CalendarInfo>;
    /**
     * カレンダーを削除
     */
    deleteCalendar(calendarId: string): Promise<void>;
    /**
     * 指定期間の予定を取得
     */
    listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]>;
    /**
     * 予定を追加
     */
    createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent>;
    /**
     * 予定を更新
     */
    updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
    /**
     * 予定を削除
     */
    deleteEvent(calendarId: string, eventId: string): Promise<void>;
}
export declare abstract class AbstractCalendarService implements ICalendarService {
    abstract getProviderId(): string;
    abstract getCapabilities(): ProviderCapabilities;
    abstract listCalendars(): Promise<CalendarInfo[]>;
    abstract createCalendar(name: string): Promise<CalendarInfo>;
    abstract deleteCalendar(calendarId: string): Promise<void>;
    abstract listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]>;
    abstract createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent>;
    abstract updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
    abstract deleteEvent(calendarId: string, eventId: string): Promise<void>;
    /**
     * 予定データの正規化 (共通処理)
     */
    protected normalizeEvent(event: Partial<CalendarEvent>): Partial<CalendarEvent>;
    /**
     * エラーの正規化 (各サービスでオーバーライド可能)
     */
    protected normalizeError(error: any): Error;
}
