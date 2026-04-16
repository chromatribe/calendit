import { Command } from "commander";
import { AuthManager } from "./core/auth.js";
import { ConfigManager } from "./core/config.js";
import { ApiError, AuthError, CalendarError, ConfigError, ValidationError } from "./core/errors.js";
import { logger, setDebugDump, setLogLevel } from "./core/logger.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerQueryCommand } from "./commands/query.js";
import { registerApplyCommand } from "./commands/apply.js";
import { registerAddCommand } from "./commands/add.js";
import { registerCalCommands } from "./commands/cal.js";

const program = new Command();
const deps = {
  config: new ConfigManager(),
  auth: new AuthManager(),
};

program
  .name("calendit")
  .description("Terminal-based Calendar Management Tool")
  .version("2026-0416-01.02")
  .option("--verbose", "Enable verbose debug logs", false)
  .option("--debug-dump <file>", "Write all logs to a file");

program.hook("preAction", (thisCommand) => {
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

registerAuthCommands(program, deps);
registerConfigCommands(program, deps);
registerQueryCommand(program, deps);
registerApplyCommand(program, deps);
registerAddCommand(program, deps);
registerCalCommands(program, deps);

function handleError(error: unknown): never {
  const isVerbose = process.argv.includes("--verbose") || process.env.DEBUG === "calendit";

  if (error instanceof ValidationError) {
    logger.error(`入力エラー: ${error.message}`);
    if (error.hint) logger.info(`ヒント: ${error.hint}`);
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof ConfigError) {
    logger.error(`設定エラー: ${error.message}`);
    if (error.hint) logger.info(`ヒント: ${error.hint}`);
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof AuthError) {
    logger.error(`認証エラー: ${error.message}`);
    if (error.hint) logger.info(`ヒント: ${error.hint}`);
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof ApiError) {
    const statusPart = error.statusCode ? ` (${error.statusCode})` : "";
    logger.error(`API エラー${statusPart}: ${error.message}`);
    if (error.hint) logger.info(`ヒント: ${error.hint}`);
    logger.debug("ApiError", "API error details", error.details);
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }
  if (error instanceof CalendarError) {
    logger.error(error.message);
    if (error.hint) logger.info(`ヒント: ${error.hint}`);
    if (isVerbose && error.stack) logger.debug("STACK", error.stack);
    process.exit(1);
  }

  const unknown = error as { message?: string };
  logger.error(`予期しないエラー: ${unknown?.message || String(error)}`);
  if (isVerbose && error instanceof Error && error.stack) {
    logger.debug("STACK", error.stack);
  } else {
    logger.debug("UnknownError", error);
  }
  process.exit(1);
}

program.parseAsync(process.argv).catch(handleError);
