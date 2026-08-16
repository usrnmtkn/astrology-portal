#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { findPolicyFindings, passageHasRetrievalExclusion } = require("./banned-word-policy.js");
const { passesBanList } = require("./aspect-corpus-warmth-harvest.js");
const { bannedLexicon, survivesBanList } = require("./timing-warmth-harvest.js");
const { lintLongformArticle } = require("./lint-article-voice.js");
const { lintArticle } = require("./lint-placement-voice.js");
const { lintCard } = require("./lint-sky-voice.js");
const { lintPatternCard } = require("./lint-pattern-voice.js");

const policy = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "voice", "banned-words.json"), "utf8"));
const entries = [...policy.bannedWords, ...(policy.waivedTerms || [])];

for (const term of ["death", "die", "dying", "self-punishment", "voice shakes"]) {
  const sentence = `A literal sentence may contain ${term}.`;
  assert.deepStrictEqual(findPolicyFindings(sentence, entries), [], `${term} must be fully waived`);
  assert.strictEqual(passageHasRetrievalExclusion(sentence, entries), false, `${term} must not exclude retrieval`);
  assert.strictEqual(passesBanList(sentence), true, `${term} must survive the aspect harvester`);
  assert.strictEqual(survivesBanList(sentence, bannedLexicon()), true, `${term} must survive the timing harvester`);
}

const profound = findPolicyFindings("A profound shift follows.", entries);
assert.strictEqual(profound.length, 1);
assert.strictEqual(profound[0].severity, "warn");
assert.strictEqual(profound[0].policyClass, "REPLACEMENT_SUGGESTION");
assert.ok(profound[0].preferredAlternatives.includes("significant"));
assert.strictEqual(passageHasRetrievalExclusion("A profound shift follows.", entries), false);
assert.deepStrictEqual(findPolicyFindings("The canyon is profound in depth.", entries), [], "non-generic profound usage must not flag");

for (const term of ["reckoning", "permission slip", "running tally", "truth bomb", "performing normalcy", "dynamic interplay"]) {
  const findings = findPolicyFindings(`This is a ${term}.`, entries);
  assert.ok(findings.some((finding) => finding.term === term && finding.severity === "fail"), `${term} must remain a hard failure`);
}

for (const sentence of [
  "Their lives weave together into a shared destiny.",
  "A tapestry of possibility appears.",
  "The histories are woven into one meaning."
]) {
  assert.ok(findPolicyFindings(sentence, entries).some((finding) => finding.policyClass === "AI_TELL_PREVENTIVE"), `${sentence} must flag as an AI tell`);
}
for (const sentence of [
  "They weave the fabric on a wooden loom.",
  "The woven cloth is folded beside the yarn."
]) {
  assert.deepStrictEqual(findPolicyFindings(sentence, entries), [], `${sentence} must pass as literal weaving`);
}

const editorial = findPolicyFindings("The pattern becomes self-erasure.", entries);
assert.strictEqual(editorial[0].severity, "warn");
assert.strictEqual(editorial[0].policyClass, "EDITORIAL_REVIEW");
assert.strictEqual(passageHasRetrievalExclusion("The pattern becomes self-erasure.", entries), false);
assert.strictEqual(passesBanList("The pattern becomes self-erasure."), true);
assert.strictEqual(survivesBanList("The pattern becomes self-erasure.", bannedLexicon()), true);

assert.strictEqual(lintLongformArticle("You notice a profound shift in the plan.").fails, 0);
assert.ok(lintLongformArticle("You notice a profound shift in the plan.").findings.some((finding) => finding.policyClass === "REPLACEMENT_SUGGESTION"));
assert.ok(lintLongformArticle("You face a reckoning in the plan.").fails > 0);

const placementAdvisory = lintArticle({
  planet: "venus",
  sign: "libra",
  tagline: "The balance changes.",
  hook: "A profound shift changes the agreement.",
  lived: "Until {{exitDate}}, someone names the cost before agreeing.",
  turn: "The answer arrives before the plan is final."
});
assert.ok(placementAdvisory.findings.some((finding) => finding.term === "profound" && finding.severity === "warn"));
assert.ok(!placementAdvisory.findings.some((finding) => finding.term === "profound" && finding.severity === "fail"));
const skyAdvisory = lintCard("We notice a profound shift in the agreement.");
assert.ok(skyAdvisory.findings.some((finding) => finding.term === "profound" && finding.severity === "warn"));
const patternAdvisory = lintPatternCard("You notice a profound shift in how the answer is given.");
assert.ok(patternAdvisory.findings.some((finding) => finding.term === "profound" && finding.severity === "warn"));

console.log("OK  banned-word policy classes preserve lint severity and retrieval eligibility");
