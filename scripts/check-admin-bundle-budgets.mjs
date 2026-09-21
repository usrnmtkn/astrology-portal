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
// including its rendered Friend-variable guide, their CRUD lifecycle, and
// bounded API-failure handling. Deferred content markers remain forbidden.
// 2026-09-07 release baseline: main 0720c198 already measured 604,777 bytes
// raw / 171,182 gzip at entry and 297,811 gzip total with the isolated runtime.
// Main 380aeb7e leaves Admin sources unchanged. The Sky template release measures
// 610.3 kB raw / 172.9 kB gzip at entry and 298.9 kB gzip total. Limits allow
// narrow headroom for that existing application plus this release. Lazy-group
// boundaries and forbidden payload checks remain enforced independently.

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
const memoryGraphFiles = javaScriptFiles.filter((item) => /\/MemoryGraphDashboard-/.test(item.file));
const measurements = {
  entryJavaScriptRawBytes: entryItem?.rawBytes ?? 0,
  entryJavaScriptGzipBytes: entryItem?.gzipBytes ?? 0,
  largestJavaScriptRawBytes: largestItem?.rawBytes ?? 0,
  totalJavaScriptGzipBytes: javaScriptFiles.reduce((sum, item) => sum + item.gzipBytes, 0),
  memoryGraphJavaScriptGzipBytes: memoryGraphFiles.reduce((sum, item) => sum + item.gzipBytes, 0)
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

// Moving provenance out of JavaScript must preserve every source record in the
// deployed asset. A smaller bundle with missing data is not a passing build.
const moonSourceFile = manifest["src/skyMoonSummarySources.json"]?.file;
if (!moonSourceFile?.endsWith(".json") || !fs.existsSync(path.join(distRoot, moonSourceFile))) {
  failures.push("Moon source metadata must ship as a deferred JSON asset.");
} else {
  const expected = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/admin/src/skyMoonSummarySources.json"), "utf8"));
  const deployed = JSON.parse(fs.readFileSync(path.join(distRoot, moonSourceFile), "utf8"));
  if (JSON.stringify(deployed) !== JSON.stringify(expected)) {
    failures.push("Deployed Moon source metadata differs from the complete source artifact.");
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

// The variable reference is shared by two lazy editors. Check the complete
// static entry graph so moving it to an eagerly imported shared chunk fails.
const initialChunks = new Set();
function visitInitial(key) {
  if (initialChunks.has(key) || !manifest[key]) return;
  initialChunks.add(key);
  for (const dependency of manifest[key].imports ?? []) visitInitial(dependency);
}
visitInitial(Object.entries(manifest).find(([, item]) => item === entry)?.[0]);
if (memoryGraphFiles.length !== 1) failures.push('Expected one deferred memory graph route with its renderer.');
for (const key of initialChunks) {
  const file = manifest[key].file;
  if (key === "src/StudioFormattingEditor.tsx" || (file?.endsWith(".js") && fs.readFileSync(path.join(distRoot, file), "utf8").includes("ProseMirror"))) {
    failures.push(`The visual writing editor must remain deferred from Studio startup: ${file}`);
  }
  if (memoryGraphFiles.some((item) => item.file === file)) {
    failures.push(`Memory graph must remain deferred from Content Studio startup: ${file}`);
  }
  if (file?.endsWith(".js") && fs.readFileSync(path.join(distRoot, file), "utf8").includes("Sky variable key")) {
    failures.push(`Sky variable reference must remain deferred: ${file}`);
  }
  if (file?.endsWith(".js") && fs.readFileSync(path.join(distRoot, file), "utf8").includes("Compare original and replacement")) {
    failures.push(`Studio memory review must remain deferred: ${file}`);
  }
  if (file?.endsWith(".js") && fs.readFileSync(path.join(distRoot, file), "utf8").includes("Calendar preview variables")) {
    failures.push(`Calendar template preview must remain deferred: ${file}`);
  }
  if (file?.endsWith(".js") && fs.readFileSync(path.join(distRoot, file), "utf8").includes("Find a Friends transit card")) {
    failures.push(`Friends transit source finder must remain deferred: ${file}`);
  }
}

const expectedDynamicEntries = [
  "src/StudioFormattingEditor.tsx",
  "src/CompositionMapWorkspace.tsx",
  "src/SkyPlacementComposition.tsx",
  "src/SkyFallbackFieldsEditor.tsx",
  "src/MemoryGraphDashboard.tsx",
  "src/StudioMemoryFeedback.tsx",
  "src/CalendarTemplatePreview.tsx",
  "src/CalendarOverviewEditor.tsx",
  "src/SkyForecastTemplateStudio.tsx",
  "src/calendarPreviewCalculation.ts",
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
console.log(`Deferred memory graph: ${formatBytes(measurements.memoryGraphJavaScriptGzipBytes)} gzip`);
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
