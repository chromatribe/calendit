import * as fsSync from "fs";
import * as path from "path";
import * as os from "os";
import { AbstractCalendarService } from "./base.js";
import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";

const CONFIG_DIR = process.env.CALENDIT_CONFIG_DIR || path.join(os.homedir(), ".config", "calendit");
const MOCK_DB = path.join(CONFIG_DIR, "mock_db.json");

export class MockCalendarService extends AbstractCalendarService {
  private events: CalendarEvent[] = [];
  private providerId: string;

  constructor(providerId: string = "mock") {
    super();
    this.providerId = providerId;
    this.load();
  }

  private load() {
    try {
      if (fsSync.existsSync(MOCK_DB)) {
        this.events = JSON.parse(fsSync.readFileSync(MOCK_DB, "utf-8"));
      } else {
        // Add a default event for TC-01 and others
        this.events.push({
          id: "mock-default",
          summary: "Default Event",
          start: "2026-04-12T10:00:00+09:00",
          end: "2026-04-12T11:00:00+09:00",
          service: this.providerId as any,
          calendarId: "primary",
        });
      }
    } catch (e) {
      this.events = [];
    }
  }

  private save() {
    if (!fsSync.existsSync(CONFIG_DIR)) {
      fsSync.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fsSync.writeFileSync(MOCK_DB, JSON.stringify(this.events, null, 2));
  }

  getProviderId(): string {
    return this.providerId;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      webConferencing: true,
      bulkOperations: true,
    };
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    return [
      { id: "primary", name: "Primary Calendar", service: this.providerId as any, isPrimary: true, canEdit: true },
      { id: "work", name: "Work Calendar", service: this.providerId as any, isPrimary: false, canEdit: true },
    ];
  }

  async createCalendar(name: string): Promise<CalendarInfo> {
    return { id: "new-cal", name, service: this.providerId as any, isPrimary: false, canEdit: true };
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    console.log(`[Mock] Deleted calendar ${calendarId}`);
  }

  async listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    return this.events.filter(e => {
      const eStart = new Date(e.start);
      return eStart >= start && eStart <= end;
    });
  }

  async createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      ...event,
      id: "mock-" + Math.random().toString(36).substr(2, 9),
      service: this.providerId as any,
      calendarId,
    };
    this.events.push(newEvent);
    this.save();
    return newEvent;
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const idx = this.events.findIndex(e => e.id === eventId);
    if (idx >= 0) {
      this.events[idx] = { ...this.events[idx], ...event };
      this.save();
      return this.events[idx];
    }
    throw new Error("Event not found");
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    this.events = this.events.filter(e => e.id !== eventId);
    this.save();
  }
}
