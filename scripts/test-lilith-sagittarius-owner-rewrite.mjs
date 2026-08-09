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
const ownerPackage = read("packages/astro-knowledge/review/lilith-sagittarius-owner-rewrite-v1/lilith-sagittarius-owner-package.md");
const source = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const aspectSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");
const transitSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templateSource = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const browserRenderer = createTransitSynastryRenderer(transitSource, templateSource, {
  ...source,
  hookRows: [...source.hookRows, ...aspectSource.hookRows]
});

function ownerSectionBody(sectionNumber) {
  const match = ownerPackage.match(new RegExp(
    `### ${sectionNumber}\\. [^\\n]+\\n\\n([\\s\\S]*?)(?=\\n\\n### )`,
    "u"
  ));
  assert.ok(match, `Owner package section ${sectionNumber} must exist.`);
  return match[1];
}

const keys = [
  "fallback-hook/sky-placement-hook/lilith/sagittarius",
  "fallback-hook/sky-placement-lived/lilith/sagittarius",
  "fallback-hook/sky-placement-turn/lilith/sagittarius"
];

for (const [index, key] of keys.entries()) {
  const row = source.hookRows.find((candidate) => candidate.contentKey === key);
  assert.ok(row, `${key} must exist.`);
  assert.equal(row.body_you, ownerSectionBody(index + 1), `${key} must match the owner package exactly.`);
  assert.equal(row.body_they, row.body_you, `${key} must not carry a rewritten reader variant.`);
  assert.equal(row.review_status, "approved");
}

const aspectKey = "fallback-hook/sky-aspect-sign/lilith/sagittarius/sextile/north-node/aquarius";
const aspectRow = aspectSource.hookRows.find((candidate) => candidate.contentKey === aspectKey);
assert.ok(aspectRow, `${aspectKey} must exist.`);
assert.equal(aspectRow.body_you, ownerSectionBody(4), `${aspectKey} must match the owner package exactly.`);
assert.equal(aspectRow.body_they, aspectRow.body_you, `${aspectKey} must not carry a rewritten reader variant.`);
assert.equal(aspectRow.review_status, "reviewed");

const event = {
  type: "aspect",
  a: "lilith",
  aSign: "sagittarius",
  b: "north-node",
  bSign: "aquarius",
  aspect: "sextile",
  exactDate: "September 6"
};
const rendered = renderSkyPlacement({
  planet: "lilith",
  sign: "sagittarius",
  events: [event],
  entryDate: "August 25",
  exitDate: "May 21"
});
const browserRendered = browserRenderer.renderSkyPlacement({
  planet: "lilith",
  sign: "sagittarius",
  events: [event],
  entryDate: "August 25",
  exitDate: "May 21"
});

assert.ok(rendered.parts.includes(ownerSectionBody(1)));
assert.ok(rendered.parts.includes(ownerSectionBody(2).replace("{{exitDate}}", "May 21")));
assert.ok(rendered.parts.includes(ownerSectionBody(3)));
assert.ok(rendered.body.includes(
  "Lilith in Sagittarius and the North Node in Aquarius open a workable route between them, closest on September 6."
));
assert.ok(rendered.body.includes(ownerSectionBody(4)));
assert.doesNotMatch(rendered.body, /\{\{/u);
assert.equal(browserRendered.body, rendered.body, "Browser and Node placement rendering must stay identical.");

assert.throws(
  () => renderSkyPlacement({
    planet: "lilith",
    sign: "sagittarius",
    events: [],
    entryDate: "August 25",
    exitDate: null
  }),
  (error) => error instanceof SourceGapError
    && /SOURCE_GAP: sky placement pair slots lilith\/sagittarius/u.test(error.message),
  "Lilith in Sagittarius must fail closed when the engine does not supply an exit date."
);
assert.throws(
  () => browserRenderer.renderSkyPlacement({
    planet: "lilith",
    sign: "sagittarius",
    events: [],
    entryDate: "August 25",
    exitDate: null
  }),
  /SOURCE_GAP: sky placement pair slots lilith\/sagittarius/u,
  "The browser renderer must also fail closed without the Lilith exit date."
);

console.log("Lilith in Sagittarius owner replacement is exact, engine-dated, and fail-closed without exitDate.");
