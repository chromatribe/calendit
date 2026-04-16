import { PublicClientApplication } from "@azure/msal-node";
import { AbstractCalendarService } from "./base.js";
import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";
export declare class OutlookCalendarService extends AbstractCalendarService {
    private pca;
    private account;
    constructor(pca: PublicClientApplication, account: any);
    getProviderId(): string;
    getCapabilities(): ProviderCapabilities;
    private getAccessToken;
    private request;
    listCalendars(): Promise<CalendarInfo[]>;
    createCalendar(name: string): Promise<CalendarInfo>;
    deleteCalendar(calendarId: string): Promise<void>;
    listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]>;
    createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent>;
    updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
    deleteEvent(calendarId: string, eventId: string): Promise<void>;
}
