import { Command } from "commander";
import { formatInTimeZone } from "date-fns-tz";
import { parseDateTime } from "../core/datetime.js";
import { CommandDeps, getServiceForContext } from "./shared.js";
import { ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export function registerAddCommand(program: Command, deps: CommandDeps) {
  program
    .command("add")
    .description("Add a single event")
    .option("--summary <text>", "Event title")
    .option("--start <dateTime>", "Start date/time (YYYY-MM-DDTHH:mm or HH:mm)")
    .option("--end <dateTime>", "End date/time")
    .option("--location <text>", "Event location")
    .option("--description <text>", "Event description")
    .option("--set <name>", "Use a named context")
    .option("--calendar <id>", "Explicit Calendar ID")
    .option("--dry-run", "Preview addition without applying", false)
    .action(
      async (options: {
        summary?: string;
        start?: string;
        end?: string;
        location?: string;
        description?: string;
        set?: string;
        calendar?: string;
        dryRun: boolean;
      }) => {
        if (!options.summary || !options.start) {
          throw new ValidationError("Summary and Start time are required.");
        }

        const { service, calendarId: ctxCalId } = await getServiceForContext(deps, options.set);
        const calendarId = options.calendar || ctxCalId;
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const startDate = parseDateTime(options.start);
        let endDate = options.end ? parseDateTime(options.end) : new Date(startDate.getTime() + 60 * 60 * 1000);

        if (options.end && endDate < startDate) {
          endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
        }
        if (startDate >= endDate) {
          throw new ValidationError(
            `Invalid time range: ${options.summary} (${options.start} - ${options.end || "+1h"})`,
            "開始時刻より後の終了時刻を指定してください。",
          );
        }

        const formattedStart = formatInTimeZone(startDate, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
        const formattedEnd = formatInTimeZone(endDate, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");

        logger.info(`Adding event: ${options.summary}`);
        logger.info(`Start: ${formattedStart}`);
        logger.info(`End:   ${formattedEnd}`);

        if (options.dryRun) {
          logger.info(`✅ [Dry Run] Event would be added: "${options.summary}"`);
          return;
        }

        await service.createEvent(calendarId, {
          summary: options.summary,
          start: formattedStart,
          end: formattedEnd,
          location: options.location,
          description: options.description,
        });
        logger.info(`✅ Event added successfully: "${options.summary}"`);
      },
    );
}
