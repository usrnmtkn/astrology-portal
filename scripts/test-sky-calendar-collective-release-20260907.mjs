#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRelative = "packages/astro-knowledge/review/sky-calendar-collective-approved-2026-09-07";
const releaseRoot = path.join(repoRoot, releaseRelative);
const projection = JSON.parse(fs.readFileSync(path.join(releaseRoot, "current-owner-payloads.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(releaseRoot, "shipping-manifest.json"), "utf8"));
const records = JSON.parse(fs.readFileSync(path.join(releaseRoot, "exact-approval-records.json"), "utf8"));
const editorial = JSON.parse(fs.readFileSync(path.join(releaseRoot, "owner-batch-authorization.json"), "utf8"));
const serving = JSON.parse(fs.readFileSync(path.join(releaseRoot, "owner-serving-authorization.json"), "utf8"));
const refinements = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/astro-knowledge/review/calendar-collective-pressure-pass-2026-09-07/owner-release-authorization.json'), 'utf8'));
assert.equal(refinements.authority, 'owner');
assert.equal(refinements.decision, 'approve');
assert.equal(refinements.memberCount, 21);
const refinementByKey = new Map(refinements.records.map(row => [row.contentKey.replace('sky.aspect.', 'sky.'), row]));
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");

const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu;

assert.equal(editorial.authority, "owner");
assert.equal(editorial.decision, "approve");
assert.equal(editorial.approvalEffect, "exact_wording_approval");
assert.equal(editorial.memberCount, 379);
assert.equal(editorial.readerAddressOverlayCount, 40);
assert.equal(serving.authority, "owner");
assert.equal(serving.decision, "approve");
assert.equal(serving.runtimeEligible, true);
assert.equal(serving.contentStudioEditable, true);
assert.equal(serving.contentStudioSignedOffExactOverridesCanonicalBaseline, true);
assert.ok(serving.capabilities.includes("serving"));
assert.ok(serving.capabilities.includes("content_studio_sync"));

assert.equal(projection.rowCount, 379);
assert.equal(Object.keys(projection.payloads).length, 379);
assert.equal(projection.readerAddressOverlayCount, 40);
assert.equal(manifest.rowCount, 379);
assert.equal(manifest.rows.length, 379);
assert.equal(manifest.readerAddressOverlayCount, 40);
assert.equal(manifest.contentStudioEditable, true);
assert.equal(manifest.contentStudioSignedOffExactOverridesCanonicalBaseline, true);
assert.equal(records.rowCount, 379);
assert.equal(records.records.length, 379);
assert.equal(records.readerAddressOverlayCount, 40);

const manifestByLegacyKey = new Map(manifest.rows.map((row) => [row.legacyProjectionKey, row]));
let readerAddressRows = 0;
for (const [legacyKey, entry] of Object.entries(projection.payloads)) {
  const payload = entry.payload;
  assert.ok(payload.summary.trim(), `${legacyKey}: summary missing.`);
  assert.ok(payload.body.startsWith(payload.summary), `${legacyKey}: body does not begin with summary.`);
  assert.equal(entry.sha256, sha256(JSON.stringify(payload)), `${legacyKey}: projection payload hash drifted.`);
  if (secondPerson.test(payload.body)) readerAddressRows += 1;

  const manifestRow = manifestByLegacyKey.get(legacyKey);
  assert.ok(manifestRow, `${legacyKey}: shipping manifest row missing.`);
  assert.equal(manifestRow.summarySha256, sha256(payload.summary));
  assert.equal(manifestRow.bodySha256, sha256(payload.body));
  const runtime = JSON.parse(fs.readFileSync(path.join(repoRoot, manifestRow.runtimeFile), "utf8"));
  assert.equal(runtime.status, "LIVE", `${legacyKey}: runtime row is not LIVE.`);
  assert.equal(runtime.voiceNeutral, true, `${legacyKey}: runtime row lost collective voice metadata.`);
  assert.equal(runtime.readerCopy.summary, refinementByKey.get(legacyKey)?.summary ?? payload.summary, `${legacyKey}: runtime summary drifted.`);
  assert.equal(runtime.readerCopy.body, refinementByKey.get(legacyKey)?.body ?? payload.body, `${legacyKey}: runtime body drifted.`);
  assert.match(runtime.readerCopy.approvedVia, /sky-calendar-collective-approved-2026-09-07/u, `${legacyKey}: runtime approval provenance missing.`);
}
assert.equal(readerAddressRows, 40, "Exactly the 40 selectively authored rows should contain direct second person.");

const canonicalMemberHash = sha256(JSON.stringify(
  Object.entries(projection.payloads)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 })),
));
assert.equal(projection.payloadSetSha256, canonicalMemberHash);
assert.equal(manifest.payloadSetSha256, canonicalMemberHash);

