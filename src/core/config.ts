import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { z } from "zod";
import { ConfigError } from "./errors.js";
import {
  AppEventkitConfig,
  AppUiConfig,
  ContextConfig,
  FullAppConfig,
  GoogleCredentials,
  OutlookCredentials,
} from "../types/index.js";
import { t } from "./i18n.js";

export function getCalenditConfigDir(): string {
  return process.env.CALENDIT_CONFIG_DIR || path.join(os.homedir(), ".config", "calendit");
}

/** Google OAuth トークンファイルの絶対パス（`auth login` と `getServiceForContext` と同一ルール） */
export function getGoogleTokenFilePath(accountId?: string): string {
  const filename = accountId ? `google_token_${accountId}.json` : "google_token.json";
  return path.join(getCalenditConfigDir(), filename);
}

const CONFIG_DIR = getCalenditConfigDir();
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const contextConfigSchema = z.object({
  service: z.enum(["google", "outlook", "macos"]),
  calendarId: z.string().min(1),
  accountId: z.string().optional(),
  fields: z.array(z.string()).optional(),
  defaultFormat: z.enum(["csv", "md", "json"]).optional(),
});

const uiConfigSchema = z.object({
  locale: z.enum(["en", "ja"]),
  localePromptCompleted: z.boolean().optional(),
});

const fullAppConfigSchema = z.object({
  contexts: z.record(z.string(), contextConfigSchema),
  google_creds: z
    .object({
      id: z.string().min(1),
      secret: z.string().min(1),
    })
    .optional(),
  outlook_creds: z
    .object({
      id: z.string().min(1),
      tenantId: z.string().min(1).default("common"),
    })
    .optional(),
  ui: uiConfigSchema.optional(),
  eventkit: z
    .object({
      defaultTransport: z.enum(["auto", "bridge", "helper"]),
    })
    .optional(),
});

function defaultUi(): AppUiConfig {
  return { locale: "en", localePromptCompleted: true };
}

function ensureUiMerged(config: FullAppConfig): void {
  if (!config.ui) {
    config.ui = defaultUi();
  }
}

export class ConfigManager {
  private config: FullAppConfig = { contexts: {}, ui: defaultUi() };

  constructor() {}

  getUi(): AppUiConfig | undefined {
    return this.config.ui;
  }

  setUi(ui: AppUiConfig): void {
    this.config.ui = ui;
  }

  /** Replace in-memory config with minimal file (first-run language choice). */
  resetMinimalWithUi(locale: "en" | "ja"): void {
    this.config = {
      contexts: {},
      ui: { locale, localePromptCompleted: true },
    };
  }

  async loadOptional(): Promise<boolean> {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    try {
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data);
      this.config = fullAppConfigSchema.parse(parsed);
      ensureUiMerged(this.config);
      return true;
    } catch (e: any) {
      if (e && (e.code === "ENOENT" || /no such file/i.test(String(e.message)))) {
        return false;
      }
      if (e instanceof z.ZodError) {
        throw new ConfigError(
          t("errors.config.invalidFormat"),
          t("errors.config.invalidFormatDetails", { details: e.issues.map((issue) => issue.message).join(", ") }),
          "invalid_schema",
        );
      }
      throw new ConfigError(t("errors.config.readFailed"), t("errors.config.readFailedHint"), "read_failed");
    }
  }

  async load() {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    try {
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data);
      this.config = fullAppConfigSchema.parse(parsed);
      ensureUiMerged(this.config);
    } catch (e: any) {
      if (e && (e.code === "ENOENT" || /no such file/i.test(String(e.message)))) {
        throw new ConfigError(
          t("errors.config.fileNotFound"),
          t("errors.config.fileNotFoundHint"),
          "missing_file",
        );
      }
      if (e instanceof z.ZodError) {
        throw new ConfigError(
          t("errors.config.invalidFormat"),
          t("errors.config.invalidFormatDetails", { details: e.issues.map((issue) => issue.message).join(", ") }),
          "invalid_schema",
        );
      }
      throw new ConfigError(t("errors.config.readFailed"), t("errors.config.readFailedHint"), "read_failed");
    }
  }

  async save() {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    ensureUiMerged(this.config);
    await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
  }

  getContext(name: string): ContextConfig | undefined {
    return this.config.contexts[name];
  }

  setContext(name: string, context: ContextConfig) {
    this.config.contexts[name] = context;
  }

  deleteContext(name: string): boolean {
    if (!(name in this.config.contexts)) return false;
    delete this.config.contexts[name];
    return true;
  }

  getAllContexts() {
    return this.config.contexts;
  }

  getGoogleCreds(): GoogleCredentials | undefined {
    return this.config.google_creds;
  }

  setGoogleCreds(id: string, secret: string) {
    this.config.google_creds = { id, secret };
  }

  getOutlookCreds(): OutlookCredentials | undefined {
    return this.config.outlook_creds;
  }

  setOutlookCreds(id: string, tenantId: string) {
    this.config.outlook_creds = { id, tenantId };
  }

  getEventkitDefaultTransport(): AppEventkitConfig["defaultTransport"] | undefined {
    return this.config.eventkit?.defaultTransport;
  }

  setEventkitDefaultTransport(value: AppEventkitConfig["defaultTransport"]): void {
    this.config.eventkit = { defaultTransport: value };
  }
}
