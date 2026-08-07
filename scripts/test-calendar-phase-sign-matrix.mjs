#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const authoredRows = readJson("source-rows/transit-synastry-rows-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
const renderer = createTransitSynastryRenderer(authoredRows, templates, sourceRows);
const phases = [
  "new-moon",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full-moon",
  "disseminating",
  "last-quarter",
  "balsamic"
];
const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];
let exactReviewedCount = 0;
let signDerivedCount = 0;

for (const phase of phases) {
  const bodies = new Set();

  for (const sign of signs) {
    const result = renderer.renderCalendarPhase({ phase, sign });
    const expectedKey = `fallback-hook/moon-phase-sign/${phase}/${sign}`;

    assert.equal(result.contentKey, expectedKey);
    assert.match(result.headline, new RegExp(` in ${sign}$`, "iu"));
    assert.equal(result.templateKey, "fallback-template/calendar.phase-sign");
    assert.ok(result.body.trim(), `${phase} in ${sign} must have reader copy.`);
    if (result.phaseSignSpecificity === "exact-reviewed") exactReviewedCount += 1;
    if (result.phaseSignSpecificity === "sign-derived") signDerivedCount += 1;
    assert.ok(
      result.sourceKeys?.includes(`fallback-hook/moon-phase/${phase}`),
      `${expectedKey} must retain its approved phase source.`
    );
    const expectedSignSourcePrefix = phase === "new-moon" || phase === "full-moon"
      ? `fallback-hook/lunation-sign-compact/${phase}/${sign}`
      : `authored/calendar-weekly-moon/${sign}`;
    assert.ok(
      result.sourceKeys?.some((key) => key.startsWith(expectedSignSourcePrefix)),
      `${expectedKey} must retain its approved current-sign source.`
    );
    bodies.add(result.body);
  }

  assert.equal(
    bodies.size,
    signs.length,
    `${phase} must resolve distinct current-sign copy instead of one generic phase paragraph.`
  );
}

assert.equal(exactReviewedCount, 24, "New and Full Moons must use the 24 approved compact phase-sign rows.");
assert.equal(signDerivedCount, 72, "The six remaining phase families must stay explicitly marked as editorial gaps.");

const lastQuarterTaurus = renderer.renderCalendarPhase({ phase: "last-quarter", sign: "taurus" });
assert.match(lastQuarterTaurus.body, /Taurus Moon|Your body/iu);
assert.doesNotMatch(lastQuarterTaurus.body, /waning Moon carries things out|harvest proved/iu);
const newMoonLeo = renderer.renderCalendarPhase({ phase: "new-moon", sign: "leo" });
assert.match(newMoonLeo.body, /Leo New Moon begins/iu);
assert.doesNotMatch(newMoonLeo.body, /Leo Moon asks you to shine/iu);
const fullMoonPisces = renderer.renderCalendarPhase({ phase: "full-moon", sign: "pisces" });
assert.match(fullMoonPisces.body, /Pisces Full Moon shows you/iu);
assert.doesNotMatch(fullMoonPisces.body, /maybe that's exactly what needs to happen/iu);
assert.throws(
  () => renderer.renderCalendarPhase({ phase: "last-quarter", sign: "" }),
  /current Moon sign required/iu
);

const withoutTaurusRows = {
  ...authoredRows,
  authoredCards: authoredRows.authoredCards.filter((row) => (
    !row.contentKey.startsWith("authored/calendar-weekly-moon/taurus")
  ))
};
const missingSignRenderer = createTransitSynastryRenderer(withoutTaurusRows, templates, sourceRows);
assert.throws(
  () => missingSignRenderer.renderCalendarPhase({ phase: "last-quarter", sign: "taurus" }),
  /no approved Moon-sign row/iu,
  "A missing sign-specific source must fail closed instead of serving generic phase copy."
);

const exactBody = "Reviewed exact phase-sign test body.";
const exactSourceRows = {
  ...sourceRows,
  hookRows: [
    ...sourceRows.hookRows,
    {
      contentKey: "fallback-hook/moon-phase/last-quarter/taurus",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: exactBody,
      body_they: exactBody,
      title: "The Release",
      review_status: "approved"
    }
  ]
};
const exactRenderer = createTransitSynastryRenderer(authoredRows, templates, exactSourceRows);
const exactResult = exactRenderer.renderCalendarPhase({ phase: "last-quarter", sign: "taurus" });
assert.equal(exactResult.contentKey, "fallback-hook/moon-phase/last-quarter/taurus");
assert.equal(exactResult.body, exactBody);

const lunarCalendarSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx"),
  "utf8"
);
assert.match(
  lunarCalendarSource,
  /phase: calendarPhaseContentKey\(phase\),\s*sign: slugContentPart\(day\.moonSign\)/u,
  "Weekly phase guidance must pass the current Moon sign, not the cycle's New Moon sign."
);
assert.doesNotMatch(lunarCalendarSource, /cycleNewMoonSignForDay/u);

console.log(
  `calendar phase x current Moon sign checks passed (${phases.length * signs.length} combinations: ${exactReviewedCount} exact reviewed, ${signDerivedCount} sign-derived)`
);
