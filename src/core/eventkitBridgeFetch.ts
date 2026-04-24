import { execFile } from "child_process";
import { tmpdir } from "os";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { defaultCalenditDataDir } from "./eventkitHelper.js";
import { resolveCalenditPackageRootFromModule } from "./macosBridgeApp.js";

const execFileAsync = promisify(execFile);
const fsp = fs.promises;

/** Same `CALENDIT_CONFIG_DIR` rules as the bridge: fetched sources live under defaultCalenditDataDir. */
export function getFetchedEventkitBridgePath(): string {
  return path.join(defaultCalenditDataDir(), "fetched-eventkit-bridge");
}

const DEFAULT_REF = "main";

const ALLOWED_FETCH_HOSTS = new Set([
  "github.com",
  "codeload.github.com",
  "raw.githubusercontent.com",
  "www.github.com",
]);

function isAllowedUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return ALLOWED_FETCH_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Resolves `owner/repo` from the installed `calendit` `package.json` (repository.url), with defaults.
 */
function readDefaultOwnerRepoFromPackageJson(): { owner: string; repo: string } {
  const calenditRoot = resolveCalenditPackageRootFromModule();
  if (calenditRoot) {
    const pkgPath = path.join(calenditRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { repository?: { url?: string } | string };
        const raw = typeof pkg.repository === "string" ? pkg.repository : (pkg.repository?.url ?? "");
        const m = raw.match(/github\.com[:/]([^/]+)\/([^.?#/]+)/i);
        if (m) {
          const repo = m[2]!.replace(/\.git$/, "");
          return { owner: m[1]!, repo };
        }
      } catch {
        // fall through
      }
    }
  }
  return { owner: "chromatribe", repo: "calendit" };
}

function refToArchivePathSegment(ref: string): `refs/heads/${string}` | `refs/tags/${string}` {
  const t = ref.trim();
  if (t.startsWith("v") && /v\d+/.test(t)) {
    return `refs/tags/${t}`;
  }
  return `refs/heads/${t || DEFAULT_REF}`;
}

/**
 * Public default URL: GitHub `tar.gz` of the ref (entire repository archive).
 */
export function getDefaultEventkitFetchUrlFromEnv(): { url: string; ref: string; owner: string; repo: string } {
  const { owner, repo } = readDefaultOwnerRepoFromPackageJson();
  const ref = process.env.CALENDIT_EVENTKIT_FETCH_REF?.trim() || DEFAULT_REF;
  const fromEnv = process.env.CALENDIT_EVENTKIT_FETCH_URL?.trim();
  if (fromEnv) {
    if (!isAllowedUrl(fromEnv)) {
      throw new Error(`Invalid or disallowed fetch URL: ${fromEnv} (https on github.com only)`);
    }
    return { url: fromEnv, ref, owner, repo };
  }
  const seg = refToArchivePathSegment(ref);
  const url = `https://github.com/${owner}/${repo}/archive/${seg}.tar.gz`;
  return { url, ref, owner, repo };
}

/**
 * `HEAD` request: returns `Content-Length` as bytes or null.
 */
export async function probeHttpArchiveSizeBytes(url: string): Promise<number | null> {
  if (!isAllowedUrl(url)) {
    return null;
  }
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const cl = res.headers.get("content-length");
    if (cl == null || cl === "") {
      return null;
    }
    const n = parseInt(cl, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function formatMebibytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "?";
  }
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Download archive, extract the `native/eventkit-bridge` subtree to `getFetchedEventkitBridgePath()`.
 */
export async function materializeEventkitBridgeFromNetwork(opts: {
  url: string;
  force: boolean;
}): Promise<{ dest: string; writtenBytes: number }> {
  if (!isAllowedUrl(opts.url)) {
    throw new Error(`Refusing to fetch: ${opts.url} (https on github.com only)`);
  }
  const dest = getFetchedEventkitBridgePath();
  if (fs.existsSync(path.join(dest, "Package.swift")) && !opts.force) {
    return { dest, writtenBytes: 0 };
  }
  if (opts.force && fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }

  const tdir = await fsp.mkdtemp(path.join(tmpdir(), "calendit-ek-fetch-"));
  const tarball = path.join(tdir, "archive.tar.gz");
  const extractRoot = path.join(tdir, "extracted");

  try {
    const res = await fetch(opts.url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText || ""}`.trim());
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    fs.writeFileSync(tarball, buf);
    await fsp.mkdir(extractRoot, { recursive: true });
    await execFileAsync("/usr/bin/tar", ["-xzf", tarball, "-C", extractRoot]);
    const top = fs.readdirSync(extractRoot);
    if (top.length < 1) {
      throw new Error("empty archive");
    }
    const one = path.join(extractRoot, top[0]!);
    const bridgePkg = path.join(one, "native", "eventkit-bridge", "Package.swift");
    if (!fs.existsSync(bridgePkg)) {
      throw new Error(`no native/eventkit-bridge/Package.swift in archive (root: ${one})`);
    }
    const bridgeDir = path.dirname(bridgePkg);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    await fsp.cp(bridgeDir, dest, { recursive: true });
    return { dest, writtenBytes: buf.byteLength };
  } finally {
    try {
      fs.rmSync(tdir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
