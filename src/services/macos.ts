import { AbstractCalendarService } from "./base.js";
import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";
import { ApiError } from "../core/errors.js";
import { runEventkitHelper } from "../core/eventkitHelper.js";
import { logger } from "../core/logger.js";

export class MacosCalendarService extends AbstractCalendarService {
  getProviderId(): string {
    return "macos";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      webConferencing: false,
      bulkOperations: true,
    };
  }

  private wrapError(err: unknown, op: string): never {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(`macOS EventKit (${op}): ${msg}`, { provider: "macos", details: err });
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    try {
      const { stdout } = await runEventkitHelper(["list-calendars"]);
      const data = JSON.parse(stdout.trim()) as {
        calendars: Array<{
          calendarIdentifier: string;
          title: string;
          sourceTitle: string;
          allowsContentModification: boolean;
        }>;
      };
      return (data.calendars || []).map((c) => ({
        id: c.calendarIdentifier,
        name: `${c.title} (${c.sourceTitle})`,
        service: "macos" as const,
        isPrimary: false,
        canEdit: c.allowsContentModification,
      }));
    } catch (e) {
      this.wrapError(e, "listCalendars");
    }
  }

  async createCalendar(_name: string): Promise<CalendarInfo> {
    throw new ApiError("macOS EventKit: createCalendar は未対応です。", { provider: "macos" });
  }

  async deleteCalendar(_calendarId: string): Promise<void> {
    throw new ApiError("macOS EventKit: deleteCalendar は未対応です。", { provider: "macos" });
  }

  async listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    try {
      logger.debug("Macos listEvents", { calendarId, start: start.toISOString(), end: end.toISOString() });
      const { stdout } = await runEventkitHelper([
        "list-events",
        calendarId,
        start.toISOString(),
        end.toISOString(),
      ]);
      const data = JSON.parse(stdout.trim()) as { events: CalendarEvent[] };
      return data.events || [];
    } catch (e) {
      this.wrapError(e, "listEvents");
    }
  }

  async createEvent(
    calendarId: string,
    event: Omit<CalendarEvent, "id" | "service" | "calendarId">,
  ): Promise<CalendarEvent> {
    try {
      const body: Record<string, unknown> = {
        calendarId,
        summary: event.summary,
        start: event.start,
        end: event.end,
        location: event.location,
        description: event.description,
      };
      if (event.attendees?.length) {
        body.attendees = event.attendees;
      }
      const { stdout } = await runEventkitHelper(["create-event"], {
        stdin: JSON.stringify(body),
      });
      const raw = JSON.parse(stdout.trim()) as Record<string, unknown>;
      if (raw.attendeesOmitted) {
        logger.warn("macOS EventKit: attendees はこのビルドでは保存されませんでした（EventKit の制限）。");
      }
      delete raw.attendeesOmitted;
      const row = raw as unknown as CalendarEvent;
      return { ...row, service: "macos", calendarId };
    } catch (e) {
      this.wrapError(e, "createEvent");
    }
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const patch: Record<string, unknown> = {};
      if (event.summary !== undefined) patch.summary = event.summary;
      if (event.start !== undefined) patch.start = event.start;
      if (event.end !== undefined) patch.end = event.end;
      if (event.location !== undefined) patch.location = event.location;
      if (event.description !== undefined) patch.description = event.description;
      const stdin = JSON.stringify({ calendarId, eventId, patch });
      const { stdout } = await runEventkitHelper(["update-event"], { stdin });
      const row = JSON.parse(stdout.trim()) as CalendarEvent;
      return { ...row, service: "macos", calendarId };
    } catch (e) {
      this.wrapError(e, "updateEvent");
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await runEventkitHelper(["delete-event", calendarId, eventId]);
    } catch (e) {
      this.wrapError(e, "deleteEvent");
    }
  }
}
