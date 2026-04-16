import { getServiceForContext } from "./shared.js";
import { ValidationError } from "../core/errors.js";
import { logger } from "../core/logger.js";
export function registerCalCommands(program, deps) {
    const calCmd = program.command("cal").description("Calendar management");
    calCmd
        .command("list")
        .description("List available calendars")
        .option("--set <name>", "Use a named context")
        .action(async (options) => {
        const { service } = await getServiceForContext(deps, options.set);
        const list = await service.listCalendars();
        logger.info("--- Available Calendars ---");
        list.forEach((c) => {
            logger.info(`- ${c.name} (ID: ${c.id}) ${c.isPrimary ? "[Primary]" : ""} ${c.canEdit ? "" : "[Read-Only]"}`);
        });
    });
    calCmd
        .command("add <name>")
        .description("Create a new calendar")
        .option("--set <name>", "Use a named context")
        .action(async (name, options) => {
        const { service } = await getServiceForContext(deps, options.set);
        const newCal = await service.createCalendar(name);
        logger.info(`Calendar created: ${newCal.name} (ID: ${newCal.id})`);
    });
    calCmd
        .command("delete <id>")
        .description("Delete a calendar")
        .option("--force", "Skip confirmation")
        .option("--set <name>", "Use a named context")
        .action(async (id, options) => {
        if (id === "primary") {
            throw new ValidationError("The 'primary' calendar cannot be deleted for safety.");
        }
        const { service } = await getServiceForContext(deps, options.set);
        if (!options.force) {
            const { Confirm } = (await import("enquirer")).default;
            const prompt = new Confirm({
                name: "question",
                message: `Are you sure you want to delete calendar ${id}?`,
            });
            if (!(await prompt.run()))
                return;
        }
        await service.deleteCalendar(id);
        logger.info(`Calendar ${id} deleted.`);
    });
}
