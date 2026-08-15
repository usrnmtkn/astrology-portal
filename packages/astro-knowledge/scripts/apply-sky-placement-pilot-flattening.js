#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const runRoot = path.join(repoRoot, "packages", "astro-knowledge", "review", "sky-placement-recovery", "pilot-rerun-2026-08-14");
const cycleFacts = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages", "astro-knowledge", "data", "modifiers", "planet-cycle-facts.json"), "utf8"));

const edits = {
  "jupiter-aries": [
    {
      id: "jupiter-lived-close",
      slot: "lived",
      before: "The first move produced evidence that more waiting could not supply.",
      after: "After you replied, you got the rate and a scheduled call.",
      plainMeaning: "Replying produced two concrete answers that waiting had not produced."
    },
    {
      id: "jupiter-turn-opening",
      slot: "turn",
      before: "The useful impulse goes wrong when the first yes becomes the pattern for every later demand, even as the terms grow beyond what you first accepted.",
      after: "The first quick yes becomes the answer to every later request.",
      plainMeaning: "One quick acceptance becomes the expectation for later requests."
    },
    {
      id: "jupiter-turn-close",
      slot: "turn",
      before: "You have the opportunity, and it takes more time than the first reply accounted for.",
      after: "The offer is real, and the hours no longer fit the calendar.",
      plainMeaning: "The offer exists, but its hours exceed the available calendar."
    }
  ],
  "uranus-taurus": [
    {
      id: "uranus-lived-close",
      slot: "lived",
      before: "Keeping the familiar numbers now produces the insecurity those numbers were supposed to prevent.",
      after: "The old budget no longer covers both the grocery order and the fixed payment.",
      plainMeaning: "The old budget cannot cover the two ordinary costs shown in the scene."
    },
    {
      id: "uranus-turn-opening",
      slot: "turn",
      before: "Changing the setup is the useful impulse, because waiting for complete certainty lets the mismatch grow.",
      after: "Changing the budget before the shortfall grows is necessary.",
      plainMeaning: "The budget must change before the missing amount increases."
    },
    {
      id: "uranus-turn-close",
      slot: "turn",
      before: "Security now rests on what the current numbers can support.",
      after: "The new budget has to cover today's bill and next week's payment.",
      plainMeaning: "The replacement budget must cover the bills that actually exist now."
    }
  ],
  "pluto-capricorn": [
    {
      id: "pluto-hook-close",
      slot: "hook",
      before: "Power stays concentrated when rank determines both the decision and whose evidence can reverse it.",
      after: "The same leaders make the decision and decide which records matter.",
      plainMeaning: "The leaders control both the decision and the records considered in reviewing it."
    },
    {
      id: "pluto-lived-close",
      slot: "lived",
      before: "Your objection becomes part of the file, but the leaders who approved the targets still decide what counts as proof.",
      after: "The complaint is filed; the leaders who set the targets reject the schedules.",
      plainMeaning: "The complaint is recorded, but the target-setters reject the submitted schedules."
    },
    {
      id: "pluto-turn-opening",
      slot: "turn",
      before: "The useful Capricorn impulse is to preserve continuity through clear standards and accountable leadership.",
      after: "Capricorn's standards are meant to keep the institution running and its leaders accountable.",
      plainMeaning: "The standards should preserve the institution while keeping its leaders answerable."
    }
  ]
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
  const nonAscii = Object.values(card).join(" ").match(/[^\x00-\x7F]/gu) || [];
  const turnSentences = sentences(card.turn);
  const wordCountBySlot = Object.fromEntries(Object.entries(card).map(([slot, text]) => [slot, words(text).length]));
  return {
    wordCountBySlot,
    wordCount: Object.values(wordCountBySlot).reduce((sum, value) => sum + value, 0),
    finalSentenceWords: words(turnSentences.at(-1) || "").length,
    threeItemLists: countThreeItemLists(card),
    asciiOnly: nonAscii.length === 0,
    nonAscii: [...new Set(nonAscii)],
    passed: nonAscii.length === 0 && countThreeItemLists(card).count === 0
  };
}

function replaceExact(text, before, after, label) {
  const beforeCount = text.split(before).length - 1;
  const afterCount = text.split(after).length - 1;
  if (beforeCount === 1 && afterCount === 0) return text.replace(before, after);
  if (beforeCount === 0 && afterCount === 1) return text;
  throw new Error(`${label}: expected one before or one after match, found before=${beforeCount}, after=${afterCount}.`);
}

const finalResults = [];
for (const page of Object.keys(edits)) {
  const resultPath = path.join(runRoot, page, "result.json");
  const draftPath = path.join(runRoot, page, "draft.json");
  const result = readJson(resultPath);
  const draft = readJson(draftPath);
  for (const edit of edits[page]) {
    result.card[edit.slot] = replaceExact(result.card[edit.slot], edit.before, edit.after, `${page}/${edit.id}/result`);
    draft.card[edit.slot] = replaceExact(draft.card[edit.slot], edit.before, edit.after, `${page}/${edit.id}/draft`);
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
  result.flatteningEdits = edits[page];
  draft.flatteningEdits = edits[page];
  writeJson(resultPath, result);
  writeJson(draftPath, draft);
  writeJson(path.join(runRoot, page, "lint.json"), { placementLint, pilotShapeChecks });
  fs.writeFileSync(path.join(runRoot, page, "RENDERED-CARD.md"), result.rendered, "utf8");
  finalResults.push(result);
}

const runPath = path.join(runRoot, "RUN-RECORD.json");
const run = readJson(runPath);
run.status = finalResults.every((result) => result.mechanicalChecksPassed) ? "owner_cold_read_required" : "owner_cold_read_required_with_mechanical_findings";
run.results = finalResults;
run.flatteningEdits = edits;
run.flatteningBilledCalls = 0;
writeJson(runPath, run);

writeJson(path.join(runRoot, "FLATTENING-EDIT-RECORD.json"), {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  ownerRuling: "the underlying concepts are good, but the rewrite got too clever i had to think too hard and i missed the point",
  billedCalls: 0,
  edits,
  pages: finalResults.map((result) => ({ target: result.target, lint: result.lint, mechanicalChecksPassed: result.mechanicalChecksPassed }))
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
    threeItemLists: result.lint.pilotShapeChecks.threeItemLists.count,
    wordCountBySlot: result.lint.pilotShapeChecks.wordCountBySlot,
    totalWords: result.lint.pilotShapeChecks.wordCount,
    asciiOnly: result.lint.pilotShapeChecks.asciiOnly
  }))
}, null, 2)}\n`);
