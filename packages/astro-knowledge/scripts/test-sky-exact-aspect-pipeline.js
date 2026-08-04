#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { readRegistry, validateRegistry } = require("./editorial-model-registry.js");
const { parseVerdict, buildJudgePrompt } = require("./judge-sky-exact-aspect.js");
const { VENUS_SQUARE_LILITH_MODEL, VENUS_SQUARE_MARS_MODEL, parseArgs, plainBriefPrompt, writerPrompt } = require("./generate-sky-exact-aspect-drafts.js");
const {
  batchCounts,
  lintExactEntry,
  missingTargets,
  ownerCorpus,
  readerEligibleOwnerCorpus
} = require("./sky-exact-aspect-corpus.js");
const { weakControls } = require("./calibrate-sky-exact-aspect-judge.js");
const {
  OWNER_STYLE_MODELS,
  SKY_EXACT_ASPECT_OWNER_VOCABULARY,
  buildSkyExactAspectVocabularyPrompt
} = require("./sky-exact-aspect-style.js");
const {
  NEGATIVE_CONTROLS,
  buildNaturalEnglishPrompt,
  parseNaturalEnglishVerdict
} = require("./judge-sky-natural-english.js");
const {
  buildAspectWarmthHarvest
} = require("./aspect-corpus-warmth-harvest.js");

const registry = validateRegistry(readRegistry());
assert.strictEqual(registry.lanes["generation:sky-exact-aspect"].candidate.model, "gpt-5.6-sol");
assert.strictEqual(registry.lanes["judge:sky-exact-aspect"].candidate.model, "gpt-5.6-sol");

const approved = ownerCorpus();
assert.strictEqual(approved.length, 225);
assert.strictEqual(readerEligibleOwnerCorpus().length, 214);
const approvedLint = approved.map((entry) => ({ id: entry.id, lint: lintExactEntry(entry) })).filter(({ lint }) => lint.fails);
assert.deepStrictEqual(approvedLint, [], "All 225 owner-approved exact-aspect entries must satisfy the exact-entry contract.");

const targets = missingTargets();
assert.strictEqual(targets.length, 240);
assert.deepStrictEqual(batchCounts(targets), { chiron: 66, lilith: 72, "node-axis": 60, "classical-quincunx": 42 });
assert.strictEqual(new Set(targets.map((target) => target.id)).size, 240);

const harvestedTargets = targets.map((target) => ({
  ...target,
  warmthHarvest: buildAspectWarmthHarvest(target, { surface: "sky-exact-aspect", format: "full-card" })
}));
assert.strictEqual(harvestedTargets.filter((target) => target.warmthHarvest.status === "ready").length, 198);
assert.strictEqual(harvestedTargets.filter((target) => target.warmthHarvest.flags.some((flag) => flag.id === "missing-human-moment-beat")).length, 42);

for (const target of harvestedTargets.filter((candidate) => candidate.warmthHarvest.status === "ready")) {
  const briefPrompt = plainBriefPrompt(target);
  assert.match(briefPrompt, /planning material, not reader copy/);
  assert.match(briefPrompt, /Do not be clever, lyrical, quotable/);
  const prompt = writerPrompt(target);
  assert.match(prompt, /needs_review/);
  assert.match(prompt, /Use collective we\/our\/us/);
  assert.match(prompt, /Exactly two paragraphs, 5-10 sentences total/);
  assert.match(prompt, /Venus square Mars/);
  assert.match(prompt, /OWNER VOCABULARY PALETTE \(menu, never quota\)/);
  assert.match(prompt, /OWNER SKY-ASPECT VOCABULARY \(derived only from approved owner copy; menu, never quota\)/);
  assert.match(prompt, /individual-word diction cues, not a template, required-word list, or automatic voice pass/);
  assert.match(prompt, /OWNER FOUNDATION LINES/);
  assert.match(prompt, /Adapt one of these into the card/);
  assert.match(prompt, /warmth beat is exactly one sentence/);
  assert.ok(target.warmthHarvest.ownerFoundationLines.length >= 1 && target.warmthHarvest.ownerFoundationLines.length <= 3);
  assert.ok(target.warmthHarvest.ownerFoundationLines.every((line) => !/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(line.suppliedLine)));
  assert.match(prompt, /Words shared by Marie and Spirit Daughter/);
  assert.match(prompt, /Neutral Spirit Daughter word additions approved for individual-word use/);
  assert.doesNotMatch(prompt, /Welcome to another powerful week/);
  assert.match(prompt, new RegExp(`EXACT ASPECT MECHANIC:[\\s\\S]*${target.aspect === "quincunx" ? "repeated adjustments" : target.aspect}`, "i"));
}

