import * as fs from "fs/promises";
import { Command } from "commander";
import { CalendarEvent } from "../types/index.js";
import { Formatter } from "../core/formatter.js";
import { Applier } from "../core/applier.js";
import { CommandDeps, getServiceForContext } from "./shared.js";
import { ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";

const COLOR_RESET = "\x1b[0m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_BLUE = "\x1b[34m";
const COLOR_RED = "\x1b[31m";

export function registerApplyCommand(program: Command, deps: CommandDeps) {
  program
    .command("apply")
    .description("Apply events from a file (bulk update/sync)")
    .option("--in <file>", "Input file path")
    .option("--set <name>", "Use a named context")
    .option("--calendar <id>", "Explicit Calendar ID")
    .option("--sync", "Delete events not in the file", false)
    .option("--dry-run", "Preview changes without applying", false)
    .action(async (options: { in?: string; set?: string; calendar?: string; sync: boolean; dryRun: boolean }) => {
      if (!options.in) {
        throw new ValidationError("Input file required.", "Use --in <file> to specify input.");
      }

      const { service, calendarId: ctxCalId } = await getServiceForContext(deps, options.set);
      const calendarId = options.calendar || ctxCalId;
      const inputData = await fs.readFile(options.in, "utf-8");

      let inputEvents: Partial<CalendarEvent>[] = [];
      if (options.in.endsWith(".md")) {
        const parsed = Formatter.fromMarkdown(inputData);
        inputEvents = parsed.events;
      } else if (options.in.endsWith(".csv")) {
        inputEvents = Formatter.fromCsv(inputData);
      } else {
        const parsed = Formatter.fromJson(inputData);
        if (parsed.warnings.length > 0) {
          parsed.warnings.forEach((w) => logger.warn(w));
        }
        inputEvents = parsed.events;
      }

      const applier = new Applier(service);

      if (options.dryRun) {
        logger.info("[DRY RUN - 実際の変更は行いません]");
      }
      logger.info(`Applying changes to ${calendarId}...`);

      const results = await applier.apply(calendarId, inputEvents, undefined, {
        dryRun: options.dryRun,
        sync: options.sync,
      });

      logger.info("--- Results ---");
      if (results.created.length > 0) {
        logger.info(`Created (${results.created.length}):`);
        results.created.forEach((e) => logger.info(`  + ${e.summary}`));
      }
      if (results.updated.length > 0) {
        logger.info(`Updated (${results.updated.length}):`);
        results.updated.forEach((u) => logger.info(`  * ${u.input.summary || u.existing.summary}`));
      }
      if (results.deleted.length > 0) {
        logger.info(`Deleted (${results.deleted.length}):`);
        results.deleted.forEach((e) => logger.info(`  - ${e.summary}`));
      }
      if (results.created.length === 0 && results.updated.length === 0 && results.deleted.length === 0) {
        logger.info("No changes detected.");
      }

      logger.info(
        `${COLOR_GREEN}✅ 作成 ${results.created.length}件${COLOR_RESET} / ` +
          `${COLOR_BLUE}📝 更新 ${results.updated.length}件${COLOR_RESET} / ` +
          `${COLOR_RED}🗑 削除 ${results.deleted.length}件${COLOR_RESET}`,
      );
    });
}
