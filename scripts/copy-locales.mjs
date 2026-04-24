#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src", "locales");
const destDir = path.join(root, "dist", "locales");
fs.mkdirSync(destDir, { recursive: true });
for (const name of fs.readdirSync(srcDir)) {
  if (name.endsWith(".json")) {
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
  }
}
console.log("Copied locales to dist/locales");
