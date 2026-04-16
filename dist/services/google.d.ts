import { AbstractCalendarService } from "./base.js";
import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";
export declare class GoogleCalendarService extends AbstractCalendarService {
    private calendar;
    constructor(auth: any);
    private wrapApiError;
    getProviderId(): string;
    getCapabilities(): ProviderCapabilities;
    listCalendars(): Promise<CalendarInfo[]>;
    createCalendar(name: string): Promise<CalendarInfo>;
    deleteCalendar(calendarId: string): Promise<void>;
    listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]>;
    createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent>;
    updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
    deleteEvent(calendarId: string, eventId: string): Promise<void>;
}
