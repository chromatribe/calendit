import { Command } from "commander";
import { CommandDeps, loadConfigIfExists } from "./shared.js";
import { ConfigError, ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export function registerAuthCommands(program: Command, deps: CommandDeps) {
  const authCmd = program.command("auth").description("Authentication management");

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
            "Google Client ID / Secret が未設定です。",
            "docs/setup_google.md を参照、または `calendit config set-google --file <path>` を実行してください。",
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
            "Outlook Client ID が未設定です。",
            "`calendit config set-outlook --id <id>` を先に実行してください。",
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
