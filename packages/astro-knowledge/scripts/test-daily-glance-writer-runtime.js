#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  batch1ConfigPath,
  batch2ConfigPath,
  batch3ConfigPath,
  batchLint,
  buildPacket,
  configPath,
  lintOutput,
  packetLint,
  readJson,
  renderModelInput
} = require("./daily-glance-writer-runtime.js");

const config = readJson(configPath);
for (const target of config.keys) {
  const packet = buildPacket(target.key, config);
  const input = renderModelInput(packet);
  const lint = packetLint(packet, input, config);
  assert.equal(packet.ownerPassages.length, 6, `${target.key}: exactly six owner passages`);
  assert.equal(lint.passed, true, `${target.key}: packet self-lint passes`);
  assert.equal(packet.routing.terraEnabled, false, `${target.key}: Terra stays off`);
}

const batchConfig = readJson(batch1ConfigPath);
assert.equal(batchConfig.keys.length, 7, "batch 1 contains seven authorized keys");
for (const target of batchConfig.keys) {
  const packet = buildPacket(target.key, batchConfig);
  const input = renderModelInput(packet);
  const lint = packetLint(packet, input, batchConfig);
  assert.equal(packet.ownerPassages.length, 6, `${target.key}: exactly six owner passages`);
  assert.equal(lint.passed, true, `${target.key}: batch packet self-lint passes`);
  assert.equal(packet.routing.writerCalls, 7, `${target.key}: seven Sol calls authorized`);
  assert.equal(packet.routing.terraEnabled, false, `${target.key}: Terra stays off`);
  assert.ok(["matched", "none_found"].includes(packet.warmthHarvest.harvest_mode), `${target.key}: governed harvest mode recorded`);
  assert.ok(packet.warmthHarvest.ownerFoundationLines.length <= 1, `${target.key}: at most one warmth line`);
  assert.equal(packet.warmthHarvest.sourcesSearched.length, 3, `${target.key}: all three harvest lanes recorded`);
  assert.ok(["owner-five-beat", "invented_allowed"].includes(packet.sceneEvidence.mode), `${target.key}: scene lane recorded`);
  assert.equal(packet.batch1LintGuidance.length, 4, `${target.key}: batch-1 lint lessons included`);
  if (target.register === "saturation") {
    assert.deepEqual(packet.target.matchingExemplarSourceIds, [], `${target.key}: conjunction has no cross-group exemplar`);
  } else {
    assert.equal(packet.target.matchingExemplarSourceIds.length, 2, `${target.key}: matching group exemplar present`);
  }
}

const batch2Config = readJson(batch2ConfigPath);
assert.equal(batch2Config.keys.length, 7, "batch 2 contains seven authorized keys");
for (const target of batch2Config.keys) {
  const packet = buildPacket(target.key, batch2Config);
  const input = renderModelInput(packet);
  const lint = packetLint(packet, input, batch2Config);
  assert.equal(packet.ownerPassages.length, 6, `${target.key}: exactly six owner passages`);
  assert.equal(lint.passed, true, `${target.key}: batch-2 packet self-lint passes`);
  assert.equal(packet.ownerPromptCore, batch2Config.ownerPromptCore, `${target.key}: owner prompt core stays verbatim`);
  assert.equal(packet.ownerGuidance.length, 9, `${target.key}: nine owner guidance steps included`);
  assert.equal(packet.ownerFinalTests.length, 3, `${target.key}: three owner tests included`);
  assert.equal(packet.dailyRules.length, 17, `${target.key}: DG-R1 through DG-R17 included`);
  assert.ok(["owner-five-beat", "house-context", "invented_allowed"].includes(packet.sceneEvidence.mode), `${target.key}: governed scene mode recorded`);
  assert.ok(packet.specificity, `${target.key}: mechanical specificity profile included`);
  assert.equal(packet.routing.terraEnabled, false, `${target.key}: Terra stays off`);
}

const batch3Config = readJson(batch3ConfigPath);
assert.equal(batch3Config.keys.length, 14, "batch 3 contains fourteen authorized keys");
for (const target of batch3Config.keys) {
  const packet = buildPacket(target.key, batch3Config);
  const input = renderModelInput(packet);
  const lint = packetLint(packet, input, batch3Config);
  assert.equal(packet.ownerPassages.length, 6, `${target.key}: exactly six owner passages`);
  assert.equal(lint.passed, true, `${target.key}: batch-3 packet self-lint passes`);
  assert.equal(packet.ownerPromptCore, batch3Config.ownerPromptCore, `${target.key}: owner prompt core stays verbatim`);
  assert.equal(packet.dailyRules.length, 17, `${target.key}: DG-R1 through DG-R17 included`);
  assert.equal(packet.routing.writerCalls, 14, `${target.key}: fourteen Sol calls authorized`);
  assert.equal(packet.routing.maxOutputTokens, 24000, `${target.key}: 24,000-token output ceiling`);
  assert.equal(packet.routing.terraEnabled, false, `${target.key}: Terra stays off`);
  assert.ok(["owner-five-beat", "house-context", "invented_allowed"].includes(packet.sceneEvidence.mode), `${target.key}: governed scene mode recorded`);
  assert.ok(packet.specificity, `${target.key}: mechanical specificity profile included`);
}