const southNodeFiles = fs.readdirSync(transitRoot).filter((name) => name.endsWith("-south-node.json"));
assert.equal(southNodeFiles.length, 60, "The pre-existing 60 South Node exact rows must remain present and outside the 379-row rewrite.");
assert.equal(manifest.rows.filter((row) => row.runtimeFile.endsWith("-south-node.json")).length, 0, "The collective rewrite must not replace South Node pole-specific copy.");

const seedRun = spawnSync(process.execPath, [path.join(repoRoot, "scripts/seed-published-calendar-aspect-content-studio.mjs")], {
  cwd: repoRoot,
  encoding: "utf8"
});
assert.equal(seedRun.status, 0, seedRun.stderr || "Content Studio exact catalog generation failed.");
const seedResult = JSON.parse(seedRun.stdout);
assert.equal(seedResult.rows, 439, "Content Studio must expose all 439 exact aspect rows after the release.");
assert.equal(seedResult.northNodeRows, 60, "Content Studio must retain 60 editable North Node rows.");
assert.equal(seedResult.southNodeRows, 60, "Content Studio must retain 60 editable South Node rows.");

const lunar = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx"), "utf8");
const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const skyContent = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/skyAspectContent.ts"), "utf8");
const seedSource = fs.readFileSync(path.join(repoRoot, "scripts/seed-published-calendar-aspect-content-studio.mjs"), "utf8");
const surfaceContract = fs.readFileSync(path.join(repoRoot, "docs/content-management/SKY-ASPECT-SURFACE-CONTRACT.md"), "utf8");

assert.match(lunar, /exact: studioExact \?\? exact/u, "Calendar must prefer a signed-off Studio exact version over its canonical exact baseline.");
assert.match(app, /if \(studio\) \{[\s\S]*tier: "content-studio-exact-sky-aspect-v1"/u, "Sky detail must prefer a signed-off Studio exact version at the exact tier.");
assert.doesNotMatch(app, /!loadedExactRegistry\.approvedExactSkyAspectCopy/u, "Studio exact authority must not be limited to canonical source gaps.");
assert.match(skyContent, /South Node \(\$\{southAspect\}\): \$\{south\.body\}/u, "Studio exact North Node rendering must preserve the paired South Node interpretation.");
assert.match(skyContent, /sky\.aspect\.south-node\.\$\{southAspect\}/u, "Calendar hydration must request the editable South Node counterpart for node-axis events.");
assert.match(seedSource, /studio_editable_fields:[\s\S]*Summary[\s\S]*Body/u, "All exact aspect baselines must keep Summary and Body editable in Content Studio.");
assert.match(seedSource, /EXACT-SKY-ASPECT-CONTENT-STUDIO-2026-09-07-COLLECTIVE/u, "Content Studio exact package version was not advanced with this release.");
assert.match(surfaceContract, /Governed LIVE Content Studio exact-aspect version[\s\S]*canonical transit corpus as the baseline/u, "The documented exact-aspect authority order must match runtime behavior.");

console.log("Sky Calendar 379-row collective serving release contract passed.", {
  rows: projection.rowCount,
  readerAddressRows,
  contentStudioRows: seedResult.rows,
  northNodeRows: seedResult.northNodeRows,
  southNodeRows: seedResult.southNodeRows,
  contentStudioEditable: true,
});
