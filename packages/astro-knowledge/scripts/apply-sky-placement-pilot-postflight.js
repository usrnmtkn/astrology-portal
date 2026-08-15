#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const runRoot = path.join(repoRoot, "packages", "astro-knowledge", "review", "sky-placement-recovery", "pilot-rerun-2026-08-14");
const cycleFacts = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages", "astro-knowledge", "data", "modifiers", "planet-cycle-facts.json"), "utf8"));

const edits = {
  "uranus-taurus": {
    slot: "hook",
    before: "The same paycheck reaches the end of the month sooner, but the household keeps using the budget that once made everything feel manageable. With Uranus in Taurus, abrupt change reaches material arrangements designed to stay dependable, exposing the gap between a stable routine and a workable one. Taurus holds on through repetition and tangible proof, so the disruption becomes undeniable when the total on the page no longer matches what daily life costs.",
    after: "The paycheck reaches the end of the month sooner, but the household keeps using the old budget. With Uranus in Taurus, abrupt change reaches material arrangements designed to stay dependable, exposing the gap between a stable routine and a workable one. Taurus holds on through repetition and tangible proof, so the disruption becomes undeniable when the total on the page no longer matches what daily life costs.",
    reason: "The 73-word hook exceeded the advisory threshold. The first sentence was shortened without removing the changed-cost mechanism."
  },
  "pluto-capricorn": {
    slot: "tagline",
    before: "A system can meet every formal standard while keeping decision-making power at ‌",
    after: "A system can meet every formal standard while keeping decision-making power at the top.",
    reason: "The generated tagline was truncated after 'at' and ended with U+00A0/U+200C. The sentence was completed in the meaning already stated by the hook."
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function title(value) {
  return String(value).split("-").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(" ");
}

function renderCard(card, target) {
  return `# ${title(target.planet)} in ${title(target.sign)}\n\n## ${card.tagline}\n\n${card.hook}\n\n${card.lived}\n\n${card.turn}\n`;
}

function sentences(text) {
  return String(text).match(/[^.!?]+[.!?]+/gu) || [];
}

function words(text) {
  return String(text).trim().split(/\s+/u).filter(Boolean);
}

function countThreeItemLists(card) {
  const matches = [];
  for (const sentence of sentences(Object.values(card).join("\n"))) {
    const match = sentence.match(/\b([^,.;:!?]{1,60}),\s+([^,.;:!?]{1,60}),\s+(?:and|or)\s+([^,.;:!?]{1,60})/iu);
    if (match) matches.push(match[0].trim());
  }
  return { count: matches.length, matches };
}

function shapeChecks(card) {
  const failures = [];
  const nonAscii = Object.values(card).join(" ").match(/[^\x00-\x7F]/gu) || [];
  const taglineWords = words(card.tagline).length;
  const hookSentences = sentences(card.hook).length;
  const livedSentences = sentences(card.lived).length;
  const turnSentences = sentences(card.turn);
  const finalSentenceWords = words(turnSentences.at(-1) || "").length;
  if (taglineWords < 6 || taglineWords > 18) failures.push({ rule: "tagline-6-to-18-words", actual: taglineWords });
  if (sentences(card.tagline).length !== 1) failures.push({ rule: "tagline-clear-full-sentence", actual: sentences(card.tagline).length });
  if (hookSentences < 2 || hookSentences > 4) failures.push({ rule: "hook-2-to-4-sentences", actual: hookSentences });
  if (livedSentences < 2 || livedSentences > 4) failures.push({ rule: "lived-2-to-4-sentences", actual: livedSentences });
  if (turnSentences.length < 2 || turnSentences.length > 5) failures.push({ rule: "turn-2-to-5-sentences", actual: turnSentences.length });
  if (finalSentenceWords >= 22) failures.push({ rule: "final-sentence-under-22-words", actual: finalSentenceWords });
  let shortEndingRun = 0;
  for (let index = turnSentences.length - 1; index >= 0; index -= 1) {
    if (words(turnSentences[index]).length <= 11) shortEndingRun += 1;
    else break;
  }
  if (shortEndingRun >= 3) failures.push({ rule: "no-stacked-short-ending", actual: shortEndingRun });
  if (nonAscii.length) failures.push({ rule: "ascii-only", actual: [...new Set(nonAscii)] });
  const threeItemLists = countThreeItemLists(card);
  if (threeItemLists.count) failures.push({ rule: "no-three-item-lists", actual: threeItemLists.count, matches: threeItemLists.matches });
  const wordCounts = Object.fromEntries(Object.entries(card).map(([slot, text]) => [slot, words(text).length]));
  return {
    wordCountBySlot: wordCounts,
    wordCount: Object.values(wordCounts).reduce((sum, value) => sum + value, 0),
    finalSentenceWords,
    shortEndingRun,
    threeItemLists,
    asciiOnly: nonAscii.length === 0,
    failures,
    passed: failures.length === 0
  };
}

const pages = ["jupiter-aries", "uranus-taurus", "pluto-capricorn"];
const finalResults = [];
for (const page of pages) {
  const resultPath = path.join(runRoot, page, "result.json");
  const draftPath = path.join(runRoot, page, "draft.json");
  const result = readJson(resultPath);
  const draft = readJson(draftPath);
  if (edits[page]) {
    const { slot, before, after } = edits[page];
    if (result.card[slot] !== before || draft.card[slot] !== before) {
      throw new Error(`${page}/${slot}: expected pre-edit text did not match; stopped without guessing.`);
    }
    result.card[slot] = after;
    draft.card[slot] = after;
  }
  const factContext = { status: cycleFacts.status, ...cycleFacts.planets[result.target.planet] };
  const placementLint = lintArticle({ ...result.card, planet: result.target.planet, sign: result.target.sign, factContext });
  const pilotShapeChecks = shapeChecks(result.card);
  result.rendered = renderCard(result.card, result.target);
  result.lint = {
    score: placementLint.score,
    fails: placementLint.fails,
    warns: placementLint.warns,
    findings: placementLint.findings,
    notes: placementLint.notes,
    auditValid: placementLint.auditValid,
    pilotShapeChecks
  };
  result.mechanicalChecksPassed = placementLint.auditValid && placementLint.score === 3 && pilotShapeChecks.passed;
  result.postflightEdit = edits[page] || null;
  draft.postflightEdit = edits[page] || null;
  writeJson(resultPath, result);
  writeJson(draftPath, draft);
  writeJson(path.join(runRoot, page, "lint.json"), { placementLint, pilotShapeChecks });
  fs.writeFileSync(path.join(runRoot, page, "RENDERED-CARD.md"), result.rendered, "utf8");
  finalResults.push(result);
}

const runPath = path.join(runRoot, "RUN-RECORD.json");
const run = readJson(runPath);
run.status = finalResults.every((result) => result.mechanicalChecksPassed)
  ? "owner_cold_read_required"
  : "owner_cold_read_required_with_mechanical_findings";
run.results = finalResults;
run.postflightFindings = [];
run.postflightEdits = Object.fromEntries(Object.entries(edits).map(([page, edit]) => [page, {
  slot: edit.slot,
  before: edit.before,
  after: edit.after,
  reason: edit.reason
}]));
run.governanceResolution = {
  whether: "not_governed_not_enforced",
  note: "No decision, banned-word entry, or banned-construction governs whether. The draft remains unchanged."
};
run.postflightBilledCalls = 0;
writeJson(runPath, run);

writeJson(path.join(runRoot, "POSTFLIGHT-EDIT-RECORD.json"), {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  billedCalls: 0,
  governanceResolution: run.governanceResolution,
  edits,
  pages: finalResults.map((result) => ({
    target: result.target,
    mechanicalChecksPassed: result.mechanicalChecksPassed,
    lint: result.lint
  }))
});

process.stdout.write(`${JSON.stringify({
  billedCalls: 0,
  status: run.status,
  pages: finalResults.map((result) => ({
    target: `${result.target.planet}/${result.target.sign}`,
    score: result.lint.score,
    fails: result.lint.fails,
    warns: result.lint.warns,
    notes: result.lint.notes,
    mechanicalChecksPassed: result.mechanicalChecksPassed,
    wordCountBySlot: result.lint.pilotShapeChecks.wordCountBySlot,
    totalWords: result.lint.pilotShapeChecks.wordCount,
    threeItemLists: result.lint.pilotShapeChecks.threeItemLists.count,
    asciiOnly: result.lint.pilotShapeChecks.asciiOnly
  }))
}, null, 2)}\n`);
