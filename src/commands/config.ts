import * as fs from "fs/promises";
import { Command } from "commander";
import { CommandDeps, loadConfigIfExists } from "./shared.js";
import { ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export function registerConfigCommands(program: Command, deps: CommandDeps) {
  const configCmd = program.command("config").description("Configuration management");

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
      logger.info("Google credentials saved to config.");
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
      logger.info("Outlook credentials saved to config.");
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

      logger.info("[CONFIG CHECK]");
      logger.info(
        `  Google credentials : ${
          googleCreds ? `OK (id: ${mask(googleCreds.id)})` : "NOT SET (run: calendit config set-google --id <id> --secret <secret>)"
        }`,
      );
      logger.info(
        `  Outlook credentials: ${
          outlookCreds ? `OK (id: ${mask(outlookCreds.id)})` : "NOT SET (run: calendit config set-outlook --id <id>)"
        }`,
      );
      logger.info(
        `  Contexts           : ${
          contextEntries.length > 0
            ? contextEntries.map(([name, ctx]) => `${name} (${ctx.service}/${ctx.calendarId})`).join(", ")
            : "none"
        }`,
      );
      logger.info("  Config file        : ~/.config/calendit/config.json (or CALENDIT_CONFIG_DIR override)");
    });

  configCmd
    .command("set-context <name>")
    .description("Set a named context (e.g. work, hobby)")
    .requiredOption("--service <service>", "google or outlook")
    .requiredOption("--calendar <id>", "Calendar ID")
    .option("--account <id>", "Custom account identifier for tokens")
    .action(async (name: string, options: { service: "google" | "outlook"; calendar: string; account?: string }) => {
      await loadConfigIfExists(deps.config);
      if (options.service !== "google" && options.service !== "outlook") {
        throw new ValidationError("Service must be 'google' or 'outlook'.");
      }
      deps.config.setContext(name, {
        service: options.service,
        calendarId: options.calendar,
        accountId: options.account,
      });
      await deps.config.save();
      logger.info(`Context '${name}' saved.`);
    });
}
