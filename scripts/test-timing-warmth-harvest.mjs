#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {
  TimingWarmthSourceGapError,
  buildTimingWarmthPacket,
  timingJudgeInstructions
} = require("../packages/astro-knowledge/scripts/timing-warmth-harvest.js");
const { validateAll } = require("../packages/astro-knowledge/scripts/validate.js");

const mercuryRetrograde = buildTimingWarmthPacket({
  sourceId: "src.timing.mercury.station-retrograde",
  eventFamily: "station",
  phase: "station-retrograde",
  planet: "mercury",
  sign: "pisces",
  mode: "full"
});
const mercuryDirect = buildTimingWarmthPacket({
  sourceId: "src.timing.mercury.station-direct",
  eventFamily: "station",
  phase: "station-direct",
  planet: "mercury",
  sign: "pisces",
  mode: "full"
});

assert.equal(mercuryRetrograde.harvest_mode, "foundation_line");
assert.equal(mercuryDirect.harvest_mode, "foundation_line");
assert.notEqual(mercuryRetrograde.emotionalCore.name, mercuryDirect.emotionalCore.name, "Station phases must retain different V9 emotional cores.");
assert.notDeepEqual(
  mercuryRetrograde.ownerFoundationLines.map((entry) => entry.originalLine),
  mercuryDirect.ownerFoundationLines.map((entry) => entry.originalLine),
  "Mercury station-retrograde and station-direct must select different owner foundations."
);
assert.ok(
  mercuryDirect.ownerFoundationLines.every((entry) => !/\bretrograde\b/iu.test(entry.originalLine)),
  "Station-direct foundations may not import retrograde-passage pressure."
);

for (const packet of [mercuryRetrograde, mercuryDirect]) {
  assert.ok(packet.ownerFoundationLines.length >= 1 && packet.ownerFoundationLines.length <= 3);
  assert.equal(packet.provenance.evidenceClass, "owner-corpus-derived");
  for (const line of packet.ownerFoundationLines) {
    assert.doesNotMatch(line.usedForm, /\b(?:you|your|yours|yourself|yourselves|people)\b/iu);
    assert.doesNotMatch(line.usedForm, /\b(?:encourages|asks|allows|invites|teaches|shows|forces|requires|urges|tells|reminds|helps|gives) we\b/iu);
    assert.doesNotMatch(line.originalLine, /\b(?:1st|2nd|3rd|[4-9]th|1[0-2]th) house\b/iu);
    assert.ok(
      line.matchedTerms.some((term) => ![packet.event.planet, packet.event.sign].includes(term)),
      "Every owner foundation must match phase or emotional-core language, not only a planet or sign name."
    );
    assert.doesNotMatch(line.sourceArticleId, /:(?:p|e)\d+$/u, "Foundation provenance must name the source article, not a paragraph/entry ID.");
    const provenance = packet.provenance.warmthCandidates.find((entry) => (
      entry.sourceEntryId === line.sourceEntryId && entry.originalLine === line.originalLine
    ));
    assert.ok(provenance, "Every supplied foundation line must retain its provenance record.");
    assert.equal(provenance.originalLine, line.originalLine);
    assert.equal(provenance.usedForm, line.usedForm);
  }
}

const venusRetrograde = buildTimingWarmthPacket({
  sourceId: "src.timing.venus.retrograde-passage",
  eventFamily: "retrograde",
  phase: "retrograde-passage",
  planet: "venus",
  sign: "scorpio",
  mode: "full"
});
assert.ok(
  venusRetrograde.ownerFoundationLines.every((entry) => entry.sourcePath.includes("relationship-year-libra-2025-to-venus-rx-2026")),
  "Venus retrograde must draw from the owner relationship-year material."
);
assert.ok(
  venusRetrograde.ownerFoundationLines.every((entry) => !/\b(?:1st|2nd|3rd|[4-9]th|1[0-2]th) house\b/iu.test(entry.originalLine)),
  "Current Sky warmth may not inherit a rising-sign house claim from the source article."
);

const virgoIngress = buildTimingWarmthPacket({
  sourceId: "src.timing.mercury.ingress",
  eventFamily: "ingress",
  phase: "ingress",
  planet: "mercury",
  sign: "virgo",
  mode: "full"
});
assert.ok(
  virgoIngress.ownerFoundationLines.every((entry) => entry.sourcePath.includes("virgo-season")),
  "Virgo ingress must draw from the Virgo season family."
);

