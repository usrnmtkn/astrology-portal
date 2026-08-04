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

for (const target of targets) {
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
  assert.match(prompt, /OWNER-CORPUS WARMTH HARVEST: harvest_mode=none_found/);
  assert.match(prompt, /do not invent a permission, reassurance, benediction, or turn-toward-the-reader line/iu);
  assert.match(prompt, /individual-word diction cues, not a template, required-word list, or automatic voice pass/);
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
assert.match(writerPrompt(targets.find((target) => target.aspect === "quincunx")), /Center the awkward aftermath, repeated practical revisions/);
assert.match(writerPrompt({ ...targets[0], harvest_mode: "vocabulary_only" }), /harvest_mode=vocabulary_only[\s\S]*Do not add a permission, reassurance, benediction, or turn-toward-the-reader sentence/iu);
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
const missingHumanMoment = lintExactEntry({
  aspect: "square",
  humanMoment: "",
  developmentDetail: "The correction arrives after the first version has already spread.",
  planetaryDynamic: "One function pushes while the other checks what the push will cost.",
  aspectMechanic: "The pressure repeats until the underlying choice is addressed.",
  conditionalConsequence: "The delay becomes useful only when it changes the next decision.",
  collectiveLeadEligible: true
});
const humanMomentFinding = missingHumanMoment.findings.find((finding) => finding.field === "humanMoment");
assert.strictEqual(humanMomentFinding.severity, "fail");
assert.strictEqual(humanMomentFinding.source, "editorial-data-completeness");
assert.strictEqual(humanMomentFinding.ownerProseRequired, false);

const judgePrompt = buildJudgePrompt(approved[0], { pairSource: "test source" });
assert.match(judgePrompt, /ready for owner review only/i);
assert.match(judgePrompt, /not a natal reading/i);
assert.match(buildJudgePrompt(approved[0], { pairSource: "test source", harvest_mode: "none_found" }), /Do not require or penalize the absence of a permission, reassurance, benediction, or turn-toward-the-reader line/iu);
assert.match(buildJudgePrompt(approved[0], { pairSource: "test source", harvest_mode: "vocabulary_only" }), /Do not require a warmth beat on short copy/iu);
assert.deepStrictEqual(parseVerdict('{"score":3,"verdict":"in-voice","failedChecks":[]}').score, 3);
assert.strictEqual(parseVerdict("not json").score, 1);
assert.strictEqual(weakControls().length, 8);
assert.deepStrictEqual(parseArgs(["--plan", "--batch=lilith", "--limit=4"]).batch, "lilith");

console.log("Sky exact-aspect pipeline: 225 owner source entries, 214 reader-eligible calibration entries, 240 missing targets, Sol lanes, prompts, lint, and weak controls passed.");
