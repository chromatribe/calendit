import { GoogleCalendarService } from "../services/google.js";
import { OutlookCalendarService } from "../services/outlook.js";
import { MockCalendarService } from "../services/mock.js";
import { ConfigError } from "../core/errors.js";
export async function loadConfigIfExists(config) {
    try {
        await config.load();
    }
    catch (err) {
        if (err instanceof ConfigError && err.message.includes("見つかりません")) {
            return;
        }
        throw err;
    }
}
export async function getServiceForContext(deps, contextName) {
    const { config, auth } = deps;
    try {
        await config.load();
    }
    catch (err) {
        if (err instanceof ConfigError) {
            throw new ConfigError("Failed to load configuration. Run 'calendit --help' for setup instructions.", "初回は `calendit config set-google` などで設定を作成してください。");
        }
        throw err;
    }
    if (process.env.CALENDIT_MOCK === "true") {
        return {
            service: new MockCalendarService(contextName || "mock"),
            calendarId: "primary",
            serviceType: "mock",
        };
    }
    const ctx = contextName
        ? config.getContext(contextName)
        : { service: "google", calendarId: "primary", accountId: undefined };
    if (!ctx) {
        throw new ConfigError(`Context '${contextName}' が見つかりません。`, `\`calendit config set-context ${contextName} --service google --calendar primary\` を実行してください。`);
    }
    if (ctx.service === "google") {
        const creds = config.getGoogleCreds();
        if (!creds) {
            throw new ConfigError("Google 認証情報が未設定です。", "`calendit config set-google --id <id> --secret <secret>` を実行してください。");
        }
        const oauth2Client = await auth.getGoogleAuth(creds.id, creds.secret, ctx.accountId);
        return {
            service: new GoogleCalendarService(oauth2Client),
            calendarId: ctx.calendarId,
            serviceType: "google",
        };
    }
    const creds = config.getOutlookCreds();
    if (!creds) {
        throw new ConfigError("Outlook 認証情報が未設定です。", "`calendit config set-outlook --id <id>` を実行してください。");
    }
    const pca = await auth.getOutlookClient(creds.id, creds.tenantId);
    const accounts = await pca.getTokenCache().getAllAccounts();
    const account = ctx.accountId ? accounts.find((a) => a.homeAccountId === ctx.accountId) : accounts[0];
    return {
        service: new OutlookCalendarService(pca, account),
        calendarId: ctx.calendarId,
        serviceType: "outlook",
    };
}
