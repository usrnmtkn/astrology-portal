import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isReaderAppHref } from "../apps/admin/src/adminReaderLinks.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webMain = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const adminHeader = fs.readFileSync(path.join(repoRoot, "apps/admin/src/AdminStudioPrimitives.tsx"), "utf8");

assert.equal(isReaderAppHref("#/you/placement/sun-aquarius-9h"), true, "reader hash routes open outside Content Studio");
assert.equal(isReaderAppHref("/#/you/placement/sun-aquarius-9h"), true, "root reader hash routes open outside Content Studio");
assert.equal(isReaderAppHref("/reports/example-report"), true, "public app paths open outside Content Studio");
assert.equal(isReaderAppHref("/admin/content/coverage"), false, "Content coverage stays inside Content Studio");
assert.equal(isReaderAppHref("/admin/content"), false, "Content Studio stays in the current tab");
assert.equal(isReaderAppHref("#slots"), false, "Content Studio hash navigation stays in the current tab");
assert.equal(isReaderAppHref("https://example.com"), false, "unrelated external links are not reclassified as app links");

assert.match(webMain, /isContentCoveragePath\(\)/u, "public web entry recognizes the Content coverage route");
assert.match(webMain, /ContentCoverageDashboard/u, "public web entry renders Content coverage instead of the reader app");
assert.match(webMain, /setupAdminReaderLinks/u, "public web-mounted Content Studio enforces reader-link tab behavior");
assert.match(adminHeader, />\s*Content coverage\s*</u, "Content Studio names the Coverage action clearly");

console.log("Content Studio coverage and reader-link routing contract passed.");
