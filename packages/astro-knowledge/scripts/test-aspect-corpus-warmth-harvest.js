#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  annotateCandidateWithWarmth,
  buildAspectWarmthHarvest,
  collectivize,
  foundationPromptBlock,
  lintAspectWarmthUsage,
  passesBanList
} = require("./aspect-corpus-warmth-harvest.js");
const { buildAspectWritingPacket } = require("./build-aspect-writing-packet.js");
const { buildJudgePrompt, parseVerdict } = require("./judge-sky-exact-aspect.js");
const { lintExactEntry, missingTargets, ownerCorpus } = require("./sky-exact-aspect-corpus.js");

const skyEntry = {
  id: "sky.test.warmth",
  humanMoment: "The need to prove worth through approval leaves everyone exhausted."
};
const skyHarvest = buildAspectWarmthHarvest(skyEntry, {
  surface: "sky-exact-aspect",
  format: "full-card"
});

assert.strictEqual(skyHarvest.status, "ready");
assert.strictEqual(skyHarvest.generationAllowed, true);
assert.strictEqual(skyHarvest.harvest_mode, "matched");
assert.ok(skyHarvest.ownerFoundationLines.length >= 1 && skyHarvest.ownerFoundationLines.length <= 3);
assert.ok(skyHarvest.ownerFoundationLines.every((line) => line.sourceArticleId && line.originalLine && line.suppliedLine));
assert.ok(skyHarvest.ownerFoundationLines.some((line) => /\b(?:you|your)\b/iu.test(line.originalLine)), "Fixture should exercise second-person collectivization.");
assert.ok(skyHarvest.ownerFoundationLines.every((line) => !/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(line.suppliedLine)));
assert.match(skyHarvest.insertInstruction, /Adapt one of these/);
assert.match(skyHarvest.placementInstruction, /final sentence or the sentence before it/);

assert.strictEqual(
  collectivize("You don't have to earn rest through exhaustion. You can be your actual self."),
  "We don't have to earn rest through exhaustion. We can be our actual selves."
);

const natalEntry = {
  id: "natal.jupiter-ascendant.hard",
  humanMoment: "Encouragement feels generous until support becomes pressure and the need for approval takes over."
};
const natalPacket = buildAspectWritingPacket({
  surface: "natal-aspect",
  format: "full-card",
  entry: natalEntry
});
assert.strictEqual(natalPacket.status, "ready");
assert.strictEqual(natalPacket.pronounPolicy, "Second person is allowed; supply owner lines verbatim with pronouns intact.");
assert.ok(natalPacket.warmthHarvest.ownerFoundationLines.some((line) => /\b(?:you|your)\b/iu.test(line.originalLine)));
assert.ok(natalPacket.warmthHarvest.ownerFoundationLines.every((line) => line.suppliedLine === line.originalLine));

const shortPacket = buildAspectWritingPacket({
  surface: "natal-aspect",
  format: "tldr-line",
  entry: natalEntry
});
assert.strictEqual(shortPacket.warmthHarvest.harvest_mode, "vocabulary_only");
assert.strictEqual(shortPacket.warmthHarvest.insertInstruction, null);
assert.strictEqual(shortPacket.scaleRule.insertWarmthBeat, false);
assert.match(shortPacket.promptBlock, /vocabulary_only/);
assert.doesNotMatch(shortPacket.promptBlock, /Adapt one of these/);

const missingPacket = buildAspectWritingPacket({
  surface: "transit-to-natal-aspect",
  format: "full-card",
  entry: { id: "missing-core" }
});
assert.strictEqual(missingPacket.status, "editorial_required");
assert.strictEqual(missingPacket.generationAllowed, false);
assert.deepStrictEqual(missingPacket.flags, [{
  id: "missing-human-moment-beat",
  severity: "editorial",
  blocking: true,
  reason: "Aspect entry has no human-moment beat. This is editorial data completeness; flag for editorial work. Do not request new owner prose."
}]);
assert.deepStrictEqual(missingPacket.warmthHarvest.ownerFoundationLines, []);
assert.deepStrictEqual(missingPacket.scaleRule, {
  harvest_mode: null,
  insertWarmthBeat: false,
  rule: "Packet blocked; no scale rule applies."
});

const noFoundationPacket = buildAspectWritingPacket({
  surface: "sky-exact-aspect",
  format: "full-card",
  entry: {
    id: "sky.no-foundation-line",
    humanMoment: "The memo arrives before the meeting and changes the schedule."
  }
});
assert.strictEqual(noFoundationPacket.status, "ready");
assert.strictEqual(noFoundationPacket.generationAllowed, true);
assert.strictEqual(noFoundationPacket.warmthHarvest.harvest_mode, "none_found");
assert.deepStrictEqual(noFoundationPacket.flags, [{
  id: "owner-corpus-warmth-none-found",
  severity: "info",
  blocking: false,
  reason: "No qualifying owner-corpus warmth line is available for this core. Revisit if future owner writing covers it; do not invent imitation warmth."
}]);
assert.deepStrictEqual(noFoundationPacket.warmthHarvest.ownerFoundationLines, []);
assert.strictEqual(noFoundationPacket.scaleRule.insertWarmthBeat, false);
assert.match(noFoundationPacket.promptBlock, /absence of a warmth beat is acceptable/);
assert.match(noFoundationPacket.promptBlock, /Do not invent permission, reassurance/);

