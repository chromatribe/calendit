import { Command } from "commander";
import Enquirer from "enquirer";
import { writeStdoutLine } from "../core/logger.js";

const RALLY_BLOB = "https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md";
const RALLY_RAW = "https://raw.githubusercontent.com/chromatribe/calendit/main/docs/ai-onboarding-rally.md";
const DOCS_BASE = "https://github.com/chromatribe/calendit/blob/main/docs";

type Provider = "google" | "outlook" | "macos";

function printRallyHeader(): void {
  writeStdoutLine("calendit — first-time setup (onboard)");
  writeStdoutLine("");
  writeStdoutLine(`Rally doc (read in browser): ${RALLY_BLOB}`);
  writeStdoutLine(`Rally doc (raw, for agents):  ${RALLY_RAW}`);
  writeStdoutLine("");
}

function printGoogle(): void {
  writeStdoutLine("— Google");
  writeStdoutLine(`  Console walkthrough: ${DOCS_BASE}/setup_google.md`);
  writeStdoutLine("  calendit config set-google --file <credentials.json>");
  writeStdoutLine('  calendit config set-context my-google --service google --calendar primary --account "you@gmail.com"');
  writeStdoutLine("  calendit auth login google --set my-google");
  writeStdoutLine("  calendit accounts status");
  writeStdoutLine("");
}

function printOutlook(): void {
  writeStdoutLine("— Outlook (Microsoft Graph)");
  writeStdoutLine(`  Entra / Azure walkthrough: ${DOCS_BASE}/setup_outlook.md`);
  writeStdoutLine('  calendit config set-outlook --id "<client-id>"');
  writeStdoutLine('  calendit config set-context my-outlook --service outlook --calendar primary --account "you@outlook.com"');
  writeStdoutLine("  calendit auth login outlook --set my-outlook");
  writeStdoutLine("  calendit accounts status");
  writeStdoutLine("  (Do not run Google and Outlook auth logins at the same time; both use localhost:3000.)");
  writeStdoutLine("");
}

function printMacos(): void {
  writeStdoutLine("— macOS (EventKit / Calendar.app)");
  writeStdoutLine(`  Bridge / TCC: ${DOCS_BASE}/eventkit-bridge.md`);
  writeStdoutLine("  calendit macos setup                    # recommended wizard when possible");
  writeStdoutLine("  calendit macos list-calendars            # use CALENDAR_ID (not only display title) for set-context");
  writeStdoutLine('  calendit config set-context my-macos --service macos --calendar "<CALENDAR_ID>"');
  writeStdoutLine("  calendit accounts status");
  writeStdoutLine("");
}

function printAllBranches(): void {
  printRallyHeader();
  printGoogle();
  printOutlook();
  printMacos();
}

function printOne(p: Provider): void {
  printRallyHeader();
  if (p === "google") printGoogle();
  if (p === "outlook") printOutlook();
  if (p === "macos") printMacos();
  writeStdoutLine("Full step-by-step (human, no omissions):");
  writeStdoutLine(`  ${DOCS_BASE}/getting-started.md`);
}

export function registerOnboardCommand(program: Command): void {
  program
    .command("onboard")
    .description("First-time setup hints: pick Google, Outlook, or this Mac; prints doc URLs and next commands")
    .action(async () => {
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        printAllBranches();
        return;
      }
      const { provider } = await Enquirer.prompt<{ provider: Provider }>({
        type: "select",
        name: "provider",
        message: "Which calendar provider are you setting up first?",
        choices: [
          { name: "Google", value: "google" as const },
          { name: "Outlook (Microsoft 365 / Outlook.com)", value: "outlook" as const },
          { name: "This Mac only (EventKit / Calendar.app)", value: "macos" as const },
        ],
      });
      printOne(provider);
    });
}
