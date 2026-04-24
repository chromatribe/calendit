import { execFileSync } from "child_process";
import * as path from "path";
import * as process from "process";

/** POSIX single-quoted string for sh -c / do script. */
function shSingleQuote(s: string): string {
  return `'${String(s).replace(/'/g, `'"'"'`)}'`;
}

/**
 * Build a shell one-liner: optional exports, cd cwd, then `calendit macos …` or `node …/index.js macos …`.
 */
export function buildMacosExternalShellLine(cwd: string, macosArgv: string[]): string {
  const argv1 = process.argv[1];
  let inv: string;
  if (argv1?.endsWith(".js")) {
    inv = `node ${shSingleQuote(path.resolve(argv1))}`;
  } else {
    inv = "calendit";
  }
  const exports: string[] = [];
  if (process.env.CALENDIT_CONFIG_DIR) {
    exports.push(`export CALENDIT_CONFIG_DIR=${shSingleQuote(process.env.CALENDIT_CONFIG_DIR)}`);
  }
  if (process.env.CALENDIT_EVENTKIT_HELPER) {
    exports.push(`export CALENDIT_EVENTKIT_HELPER=${shSingleQuote(process.env.CALENDIT_EVENTKIT_HELPER)}`);
  }
  const macosRest = macosArgv.join(" ");
  const exportPrefix = exports.length ? `${exports.join(" && ")} && ` : "";
  return `${exportPrefix}cd ${shSingleQuote(cwd)} && ${inv} macos ${macosRest}`;
}

/** Tell Terminal.app to run `shellLine` (Calendar TCC applies to Terminal, not IDE host). */
export function buildMacosTerminalSessionLine(cwd: string): string {
  const exports: string[] = [];
  if (process.env.CALENDIT_CONFIG_DIR) {
    exports.push(`export CALENDIT_CONFIG_DIR=${shSingleQuote(process.env.CALENDIT_CONFIG_DIR)}`);
  }
  if (process.env.CALENDIT_EVENTKIT_HELPER) {
    exports.push(`export CALENDIT_EVENTKIT_HELPER=${shSingleQuote(process.env.CALENDIT_EVENTKIT_HELPER)}`);
  }
  const shell = process.env.SHELL || "/bin/zsh";
  const exportPrefix = exports.length ? `${exports.join(" && ")} && ` : "";
  return `${exportPrefix}cd ${shSingleQuote(cwd)} && exec ${shSingleQuote(shell)} -l`;
}

/**
 * Run `shellLine` in Terminal.app. If a window already exists, reuse **window 1**
 * (`do script … in window 1`) so each `external` call does not spawn a separate window.
 * (Terminal may still open a **new tab** per call, depending on user preferences.)
 */
export function openTerminalAndRunShellLine(shellLine: string): void {
  const line = JSON.stringify(shellLine);
  const script = [
    `tell application "Terminal"`,
    `  activate`,
    `  if (count of windows) is 0 then`,
    `    do script ${line}`,
    `  else`,
    `    do script ${line} in window 1`,
    `  end if`,
    `end tell`,
  ].join("\n");
  execFileSync("osascript", ["-e", script], { stdio: "inherit" });
}
