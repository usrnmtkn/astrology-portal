#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const records = fs.readFileSync("api/_lib/serving-package-records.ts", "utf8");
const liveStatus = fs.readFileSync("api/_lib/content-live-status.ts", "utf8");
const packageSource = fs.readFileSync("api/admin/package-source.ts", "utf8");
const inventory = fs.readFileSync("api/admin/generated-content-inventory.ts", "utf8");
const client = fs.readFileSync("apps/admin/src/generatedContentClient.ts", "utf8");
const vercel = fs.readFileSync("vercel.json", "utf8");

assert.doesNotMatch(records, /astro101|content-live-status|tldr-content/u, "Serving package records must not boot live-status or Astro 101.");
assert.match(liveStatus, /from "\.\/serving-package-records\.js"/u);
assert.match(packageSource, /serving-package-records/u);
assert.doesNotMatch(packageSource, /generated-content-libraries|content-live-status|astro101/u);
assert.match(packageSource, /A single contentKey is required for package source lookup/u);
assert.match(inventory, /allowedStatus/u);
assert.match(inventory, /allowedSurface/u);
assert.match(inventory, /boundedLimit\(requestUrl\.searchParams\.get\("limit"\), 50, 200\)/u);
assert.match(client, /studioInventoryDocumentPath/u);
assert.match(client, /studioPackageSourcePath/u);
assert.match(client, /\/api\/admin\/package-source\?contentKey=/u);
assert.match(client, /status: extras\.status \?\? "all"/u);
assert.match(client, /studioInventoryDocumentPath\(row\.content_key, \{ status: "DRAFT"/u);
assert.match(vercel, /"api\/admin\/package-source\.ts"/u);

const { servingPackageRecords } = await import("../api/_lib/serving-package-records.ts");
assert.ok(servingPackageRecords.get("authored/transit-aspect/sun/north-node/conjunction"), "You-serving transit package records must be readable without content-live-status.");

console.log("Content Studio slim package-source read contract passed.");
