import { PublicClientApplication, SilentFlowRequest } from "@azure/msal-node";
import { AbstractCalendarService } from "./base.js";
import { CalendarEvent, CalendarInfo, ProviderCapabilities } from "../types/index.js";
import { ApiError, AuthError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export class OutlookCalendarService extends AbstractCalendarService {
  private pca: PublicClientApplication;
  private account: any;

  constructor(pca: PublicClientApplication, account: any) {
    super();
    this.pca = pca;
    this.account = account;
  }

  getProviderId(): string {
    return "outlook";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      webConferencing: false, // Not yet implemented for Outlook
      bulkOperations: true,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (!this.account) {
      throw new AuthError(
        "Outlook の認証アカウントが見つかりません。",
        "`calendit auth login outlook --set <context>` を再実行してください。",
      );
    }
    const silentRequest: SilentFlowRequest = {
      account: this.account,
      scopes: ["Calendars.ReadWrite", "offline_access"],
    };
    const response = await this.pca.acquireTokenSilent(silentRequest);
    if (!response?.accessToken) {
      throw new AuthError(
        "Outlook のアクセストークンを取得できませんでした。",
        "再ログインしてから再度実行してください。",
      );
    }
    return response.accessToken;
  }

  private async request(path: string, options: RequestInit = {}) {
    const token = await this.getAccessToken();
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const url = `https://graph.microsoft.com/v1.0${path}`;
    logger.debug("Outlook request", { url, method: options.method || "GET" });
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      const code = errorData?.error?.code;
      const message = errorData?.error?.message || response.statusText;
      throw new ApiError(`Outlook API Error${code ? ` (${code})` : ""}: ${message}`, {
        provider: "outlook",
        statusCode: response.status,
        details: errorData,
      });
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const data = await this.request("/me/calendars");
    return data.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      service: "outlook",
      isPrimary: item.isDefaultCalendar || false,
      canEdit: item.canEdit || true,
    }));
  }

  async createCalendar(name: string): Promise<CalendarInfo> {
    const data = await this.request("/me/calendars", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return {
      id: data.id,
      name: data.name,
      service: "outlook",
      isPrimary: false,
      canEdit: true,
    };
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.request(`/me/calendars/${calendarId}`, { method: "DELETE" });
  }

  private calendarPath(calendarId: string): string {
    // "primary" is a Google concept; Outlook's default calendar is /me/calendar
    return calendarId === "primary" ? "/me/calendar" : `/me/calendars/${calendarId}`;
  }

  async listEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const data = await this.request(
      `${this.calendarPath(calendarId)}/calendarView?startDateTime=${startStr}&endDateTime=${endStr}`,
      { headers: { Prefer: `outlook.timezone="${localTimeZone}"` } },
    );

    return data.value.map((item: any) => ({
      id: item.id,
      summary: item.subject || "(No Title)",
      // Graph returns local time with no offset when Prefer header is set; append offset for correct parsing
      start: item.start.dateTime,
      end: item.end.dateTime,
      location: item.location?.displayName || undefined,
      description: item.bodyPreview || undefined,
      service: "outlook",
      calendarId,
    }));
  }

  async createEvent(calendarId: string, event: Omit<CalendarEvent, "id" | "service" | "calendarId">): Promise<CalendarEvent> {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const data = await this.request(`${this.calendarPath(calendarId)}/events`, {
      method: "POST",
      body: JSON.stringify({
        subject: event.summary,
        start: { dateTime: event.start, timeZone: localTimeZone },
        end: { dateTime: event.end, timeZone: localTimeZone },
        location: { displayName: event.location },
        body: { contentType: "Text", content: event.description },
      }),
    });

    return {
      id: data.id,
      summary: data.subject,
      start: data.start.dateTime,
      end: data.end.dateTime,
      service: "outlook",
      calendarId,
    };
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const body: any = {};
    if (event.summary) body.subject = event.summary;
    if (event.start) body.start = { dateTime: event.start, timeZone: localTimeZone };
    if (event.end) body.end = { dateTime: event.end, timeZone: localTimeZone };
    if (event.location) body.location = { displayName: event.location };
    if (event.description) body.body = { contentType: "Text", content: event.description };

    const data = await this.request(`/me/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return {
      id: data.id,
      summary: data.subject,
      start: data.start.dateTime,
      end: data.end.dateTime,
      service: "outlook",
      calendarId,
    };
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request(`/me/events/${eventId}`, { method: "DELETE" });
  }
}
