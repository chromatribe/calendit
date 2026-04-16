import { CalendarEvent } from "../types/index.js";
import { ICalendarService } from "../services/base.js";
export interface ApplyOptions {
    dryRun?: boolean;
    sync?: boolean;
}
export interface ApplyResults {
    created: Partial<CalendarEvent>[];
    updated: {
        input: Partial<CalendarEvent>;
        existing: CalendarEvent;
        diffs: string[];
    }[];
    deleted: CalendarEvent[];
}
export declare class Applier {
    private service;
    constructor(service: ICalendarService);
    /**
     * カレンダーに予定を適用する
     */
    apply(calendarId: string, inputEvents: Partial<CalendarEvent>[], timerange?: {
        start: Date;
        end: Date;
    }, options?: ApplyOptions): Promise<ApplyResults>;
}
