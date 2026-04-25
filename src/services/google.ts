import { google, calendar_v3 } from "googleapis";
import { AbstractCalendarService } from "./base.js";
import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";
import { ApiError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export class GoogleCalendarService extends AbstractCalendarService {
  private calendar: calendar_v3.Calendar;

  private static localTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  constructor(auth: any) {
    super();
    this.calendar = google.calendar({ version: "v3", auth });
  }

  private wrapApiError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : "Unknown Google API error";
    throw new ApiError(`Google API Error during ${operation}: ${message}`, {
      provider: "google",
      details: error,
    });
  }

  getProviderId(): string {
    return "google";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      webConferencing: true, // Google Meet support
      bulkOperations: true,
    };
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    try {
      const res = await this.calendar.calendarList.list();
      return (res.data.items || []).map((item) => ({
        id: item.id!,
        name: item.summary!,
        service: "google",
        isPrimary: item.primary || false,
        canEdit: item.accessRole === "owner" || item.accessRole === "writer",
      }));
    } catch (error) {
      this.wrapApiError(error, "listCalendars");
    }
  }

  async createCalendar(name: string): Promise<CalendarInfo> {
    try {
      const res = await this.calendar.calendars.insert({
        requestBody: { summary: name },
      });
      return {
        id: res.data.id!,
        name: res.data.summary!,
        service: "google",
        isPrimary: false,
        canEdit: true,
      };
    } catch (error) {
      this.wrapApiError(error, "createCalendar");
    }
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    try {
      await this.calendar.calendars.delete({ calendarId });
    } catch (error) {
      this.wrapApiError(error, "deleteCalendar");
    }
  }

  async listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    try {
      logger.debug("Google listEvents", { calendarId, start: start.toISOString(), end: end.toISOString() });
      const res = await this.calendar.events.list({
        calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return (res.data.items || []).map((item) => ({
        id: item.id!,
        summary: item.summary || "(No Title)",
        start: item.start?.dateTime || item.start?.date!,
        end: item.end?.dateTime || item.end?.date!,
        location: item.location || undefined,
        description: item.description || undefined,
        service: "google",
        calendarId,
      }));
    } catch (error) {
      this.wrapApiError(error, "listEvents");
    }
  }

  async createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent> {
    try {
      const tz = GoogleCalendarService.localTimeZone();
      const res = await this.calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.summary,
          start: { dateTime: event.start, timeZone: tz },
          end: { dateTime: event.end, timeZone: tz },
          location: event.location,
          description: event.description,
        },
      });

      return {
        id: res.data.id!,
        summary: res.data.summary!,
        start: res.data.start?.dateTime!,
        end: res.data.end?.dateTime!,
        service: "google",
        calendarId,
      };
    } catch (error) {
      this.wrapApiError(error, "createEvent");
    }
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const tz = GoogleCalendarService.localTimeZone();
      const res = await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          summary: event.summary,
          start: event.start ? { dateTime: event.start, timeZone: tz } : undefined,
          end: event.end ? { dateTime: event.end, timeZone: tz } : undefined,
          location: event.location,
          description: event.description,
        },
      });

      return {
        id: res.data.id!,
        summary: res.data.summary!,
        start: res.data.start?.dateTime!,
        end: res.data.end?.dateTime!,
        service: "google",
        calendarId,
      };
    } catch (error) {
      this.wrapApiError(error, "updateEvent");
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({ calendarId, eventId });
    } catch (error) {
      this.wrapApiError(error, "deleteEvent");
    }
  }
}
