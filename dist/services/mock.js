import * as fsSync from "fs";
import * as path from "path";
import * as os from "os";
import { AbstractCalendarService } from "./base.js";
const CONFIG_DIR = process.env.CALENDIT_CONFIG_DIR || path.join(os.homedir(), ".config", "calendit");
const MOCK_DB = path.join(CONFIG_DIR, "mock_db.json");
export class MockCalendarService extends AbstractCalendarService {
    events = [];
    providerId;
    constructor(providerId = "mock") {
        super();
        this.providerId = providerId;
        this.load();
    }
    load() {
        try {
            if (fsSync.existsSync(MOCK_DB)) {
                this.events = JSON.parse(fsSync.readFileSync(MOCK_DB, "utf-8"));
            }
            else {
                // Add a default event for TC-01 and others
                this.events.push({
                    id: "mock-default",
                    summary: "Default Event",
                    start: "2026-04-12T10:00:00+09:00",
                    end: "2026-04-12T11:00:00+09:00",
                    service: this.providerId,
                    calendarId: "primary",
                });
            }
        }
        catch (e) {
            this.events = [];
        }
    }
    save() {
        if (!fsSync.existsSync(CONFIG_DIR)) {
            fsSync.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fsSync.writeFileSync(MOCK_DB, JSON.stringify(this.events, null, 2));
    }
    getProviderId() {
        return this.providerId;
    }
    getCapabilities() {
        return {
            webConferencing: true,
            bulkOperations: true,
        };
    }
    async listCalendars() {
        return [
            { id: "primary", name: "Primary Calendar", service: this.providerId, isPrimary: true, canEdit: true },
            { id: "work", name: "Work Calendar", service: this.providerId, isPrimary: false, canEdit: true },
        ];
    }
    async createCalendar(name) {
        return { id: "new-cal", name, service: this.providerId, isPrimary: false, canEdit: true };
    }
    async deleteCalendar(calendarId) {
        console.log(`[Mock] Deleted calendar ${calendarId}`);
    }
    async listEvents(calendarId, start, end) {
        return this.events.filter(e => {
            const eStart = new Date(e.start);
            return eStart >= start && eStart <= end;
        });
    }
    async createEvent(calendarId, event) {
        const newEvent = {
            ...event,
            id: "mock-" + Math.random().toString(36).substr(2, 9),
            service: this.providerId,
            calendarId,
        };
        this.events.push(newEvent);
        this.save();
        return newEvent;
    }
    async updateEvent(calendarId, eventId, event) {
        const idx = this.events.findIndex(e => e.id === eventId);
        if (idx >= 0) {
            this.events[idx] = { ...this.events[idx], ...event };
            this.save();
            return this.events[idx];
        }
        throw new Error("Event not found");
    }
    async deleteEvent(calendarId, eventId) {
        this.events = this.events.filter(e => e.id !== eventId);
        this.save();
    }
}
