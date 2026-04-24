import type { ConfigManager } from "./config.js";

/**
 * If the user did not set `CALENDIT_EVENTKIT_BRIDGE` in the environment, apply
 * the persisted `eventkit.defaultTransport` from config (when present).
 * Shell env always wins; call only after `loadOptional()`.
 */
export function applyEventkitConfigToEnvAfterLoad(config: ConfigManager): void {
  const raw = process.env.CALENDIT_EVENTKIT_BRIDGE;
  if (raw !== undefined && String(raw).trim() !== "") {
    return;
  }
  const v = config.getEventkitDefaultTransport();
  if (!v) {
    return;
  }
  if (v === "bridge") {
    process.env.CALENDIT_EVENTKIT_BRIDGE = "1";
  } else if (v === "helper") {
    process.env.CALENDIT_EVENTKIT_BRIDGE = "0";
  } else {
    delete process.env.CALENDIT_EVENTKIT_BRIDGE;
  }
}
