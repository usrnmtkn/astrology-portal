#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const trainPath = path.join(repoRoot, "data/writing/cold-rendered-prose-round-2-train.jsonl");
const holdoutPath = path.join(repoRoot, "data/writing/cold-rendered-prose-round-2-holdout.jsonl");
const briefingPath = path.join(repoRoot, "packages/astro-knowledge/review/cold-rendered-prose-governance-v1/round-2-reviewer-briefing.md");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = (filePath) => fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const serializeJsonl = (rows) => `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;

function renderedPlacement(planet, sign) {
  const rendered = renderSkyPlacement({
    planet,
    sign,
    entryDate: "August 1, 2026",
    exitDate: "August 21, 2026",
    priorSign: "Cancer",
    priorSignEntryDate: "July 10, 2026",
    priorSignExitDate: "August 1, 2026",
    events: []
  });
  assert.ok(rendered?.headline && rendered?.body, `${planet}/${sign} must render.`);
  return [rendered.headline, rendered.tagline, rendered.body].filter(Boolean).join("\n\n");
}

function renderedPilot(sign) {
  const decisionSheet = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "packages/astro-knowledge/review/mercury-placements-pilot-v1/decision-sheet.json"),
    "utf8"
  ));
  const rows = decisionSheet.rows.filter((row) => row.planet === "mercury" && row.sign === sign);
  assert.deepEqual(rows.map((row) => row.slot), ["tagline", "hook", "lived", "turn"]);
  assert.ok(rows.every((row) => row.status === "pipeline-review-passed" && row.ownerApproved === false));
  const bySlot = Object.fromEntries(rows.map((row) => [row.slot, row.body.replaceAll("{{exitDate}}", "August 21, 2026")]));
  return [`Mercury in ${sign[0].toUpperCase()}${sign.slice(1)}`, bySlot.tagline, bySlot.hook, bySlot.lived, bySlot.turn].join("\n\n");
}

const firstRound = readJsonl(path.join(repoRoot, "data/writing/cold-rendered-prose-fixtures.jsonl"));
const v7BySign = new Map(firstRound
  .filter((row) => row.fixture_kind === "negative")
  .map((row) => [row.fixture_id.match(/mercury-([a-z]+)-v7$/u)?.[1], row]));
assert.equal(v7BySign.size, 12);

const trainReasons = {
  aries: ["flashcard rhythm", "explains instead of talks"],
  leo: ["explains instead of talks", "assembled-not-written"],
  virgo: ["flashcard rhythm", "assembled-not-written"],
  libra: ["explains instead of talks", "assembled-not-written"]
};
const train = Object.entries(trainReasons).map(([sign, ownerReasons]) => ({
  fixture_id: `cold-train-fail-mercury-${sign}-v7`,
  fixture_kind: "teaching-negative",
  label: "FAIL",
  owner_reasons: ownerReasons,
  source: v7BySign.get(sign).source,
  rendered_copy: v7BySign.get(sign).rendered_copy
}));
train.push({
  fixture_id: "cold-train-pass-sun-leo-v3",
  fixture_kind: "teaching-gold",
  label: "PASS",
  owner_reasons: ["owner-approved flowing article prose"],
  source: "fallback-hook/sky-sign-copy/sun/leo",
  rendered_copy: renderedPlacement("sun", "leo")
});
train.push({
  fixture_id: "cold-train-pass-lilith-libra-v5",
  fixture_kind: "teaching-gold",
  label: "PASS",
  owner_reasons: ["owner-locked card reads as written rather than assembled"],
  source: "fallback-hook/sky-placement-{tagline|hook|lived|turn}/lilith/libra",
  rendered_copy: renderedPlacement("lilith", "libra")
});

const trainSigns = new Set(Object.keys(trainReasons));
const holdout = [...v7BySign.entries()]
  .filter(([sign]) => !trainSigns.has(sign))
  .map(([sign, row]) => ({
    fixture_id: `cold-holdout-fail-mercury-${sign}-v7`,
    fixture_kind: "holdout-negative",
    expected: "REVISE",
    expected_failures: ["cold_rendered_prose"],
    source: row.source,
    rendered_copy: row.rendered_copy
  }));
holdout.push({
  fixture_id: "cold-holdout-pass-venus-libra-collective",
  fixture_kind: "holdout-gold",
  expected: "PASS",
  expected_failures: [],
  source: "fallback-hook/sky-sign-copy/venus/libra",
  rendered_copy: renderedPlacement("venus", "libra")
});
holdout.push({
  fixture_id: "cold-holdout-pass-lilith-sagittarius-v5",
  fixture_kind: "holdout-gold",
  expected: "PASS",
  expected_failures: [],
  source: "fallback-hook/sky-placement-{tagline|hook|lived|turn}/lilith/sagittarius",
  rendered_copy: renderedPlacement("lilith", "sagittarius")
});
for (const sign of ["virgo", "libra", "sagittarius"]) {
  holdout.push({
    fixture_id: `cold-probe-mercury-${sign}-pilot-v1`,
    fixture_kind: "borderline-probe",
    expected: null,
    expected_failures: [],
    source: "packages/astro-knowledge/review/mercury-placements-pilot-v1/decision-sheet.json",
    rendered_copy: renderedPilot(sign)
  });
}

assert.equal(train.length, 6);
assert.equal(holdout.filter((row) => row.fixture_kind === "holdout-negative").length, 8);
assert.equal(holdout.filter((row) => row.fixture_kind === "holdout-gold").length, 2);
assert.equal(holdout.filter((row) => row.fixture_kind === "borderline-probe").length, 3);
const withHashes = (rows) => rows.map((row) => ({ ...row, rendered_copy_sha256: sha256(row.rendered_copy) }));
const hashedTrain = withHashes(train);
const hashedHoldout = withHashes(holdout);
const briefing = [
  "# Cold rendered prose: round 2 TRAIN briefing",
  "",
  "These six owner-ruling examples teach the prose distinction. Judge only how the rendered prose reads.",
  "A FAIL may be astrologically correct and still read like flashcards, explain instead of talk, or sound assembled rather than written.",
  "A PASS may be sharp or structured; do not fail it merely for having a distinct voice.",
  "Do not compare subject matter. Apply the demonstrated prose distinction to the submitted rendered copy.",
  "",
  ...hashedTrain.flatMap((row) => [
    `## ${row.label}: ${row.fixture_id}`,
    "",
    `Owner reasons: ${row.owner_reasons.join("; ")}.`,
    "",
    row.rendered_copy,
    ""
  ])
].join("\n").trimEnd();
for (const row of hashedHoldout) {
  assert.ok(!briefing.includes(row.fixture_id), `${row.fixture_id} leaked into TRAIN briefing.`);
  assert.ok(!briefing.includes(row.rendered_copy), `${row.fixture_id} full text leaked into TRAIN briefing.`);
  assert.ok(!hashedTrain.some((training) => training.rendered_copy_sha256 === row.rendered_copy_sha256), `${row.fixture_id} duplicates a TRAIN fixture.`);
}

const outputs = [
  [trainPath, serializeJsonl(hashedTrain)],
  [holdoutPath, serializeJsonl(hashedHoldout)],
  [briefingPath, `${briefing}\n`]
];
if (process.argv.includes("--check")) {
  for (const [filePath, expected] of outputs) assert.equal(fs.readFileSync(filePath, "utf8"), expected, `${path.basename(filePath)} is stale.`);
  console.log("Cold-rendered-prose round-2 TRAIN/HOLDOUT split is current and leak-free.");
} else {
  for (const [filePath, value] of outputs) fs.writeFileSync(filePath, value);
  console.log("Wrote 6 TRAIN and 13 HOLDOUT/probe cold-rendered-prose fixtures with zero full-text leakage.");
}
