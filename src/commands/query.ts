import * as fs from "fs/promises";
import { Command } from "commander";
import { formatInTimeZone } from "date-fns-tz";
import { Formatter } from "../core/formatter.js";
import { parseTimeRangeForQuery } from "../core/timeRangeForQuery.js";
import { CommandDeps, getServiceForContext } from "./shared.js";
import { logger } from "../core/logger.js";

export function registerQueryCommand(program: Command, deps: CommandDeps) {
  program
    .command("query")
    .description("Query calendars and events")
    .option("--set <name>", "Use a named context")
    .option("--calendar <id>", "Explicit Calendar ID")
    .option("--start <iso>", "Start date (YYYY-MM-DD)")
    .option("--end <iso>", "End date (YYYY-MM-DD)")
    .option("--format <fmt>", "Output format (csv, md, json)", "md")
    .option("--out <file>", "Output file path")
    .option("--dry-run", "Preview (no effect for query)", false)
    .action(async (options: { set?: string; calendar?: string; start?: string; end?: string; format: "csv" | "md" | "json"; out?: string }) => {
      const { service, calendarId: ctxCalId, serviceType } = await getServiceForContext(deps, options.set);
      const calendarId = options.calendar || ctxCalId;

      const now = new Date();
      const { start, end } = parseTimeRangeForQuery(options.start, options.end, now);

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = formatInTimeZone(new Date(), timeZone, "XXX");
      logger.debug(`Local timezone: ${timeZone} (${offset})`);
      logger.info(`Local timezone offset: ${offset}`);
      logger.info(`Fetching events for ${calendarId} from ${start.toISOString()} to ${end.toISOString()}...`);
      const events = await service.listEvents(calendarId, start, end);

      let output = "";
      if (options.format === "md") output = Formatter.toMarkdown(events);
      else if (options.format === "csv") output = Formatter.toCsv(events);
      else output = Formatter.toJson(events, { context: options.set, service: serviceType, calendarId });

      if (options.out) {
        await fs.writeFile(options.out, output, "utf-8");
        logger.info(`Events exported to ${options.out}`);
      } else {
        logger.info(output);
      }
    });
}
