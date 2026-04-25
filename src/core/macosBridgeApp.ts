import * as fs from "fs";
import * as fsp from "fs/promises";
import * as os from "os";
import * as path from "path";
import { resolveCalenditPackageRootFromModule } from "./calenditInstallRoot.js";
import { defaultCalenditDataDir } from "./eventkitHelper.js";

function isAppBundle(p: string): boolean {
  return p.endsWith(".app") && fs.existsSync(path.join(p, "Contents/Info.plist"));
}

/** Last bundle opened or installed by calendit (fallback when search paths miss). */
const BRIDGE_BUNDLE_PATH_CACHE = "eventkit-bridge-bundle-path.txt";

function readCachedBridgeAppBundlePath(): string | null {
  const f = path.join(defaultCalenditDataDir(), BRIDGE_BUNDLE_PATH_CACHE);
  try {
    const raw = fs.readFileSync(f, "utf8").trim();
    if (raw && isAppBundle(raw)) {
      return raw;
    }
  } catch {
    /* missing or unreadable */
  }
  return null;
}

/** Persist which `.app` calendit last opened or installed (helps doctor after cwd / helper path changes). */
export function recordLastOpenedBridgeAppBundle(appPath: string): void {
  const resolved = path.resolve(appPath);
  if (!isAppBundle(resolved)) {
    return;
  }
  try {
    fs.mkdirSync(defaultCalenditDataDir(), { recursive: true });
    fs.writeFileSync(path.join(defaultCalenditDataDir(), BRIDGE_BUNDLE_PATH_CACHE), `${resolved}\n`, "utf8");
  } catch {
    /* best-effort */
  }
}

export { resolveCalenditPackageRootFromModule } from "./calenditInstallRoot.js";

/** `native/eventkit-bridge` with `Package.swift` (source tree), or null. */
export function resolveEventkitBridgeRepoPath(): string | null {
  const override = process.env.CALENDIT_EVENTKIT_BRIDGE_ROOT?.trim();
  if (override) {
    const p = path.resolve(override);
    if (fs.existsSync(path.join(p, "Package.swift"))) {
      return p;
    }
    return null;
  }
  const root = resolveCalenditPackageRootFromModule();
  if (!root) {
    return null;
  }
  const br = path.join(root, "native/eventkit-bridge");
  if (fs.existsSync(path.join(br, "Package.swift"))) {
    return br;
  }
  const fetched = path.join(defaultCalenditDataDir(), "fetched-eventkit-bridge");
  if (fs.existsSync(path.join(fetched, "Package.swift"))) {
    return fetched;
  }
  return null;
}

/**
 * Resolve the CalenditEventKitBridge .app path for `calendit macos bridge start` / doctor.
 * Order: `CALENDIT_EVENTKIT_BRIDGE_APP`, then `/Applications` and `~/Applications` (stable TCC targets),
 * then `Package.swift` 隣の `.build/`（fetch / clone / `CALENDIT_EVENTKIT_BRIDGE_ROOT`）,
 * then cwd 配下の開発用 `.build/`, finally the path last recorded by `recordLastOpenedBridgeAppBundle` if still present.
 */
export function resolveEventkitBridgeAppBundlePath(): string | null {
  const fromEnv = process.env.CALENDIT_EVENTKIT_BRIDGE_APP?.trim();
  if (fromEnv && isAppBundle(fromEnv)) {
    return path.resolve(fromEnv);
  }
  const global = "/Applications/CalenditEventKitBridge.app";
  if (isAppBundle(global)) {
    return global;
  }
  const homeApps = path.join(os.homedir(), "Applications/CalenditEventKitBridge.app");
  if (isAppBundle(homeApps)) {
    return homeApps;
  }
  const bridgeRoot = resolveEventkitBridgeRepoPath();
  if (bridgeRoot) {
    const fromRepoBuild = path.join(bridgeRoot, ".build", "CalenditEventKitBridge.app");
    if (isAppBundle(fromRepoBuild)) {
      return fromRepoBuild;
    }
  }
  const dev = path.join(process.cwd(), "native/eventkit-bridge/.build/CalenditEventKitBridge.app");
  if (isAppBundle(dev)) {
    return dev;
  }
  return readCachedBridgeAppBundlePath();
}

/** `~/Applications/CalenditEventKitBridge.app` へ上書きコピー（TCC 用の安定パス向け）。 */
export async function installBuiltBridgeAppToUserApplications(sourceApp: string): Promise<{ ok: boolean; dest: string; message?: string }> {
  const dest = path.join(os.homedir(), "Applications", "CalenditEventKitBridge.app");
  try {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.rm(dest, { recursive: true, force: true });
    await fsp.cp(sourceApp, dest, { recursive: true, force: true });
    return { ok: true, dest };
  } catch (e) {
    return { ok: false, dest, message: e instanceof Error ? e.message : String(e) };
  }
}

/** `/Applications/CalenditEventKitBridge.app` へ上書きコピー（権限が無い場合は失敗し得る）。 */
export async function installBuiltBridgeAppToSystemApplications(sourceApp: string): Promise<{ ok: boolean; dest: string; message?: string }> {
  const dest = "/Applications/CalenditEventKitBridge.app";
  try {
    await fsp.rm(dest, { recursive: true, force: true });
    await fsp.cp(sourceApp, dest, { recursive: true, force: true });
    return { ok: true, dest };
  } catch (e) {
    return { ok: false, dest, message: e instanceof Error ? e.message : String(e) };
  }
}
