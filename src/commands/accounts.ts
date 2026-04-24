import { Command } from "commander";
import { CommandDeps, loadConfigIfExists } from "./shared.js";
import { writeStdoutLine } from "../core/logger.js";
import { buildAccountStatusRows, formatAccountStatusTable } from "../core/accountStatus.js";

export async function printAccountStatusTable(deps: CommandDeps): Promise<void> {
  await loadConfigIfExists(deps.config);
  const contexts = deps.config.getAllContexts();
  const names = Object.keys(contexts);
  if (names.length === 0) {
    writeStdoutLine("コンテキストが定義されていません。`calendit config set-context` で追加してください。");
    return;
  }
  const rows = await buildAccountStatusRows(contexts, {
    auth: deps.auth,
    outlookCreds: deps.config.getOutlookCreds(),
  });
  writeStdoutLine(formatAccountStatusTable(rows));
}

export function registerAccountsCommands(program: Command, deps: CommandDeps) {
  const accountsCmd = program.command("accounts").description("Calendar accounts and connection status (all services)");

  accountsCmd
    .command("status")
    .description("Show each context's service, calendar, account, and connection state (google / outlook / macos)")
    .action(async () => {
      await printAccountStatusTable(deps);
    });
}
