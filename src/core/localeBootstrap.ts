import Enquirer from "enquirer";
import { Command } from "commander";
import { ConfigManager } from "./config.js";
import { initI18n, isUiLocale, type UiLocale } from "./i18n.js";

/** Skip locale/bootstrap IO for `--help` / `--version` only. */
export function shouldSkipLocaleBootstrap(): boolean {
  const a = process.argv;
  if (a.includes("--help") || a.includes("-h") || a.includes("--version") || a.includes("-V")) return true;
  return false;
}

function shouldSkipLocalePrompt(): boolean {
  if (process.env.CALENDIT_SKIP_LOCALE_PROMPT === "1") return true;
  if (process.env.CALENDIT_MOCK === "true") return true;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return true;
  return false;
}

function resolveLocaleFromEnvAndArgv(program: Command): UiLocale | undefined {
  const fromEnv = process.env.CALENDIT_LOCALE?.trim();
  if (fromEnv && isUiLocale(fromEnv)) return fromEnv;
  const opts = program.optsWithGlobals() as { locale?: string };
  if (opts.locale && isUiLocale(opts.locale)) return opts.locale;
  return undefined;
}

/**
 * After config is loaded, set active locale: CALENDIT_LOCALE > --locale > config.ui.locale > en.
 */
export function applyResolvedLocale(program: Command, config: ConfigManager): void {
  const fromEnvArgv = resolveLocaleFromEnvAndArgv(program);
  if (fromEnvArgv) {
    initI18n(fromEnvArgv);
    return;
  }
  const ui = config.getUi();
  initI18n(ui?.locale ?? "en");
}

/**
 * First-run language prompt when config.json is absent; then initI18n.
 */
export async function ensureLocalePreference(program: Command, config: ConfigManager): Promise<void> {
  const forced = resolveLocaleFromEnvAndArgv(program);
  initI18n(forced ?? "en");

  if (shouldSkipLocaleBootstrap()) {
    return;
  }

  if (forced) {
    return;
  }

  const loaded = await config.loadOptional();

  if (!loaded) {
    if (shouldSkipLocalePrompt()) {
      config.resetMinimalWithUi("en");
      initI18n("en");
      return;
    }
    const { locale: picked } = await Enquirer.prompt<{ locale: string }>({
      type: "select",
      name: "locale",
      message: "Choose your language for calendit messages:",
      choices: [
        { name: "English", value: "en" },
        { name: "Japanese (日本語)", value: "ja" },
      ],
    });
    const locale: UiLocale = picked === "ja" ? "ja" : "en";
    config.resetMinimalWithUi(locale);
    await config.save();
    initI18n(locale);
    return;
  }
}
