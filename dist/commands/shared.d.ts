import { ConfigManager } from "../core/config.js";
import { AuthManager } from "../core/auth.js";
import { GoogleCalendarService } from "../services/google.js";
import { OutlookCalendarService } from "../services/outlook.js";
import { MockCalendarService } from "../services/mock.js";
export interface CommandDeps {
    config: ConfigManager;
    auth: AuthManager;
}
export interface ResolvedService {
    service: GoogleCalendarService | OutlookCalendarService | MockCalendarService;
    calendarId: string;
    serviceType: "google" | "outlook" | "mock";
}
export declare function loadConfigIfExists(config: ConfigManager): Promise<void>;
export declare function getServiceForContext(deps: CommandDeps, contextName?: string): Promise<ResolvedService>;
