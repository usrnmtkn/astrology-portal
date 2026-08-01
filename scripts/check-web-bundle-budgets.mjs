#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "apps/web/dist");
const manifestPath = path.join(distRoot, ".vite/manifest.json");
const budgetsPath = path.join(repoRoot, "scripts/web-bundle-budgets.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function filesRecursively(root) {
  if (!fs.existsSync(root)) return [];

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(root, entry.name);
    return entry.isDirectory() ? filesRecursively(resolved) : [resolved];
  });
}

function compressedFile(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    file: path.relative(distRoot, filePath),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length
  };
}

function collectStaticManifestGraph(manifest, entryKeys) {
  const visitedKeys = new Set();
  const files = new Set();

  function visit(key) {
    if (!key || visitedKeys.has(key)) return;
    visitedKeys.add(key);

    const item = manifest[key];
    if (!item) return;
    if (item.file) files.add(item.file);
    for (const cssFile of item.css ?? []) files.add(cssFile);
    for (const assetFile of item.assets ?? []) files.add(assetFile);
    for (const importedKey of item.imports ?? []) visit(importedKey);
  }

  for (const key of entryKeys) visit(key);
  return files;
}

function formatBytes(value) {
  if (value < 1000) return `${value} B`;
  if (value < 1000000) return `${(value / 1000).toFixed(1)} kB`;
  return `${(value / 1000000).toFixed(2)} MB`;
}

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing Vite manifest at ${path.relative(repoRoot, manifestPath)}. Run npm run build:web first.`);
  process.exit(1);
}

const manifest = readJson(manifestPath);
const budgets = readJson(budgetsPath);
const builtFiles = filesRecursively(path.join(distRoot, "assets"))
  .filter((filePath) => /\.(?:css|js)$/u.test(filePath))
  .map(compressedFile);
const filesByName = new Map(builtFiles.map((item) => [item.file, item]));
const javaScriptFiles = builtFiles.filter((item) => item.file.endsWith(".js"));
const cssFiles = builtFiles.filter((item) => item.file.endsWith(".css"));
const entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry);
const appKey = Object.keys(manifest).find((key) => manifest[key]?.name === "App");
const readerStyleKeys = [
  "src/styles.css",
  "src/styles/responsive.css",
  "src/styles/card-systems.css"
];

if (!entryKey || !appKey || readerStyleKeys.some((key) => !manifest[key])) {
  console.error("Vite manifest is missing the web entry, App module, or reader startup styles.");
  process.exit(1);
}

const bootFiles = collectStaticManifestGraph(manifest, [entryKey, appKey]);
const bootItems = [...bootFiles]
  .map((file) => filesByName.get(file))
  .filter(Boolean);
const readerStyleFiles = collectStaticManifestGraph(manifest, readerStyleKeys);
const readerStyleItems = [...readerStyleFiles]
  .map((file) => filesByName.get(file))
  .filter(Boolean);
const readerBootItems = [...new Set([...bootFiles, ...readerStyleFiles])]
  .map((file) => filesByName.get(file))
  .filter(Boolean);
const appItem = filesByName.get(manifest[appKey].file);
const deferredFallbackItem = javaScriptFiles.find((item) => item.file.includes("fallback-content-relationships-"));
const largestJavaScript = [...javaScriptFiles].sort((first, second) => second.gzipBytes - first.gzipBytes)[0];
const measurements = {
  appBootGzipBytes: sum(bootItems, "gzipBytes"),
  appChunkGzipBytes: appItem?.gzipBytes ?? 0,
  readerBootGzipBytes: sum(readerBootItems, "gzipBytes"),
  readerInitialCssGzipBytes: sum(readerStyleItems, "gzipBytes"),
  largestJavaScriptGzipBytes: largestJavaScript?.gzipBytes ?? 0,
  totalCssGzipBytes: sum(cssFiles, "gzipBytes"),
  totalJavaScriptGzipBytes: sum(javaScriptFiles, "gzipBytes")
};

const failures = Object.entries(budgets).flatMap(([metric, limit]) => {
  const actual = measurements[metric];
  return typeof actual === "number" && actual > limit
    ? [`${metric}: ${formatBytes(actual)} exceeds ${formatBytes(limit)}`]
    : [];
});

if (deferredFallbackItem && bootFiles.has(deferredFallbackItem.file)) {
  failures.push("The transit/relationship fallback chunk re-entered the static App boot graph.");
}

console.log("# Web bundle budget");
console.log(`App JavaScript boot graph: ${formatBytes(measurements.appBootGzipBytes)} gzip across ${bootItems.length} files`);
console.log(`Reader boot including awaited CSS: ${formatBytes(measurements.readerBootGzipBytes)} gzip across ${readerBootItems.length} files`);
console.log(`Reader startup CSS: ${formatBytes(measurements.readerInitialCssGzipBytes)} gzip across ${readerStyleItems.length} files`);
console.log(`App code chunk: ${formatBytes(measurements.appChunkGzipBytes)} gzip`);
console.log(`Largest JavaScript: ${largestJavaScript?.file ?? "none"} (${formatBytes(measurements.largestJavaScriptGzipBytes)} gzip)`);
console.log(`All JavaScript: ${formatBytes(measurements.totalJavaScriptGzipBytes)} gzip across ${javaScriptFiles.length} files`);
console.log(`All CSS: ${formatBytes(measurements.totalCssGzipBytes)} gzip across ${cssFiles.length} files`);
console.log("");
console.log("Largest JavaScript chunks:");
for (const item of [...javaScriptFiles].sort((first, second) => second.gzipBytes - first.gzipBytes).slice(0, 8)) {
  console.log(`- ${item.file}: ${formatBytes(item.gzipBytes)} gzip (${formatBytes(item.rawBytes)} raw)`);
}

if (failures.length > 0) {
  console.error("\nBundle budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nBundle budget passed.");
