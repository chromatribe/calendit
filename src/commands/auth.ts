import { Command } from "commander";
import { CommandDeps, loadConfigIfExists } from "./shared.js";
import { ConfigError, ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { t } from "../core/i18n.js";
import { printAccountStatusTable } from "./accounts.js";

export function registerAuthCommands(program: Command, deps: CommandDeps) {
  const authCmd = program.command("auth").description("Authentication management");

  authCmd
    .command("status")
    .description("Same as `calendit accounts status` (deprecated name; use accounts status for clarity)")
    .action(async () => {
      logger.info("推奨: 全サービス横断の状態は `calendit accounts status` を使用してください。");
      await printAccountStatusTable(deps);
    });

  authCmd
    .command("login <service>")
    .description("Login to Google or Outlook")
    .option("--set <context>", "Context to associate this login with")
    .option("--account <id>", "Custom account identifier for tokens")
    .action(async (service: string, options: { set?: string; account?: string }) => {
      await loadConfigIfExists(deps.config);
      const accountId = options.account || options.set;

      if (service === "google") {
        const creds = deps.config.getGoogleCreds();
        if (!creds) {
          throw new ConfigError(
            t("errors.service.googleCredsNotSet"),
            t("errors.auth.googleLoginHint"),
          );
        }
        logger.info("Google 認証フローを開始します...");
        await deps.auth.loginGoogle(creds.id, creds.secret, accountId);
        logger.info(`Google authentication complete for account '${accountId || "default"}'!`);
        return;
      }

      if (service === "outlook") {
        const creds = deps.config.getOutlookCreds();
        if (!creds) {
          throw new ConfigError(
            t("errors.service.outlookCredsNotSet"),
            t("errors.service.outlookCredsNotSetHint"),
          );
        }
        logger.info("Outlook 認証フローを開始します...");
        await deps.auth.loginOutlook(creds.id, creds.tenantId, accountId);
        logger.info(`Outlook authentication complete for account '${accountId || "default"}'!`);
        return;
      }

      throw new ValidationError(`Unknown service: ${service}`, "service は google または outlook を指定してください。");
    });
}
