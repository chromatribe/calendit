#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

const localesDir = path.join(root, "src", "locales");
const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));
if (files.length < 2) {
  console.error("Need at least two locale JSON files.");
  process.exit(1);
}

const sets = {};
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(localesDir, f), "utf8"));
  sets[f] = new Set(flattenKeys(data).sort());
}

const baseName = "en.json";
const base = sets[baseName];
if (!base) {
  console.error("en.json is required as the master locale file.");
  process.exit(1);
}

let failed = false;
for (const f of files) {
  if (f === baseName) continue;
  const other = sets[f];
  const onlyBase = [...base].filter((k) => !other.has(k));
  const onlyOther = [...other].filter((k) => !base.has(k));
  if (onlyBase.length || onlyOther.length) {
    failed = true;
    console.error(`Locale key mismatch: ${baseName} vs ${f}`);
    if (onlyBase.length) console.error(`  Only in ${baseName}:`, onlyBase.join(", "));
    if (onlyOther.length) console.error(`  Only in ${f}:`, onlyOther.join(", "));
  }
}

if (failed) process.exit(1);
console.log("Locale key parity OK:", files.join(", "));
