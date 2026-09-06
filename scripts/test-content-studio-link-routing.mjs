import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isReaderAppHref } from "../apps/admin/src/adminReaderLinks.ts";
import {
  isContextualReaderHref,
  natalPlacementReaderHref,
  readerDestinationPolicyBySurface,
  reportReaderHref,
  skyAspectReaderHref,
  skyPlacementReaderHref
} from "../apps/admin/src/adminReaderDestinations.ts";
import { writingSurfaceSourceMap } from "../apps/admin/src/writingSurfaceSourceMap.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminSrcRoot = path.join(repoRoot, "apps/admin/src");
const webMain = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const adminHeader = fs.readFileSync(path.join(adminSrcRoot, "AdminStudioPrimitives.tsx"), "utf8");

function walkSourceFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(filePath));
      continue;
    }
    if (entry.isFile() && /\.(?:ts|tsx|js|jsx|mjs)$/u.test(entry.name)) files.push(filePath);
  }
  return files;
}

assert.equal(isReaderAppHref("#/you/placement/sun-aquarius-9h"), true, "reader hash routes open outside Content Studio");
assert.equal(isReaderAppHref("/#/you/placement/sun-aquarius-9h"), true, "root reader hash routes open outside Content Studio");
assert.equal(isReaderAppHref("/reports/example-report"), true, "public app paths open outside Content Studio");
assert.equal(isReaderAppHref("/admin/content/coverage"), false, "Content coverage stays inside Content Studio");
assert.equal(isReaderAppHref("/admin/content"), false, "Content Studio stays in the current tab");
assert.equal(isReaderAppHref("#slots"), false, "Content Studio hash navigation stays in the current tab");
assert.equal(isReaderAppHref("https://example.com"), false, "unrelated external links are not reclassified as app links");

assert.equal(natalPlacementReaderHref("Sun", "Aquarius", 9), "/#/you/placement/sun-aquarius-9h");
assert.equal(skyPlacementReaderHref("Mercury", "Cancer"), "/#/sky/placement/mercury/cancer");
assert.equal(skyAspectReaderHref("Sun", "Conjunction", "Mercury"), "/#/sky/aspect/sun/conjunction/mercury");
assert.equal(reportReaderHref("report-123"), "/reports/report-123");

for (const href of [
  "/#/you/placement/sun-aquarius-9h",
  "#/you/placement/sun-aquarius-9h",
  "/#/sky/placement/mercury/cancer",
  "/#/sky/aspect/sun/conjunction/mercury",
  "/reports/report-123"
]) {
  assert.equal(isContextualReaderHref(href), true, `${href} is a contextual reader destination`);
}

for (const href of [
  "",
  "/",
  "/#/",
  "#/",
  "/#you",
  "/#sky",
  "/#friends",
  "/#calendar",
  "/admin/content",
  "/admin/content/coverage",
  "https://example.com"
]) {
  assert.equal(isContextualReaderHref(href), false, `${href || "empty href"} must not qualify as View in app context`);
}

const trackedSurfaceIds = writingSurfaceSourceMap.map((surface) => surface.id).sort();
const policySurfaceIds = Object.keys(readerDestinationPolicyBySurface).sort();
assert.deepEqual(
  policySurfaceIds,
  trackedSurfaceIds,
  "Every Composition Map surface must declare an explicit reader-destination policy."
);

assert.equal(readerDestinationPolicyBySurface["natal-placement-detail"].mode, "exact-context");
assert.equal(readerDestinationPolicyBySurface["sky-placement-detail"].mode, "exact-context");
assert.equal(readerDestinationPolicyBySurface["sky-aspect-detail"].mode, "exact-context");
assert.equal(readerDestinationPolicyBySurface["generated-reports"].mode, "exact-context");
assert.equal(readerDestinationPolicyBySurface["friends-synastry-contact"].mode, "context-required");
assert.equal(readerDestinationPolicyBySurface["daily-at-a-glance"].mode, "context-required");
assert.equal(readerDestinationPolicyBySurface["sky-calendar-event-cards"].mode, "context-required");
assert.equal(readerDestinationPolicyBySurface["surface-specs-builders"].mode, "not-reader");

const adminSourceFiles = walkSourceFiles(adminSrcRoot);
const directWindowOpenFiles = [];
const contextlessLiteralReaderLinks = [];
const ungovernedViewInAppFiles = [];
const literalHrefPattern = /href\s*=\s*["'`]([^"'`]+)["'`]/gu;

for (const filePath of adminSourceFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  const relative = path.relative(repoRoot, filePath).split(path.sep).join("/");

  if (relative !== "apps/admin/src/adminReaderDestinations.ts" && /\bwindow\.open\s*\(/u.test(source)) {
    directWindowOpenFiles.push(relative);
  }

  if (/View in app/u.test(source)
      && !/openContextualReaderHref/u.test(source)
      && !/isContextualReaderHref/u.test(source)) {
    ungovernedViewInAppFiles.push(relative);
  }

  for (const match of source.matchAll(literalHrefPattern)) {
    const href = match[1];
    if (isReaderAppHref(href) && !isContextualReaderHref(href)) {
      contextlessLiteralReaderLinks.push(`${relative}: ${href}`);
    }
  }
}

assert.deepEqual(
  directWindowOpenFiles,
  [],
  `Reader windows must go through openContextualReaderHref so new-tab and context checks cannot drift: ${directWindowOpenFiles.join(", ")}`
);
assert.deepEqual(
  contextlessLiteralReaderLinks,
  [],
  `Content Studio must not link to contextless reader landing pages: ${contextlessLiteralReaderLinks.join(", ")}`
);
assert.deepEqual(
  ungovernedViewInAppFiles,
  [],
  `Every View in app action must use the governed reader-destination helper: ${ungovernedViewInAppFiles.join(", ")}`
);

assert.match(webMain, /isContentCoveragePath\(\)/u, "public web entry recognizes the Content coverage route");
assert.match(webMain, /ContentCoverageDashboard/u, "public web entry renders Content coverage instead of the reader app");
assert.match(webMain, /setupAdminReaderLinks/u, "public web-mounted Content Studio enforces reader-link tab behavior");
assert.match(adminHeader, />\s*Content coverage\s*</u, "Content Studio names the Coverage action clearly");

const modes = Object.values(readerDestinationPolicyBySurface).reduce((counts, policy) => {
  counts[policy.mode] = (counts[policy.mode] ?? 0) + 1;
  return counts;
}, {});
console.log(
  `Content Studio reader-destination audit passed: ${trackedSurfaceIds.length} surfaces; `
  + `${modes["exact-context"] ?? 0} exact-context, ${modes["context-required"] ?? 0} context-required, ${modes["not-reader"] ?? 0} internal.`
);
