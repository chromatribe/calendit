import * as fs from "fs/promises";
import { Command } from "commander";
import { CommandDeps, loadConfigIfExists } from "./shared.js";
import { ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { isUiLocale, t } from "../core/i18n.js";

export function registerConfigCommands(program: Command, deps: CommandDeps) {
  const configCmd = program.command("config").description("Configuration management");

  configCmd
    .command("set-locale <code>")
    .description("Set UI language (en or ja) and persist to config")
    .action(async (code: string) => {
      await loadConfigIfExists(deps.config);
      const c = code.trim().toLowerCase();
      if (!isUiLocale(c)) {
        throw new ValidationError(`Invalid locale: ${code}`, "Use en or ja.");
      }
      deps.config.setUi({ locale: c, localePromptCompleted: true });
      await deps.config.save();
      logger.info(t("config.cmd.localeSet", { locale: c }));
    });

  configCmd
    .command("set-google")
    .description("Set Google API credentials (manually or via JSON file)")
    .option("--id <id>", "Client ID")
    .option("--secret <secret>", "Client Secret")
    .option("--file <path>", "Path to Google credentials JSON file")
    .action(async (options: { id?: string; secret?: string; file?: string }) => {
      await loadConfigIfExists(deps.config);

      let id = options.id;
      let secret = options.secret;

      if (options.file) {
        try {
          const fileContent = await fs.readFile(options.file, "utf-8");
          const json = JSON.parse(fileContent);
          const creds = json.installed || json.web;
          if (!creds?.client_id || !creds?.client_secret) {
            throw new ValidationError("Invalid Google credentials JSON format.");
          }
          id = creds.client_id;
          secret = creds.client_secret;
          logger.info(`Successfully extracted credentials from ${options.file}`);
        } catch (e: any) {
          throw new ValidationError(`Error reading JSON file: ${e.message}`);
        }
      }

      if (!id || !secret) {
        throw new ValidationError("Either --id and --secret, or --file must be provided.");
      }

      deps.config.setGoogleCreds(id, secret);
      await deps.config.save();
      logger.info(t("config.cmd.googleSaved"));
    });

  configCmd
    .command("set-outlook")
    .description("Set Outlook (Microsoft Graph) API credentials")
    .requiredOption("--id <id>", "Client ID (Application ID)")
    .option("--tenant <id>", "Tenant ID (default: common)", "common")
    .action(async (options: { id: string; tenant: string }) => {
      await loadConfigIfExists(deps.config);
      deps.config.setOutlookCreds(options.id, options.tenant);
      await deps.config.save();
      logger.info(t("config.cmd.outlookSaved"));
    });

  configCmd
    .command("check")
    .description("Validate current configuration and show diagnostic summary")
    .action(async () => {
      await loadConfigIfExists(deps.config);

      const googleCreds = deps.config.getGoogleCreds();
      const outlookCreds = deps.config.getOutlookCreds();
      const contexts = deps.config.getAllContexts();
      const contextEntries = Object.entries(contexts);

      const mask = (value: string) => (value.length <= 8 ? value : `${value.slice(0, 3)}...${value.slice(-3)}`);

      logger.info(t("config.check.header"));
      logger.info(
        googleCreds
          ? t("config.check.googleOk", { mask: mask(googleCreds.id) })
          : t("config.check.googleNotSet"),
      );
      logger.info(
        outlookCreds
          ? t("config.check.outlookOk", { mask: mask(outlookCreds.id) })
          : t("config.check.outlookNotSet"),
      );
      logger.info(
        contextEntries.length > 0
          ? t("config.check.contexts", {
              list: contextEntries.map(([name, ctx]) => `${name} (${ctx.service}/${ctx.calendarId})`).join(", "),
            })
          : t("config.check.contextsNone"),
      );
      logger.info(t("config.check.fileLine"));
      logger.info(t("config.check.uiLocale", { locale: deps.config.getUi()?.locale ?? "en" }));
    });

  configCmd
    .command("set-macos-transport <value>")
    .description("Persist default EventKit transport: auto, bridge, or helper (used when CALENDIT_EVENTKIT_BRIDGE is unset in the shell)")
    .action(async (value: string) => {
      await loadConfigIfExists(deps.config);
      const v = value.trim().toLowerCase();
      if (v !== "auto" && v !== "bridge" && v !== "helper") {
        throw new ValidationError("Value must be auto, bridge, or helper.");
      }
      deps.config.setEventkitDefaultTransport(v);
      await deps.config.save();
      logger.info(t("config.cmd.macosTransportSet", { value: v }));
    });

  configCmd
    .command("delete-context <name>")
    .description("Delete a named context")
    .action(async (name: string) => {
      await loadConfigIfExists(deps.config);
      const deleted = deps.config.deleteContext(name);
      if (!deleted) {
        throw new ValidationError(
          t("errors.context.missing", { name }),
          t("errors.context.missingHint", { name }),
        );
      }
      await deps.config.save();
      logger.info(t("config.cmd.contextDeleted", { name }));
    });

  configCmd
    .command("set-context <name>")
    .description("Set a named context (e.g. work, hobby)")
    .requiredOption("--service <service>", "google, outlook, or macos")
    .requiredOption("--calendar <id>", "Calendar ID (for macos: EventKit calendarIdentifier from `calendit macos list-calendars`)")
    .option("--account <id>", "Custom account identifier for tokens")
    .action(async (name: string, options: { service: "google" | "outlook" | "macos"; calendar: string; account?: string }) => {
      await loadConfigIfExists(deps.config);
      if (options.service !== "google" && options.service !== "outlook" && options.service !== "macos") {
        throw new ValidationError("Service must be 'google', 'outlook', or 'macos'.");
      }
      deps.config.setContext(name, {
        service: options.service,
        calendarId: options.calendar,
        accountId: options.account,
      });
      await deps.config.save();
      logger.info(t("config.cmd.contextSaved", { name }));
    });
}