const moonIngress = buildTimingWarmthPacket({
  sourceId: "src.timing.moon.ingress",
  eventFamily: "ingress",
  phase: "ingress",
  planet: "moon",
  sign: "taurus",
  mode: "full"
});
assert.equal(moonIngress, null, "Moon ingress must remain permanently excluded.");

const previewPacket = buildTimingWarmthPacket({
  sourceId: "src.timing.mercury.station-retrograde",
  eventFamily: "station",
  phase: "station-retrograde",
  planet: "mercury",
  sign: "pisces",
  mode: "preview"
});
assert.equal(previewPacket.harvest_mode, "vocabulary_only");
assert.deepEqual(previewPacket.ownerFoundationLines, []);
assert.equal(previewPacket.scale.addedWarmthBeats, 0);

const fullMoonPacket = buildTimingWarmthPacket({
  eventFamily: "lunation",
  phase: "full-moon",
  planet: "moon",
  sign: "aquarius",
  lunationMeaning: "What has been building becomes visible, and the emotional core is belonging without surrendering the self.",
  lunationScenes: "A group role or responsibility becomes impossible to ignore.",
  mode: "full"
});
assert.equal(fullMoonPacket.emotionalCore.source, "approved-lunation-macro");
assert.ok(fullMoonPacket.ownerFoundationLines.every((entry) => entry.sourcePath.includes("aquarius-full-moon")));

assert.throws(
  () => buildTimingWarmthPacket({
    sourceId: "src.timing.test.empty-core",
    eventFamily: "station",
    phase: "station-retrograde",
    planet: "saturn",
    sign: "aries",
    mode: "full"
  }, {
    timingCollection: {
      sourceRecords: [{
        id: "src.timing.test.empty-core",
        meaningNote: "Planet meaning supplies content.",
        status: "REVIEWED",
        serving: false
      }]
    }
  }),
  (error) => error instanceof TimingWarmthSourceGapError && error.code === "EMOTIONAL_CORE_UNNAMED"
);

const judgeRules = timingJudgeInstructions().join(" ");
assert.match(judgeRules, /Invented permission or reassurance in place of supplied material scores 2/u);
assert.match(judgeRules, /no turn at all when foundation lines were supplied scores 2/u);
assert.match(judgeRules, /phase mismatch and scores 1/u);
assert.match(judgeRules, /Verbatim use of a supplied owner line is never copying/u);

const v2 = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/review/timing-event-reader-copy-v2-approved.json"), "utf8"));
assert.equal(v2.status, "APPROVED");
assert.equal(v2.cards.length, 4);
for (const card of v2.cards) {
  const paragraphs = card.body.split(/\n\s*\n/u).filter(Boolean);
  const wordCount = card.body.trim().split(/\s+/u).length;
  assert.equal(paragraphs.length, 2, `${card.contentKey} must remain a two-paragraph format exemplar.`);
  assert.ok(wordCount >= 140 && wordCount <= 220, `${card.contentKey} must remain within the approved full-card scale.`);
  assert.doesNotMatch(card.body, /\b(?:you|your|yours|yourself|yourselves|people)\b/iu);
  assert.doesNotMatch(card.body, /(?:\b\d{4}\b|\d+°|\b\d{1,2}:\d{2}\b)/u);
  assert.doesNotMatch(card.body, /—/u);
  assert.ok(card.title.length > 0 && card.contentKey.startsWith("sky."), `${card.contentKey} must retain a title and its approved sky namespace.`);
}

assert.ok(
  validateAll().every((error) => !error.includes("data/timing/timing-event-sources-v9.json")),
  "The non-serving V9 evidence ledger must not be linted as reader-facing copy."
);

console.log(JSON.stringify({
  mercuryRetrogradeSources: mercuryRetrograde.ownerFoundationLines.map((entry) => entry.sourceEntryId),
  mercuryDirectSources: mercuryDirect.ownerFoundationLines.map((entry) => entry.sourceEntryId),
  venusSources: venusRetrograde.ownerFoundationLines.map((entry) => entry.sourceEntryId),
  virgoSources: virgoIngress.ownerFoundationLines.map((entry) => entry.sourceEntryId),
  status: "PASS"
}, null, 2));
