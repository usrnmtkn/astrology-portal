#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { SourceGapError } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const staged = readJson("packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-staged-rows.json");
const source = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const bundled = readJson("apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json");
const aspectSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");
const transitSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templateSource = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const browserRenderer = createTransitSynastryRenderer(transitSource, templateSource, {
  ...source,
  hookRows: [...source.hookRows, ...aspectSource.hookRows]
});

const lilithKeyPattern = /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/lilith\/([a-z-]+)$/u;
const stagedByKey = new Map(staged.rows.map((row) => [row.contentKey, row]));
const sourceRows = source.hookRows.filter((row) => lilithKeyPattern.test(row.contentKey));
const bundledRows = bundled.hookRows.filter((row) => lilithKeyPattern.test(row.contentKey));
const sourceByKey = new Map(sourceRows.map((row) => [row.contentKey, row]));
const bundledByKey = new Map(bundledRows.map((row) => [row.contentKey, row]));

assert.equal(staged.rows.length, 48, "The owner package must contain exactly 48 Lilith rows.");
assert.equal(stagedByKey.size, 48, "All staged Lilith keys must be unique.");
assert.equal(sourceRows.length, 48, "The source must serve exactly 48 Lilith placement rows.");
assert.equal(bundledRows.length, 48, "The deferred reader bundle must serve exactly 48 Lilith placement rows.");

for (const [contentKey, stagedRow] of stagedByKey) {
  const sourceRow = sourceByKey.get(contentKey);
  const bundledRow = bundledByKey.get(contentKey);
  assert.deepEqual(sourceRow, stagedRow, `${contentKey} must remain byte-for-byte field-identical to the staged row.`);
  assert.ok(bundledRow, `${contentKey} must be present in the serving reader bundle.`);
  assert.equal(bundledRow.body_you, stagedRow.body_you, `${contentKey} serving body_you must match the staged body exactly.`);
  assert.equal(bundledRow.body_they, stagedRow.body_they, `${contentKey} serving body_they must match the staged body exactly.`);
  assert.doesNotMatch(stagedRow.body_you, /\b(?:you|your)\b/iu, `${contentKey} must remain collective.`);
  assert.doesNotMatch(stagedRow.body_they, /\b(?:you|your)\b/iu, `${contentKey} reader variant must remain collective.`);
}

const signs = [...new Set(staged.rows.map((row) => row.contentKey.match(lilithKeyPattern)?.[1]).filter(Boolean))];
assert.equal(signs.length, 12, "The package must cover all twelve Lilith signs.");

for (const sign of signs) {
  const hook = stagedByKey.get(`fallback-hook/sky-placement-hook/lilith/${sign}`).body_you;
  const lived = stagedByKey.get(`fallback-hook/sky-placement-lived/lilith/${sign}`).body_you;
  const turn = stagedByKey.get(`fallback-hook/sky-placement-turn/lilith/${sign}`).body_you;
  const expectedLived = lived.replaceAll("{{exitDate}}", "May 21");
  const facts = {
    planet: "lilith",
    sign,
    events: [],
    entryDate: "August 25",
    exitDate: "May 21"
  };
  const rendered = renderSkyPlacement(facts);
  const browserRendered = browserRenderer.renderSkyPlacement(facts);

  assert.ok(rendered.parts.includes(hook), `${sign} must serve the exact staged hook.`);
  assert.ok(rendered.parts.includes(expectedLived), `${sign} must serve the exact staged lived row with engine date substitution only.`);
  assert.ok(rendered.parts.includes(turn), `${sign} must serve the exact staged turn.`);
  assert.doesNotMatch(rendered.body, /\{\{/u, `${sign} must not expose unresolved slots.`);
  assert.equal(browserRendered.body, rendered.body, `${sign} browser and Node rendering must remain identical.`);

  assert.throws(
    () => renderSkyPlacement({ ...facts, exitDate: null }),
    (error) => error instanceof SourceGapError
      && new RegExp(`SOURCE_GAP: sky placement pair slots lilith/${sign}`, "u").test(error.message),
    `${sign} must fail closed when the true-Lilith context omits exitDate.`
  );
  assert.throws(
    () => browserRenderer.renderSkyPlacement({ ...facts, exitDate: null }),
    new RegExp(`SOURCE_GAP: sky placement pair slots lilith/${sign}`, "u"),
    `${sign} browser rendering must fail closed when the true-Lilith context omits exitDate.`
  );
}

const retiredTaglines = [
  "Claim exile as armor",
  "Don’t let disrespect slide",
  "Old pain runs today",
  "Carry it without cracks",
  "Speak to control",
  "Demand the spotlight",
  "Stop selling yourself short",
  "Hide where it hurts",
  "Preach what burns",
  "Keep your danger close",
  "Cling to what calms",
  "Work harder, doubt louder"
];
for (const retired of retiredTaglines) {
  assert.ok(!sourceRows.some((row) => row.body_you === retired || row.body_they === retired), `Retired tagline must not remain in source: ${retired}`);
  assert.ok(!bundledRows.some((row) => row.body_you === retired || row.body_they === retired), `Retired tagline must not serve: ${retired}`);
}

console.log("All 48 Lilith V5 rows are exact, collective, engine-dated, and fail closed without exitDate.");
