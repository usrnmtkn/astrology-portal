#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "apps/admin/dist");
const manifestPath = path.join(distRoot, ".vite/manifest.json");
const budgetsPath = path.join(repoRoot, "scripts/admin-bundle-budgets.json");

// The entry allowance includes the Content Studio publishing controls plus the
// Personal Transit, House Transit, and paired Daily At-a-Glance workspaces,
// their CRUD lifecycle, and bounded API-failure handling. Deferred content
// markers remain forbidden.

function formatBytes(value) {
  if (value < 1000) return `${value} B`;
  return `${(value / 1000).toFixed(1)} kB`;
}

if (!fs.existsSync(manifestPath)) {
  console.error("Missing Admin Vite manifest. Run npm run build:admin first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const budgets = JSON.parse(fs.readFileSync(budgetsPath, "utf8"));
const entry = Object.values(manifest).find((item) => item?.isEntry);
if (!entry?.file) {
  console.error("Admin Vite manifest is missing its entry chunk.");
  process.exit(1);
}

const javaScriptFiles = fs.readdirSync(path.join(distRoot, "assets"))
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const bytes = fs.readFileSync(path.join(distRoot, "assets", file));
    return { file: `assets/${file}`, rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length };
  });
const entryItem = javaScriptFiles.find((item) => item.file === entry.file);
const largestItem = [...javaScriptFiles].sort((first, second) => second.rawBytes - first.rawBytes)[0];
const measurements = {
  entryJavaScriptRawBytes: entryItem?.rawBytes ?? 0,
  entryJavaScriptGzipBytes: entryItem?.gzipBytes ?? 0,
  largestJavaScriptRawBytes: largestItem?.rawBytes ?? 0,
  totalJavaScriptGzipBytes: javaScriptFiles.reduce((sum, item) => sum + item.gzipBytes, 0)
};
const failures = Object.entries(budgets).flatMap(([metric, limit]) => (
  measurements[metric] > limit
    ? [`${metric}: ${formatBytes(measurements[metric])} exceeds ${formatBytes(limit)}`]
    : []
));

const editorGuidanceAsset = path.join(distRoot, "generated/admin-fallback-hook-editor-guidance-v1.json");
if (!fs.existsSync(editorGuidanceAsset)) {
  failures.push("Admin fallback-editor guidance data asset is missing.");
} else {
  const guidancePayload = JSON.parse(fs.readFileSync(editorGuidanceAsset, "utf8"));
  if (guidancePayload.schema !== "admin-fallback-hook-editor-guidance/v1") {
    failures.push("Admin fallback-editor guidance data asset has an invalid schema.");
  }
}

const forbiddenEntryMarkers = [
  "bundled-deferred-core-rows-v3",
  "bundled-sky-core-rows-v3",
  "fallbackArchitectureV3Runtime",
  "Daily content map",
  "Today between you two · personal clause"
];
const entrySource = entryItem ? fs.readFileSync(path.join(distRoot, entryItem.file), "utf8") : "";
for (const marker of forbiddenEntryMarkers) {
  if (entrySource.includes(marker)) failures.push(`Admin entry contains deferred content marker: ${marker}`);
}

const expectedDynamicEntries = [
  "src/CompositionMapWorkspace.tsx",
];
for (const key of expectedDynamicEntries) {
  if (!manifest[key]?.isDynamicEntry) failures.push(`Expected lazy Admin entry is missing: ${key}`);
}
const expectedDeferredGroups = [
  "admin-deferred-editor-tools",
  "admin-deferred-fallback-tools",
  "admin-deferred-review-tools"
];
const entryImports = new Set(entry.imports ?? []);
const entryDynamicImports = new Set(entry.dynamicImports ?? []);
for (const name of expectedDeferredGroups) {
  const match = Object.entries(manifest).find(([, item]) => item?.name === name);
  const [key, item] = match ?? [];
  if (!key || !item?.isDynamicEntry) {
    failures.push(`Expected lazy Admin group is missing: ${name}`);
    continue;
  }
  if (entryImports.has(key) || !entryDynamicImports.has(key)) {
    failures.push(`Admin group must remain deferred from the entry: ${name}`);
  }
}

console.log("# Admin bundle budget");
console.log(`Entry JavaScript: ${formatBytes(measurements.entryJavaScriptGzipBytes)} gzip (${formatBytes(measurements.entryJavaScriptRawBytes)} raw)`);
console.log(`Largest JavaScript: ${largestItem?.file ?? "none"} (${formatBytes(measurements.largestJavaScriptRawBytes)} raw)`);
console.log(`All JavaScript: ${formatBytes(measurements.totalJavaScriptGzipBytes)} gzip across ${javaScriptFiles.length} files`);
console.log("\nJavaScript chunks:");
for (const item of [...javaScriptFiles].sort((first, second) => second.rawBytes - first.rawBytes)) {
  console.log(`- ${item.file}: ${formatBytes(item.gzipBytes)} gzip (${formatBytes(item.rawBytes)} raw)`);
}

if (failures.length > 0) {
  console.error("\nAdmin bundle budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nAdmin bundle budget passed.");
