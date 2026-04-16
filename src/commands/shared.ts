import { ConfigManager } from "../core/config.js";
import { AuthManager } from "../core/auth.js";
import { GoogleCalendarService } from "../services/google.js";
import { OutlookCalendarService } from "../services/outlook.js";
import { MockCalendarService } from "../services/mock.js";
import { ConfigError } from "../core/errors.js";

export interface CommandDeps {
  config: ConfigManager;
  auth: AuthManager;
}

export interface ResolvedService {
  service: GoogleCalendarService | OutlookCalendarService | MockCalendarService;
  calendarId: string;
  serviceType: "google" | "outlook" | "mock";
}

export async function loadConfigIfExists(config: ConfigManager): Promise<void> {
  try {
    await config.load();
  } catch (err) {
    if (err instanceof ConfigError && err.message.includes("見つかりません")) {
      return;
    }
    throw err;
  }
}

export async function getServiceForContext(deps: CommandDeps, contextName?: string): Promise<ResolvedService> {
  const { config, auth } = deps;

  try {
    await config.load();
  } catch (err) {
    if (err instanceof ConfigError) {
      throw new ConfigError(
        "Failed to load configuration. Run 'calendit --help' for setup instructions.",
        "初回は `calendit config set-google` などで設定を作成してください。",
      );
    }
    throw err;
  }

  const ctx = contextName
    ? config.getContext(contextName)
    : { service: "google" as const, calendarId: "primary", accountId: undefined };

  if (!ctx) {
    throw new ConfigError(
      `Context '${contextName}' が見つかりません。`,
      `\`calendit config set-context ${contextName} --service google --calendar primary\` を実行してください。`,
    );
  }

  if (process.env.CALENDIT_MOCK === "true") {
    return {
      service: new MockCalendarService(ctx.service),
      calendarId: ctx.calendarId,
      serviceType: "mock",
    };
  }

  if (ctx.service === "google") {
    const creds = config.getGoogleCreds();
    if (!creds) {
      throw new ConfigError(
        "Google 認証情報が未設定です。",
        "`calendit config set-google --id <id> --secret <secret>` を実行してください。",
      );
    }
    // Token file is keyed by contextName (used during `auth login --set`), falling back to accountId
    const tokenKey = contextName || ctx.accountId;
    const oauth2Client = await auth.getGoogleAuth(creds.id, creds.secret, tokenKey);
    return {
      service: new GoogleCalendarService(oauth2Client),
      calendarId: ctx.calendarId,
      serviceType: "google",
    };
  }

  const creds = config.getOutlookCreds();
  if (!creds) {
    throw new ConfigError(
      "Outlook 認証情報が未設定です。",
      "`calendit config set-outlook --id <id>` を実行してください。",
    );
  }

  const pca = await auth.getOutlookClient(creds.id, creds.tenantId);
  const accounts = await pca.getTokenCache().getAllAccounts();
  // Match by username (email) or homeAccountId; fall back to first account
  const account = ctx.accountId
    ? (accounts.find((a) => a.username === ctx.accountId || a.homeAccountId === ctx.accountId) ?? accounts[0])
    : accounts[0];

  return {
    service: new OutlookCalendarService(pca, account),
    calendarId: ctx.calendarId,
    serviceType: "outlook",
  };
}
