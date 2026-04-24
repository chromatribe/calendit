import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { defaultCalenditDataDir } from "./eventkitHelper.js";

function isAppBundle(p: string): boolean {
  return p.endsWith(".app") && fs.existsSync(path.join(p, "Contents/Info.plist"));
}

/**
 * Directory of the installed `calendit` npm package (where package.json with name "calendit" lives), or null.
 * Used to locate `native/eventkit-bridge` in a full clone; absent from the published npm tarball.
 */
export function resolveCalenditPackageRootFromModule(): string | null {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 20; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const raw = fs.readFileSync(pkg, "utf8");
        const j = JSON.parse(raw) as { name?: string };
        if (j.name === "calendit") {
          return dir;
        }
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

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
 * Resolve the CalenditEventKitBridge .app path for `calendit macos bridge start`.
 * Order: CALENDIT_EVENTKIT_BRIDGE_APP, ~/Applications, /Applications, repo .build (dev).
 */
export function resolveEventkitBridgeAppBundlePath(): string | null {
  const fromEnv = process.env.CALENDIT_EVENTKIT_BRIDGE_APP?.trim();
  if (fromEnv && isAppBundle(fromEnv)) {
    return fromEnv;
  }
  const homeApps = path.join(os.homedir(), "Applications/CalenditEventKitBridge.app");
  if (isAppBundle(homeApps)) {
    return homeApps;
  }
  const global = "/Applications/CalenditEventKitBridge.app";
  if (isAppBundle(global)) {
    return global;
  }
  const dev = path.join(process.cwd(), "native/eventkit-bridge/.build/CalenditEventKitBridge.app");
  if (isAppBundle(dev)) {
    return dev;
  }
  return null;
}
