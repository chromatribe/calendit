import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { z } from "zod";
import { ConfigError } from "./errors.js";
import { ContextConfig, FullAppConfig, GoogleCredentials, OutlookCredentials } from "../types/index.js";

const CONFIG_DIR = process.env.CALENDIT_CONFIG_DIR || path.join(os.homedir(), ".config", "calendit");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const contextConfigSchema = z.object({
  service: z.enum(["google", "outlook"]),
  calendarId: z.string().min(1),
  accountId: z.string().optional(),
  fields: z.array(z.string()).optional(),
  defaultFormat: z.enum(["csv", "md", "json"]).optional(),
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
});

export class ConfigManager {
  private config: FullAppConfig = { contexts: {} };

  constructor() {}

  async load() {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    try {
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data);
      this.config = fullAppConfigSchema.parse(parsed);
    } catch (e: any) {
      if (e && (e.code === "ENOENT" || /no such file/i.test(String(e.message)))) {
        throw new ConfigError(
          "設定ファイルが見つかりません。",
          "初回は `calendit config set-google --id <id> --secret <secret>` などでセットアップしてください。",
        );
      }
      if (e instanceof z.ZodError) {
        throw new ConfigError(
          "設定ファイルの形式が不正です。",
          `config.json を確認してください。詳細: ${e.issues.map((issue) => issue.message).join(", ")}`,
        );
      }
      throw new ConfigError("設定ファイルの読み込みに失敗しました。", "config.json のJSON形式を確認してください。");
    }
  }

  async save() {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
  }

  getContext(name: string): ContextConfig | undefined {
    return this.config.contexts[name];
  }

  setContext(name: string, context: ContextConfig) {
    this.config.contexts[name] = context;
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
}
