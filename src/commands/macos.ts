import { Command } from "commander";
import { execFile, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import Enquirer from "enquirer";
import { writeStdoutLine } from "../core/logger.js";
import { logger } from "../core/logger.js";
import { ValidationError } from "../core/errors.js";
import { t } from "../core/i18n.js";
import {
  eventkitDoctorJson,
  eventkitListCalendarsJson,
  hasEventkitTransport,
  resolveEventkitHelperPath,
} from "../core/eventkitHelper.js";
import {
  getDefaultEventkitFetchUrlFromEnv,
  getFetchedEventkitBridgePath,
  materializeEventkitBridgeFromNetwork,
  formatMebibytes,
  probeHttpArchiveSizeBytes,
} from "../core/eventkitBridgeFetch.js";
import {
  resolveEventkitBridgeAppBundlePath,
  resolveEventkitBridgeRepoPath,
} from "../core/macosBridgeApp.js";
import { loadConfigIfExists, type CommandDeps } from "./shared.js";
import {
  buildMacosExternalShellLine,
  buildMacosTerminalSessionLine,
  openTerminalAndRunShellLine,
} from "../core/macosTerminalRelay.js";

const execFileAsync = promisify(execFile);

function isLikelyIdeIntegratedTerminal(): boolean {
  return process.env.TERM_PROGRAM === "vscode";
}

function formatCalendarTable(
  rows: Array<{ calendarIdentifier: string; title: string; sourceTitle: string; allowsContentModification: boolean }>,
): string {
  const headers = ["SOURCE", "TITLE", "CALENDAR_ID", "EDIT"];
  const data = rows.map((r) => [
    r.sourceTitle,
    r.title,
    r.calendarIdentifier,
    r.allowsContentModification ? "yes" : "no",
  ]);
  const all = [headers, ...data];
  const widths = headers.map((_, i) => Math.max(...all.map((row) => String(row[i]).length)));
  const sep = widths.map((w) => "-".repeat(w)).join("   ");
  const fmt = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("   ");
  return [fmt(headers), sep, ...data.map((cols) => fmt(cols.map(String)))].join("\n");
}

async function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isConnectFailure(msg: string): boolean {
  return /could not connect|ECONNREFUSED|not connect|EventKit bridge token not found|bridge token not found/i.test(msg);
}

function isInteractiveTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** Run `scripts/build-app-bundle.sh` in `bridgeRoot` and log success. */
function runBridgeBuildFromRoot(bridgeRoot: string): Promise<void> {
  const script = path.join(bridgeRoot, "scripts/build-app-bundle.sh");
  return new Promise<void>((resolve, reject) => {
    const c = spawn("/bin/bash", [script], { cwd: bridgeRoot, stdio: "inherit", env: process.env });
    c.on("error", reject);
    c.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(String(code ?? 1)));
      }
    });
  });
}

