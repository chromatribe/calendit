import { ConfigManager } from "../core/config.js";
import { AuthManager } from "../core/auth.js";
import { GoogleCalendarService } from "../services/google.js";
import { OutlookCalendarService } from "../services/outlook.js";
import { MockCalendarService } from "../services/mock.js";
import { MacosCalendarService } from "../services/macos.js";
import { AuthError, ConfigError } from "../core/errors.js";
import { t } from "../core/i18n.js";
import { formatOutlookCacheUsernames, pickOutlookMsalAccount } from "../core/outlookAccountMatch.js";

export interface CommandDeps {
  config: ConfigManager;
  auth: AuthManager;
}

export interface ResolvedService {
  service: GoogleCalendarService | OutlookCalendarService | MockCalendarService | MacosCalendarService;
  calendarId: string;
  serviceType: "google" | "outlook" | "mock" | "macos";
}

export async function loadConfigIfExists(config: ConfigManager): Promise<void> {
  try {
    await config.load();
  } catch (err) {
    if (err instanceof ConfigError && err.causeCode === "missing_file") {
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
      throw new ConfigError(t("errors.context.loadFailed"), t("errors.context.loadFailedHint"));
    }
    throw err;
  }

  const ctx = contextName
    ? config.getContext(contextName)
    : { service: "google" as const, calendarId: "primary", accountId: undefined };

  if (!ctx) {
    throw new ConfigError(
      t("errors.context.missing", { name: contextName ?? "" }),
      t("errors.context.missingHint", { name: contextName ?? "" }),
    );
  }

  if (process.env.CALENDIT_MOCK === "true") {
    return {
      service: new MockCalendarService(ctx.service),
      calendarId: ctx.calendarId,
      serviceType: "mock",
    };
  }

  if (ctx.service === "macos") {
    if (process.env.CALENDIT_MOCK === "true") {
      return {
        service: new MockCalendarService("macos"),
        calendarId: ctx.calendarId,
        serviceType: "mock",
      };
    }
    return {
      service: new MacosCalendarService(),
      calendarId: ctx.calendarId,
      serviceType: "macos",
    };
  }

  if (ctx.service === "google") {
    const creds = config.getGoogleCreds();
    if (!creds) {
      throw new ConfigError(t("errors.service.googleCredsNotSet"), t("errors.service.googleCredsNotSetHint"));
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
    throw new ConfigError(t("errors.service.outlookCredsNotSet"), t("errors.service.outlookCredsNotSetHint"));
  }

  const pca = await auth.getOutlookClient(creds.id, creds.tenantId);
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length === 0) {
    throw new AuthError(
      t("errors.service.outlookNoMsalAccounts"),
      t("errors.service.outlookNoMsalAccountsHint"),
    );
  }
  const account = pickOutlookMsalAccount(accounts, ctx.accountId);
  if (!account) {
    throw new AuthError(
      t("errors.service.outlookAccountMismatch", {
        expected: ctx.accountId!.trim(),
        cached: formatOutlookCacheUsernames(accounts),
      }),
      t("errors.service.outlookAccountMismatchHint", { expected: ctx.accountId!.trim() }),
    );
  }

  return {
    service: new OutlookCalendarService(pca, account),
    calendarId: ctx.calendarId,
    serviceType: "outlook",
  };
}