const usedFoundation = skyHarvest.ownerFoundationLines[0];
const candidate = annotateCandidateWithWarmth({
  body: `The cost has already been named. ${usedFoundation.suppliedLine}`
}, skyHarvest);
assert.strictEqual(candidate.evidenceClass, "owner-corpus-derived");
assert.deepStrictEqual(candidate.warmthSource, {
  sourceArticleId: usedFoundation.sourceArticleId,
  originalLine: usedFoundation.originalLine,
  usedForm: usedFoundation.suppliedLine
});

assert.strictEqual(annotateCandidateWithWarmth({ body: "A plain card without the supplied line." }, skyHarvest).warmthSource, undefined);
assert.strictEqual(passesBanList("This is a gentle reminder to trust the process."), false);
assert.match(foundationPromptBlock(skyHarvest), /OWNER FOUNDATION LINES/);

const validWarmthUsage = lintAspectWarmthUsage(
  `The cost is already clear. ${usedFoundation.suppliedLine}`,
  skyHarvest
);
assert.strictEqual(validWarmthUsage.fails, 0, "One supplied warmth beat may appear at the end of a full card.");

const earlyWarmthUsage = lintAspectWarmthUsage(
  `${usedFoundation.suppliedLine} The cost is already clear. The exchange reaches its conclusion.`,
  skyHarvest
);
assert.ok(
  earlyWarmthUsage.findings.some((finding) => /final or penultimate/u.test(finding.reason)),
  "A warmth beat earlier than the penultimate sentence must fail."
);

const twoWarmthLines = skyHarvest.ownerFoundationLines.slice(0, 2);
assert.strictEqual(twoWarmthLines.length, 2, "Fixture should supply two lines for the one-beat scale test.");
const doubledWarmthUsage = lintAspectWarmthUsage(
  `The cost is already clear. ${twoWarmthLines[0].suppliedLine} ${twoWarmthLines[1].suppliedLine}`,
  skyHarvest
);
assert.ok(
  doubledWarmthUsage.findings.some((finding) => /at most one warmth beat/u.test(finding.reason)),
  "Two supplied warmth beats must fail."
);

const vocabularyOnlyInsertion = lintAspectWarmthUsage(
  `A short preview. ${shortPacket.warmthHarvest.ownerFoundationLines[0].suppliedLine}`,
  shortPacket.warmthHarvest
);
assert.ok(
  vocabularyOnlyInsertion.findings.some((finding) => /vocabulary_only/u.test(finding.reason)),
  "A vocabulary-only packet must reject insertion of a supplied line."
);

const targets = missingTargets();
const pointTarget = targets.find((target) => target.batch === "chiron" && target.humanMoment);
const pointHarvest = buildAspectWarmthHarvest(pointTarget, { surface: "sky-exact-aspect", format: "full-card" });
assert.strictEqual(pointHarvest.status, "ready");
const missingQuincunx = targets.find((target) => target.batch === "classical-quincunx");
const missingQuincunxHarvest = buildAspectWarmthHarvest(missingQuincunx, { surface: "sky-exact-aspect", format: "full-card" });
assert.strictEqual(missingQuincunxHarvest.status, "editorial_required");
assert.deepStrictEqual(missingQuincunxHarvest.flags, [{
  id: "missing-human-moment-beat",
  severity: "editorial",
  blocking: true,
  reason: "Aspect entry has no human-moment beat. This is editorial data completeness; flag for editorial work. Do not request new owner prose."
}]);

const ownerCalibration = ownerCorpus();
assert.strictEqual(ownerCalibration.length, 225);
assert.deepStrictEqual(
  ownerCalibration.filter((entry) => lintExactEntry(entry).fails > 0).map((entry) => entry.id),
  [],
  "Owner calibration pieces must retain mechanical score 3 eligibility."
);
assert.strictEqual(parseVerdict('{"score":3,"verdict":"in-voice","failedChecks":[]}').score, 3);
const judgePrompt = buildJudgePrompt(ownerCalibration[0], { foundationLines: skyHarvest.ownerFoundationLines });
assert.match(judgePrompt, /turn toward the reader must trace to the supplied owner foundation lines/);
assert.match(judgePrompt, /invented permission or reassurance line.*scores 2/);
assert.match(judgePrompt, /never penalized as copying/);

console.log("Aspect corpus warmth harvest: source selection, missing-core fail-closed behavior, non-blocking corpus misses, surface pronouns, scale, provenance, judge rule, and owner calibration passed.");
