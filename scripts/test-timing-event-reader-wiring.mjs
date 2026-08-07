#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const packageRoot = "apps/web/src/content/fallbackArchitectureV3";
const rows = readJson(`${packageRoot}/source-rows/station-cards-week-openers-v1.json`);
const manifest = readJson(`${packageRoot}/bundled-manifest-v3.json`);
const calendarSource = read("apps/web/src/features/calendar/LunarCalendar.tsx");
const appSource = read("apps/web/src/App.tsx");
const generatedContentSource = read("apps/web/src/services/generatedContent.ts");
const approvedTimingEventKeys = [
  "sky.station.mercury.pisces.retrograde",
  "sky.retrograde.venus.scorpio.retrograde_passage",
  "sky.station.chiron.taurus.retrograde",
  "sky.ingress.jupiter.leo"
];

for (const contentKey of approvedTimingEventKeys) {
  const matchingRows = rows.filter((row) => row.contentKey === contentKey);
  const approvedArtifact = readJson(
    `packages/astro-knowledge/out/timing-event-reader-copy-pilot-v2/${contentKey}.json`
  );

  assert.equal(matchingRows.length, 1, `${contentKey} must have exactly one package row.`);
  const [row] = matchingRows;
  assert.equal(row.review_status, "approved", `${contentKey} must be reader-eligible.`);
  assert.equal(row.owner_approved, true, `${contentKey} must preserve exact owner approval.`);
  assert.equal(row.serving, true, `${contentKey} must record reader serving authorization.`);
  assert.equal(row.promotion_authorized, true, `${contentKey} must record explicit promotion authorization.`);
  assert.equal(row.headline, approvedArtifact.title, `${contentKey} must preserve the approved title.`);
  assert.equal(row.body, approvedArtifact.body, `${contentKey} must preserve the exact approved V2 body.`);
  assert.ok(
    manifest.keys.includes(`authored:${contentKey}`),
    `${contentKey} must be present in the generated reader-package manifest.`
  );
}

assert.match(
  generatedContentSource,
  /transitV3AuthoredCardForContentKey\(contentKey\)[\s\S]{0,900}contentType: "authored-content"/u,
  "The generated-content adapter must expose reader-eligible package-authored cards without rewriting them."
);
assert.match(
  calendarSource,
  /fallbackArchitectureV3AuthoredContentForKey\(contentKey\)[\s\S]{0,260}generatedContent\.get\(contentKey\)/u,
  "Calendar cards must select package-authored exact copy before remote generated content."
);
assert.match(
  appSource,
  /fallbackArchitectureV3AuthoredContentForKey\(contentKey\)[\s\S]{0,100}\?\? liveGeneratedContent\(generatedContent, contentKey\)/u,
  "Calendar detail views must select package-authored exact copy before remote generated content."
);
assert.match(
  appSource,
  /const eventBody = calendarEventDetailBody\(event, generatedContent, description\);\s+return eventBody\.length > 0\s+\? \{/u,
  "Exact timing-event copy must own the Calendar detail body even when a general placement article exists."
);
assert.doesNotMatch(
  calendarSource,
  /fallbackArchitectureV3AuthoredContentForKey\(contentKey\)[\s\S]{0,200}\.replace\(/u,
  "Calendar selection must not rewrite approved package copy."
);

console.log("timing-event reader wiring passed", {
  packageVersion: manifest.packageVersion,
  approvedCards: approvedTimingEventKeys.length
});
