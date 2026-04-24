import { Command } from "commander";
import { createRequire } from "module";
import { AuthManager } from "./core/auth.js";
import { ConfigManager } from "./core/config.js";
import { applyEventkitConfigToEnvAfterLoad } from "./core/eventkitEnvFromConfig.js";
import { ApiError, AuthError, CalendarError, ConfigError, ValidationError } from "./core/errors.js";
import { logger, setDebugDump, setLogLevel } from "./core/logger.js";
import { t } from "./core/i18n.js";
import { applyResolvedLocale, ensureLocalePreference, shouldSkipLocaleBootstrap } from "./core/localeBootstrap.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
import { registerAuthCommands } from "./commands/auth.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerQueryCommand } from "./commands/query.js";
import { registerApplyCommand } from "./commands/apply.js";
import { registerAddCommand } from "./commands/add.js";
import { registerCalCommands } from "./commands/cal.js";
import { registerAccountsCommands } from "./commands/accounts.js";
import { registerMacosCommands } from "./commands/macos.js";
import { registerOnboardCommand } from "./commands/onboard.js";

const program = new Command();
const deps = {
  config: new ConfigManager(),
  auth: new AuthManager(),
};

program
  .name("calendit")
  .description("Terminal-based Calendar Management Tool")
  .version(version)
  .option("--verbose", "Enable verbose debug logs", false)
  .option("--debug-dump <file>", "Write all logs to a file")
  .option("--locale <code>", "UI language: en or ja (overrides config for this run)");

program.hook("preAction", async (thisCommand) => {
  await ensureLocalePreference(program, deps.config);
  if (!shouldSkipLocaleBootstrap()) {
    await deps.config.loadOptional();
    applyEventkitConfigToEnvAfterLoad(deps.config);
  }
  applyResolvedLocale(program, deps.config);

  const opts = thisCommand.optsWithGlobals();
  if (opts.debugDump) {
    setDebugDump(opts.debugDump);
    setLogLevel("debug");
    logger.debug("Logger", `Debug dump enabled: ${opts.debugDump}`);
  }
  if (opts.verbose || process.env.DEBUG === "calendit" || opts.debugDump) {
    setLogLevel("debug");
    logger.debug("Logger", "Verbose mode enabled.");
  }
});

registerOnboardCommand(program);
registerAuthCommands(program, deps);
registerAccountsCommands(program, deps);
registerMacosCommands(program, deps);
registerConfigCommands(program, deps);
registerQueryCommand(program, deps);
registerApplyCommand(program, deps);
registerAddCommand(program, deps);
registerCalCommands(program, deps);

const ERROR_META_MAX_DETAILS = 800;

function summarizeForErrorMeta(details: unknown): unknown {
  if (details === null || details === undefined) return undefined;
  try {
    const s = JSON.stringify(details);
    if (s.length <= ERROR_META_MAX_DETAILS) return details;
    return { _truncated: true, preview: s.slice(0, ERROR_META_MAX_DETAILS) };
  } catch {
    return { _nonSerializable: true, string: String(details) };
  }
}

/** Single-line JSON for `DEBUG=calendit` diagnostics (not a user-facing i18n key). */
function logErrorMeta(payload: Record<string, unknown>): void {
  try {
    logger.debug("ErrorMeta", JSON.stringify(payload));
  } catch {
    logger.debug("ErrorMeta", JSON.stringify({ kind: String(payload.kind ?? "Error") }));
  }
}

function handleError(error: unknown): never {
  const isVerbose = process.argv.includes("--verbose") || process.env.DEBUG === "calendit";

  if (error instanceof ValidationError) {
    logger.error(`${t("errors.validation.prefix")} ${error.message}`);
    if (error.hint) logger.info(`${t("common.hint")} ${error.hint}`);
    logErrorMeta({
      kind: "ValidationError",
      name: error.name,
      message: error.message,
      hint: error.hint,
    });
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof ConfigError) {
    logger.error(`${t("errors.config.prefix")} ${error.message}`);
    if (error.hint) logger.info(`${t("common.hint")} ${error.hint}`);
    logErrorMeta({
      kind: "ConfigError",
      name: error.name,
      message: error.message,
      hint: error.hint,
      causeCode: error.causeCode ?? null,
    });
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof AuthError) {
    logger.error(`${t("errors.auth.prefix")} ${error.message}`);
    if (error.hint) logger.info(`${t("common.hint")} ${error.hint}`);
    logErrorMeta({
      kind: "AuthError",
      name: error.name,
      message: error.message,
      hint: error.hint,
    });
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof ApiError) {
    const statusPart = error.statusCode ? String(error.statusCode) : "";
    const prefix = statusPart ? t("errors.apiWithStatus", { status: statusPart }) : `${t("errors.api.prefix")}:`;
    logger.error(`${prefix} ${error.message}`);
    if (error.hint) logger.info(`${t("common.hint")} ${error.hint}`);
    logErrorMeta({
      kind: "ApiError",
      name: error.name,
      message: error.message,
      hint: error.hint,
      statusCode: error.statusCode ?? null,
      provider: error.provider ?? null,
      details: summarizeForErrorMeta(error.details),
    });
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof CalendarError) {
    logger.error(error.message);
    if (error.hint) logger.info(`${t("common.hint")} ${error.hint}`);
    logErrorMeta({
      kind: "CalendarError",
      name: error.name,
      message: error.message,
      hint: error.hint,
    });
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }

  const unknown = error as { message?: string };
  logger.error(`${t("errors.unknown")} ${unknown?.message || String(error)}`);
  if (error instanceof Error) {
    logErrorMeta({
      kind: "UnknownError",
      name: error.name,
      message: error.message,
    });
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
  } else {
    logErrorMeta({
      kind: "UnknownError",
      message: String(error),
    });
  }
  process.exit(1);
}

program.parseAsync(process.argv).catch(handleError);
