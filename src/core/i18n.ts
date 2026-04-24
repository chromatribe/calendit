import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { LocaleKey } from "../generated/locale-keys.js";
import { logger } from "./logger.js";

export const SUPPORTED_UI_LOCALES = ["en", "ja"] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readLocaleFile(name: UiLocale): unknown {
  const file = path.join(__dirname, "..", "locales", `${name}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

const catalogs: Record<UiLocale, unknown> = {
  en: readLocaleFile("en"),
  ja: readLocaleFile("ja"),
};

let activeLocale: UiLocale = "en";

function getByPath(obj: unknown, parts: string[]): unknown {
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in (cur as object))) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function initI18n(locale: string): void {
  activeLocale = locale === "ja" ? "ja" : "en";
}

export function getActiveLocale(): UiLocale {
  return activeLocale;
}

export function t(key: LocaleKey, vars?: Record<string, string | number>): string {
  let raw = getByPath(catalogs[activeLocale], key.split("."));
  if (typeof raw !== "string") {
    raw = getByPath(catalogs.en, key.split("."));
    if (typeof raw !== "string") {
      logger.debug("i18n", `Missing locale key: ${key}`);
      return key;
    }
    if (activeLocale !== "en") {
      logger.debug("i18n", `Fallback to en for key: ${key}`);
    }
  }
  return interpolate(raw, vars);
}

export function isUiLocale(value: string): value is UiLocale {
  return (SUPPORTED_UI_LOCALES as readonly string[]).includes(value);
}