assert.match(VENUS_SQUARE_MARS_MODEL, /The urge is real\. The timing is not\./);
assert.match(VENUS_SQUARE_LILITH_MODEL, /fine on paper/);
assert.strictEqual(OWNER_STYLE_MODELS.length, 10);
assert.ok(OWNER_STYLE_MODELS.every((entry) => entry.body && entry.title));
assert.ok(OWNER_STYLE_MODELS.some((entry) => entry.id === "sky.uranus.quincunx.lilith" && /new logistical problem/.test(entry.body)));
const blockedQuincunx = harvestedTargets.find((target) => target.batch === "classical-quincunx");
assert.throws(() => writerPrompt(blockedQuincunx), /warmth harvest failed closed.*missing-human-moment-beat/);
const reviewableQuincunx = {
  ...blockedQuincunx,
  humanMoment: "The need to control the outcome creates pressure and leaves everyone exhausted."
};
reviewableQuincunx.warmthHarvest = buildAspectWarmthHarvest(reviewableQuincunx, { surface: "sky-exact-aspect", format: "full-card" });
assert.match(writerPrompt(reviewableQuincunx), /Center the awkward aftermath, repeated practical revisions/);
assert.ok(SKY_EXACT_ASPECT_OWNER_VOCABULARY.length >= 30);
assert.ok(SKY_EXACT_ASPECT_OWNER_VOCABULARY.includes("desire"));
assert.ok(SKY_EXACT_ASPECT_OWNER_VOCABULARY.includes("practical"));
assert.doesNotMatch(buildSkyExactAspectVocabularyPrompt(), /Welcome to another powerful week/);
assert.strictEqual(NEGATIVE_CONTROLS.length, 4);
assert.match(buildNaturalEnglishPrompt({ body: "Winning the argument can still keep us stuck in the same situation." }), /evidence object whose checkId matches/);
assert.match(buildNaturalEnglishPrompt({ body: "Plain natural copy." }), /Coherent metaphor, personification, rhythm/);
const naturalPass = parseNaturalEnglishVerdict('{"score":3,"verdict":"in-voice","rationale":"Every sentence is natural and clear.","failedChecks":[],"evidence":[]}', "Plain natural copy.");
assert.strictEqual(naturalPass.contractViolation, false);
const naturalFail = parseNaturalEnglishVerdict('{"score":2,"verdict":"borderline","rationale":"One compressed slogan.","failedChecks":["slogan-compression"],"evidence":[{"checkId":"slogan-compression","sentence":"The opportunity asks us to grow less."}]}', "The opportunity asks us to grow less.");
assert.strictEqual(naturalFail.contractViolation, false);
const unsupportedFail = parseNaturalEnglishVerdict('{"score":2,"verdict":"borderline","rationale":"One compressed slogan.","failedChecks":["slogan-compression"],"evidence":[{"checkId":"slogan-compression","sentence":"A sentence not present."}]}', "The opportunity asks us to grow less.");
assert.strictEqual(unsupportedFail.contractViolation, true);
const stylePilot = {
  aspect: "square",
  body: "Desire wants an actual target, not an abstract ideal, and drive keeps shifting the coordinates. With Venus square Mars, we get the push to connect and the pull to move on at the same time. A message left on read, a plan changed mid-sentence, the extra shift agreed to before anyone knows why - the timing is a little off, and the mood never quite syncs up. Venus weighs every signal for real value; Mars keeps the options circling, ready to pivot or bail.\n\nWe try to turn desire into action and end up tangled in missed cues and double takes. The same charge that makes us magnetic also burns up patience, and what could be easy chemistry becomes a string of second guesses. Wanting and doing are not synonyms, and the lag between them gets loud. The urge is real. The timing is not.",
  collectiveLeadEligible: false
};
assert.strictEqual(lintExactEntry(stylePilot).fails, 0, JSON.stringify(lintExactEntry(stylePilot).findings));

const judgePrompt = buildJudgePrompt(approved[0], { pairSource: "test source" });
assert.match(judgePrompt, /ready for owner review only/i);
assert.match(judgePrompt, /not a natal reading/i);
assert.deepStrictEqual(parseVerdict('{"score":3,"verdict":"in-voice","failedChecks":[]}').score, 3);
assert.strictEqual(parseVerdict("not json").score, 1);
assert.strictEqual(weakControls().length, 8);
assert.deepStrictEqual(parseArgs(["--plan", "--batch=lilith", "--limit=4"]).batch, "lilith");

console.log("Sky exact-aspect pipeline: 225 owner source entries, 214 reader-eligible calibration entries, 198 harvested targets, 42 fail-closed missing cores, Sol lanes, prompts, lint, and weak controls passed.");
