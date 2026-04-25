import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * 実行中の `calendit` が属する npm パッケージのルート（`package.json` の `name` が `calendit` のディレクトリ）。
 * `dist/` から親を辿って解決する。フル git クローンでは `native/` がこの下に付く。
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
