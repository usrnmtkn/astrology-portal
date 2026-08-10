#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { evaluateCardJudgeV31Contract, loadCardJudgeV31FixtureSet } from "../../scripts/card-judge-v3-1-fixtures.mjs";

const read = (sourcePath) => fs.readFileSync(sourcePath, "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const approvedChecklist = read("tldr-astro-phrasebank/TLDR-CARD-CRITIQUE-CHECKLIST-V3-DRAFT.md");
const approvedRubric = read("tldr-astro-phrasebank/TLDR-CARD-JUDGE-RUBRIC-V3-DRAFT.md");
const runOneArtifact = read("packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-live-evaluation-run-1.json");
const ownerApprovedGold = read("data/writing/owner-approved-examples.jsonl");
const draftChecklist = read("tldr-astro-phrasebank/TLDR-CARD-CRITIQUE-CHECKLIST-V3-1-DRAFT.md");
const draftRubric = read("tldr-astro-phrasebank/TLDR-CARD-JUDGE-RUBRIC-V3-1-DRAFT.md");
const fixtureContracts = JSON.parse(read("packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-1-fixture-contracts.json"));
const runtime = read("scripts/run-astro-writing-live-reviewer-eval-v3.mjs");

assert.equal(sha256(approvedChecklist), "d1e255a1cf151d2d7fbf705d5a9167da5a62ca3cbbbabf0957dd5f6e56f702f5", "Approved v3 checklist must remain byte-identical.");
assert.equal(sha256(approvedRubric), "bb2584941678a20d13e99c6aef34d8394f986bcdc52871c8a321a73cc0223117", "Approved v3 rubric must remain byte-identical.");
assert.equal(sha256(runOneArtifact), "5b50e50841938d95667ef6047132905f2ae52f5b60ee10bcbed3a736395f0e20", "Failed v3 run-one artifact must remain immutable.");
assert.equal(sha256(ownerApprovedGold), "7f43af675d3a3769377c409f864e9919ab3e1b6e0245daf408d52d0195d17002", "Owner-locked V5 gold cards must remain byte-identical.");

for (const draft of [draftChecklist, draftRubric]) {
  assert.match(draft, /^\*\*Status:\*\* `needs_review`$/mu);
  assert.match(draft, /^\*\*Owner approved:\*\* `false`$/mu);
  assert.match(draft, /^\*\*Active in harness:\*\* `false`$/mu);
  assert.match(draft, /^\*\*Active in production:\*\* `false`$/mu);
  assert.match(draft, /^\*\*Promotion authorized:\*\* `false`$/mu);
  assert.match(draft, /^\*\*Fixture-set status:\*\* `finalized_for_owner_review`$/mu);
  assert.match(draft, /When several categories describe the same underlying defect and require the same correction, return the narrowest causal defect as primary\. Add a second defect only when it identifies a materially different problem requiring a separate correction\./u);
  assert.match(draft, /Before returning a secondary defect, state internally what separate edit would be required to fix it\. If the same edit fixes both labels, suppress the secondary label\./u);
  assert.match(draft, /career-domain substitution[\s\S]*`house_bleed`[\s\S]*not `specificity_ceiling`/iu);
  assert.match(draft, /`specificity_ceiling` fires only when the card states an unsupported event, motive, status, or outcome/iu);
  assert.match(draft, /`shared_ban` fires only on the enumerated banned strings and inventions/iu);
}

for (const [fixtureId, text, wrongCategory, rightCategory] of [
  ["neg-capricorn-career", "The boss passes over the promotion again. The title never matches the job. Career status stalls while the professional hierarchy protects itself.", "specificity_ceiling", "house_bleed"],
  ["neg-sagittarius-9th", "A teacher gets challenged at the university. A publication prints a correction. Travel plans and legal matters expose what the institution taught wrong.", "owner_voice_drift", "house_bleed"],
  ["neg-aquarius-selfhelp", "Embrace your uniqueness. Your authentic self is your superpower, and the universe rewards those who dare to stand out.", "specificity_ceiling", "stock_trope"],
  ["neg-virgo-clinical", "It is time to heal the perfection wound and reparent the inner critic.", "shared_ban", "stock_trope"]
]) {
  assert.match(draftRubric, new RegExp(fixtureId, "u"));
  assert.ok(draftRubric.includes(text));
  assert.match(draftRubric, new RegExp(`Wrong filing:[^\\n]*${wrongCategory}`, "u"));
  assert.match(draftRubric, new RegExp(`Correct filing:[^\\n]*${rightCategory}`, "u"));
}

for (const [fixtureId, degradedText, goldId, goldText] of [
  ["neg-aries-dishes", "Someone's temper is shorter than usual, and it is not really about the dishes.", "gold-lilith-aries-v5", "Until {{exitDate}}, the anger that was easier to put away starts coming back up."],
  ["neg-pisces-well", "Some people will drain a well dry and then blame it for being empty.", "gold-lilith-pisces-v5", "Pisces likes to dissolve, to blur the edges, but Lilith cuts through the fog."],
  ["neg-taurus-tagline", "The bargain ends.", "gold-lilith-taurus-v5", "Being treated like less stops being acceptable"]
]) {
  assert.match(draftRubric, new RegExp(`MUST FLAG[^\\n]*${fixtureId}`, "u"));
  assert.ok(draftRubric.includes(degradedText));
  assert.ok(draftRubric.includes(goldId));
  assert.ok(draftRubric.includes(goldText));
}
assert.match(draftRubric, /The do-not-flag controls protect card-register \*traits\*; they do not protect \*defective instances\* of those traits\./u);
for (const id of ["gold-lilith-sagittarius-v5", "gold-lilith-pisces-v5"]) {
  assert.ok(draftRubric.includes("| `" + id + "` | `owner_voice_drift` |"));
  assert.match(draftRubric, new RegExp(`${id}[^\\n]*judge error`, "u"));
}
assert.ok(draftRubric.includes("Concrete does not mean adding a random object or domestic scene. Concrete means naming the observable behavior, circumstance, decision, or consequence produced by the astrology."));
assert.match(draftRubric, /When a placement's mechanism is internal \(belief, escape, numbing\), observable naming of the internal behavior satisfies concreteness; demanding external props for an internal mechanism is a judge error\./u);
assert.match(draftRubric, /Comparison sets must match mechanism exteriority where the gold set allows\./u);

assert.equal(fixtureContracts.status, "needs_review");
assert.equal(fixtureContracts.ownerApproved, false);
assert.equal(fixtureContracts.activeInHarness, false);
assert.equal(fixtureContracts.liveRunAuthorized, false);
assert.equal(fixtureContracts.fixtureSetStatus, "finalized_for_owner_review");
assert.ok(!Object.hasOwn(fixtureContracts, "proposedLiveRun"));
assert.deepEqual(fixtureContracts.goldFindingRulings.map((entry) => entry.decision), ["judge_error", "judge_error"]);
assert.deepEqual(fixtureContracts.goldFindingRulings.map((entry) => entry.prohibitedRecurrence), ["owner_voice_drift", "owner_voice_drift"]);
assert.ok(fixtureContracts.goldFindingRulings.every((entry) => entry.mechanismExteriority === "internal_behavior"));
assert.equal(fixtureContracts.pairs.length, 8);

const reviseCategories = new Set(["house_bleed", "stock_trope", "example_proves_astrology", "metaphor_requires_translation", "tagline_stands_alone", "owner_voice_drift"]);
const failCategories = new Set(["astrology_integrity", "shared_ban", "specificity_ceiling"]);
for (const pair of fixtureContracts.pairs) {
  for (const key of ["required_primary", "allowed_primary_alternates", "verdict", "forbidden_escalations"]) assert.ok(Object.hasOwn(pair, key), `${pair.id} omitted ${key}.`);
  for (const key of ["dimension", "replacementField", "comparisonSet"]) assert.ok(Object.hasOwn(pair, key), `${pair.id} omitted ${key}.`);
  assert.ok(reviseCategories.has(pair.required_primary), `${pair.id} primary must be REVISE-tier.`);
  assert.ok(pair.allowed_primary_alternates.every((category) => reviseCategories.has(category) && category !== pair.required_primary));
  assert.equal(pair.verdict, "REVISE");
  assert.ok(pair.forbidden_escalations.length > 0);
  assert.ok(pair.forbidden_escalations.every((category) => failCategories.has(category)));
  assert.equal(pair.comparisonSet.length, 3);
  assert.ok(!pair.comparisonSet.includes(pair.positiveFixtureId));
}

const { cases } = loadCardJudgeV31FixtureSet();
assert.equal(cases.length, 20);
assert.equal(cases.filter((fixture) => fixture.kind === "gold").length, 12);
assert.equal(cases.filter((fixture) => fixture.kind === "negative").length, 8);
assert.ok(cases.every((fixture) => fixture.packet.version === "card-writing-judge-rubric-v3.1-draft"));

for (const ruling of fixtureContracts.goldFindingRulings) {
  const goldCase = cases.find((fixture) => fixture.fixtureId === ruling.fixtureId && fixture.kind === "gold");
  const negativeCase = cases.find((fixture) => fixture.pairId === `${ruling.fixtureId.includes("sagittarius") ? "sagittarius-house-bleed" : "pisces-untranslated-metaphor"}` && fixture.kind === "negative");
  assert.ok(goldCase && negativeCase);
  assert.deepEqual(goldCase.packet.ownerComparisonSet.map((entry) => entry.evidenceId), ruling.comparisonSet);
  assert.deepEqual(negativeCase.packet.ownerComparisonSet.map((entry) => entry.evidenceId), ruling.comparisonSet);
  assert.equal(goldCase.contract.prohibitedRecurrence, "owner_voice_drift");
  assert.equal(evaluateCardJudgeV31Contract({ fixture: goldCase, verdict: "PASS", categories: [] }).passed, true);
  assert.equal(evaluateCardJudgeV31Contract({ fixture: goldCase, verdict: "REVISE", categories: ["owner_voice_drift"] }).passed, false);
}

const geminiNegative = cases.find((fixture) => fixture.fixtureId === "neg-gemini-advocacy");
assert.equal(evaluateCardJudgeV31Contract({ fixture: geminiNegative, verdict: "REVISE", categories: ["example_proves_astrology"] }).passed, true);
assert.equal(evaluateCardJudgeV31Contract({ fixture: geminiNegative, verdict: "REVISE", categories: ["stock_trope"] }).passed, true);
assert.equal(evaluateCardJudgeV31Contract({ fixture: geminiNegative, verdict: "REVISE", categories: ["example_proves_astrology", "stock_trope"] }).passed, false, "Allowed alternates are substitutions, not permission to stack findings.");
assert.equal(evaluateCardJudgeV31Contract({ fixture: geminiNegative, verdict: "FAIL", categories: ["specificity_ceiling"] }).passed, false);

assert.match(runtime, /TLDR-CARD-JUDGE-RUBRIC-V3-DRAFT\.md/u);
assert.ok(!runtime.includes("TLDR-CARD-JUDGE-RUBRIC-V3-1-DRAFT.md"), "Inactive v3.1 draft must not be wired into the live runner.");

console.log(JSON.stringify({
  status: "PASS",
  version: fixtureContracts.version,
  fixtureSetStatus: fixtureContracts.fixtureSetStatus,
  calls: cases.length,
  negativeContracts: fixtureContracts.pairs.length,
  goldJudgeErrorRulings: fixtureContracts.goldFindingRulings.length,
  liveRunAuthorized: fixtureContracts.liveRunAuthorized,
  activeInHarness: fixtureContracts.activeInHarness
}, null, 2));
