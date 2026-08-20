#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapter = require("../src/astro-writing/productionEvidenceAdapter.cjs");
const profile = JSON.parse(fs.readFileSync(
  path.join(root, "services/tldrastro-api/src/tldrastro_api/data/sky_aspect_profile.json"),
  "utf8"
));
const chartSource = fs.readFileSync(
  path.join(root, "services/tldrastro-api/src/tldrastro_api/services/chart.py"),
  "utf8"
);
const factsSource = fs.readFileSync(path.join(root, "api/admin/content-facts.ts"), "utf8");
const cronSource = fs.readFileSync(path.join(root, "api/cron/generate-sky.ts"), "utf8");

function pythonTupleNames(source, constant) {
  const block = new RegExp(`${constant}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`, "u").exec(source)?.[1];
  if (!block) throw new Error(`PRODUCTION_EMITTER_PROFILE_UNREADABLE: ${constant}`);
  return [...block.matchAll(/^\s*\("([^"]+)"/gmu)].map((match) => match[1]);
}

function slug(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function assertMapped(input, expectedRule) {
  const mapped = adapter.mapProductionInput(input);
  assert.equal(mapped.contentKeyMapping.ruleId, expectedRule, `${input.contentKey} used the wrong content-key rule`);
  assert.ok(mapped.canonicalIds.length > 0, `${input.contentKey} resolved no canonical evidence`);
  return mapped;
}

// These assertions bind the coverage generator to the production functions.
// If a producer changes its ID grammar, this test must change in the same PR.
assert.match(factsSource, /return `sky-\$\{slugContentPart\(aspect\.from\)\}-\$\{slugContentPart\(aspect\.type\)\}-\$\{slugContentPart\(aspect\.to\)\}`/u);
assert.match(factsSource, /`sky-retrograde-\$\{slugContentPart\(retrograde\.planet\)\}`/u);
assert.match(factsSource, /contentKey: `sky-daily-\$\{targetDate\}`/u);
assert.match(factsSource, /contentKey: `sky-season-\$\{slugContentPart\(sun\.sign\)\}-\$\{targetDate\}`/u);
assert.match(factsSource, /contentKey: `sky-moon-\$\{slugContentPart\(moon\.sign\)\}-\$\{targetDate\}`/u);
assert.match(cronSource, /knowledgeIds: topAspects\.map\(\(aspect\) => `sky-\$\{aspect\.from\.toLowerCase\(\)\}-\$\{aspect\.type\}-\$\{aspect\.to\.toLowerCase\(\)\}`\)/u);

const points = profile.points.map((point) => point.id);
const aspects = profile.aspects.map((aspect) => aspect.id);
const signs = pythonTupleNames(chartSource, "SIGNS");
assert.equal(points.length, 14);
assert.equal(aspects.length, 6);
assert.equal(signs.length, 12);

let aspectIds = 0;
for (const from of points) {
  for (const to of points) {
    if (from === to) continue;
    for (const aspect of aspects) {
      const knowledgeId = `sky-${from}-${aspect}-${to}`;
      const mapped = assertMapped({
        contentKey: `sky-aspect-${from}-${aspect}-${to}-2026-08-14`,
        surface: "sky",
        mode: "in_depth",
        eventType: "current-aspect",
        facts: { aspect: { from, type: aspect, to } },
        knowledgeIds: [knowledgeId]
      }, "sky-aspect");
      assert.deepEqual(mapped.legacyIdentifiers, [knowledgeId]);
      aspectIds += 1;
    }
  }
}

let retrogradeIds = 0;
for (const point of points) {
  const knowledgeId = `sky-retrograde-${point}`;
  const mapped = assertMapped({
    contentKey: `sky-retrograde-${point}-2026-08-14`,
    surface: "sky",
    mode: "feed",
    eventType: "retrograde",
    facts: { position: { planet: point } },
    knowledgeIds: [knowledgeId]
  }, "sky-retrograde");
  assert.ok(mapped.canonicalIds.includes(`body/${point.replaceAll("-", "_")}`));
  retrogradeIds += 1;
}

let seasonKeys = 0;
let lunarKeys = 0;
for (const signName of signs) {
  const sign = slug(signName);
  const season = assertMapped({
    contentKey: `sky-season-${sign}-2026-08-14`,
    surface: "sky",
    mode: "feed",
    eventType: "seasonal-current",
    facts: { sun: { sign: signName } },
    knowledgeIds: []
  }, "sky-season");
  assert.ok(season.canonicalIds.includes(`placement-sign/sun/${sign}`));
  seasonKeys += 1;

  const lunar = assertMapped({
    contentKey: `sky-moon-${sign}-2026-08-14`,
    surface: "sky",
    mode: "feed",
    eventType: "lunar-cycle",
    facts: { moon: { sign: signName } },
    knowledgeIds: []
  }, "sky-moon");
  assert.ok(lunar.canonicalIds.includes(`placement-sign/moon/${sign}`));
  lunarKeys += 1;
}

let dailySignPairs = 0;
for (const sunName of signs) {
  for (const moonName of signs) {
    const mapped = assertMapped({
      contentKey: "sky-daily-2026-08-14",
      surface: "sky",
      mode: "feed",
      eventType: "daily-sky",
      facts: { sun: { sign: sunName }, moon: { sign: moonName } },
      knowledgeIds: []
    }, "sky-daily");
    assert.deepEqual(mapped.canonicalIds, [
      `placement-sign/sun/${slug(sunName)}`,
      `placement-sign/moon/${slug(moonName)}`
    ]);
    dailySignPairs += 1;
  }
}

let lunationKeys = 0;
for (const phase of ["new-moon", "full-moon"]) {
  for (const signName of signs) {
    const sign = slug(signName);
    const mapped = assertMapped({
      contentKey: `sky-lunation-${phase}-${sign}-2026-08-14`,
      surface: "sky",
      mode: "in_depth",
      eventType: phase,
      facts: { moonEvent: { name: phase, sign: signName } },
      knowledgeIds: []
    }, "sky-lunation");
    assert.ok(mapped.canonicalIds.includes(`lunation/${phase}/${sign}`));
    lunationKeys += 1;
  }
}

assert.throws(() => assertMapped({
  contentKey: "sky-aspect-unknown-square-sun-2026-08-14",
  surface: "sky",
  mode: "feed",
  eventType: "current-aspect",
  facts: { aspect: { from: "unknown", type: "square", to: "sun" } },
  knowledgeIds: ["sky-unknown-square-sun"]
}, "sky-aspect"), /PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED/u);

// Resolution coverage above is cheap and exhaustive. These representative
// cases additionally prove that every emitted shape can construct and verify
// its complete evidence packet before a provider boundary.
for (const input of [
  {
    contentKey: "sky-aspect-jupiter-opposition-moon-2026-08-14", surface: "sky", mode: "in_depth",
    eventType: "current-aspect", facts: { aspect: { from: "jupiter", type: "opposition", to: "moon" } },
    knowledgeIds: ["sky-jupiter-opposition-moon"]
  },
  {
    contentKey: "sky-retrograde-mercury-2026-08-14", surface: "sky", mode: "feed",
    eventType: "retrograde", facts: { position: { planet: "mercury" } }, knowledgeIds: ["sky-retrograde-mercury"]
  },
  {
    contentKey: "sky-season-leo-2026-08-14", surface: "sky", mode: "feed",
    eventType: "seasonal-current", facts: { sun: { sign: "Leo" } }, knowledgeIds: []
  },
  {
    contentKey: "sky-moon-pisces-2026-08-14", surface: "sky", mode: "feed",
    eventType: "lunar-cycle", facts: { moon: { sign: "Pisces" } }, knowledgeIds: []
  },
  {
    contentKey: "sky-daily-2026-08-14", surface: "sky", mode: "feed", eventType: "daily-sky",
    facts: { sun: { sign: "Leo" }, moon: { sign: "Pisces" } }, knowledgeIds: []
  },
  {
    contentKey: "sky-lunation-full-moon-aquarius-2026-08-14", surface: "sky", mode: "in_depth",
    eventType: "full-moon", facts: { moonEvent: { name: "full-moon", sign: "Aquarius" } }, knowledgeIds: []
  }
]) {
  adapter.buildProductionCatalogEvidence(input);
}

console.log(JSON.stringify({
  status: "pass",
  profileId: profile.id,
  productionTemplatesBoundToTest: 6,
  aspectIdsCovered: aspectIds,
  retrogradeIdsCovered: retrogradeIds,
  seasonKeysCovered: seasonKeys,
  lunarKeysCovered: lunarKeys,
  dailySignPairsCovered: dailySignPairs,
  lunationKeysCovered: lunationKeys,
  totalEmissionCases: aspectIds + retrogradeIds + seasonKeys + lunarKeys + dailySignPairs + lunationKeys,
  unknownProductionIdFailsBuild: true,
  liveCallsMade: 0
}, null, 2));
