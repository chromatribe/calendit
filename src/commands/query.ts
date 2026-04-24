import * as fs from "fs/promises";
import { Command } from "commander";
import { formatInTimeZone } from "date-fns-tz";
import { Formatter } from "../core/formatter.js";
import { parseDateTime } from "../core/datetime.js";
import { CommandDeps, getServiceForContext } from "./shared.js";
import { ValidationError } from "../core/errors.js";
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
      let start: Date;
      let end: Date;

      if (options.start && /^\d+[dwm]$/.test(options.start)) {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const amount = parseInt(options.start, 10);
        const unit = options.start.slice(-1);
        const ms =
          unit === "d"
            ? amount * 24 * 3600 * 1000
            : unit === "w"
              ? amount * 7 * 24 * 3600 * 1000
              : amount * 30 * 24 * 3600 * 1000;
        end = new Date(start.getTime() + ms);
      } else {
        start = parseDateTime(options.start);
        end = options.end ? parseDateTime(options.end) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      if (end <= start) {
        throw new ValidationError("Invalid time range: end must be after start.");
      }

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