const clean = {
  "square/lilith": {
    headline: "Your wants are harder to ignore today.",
    body: "For the next few hours, you may feel torn between what feels comfortable and what you actually want. The choice can stay small, even if the feeling is sharp. Name the thing you keep dismissing, then give it one honest answer before moving on."
  },
  "opposition/mars": {
    headline: "Someone else's urgency does not have to become yours.",
    body: "For the next few hours, another person may push for an answer before you are ready. Your first reaction can be quick, especially if they mistake your pause for weakness. Delay your answer, say what needs more time, and leave the argument there."
  },
  "house/11": {
    headline: "Your friendships show you which plans still matter.",
    body: "For the next few hours, it may feel easier to notice which connections support the future you are building. A familiar friendship can remind you what you hoped for before daily obligations took over. Send one clear message to the person you want beside you."
  }
};
for (const [key, candidate] of Object.entries(clean)) {
  const report = lintOutput(candidate, key, config);
  assert.equal(report.findings.length, 0, `${key}: clean fixture has no banned terms`);
}
const banned = lintOutput({
  headline: "Today works out for once.",
  body: "This energy flows through your plans and future-you knows it. Stop waiting. Someone will fix the situation for you. Trust the process."
}, "square/lilith", config);
assert.ok(banned.findings.some((finding) => finding.id === "DG-R1"), "Stop + verb fails");
assert.ok(banned.findings.some((finding) => finding.id === "DG-R5"), "cynical/meme language fails");
assert.ok(banned.findings.some((finding) => finding.id === "SM-DG-6"), "ambient energy fails");
const recurringFrameReport = batchLint([
  { key: "a", candidate: { headline: "You can see this.", body: "Name what matters." } },
  { key: "b", candidate: { headline: "You can see that.", body: "Choose one thing." } },
  { key: "c", candidate: { headline: "You can see why.", body: "Tell one friend." } }
]);
assert.equal(recurringFrameReport.passed, true, "recurring-frame findings no longer block an otherwise clean batch");
assert.equal(recurringFrameReport.checks.find((check) => check.id === "DG-R1-recurring-sentence-frame").passed, false, "recurring three-word frame remains reported");
assert.equal(recurringFrameReport.checks.find((check) => check.id === "DG-R1-recurring-sentence-frame").tier, "advisory", "recurring-frame finding is advisory");
const repeatedOpeners = batchLint([
  { key: "a", candidate: { headline: "One clear claim lands here.", body: "Notice how pressure builds. Name one limit." } },
  { key: "b", candidate: { headline: "Another clear claim lands here.", body: "Notice how comfort shifts. Choose one action." } }
], { expectedCount: 2 });
assert.ok(repeatedOpeners.repeatedOpeners.length === 1, "DG-R7 catches a repeated body-opener construction across two outputs");
const enumerated = lintOutput({
  headline: "Someone else's plan can crowd out your own priorities.",
  body: "Notice how quickly another person's request can become your obligation today. You may feel pressure to agree before you have decided what fits. Speak to one person, name one change, and leave the rest of the plan open."
}, "opposition/sun", batchConfig);
assert.equal(enumerated.checks.find((check) => check.id === "DG-R9-enumerated-instruction-allowed").passed, true, "DG-R9 never flags one-X/one-Y instructions");
const lessonFailure = lintOutput({
  headline: "Someone else's expectations can pull you away from yourself.",
  body: "Today, another person may call before you are ready, and for the next few hours you may answer every request. Their pressure can crowd the decision. Name one limit and give the answer after you know it."
}, "opposition/sun", batchConfig);
assert.equal(lessonFailure.checks.find((check) => check.id === "B1-L1-time-anchor-max-once").passed, false, "time-anchor phrases are capped at one per body");
assert.equal(lessonFailure.checks.find((check) => check.id === "B1-L2-may-inner-states-only").passed, false, "may on observable actions fails");
const reservedConstruction = lintOutput({
  headline: "It takes less courage to ask than to keep hiding.",
  body: "You need help, but you swallow the request before anyone can answer. The old hurt may insist that asking is too much. That defense leaves you testing someone who does not know there is a test. Name the support you need and ask for it directly."
}, "square/chiron", batch2Config);
assert.equal(reservedConstruction.checks.find((check) => check.id === "DG-R16-owner-reserved-construction").passed, false, "DG-R16 catches the owner-reserved construction");
const quotedDialogue = lintOutput({
  headline: "Your request disappears before anyone can answer it.",
  body: "You type, “I need help,” then delete it. You say, “Never mind,” before anyone responds. The old hurt may call that safer, but it leaves support guessing. Send the first clear request without testing the answer."
}, "square/chiron", batch2Config);
assert.equal(quotedDialogue.checks.find((check) => check.id === "DG-R17-quoted-dialogue-max-one").passed, false, "DG-R17 catches two quoted-dialogue lines");

console.log("OK  daily-glance pilot and batch packets, warmth/scene lanes, routing, output bans, opener variety, and repetition guards");
