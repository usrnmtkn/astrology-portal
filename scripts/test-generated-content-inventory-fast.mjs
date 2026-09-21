#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("api/admin/generated-content-inventory.ts", "utf8");
const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const inventory = fs.readFileSync("apps/admin/src/studioSectionInventory.ts", "utf8");
const vercel = fs.readFileSync("vercel.json", "utf8");

assert.doesNotMatch(api, /from "\.\/generated-content/u);
assert.doesNotMatch(api, /skyArticleTemplateCompiler|astro101|skyV4ReaderCopy/u);
assert.match(api, /lunar-journal-sources/u);
assert.match(api, /calendar-season-transition-sources/u);
assert.match(api, /pageIsComplete/u);
assert.match(inventory, /authored\/lunar-journal\//u);
assert.match(inventory, /authored\/calendar-season-transition\//u);
// List rows are marked as documents-not-loaded by the shared listing projection.
assert.match(api, /studioListingRow\(row, /u);
assert.match(fs.readFileSync("api/_lib/studio-listing-facts.ts", "utf8"), /inventory_only: true/u);
assert.match(api, /postgrestContentKeyPrefixAnd/u);
assert.match(inventory, /\/api\/admin\/generated-content-inventory\?/u);
assert.match(dashboard, /\/api\/admin\/generated-content-inventory\?/u);
assert.match(dashboard, /activePage === "sourceDrafts"/u);
assert.match(vercel, /"api\/admin\/generated-content-inventory\.ts"/u);

const generatedContent = fs.readFileSync("api/admin/generated-content.ts", "utf8");
assert.doesNotMatch(generatedContent, /from ["']\.\.\/\.\.\/apps\/web/u, "generated-content must not statically import apps/web libraries at boot.");
assert.match(generatedContent, /await import\("\.\/generated-content-libraries\.js"\)/u, "Write paths must load content libraries lazily.");
assert.match(generatedContent, /await loadGeneratedContentLibraries\(\)/u, "POST, PATCH, and DELETE must load content libraries before publication checks.");
const packageLookup = generatedContent.slice(
  generatedContent.indexOf('searchParams.get("includePackageSource")'),
  generatedContent.indexOf("if (req.method === \"POST\")")
);
assert.match(packageLookup, /serving-package-records/u, "Package-source lookup must use the slim serving records module.");
assert.doesNotMatch(packageLookup, /loadGeneratedContentLibraries/u, "Package-source GET must not boot write libraries.");
assert.doesNotMatch(packageLookup, /content-live-status/u, "Package-source GET must not import content-live-status.");
assert.match(fs.readFileSync("apps/admin/src/generatedContentClient.ts", "utf8"), /readStudioContentDocument/u);
assert.match(dashboard, /readStudioContentDocument\(/u);
assert.doesNotMatch(dashboard, /includePackageSource/u);
assert.match(vercel, /"api\/admin\/package-source\.ts"/u);
assert.match(fs.readFileSync("api/admin/generated-content-libraries.ts", "utf8"), /packagePublicationAdmissionIssue/u);
assert.match(fs.readFileSync("apps/web/src/content/astro101.ts", "utf8"), /from "\.\/astro101Ephemeris\.ts"/u, "Astro 101 must import ephemeris with a Node-resolvable .ts specifier on Vercel.");

console.log("Content Studio fast inventory API contract passed.");