export function registerMacosCommands(program: Command, deps: CommandDeps) {
  const macosCmd = program
    .command("macos")
    .description("macOS Calendar (EventKit) helper — not OAuth; uses local Calendar.app data store");

  const bridgeCmd = macosCmd
    .command("bridge")
    .description("EventKit bridge (CalenditEventKitBridge.app) — TCC and socket live on this process");

  bridgeCmd
    .command("fetch")
    .description("Download the repo snapshot from GitHub, extract native/eventkit-bridge (with confirmation; then optional Swift build)")
    .option("-f, --force", "Re-download and replace existing fetched sources", false)
    .option("-y, --yes", "Skip the download confirmation prompt (non-interactive)", false)
    .option(
      "-b, --build",
      "After a successful download, run the Swift .app build without a second prompt",
      false,
    )
    .action(async (opts: { force?: boolean; yes?: boolean; build?: boolean }) => {
      if (process.platform !== "darwin") {
        writeStdoutLine(t("macos.setup.notDarwin"));
        process.exitCode = 1;
        return;
      }
      const dest = getFetchedEventkitBridgePath();
      let plan: { url: string; ref: string; owner: string; repo: string };
      try {
        plan = getDefaultEventkitFetchUrlFromEnv();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(message);
        process.exitCode = 1;
        return;
      }
      const { url } = plan;
      if (!opts.force && fs.existsSync(path.join(dest, "Package.swift"))) {
        logger.info(t("macos.bridge.fetchSkipsExisting", { path: dest }));
        return;
      }
      if (!opts.yes && !isInteractiveTty()) {
        logger.error(t("macos.bridge.fetchNoTty"));
        process.exitCode = 1;
        return;
      }
      const sizeBytes = await probeHttpArchiveSizeBytes(url);
      const sizeLine =
        sizeBytes != null
          ? t("macos.bridge.fetchSizeKnown", { mb: formatMebibytes(sizeBytes) })
          : t("macos.bridge.fetchSizeUnknown");
      if (!opts.yes) {
        writeStdoutLine(t("macos.bridge.fetchIntro"));
        writeStdoutLine("");
        writeStdoutLine(t("macos.bridge.fetchPlan", { url, sizeLine, dest }));
        writeStdoutLine("");
        const { go } = await Enquirer.prompt<{ go: boolean }>({
          type: "confirm",
          name: "go",
          message: t("macos.bridge.fetchConfirm"),
          initial: true,
        });
        if (!go) {
          logger.info(t("macos.bridge.fetchCancel"));
          return;
        }
      }
      try {
        const r = await materializeEventkitBridgeFromNetwork({ url, force: Boolean(opts.force) });
        logger.info(t("macos.bridge.fetchOk", { path: r.dest }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(t("macos.bridge.fetchFailed", { message }));
        process.exitCode = 1;
        return;
      }
      const bridgeRoot = resolveEventkitBridgeRepoPath();
      if (!bridgeRoot) {
        return;
      }
      let doBuild: boolean;
      if (opts.build) {
        doBuild = true;
      } else if (opts.yes) {
        doBuild = false;
      } else if (isInteractiveTty()) {
        const { build } = await Enquirer.prompt<{ build: boolean }>({
          type: "confirm",
          name: "build",
          message: t("macos.bridge.fetchBuildPrompt"),
          initial: true,
        });
        doBuild = build;
      } else {
        doBuild = false;
      }
      if (!doBuild) {
        return;
      }
      try {
        await runBridgeBuildFromRoot(bridgeRoot);
        const outApp = path.join(bridgeRoot, ".build/CalenditEventKitBridge.app");
        logger.info(t("macos.bridge.buildOk", { path: outApp }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(t("macos.bridge.buildFailed", { message }));
        process.exitCode = 1;
      }
    });

  bridgeCmd
    .command("build")
    .description("Build CalenditEventKitBridge.app from the Swift package (full repo; requires swift/codesign)")
    .action(async () => {
      if (process.platform !== "darwin") {
        writeStdoutLine(t("macos.setup.notDarwin"));
        process.exitCode = 1;
        return;
      }
      const bridgeRoot = resolveEventkitBridgeRepoPath();
      if (!bridgeRoot) {
        logger.error(t("macos.bridge.buildNoSource"));
        process.exitCode = 1;
        return;
      }
      try {
        await runBridgeBuildFromRoot(bridgeRoot);
        const outApp = path.join(bridgeRoot, ".build/CalenditEventKitBridge.app");
        logger.info(t("macos.bridge.buildOk", { path: outApp }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(t("macos.bridge.buildFailed", { message }));
        process.exitCode = 1;
      }
    });

  bridgeCmd
    .command("start")
    .description("Open CalenditEventKitBridge.app (searches common paths; set CALENDIT_EVENTKIT_BRIDGE_APP to override)")
    .action(async () => {
      if (process.platform !== "darwin") {
        writeStdoutLine(t("macos.setup.notDarwin"));
        process.exitCode = 1;
        return;
      }
      const p = resolveEventkitBridgeAppBundlePath();
      if (!p) {
        logger.error(t("macos.bridge.notFound"));
        process.exitCode = 1;
        return;
      }
      try {
        await execFileAsync("/usr/bin/open", [p], { shell: false });
        logger.info(t("macos.bridge.opened", { path: p }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(t("macos.bridge.openFailed", { message }));
        process.exitCode = 1;
      }
    });

  macosCmd
    .command("setup")
    .description("Interactive: ensure bridge, grant Calendar access, pick a calendar, save a macos context")
    .action(async () => {
      if (process.platform !== "darwin") {
        writeStdoutLine(t("macos.setup.notDarwin"));
        process.exitCode = 1;
        return;
      }
      if (!hasEventkitTransport()) {
        logger.error(t("macos.setup.noTransport"));
        process.exitCode = 1;
        return;
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const j = await eventkitDoctorJson();
          if (j.calendarAccess === "denied" || j.calendarAccess !== "authorized") {
            logger.info(t("macos.setup.tcc"));
            const { c } = await Enquirer.prompt<{ c: string }>({
              type: "input",
              name: "c",
              message: "[Enter] when ready to re-check",
            });
            void c;
            continue;
          }
          const data = await eventkitListCalendarsJson();
          const cals = data.calendars || [];
          if (cals.length === 0) {
            logger.error(t("macos.setup.noCalendars"));
            process.exitCode = 1;
            return;
          }
          const { calendarId } = await Enquirer.prompt<{ calendarId: string }>({
            type: "select",
            name: "calendarId",
            message: t("macos.setup.pickCalendar"),
            choices: cals.map((r) => ({
              name: `${r.title} (${r.sourceTitle}) — ${r.calendarIdentifier}`,
              value: r.calendarIdentifier,
            })),
          });
          const { ctxName } = await Enquirer.prompt<{ ctxName: string }>({
            type: "input",
            name: "ctxName",
            message: t("macos.setup.contextName"),
            validate: (s: string) => (s.trim() ? true : t("macos.setup.contextNameRequired")),
          });
          await loadConfigIfExists(deps.config);
          const name = ctxName.trim();
          deps.config.setContext(name, { service: "macos", calendarId });
          await deps.config.save();
          logger.info(t("macos.setup.saved", { name, calendarId }));
          return;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (isConnectFailure(message) && attempt < 4) {
            const { go } = await Enquirer.prompt<{ go: boolean }>({
              type: "confirm",
              name: "go",
              message: t("macos.setup.startBridgePrompt"),
              initial: true,
            });
            if (!go) {
              logger.info(t("macos.setup.canceled"));
              process.exitCode = 1;
              return;
            }
            const appPath = resolveEventkitBridgeAppBundlePath();
            if (!appPath) {
              logger.error(t("macos.bridge.notFound"));
              process.exitCode = 1;
              return;
            }
            try {
              await execFileAsync("/usr/bin/open", [appPath], { shell: false });
              await sleepMs(2000);
            } catch (err) {
              const m = err instanceof Error ? err.message : String(err);
              logger.error(t("macos.bridge.openFailed", { message: m }));
              process.exitCode = 1;
              return;
            }
            continue;
          }
          logger.error(message);
          process.exitCode = 1;
          return;
        }
      }
      logger.error("Setup: too many attempts.");
      process.exitCode = 1;
    });

  macosCmd
    .command("doctor")
    .description("Check OS, helper binary, and Calendar access (TCC); uses the same transport as `query`")
    .action(async () => {
      if (process.platform !== "darwin") {
        writeStdoutLine("macOS のみ対応です。現在の OS では EventKit ヘルパーを使用できません。");
        return;
      }
      const p = resolveEventkitHelperPath();
      writeStdoutLine(`Helper path: ${p ?? "(not found, OK if using bridge only)"}`);
      if (!hasEventkitTransport()) {
        writeStdoutLine("EventKit: no helper and no local bridge. Build helper or start CalenditEventKitBridge.app.");
        return;
      }
      try {
        const j = await eventkitDoctorJson();
        writeStdoutLine(JSON.stringify(j, null, 2));
        if (j.calendarAccess === "denied" && isLikelyIdeIntegratedTerminal()) {
          writeStdoutLine("");
          writeStdoutLine(t("macos.external.suggestionWhenDenied"));
        }
      } catch (e) {
        logger.error(`doctor 失敗: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
      }
    });

  macosCmd
    .command("external")
    .description(
      "Open Terminal.app and run `calendit macos …` or an interactive shell there (Calendar TCC applies to Terminal; use from Cursor/VS Code)",
    )
    .argument("<sub>", "doctor | list-calendars | shell")
    .option("--json", "pass --json to list-calendars", false)
    .action(async (sub: string, opts: { json?: boolean }) => {
      if (process.platform !== "darwin") {
        writeStdoutLine(t("macos.external.onlyDarwin"));
        process.exitCode = 1;
        return;
      }
      const subNorm = sub.trim();
      if (subNorm !== "doctor" && subNorm !== "list-calendars" && subNorm !== "shell") {
        throw new ValidationError(t("macos.external.badSub"), t("macos.external.badSubHint"));
      }
      if (subNorm === "doctor" && opts.json) {
        throw new ValidationError(t("macos.external.jsonOnlyForList"), t("macos.external.badSubHint"));
      }
      if (subNorm === "shell" && opts.json) {
        throw new ValidationError(t("macos.external.jsonOnlyForList"), t("macos.external.badSubHint"));
      }
      const line =
        subNorm === "shell"
          ? buildMacosTerminalSessionLine(process.cwd())
          : buildMacosExternalShellLine(
              process.cwd(),
              subNorm === "doctor" ? ["doctor"] : opts.json ? ["list-calendars", "--json"] : ["list-calendars"],
            );
      try {
        openTerminalAndRunShellLine(line);
        logger.info(t("macos.external.opened", { cmd: line }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(t("macos.external.osascriptFailed", { message }));
        process.exitCode = 1;
      }
    });

  macosCmd
    .command("list-calendars")
    .description("List calendars from the local EventKit store (use CALENDAR_ID for config set-context --service macos)")
    .option("--json", "Print raw JSON instead of a table", false)
    .action(async (opts: { json?: boolean }) => {
      if (process.platform !== "darwin") {
        writeStdoutLine("macOS のみ対応です。");
        return;
      }
      if (!hasEventkitTransport()) {
        writeStdoutLine("EventKit 経路が利用できません。`calendit macos doctor` を参照してください。");
        process.exitCode = 1;
        return;
      }
      try {
        const data = await eventkitListCalendarsJson();
        if (opts.json) {
          writeStdoutLine(JSON.stringify(data, null, 2));
        } else {
          writeStdoutLine(formatCalendarTable(data.calendars || []));
        }
      } catch (e) {
        logger.error(`list-calendars 失敗: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
      }
    });
}
