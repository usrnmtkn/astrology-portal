#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopy } from "../../../src/astro-writing/validateCopy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const p = (value) => path.join(ROOT, value);
const read = (value) => JSON.parse(fs.readFileSync(p(value), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const ordinal = (value) => `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"}`;

const INPUT = {
  signReview: "packages/astro-knowledge/review/natal-moon-compatibility-derived-review-v1.json",
  evidenceManifest: "packages/astro-knowledge/review/natal-compatibility-evidence-manifest-v1.json",
  mechanismWave1: "packages/astro-knowledge/review/natal-placement-canonical-mechanisms-review-2026-08-17.json",
  mechanismWave2: "packages/astro-knowledge/review/natal-house-canonical-mechanisms-review-wave-2-2026-08-17.json",
  mechanismApproval: "packages/astro-knowledge/review/natal-house-mechanism-owner-approval-2026-08-20.json",
  bridgeSamples: "packages/astro-knowledge/review/natal-house-bridge-review-samples-2026-08-20.json",
  fallbackSource: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
};
const OUTPUT = "packages/astro-knowledge/review/natal-moon-authoring-readiness-v2.json";

const HOUSE_ARGUMENTS = {
  1: ["The Moon's needs and reactions are visible near the surface.", "The human role is the person whose first response tells the room how something landed.", "Evidence should show an immediate facial, verbal, or physical response.", "A second example should show how mood affects the way a situation begins.", "A third example should show a recovery action without diagnosing the body.", "Over time, repeated visible reactions shape other people's first impression.", "The strength is emotional immediacy and responsiveness.", "The complication is acting before the feeling has been understood.", "The reader should recognize how quickly private feeling becomes public behavior.", "Do not assume appearance, illness, volatility, or a specific childhood."],
  2: ["The Moon seeks security through money, possessions, routines, and what feels dependable.", "The human role is the person who checks what is available before relaxing.", "Evidence should show a purchase, budget, meal, object, or practical preparation tied to mood.", "A second example should show comfort coming from something reliable and repeatable.", "A third example should show a mood changing a spending, saving, or holding decision.", "Over time, emotional safety becomes linked to what can be counted or maintained.", "The strength is practical care and an instinct for preserving resources.", "The complication is treating uncertainty as a reason to hold too tightly.", "The reader should recognize what they reach for when they need to feel secure.", "Do not assume wealth, poverty, debt, ownership status, or financial trauma."],
  3: ["The Moon processes feeling through words, messages, learning, and ordinary movement.", "The human role is the person who talks, texts, asks, or gathers details to understand a mood.", "Evidence should show a conversation, message thread, notebook, errand, or short trip.", "A second example should show tone changing before the person names the feeling.", "A third example should show information helping the person settle or decide.", "Over time, daily communication becomes part of emotional regulation.", "The strength is noticing and naming small changes quickly.", "The complication is continuing to collect information after the feeling is already clear.", "The reader should recognize how speech and movement help them process.", "Do not assume siblings, school history, diagnosis, or a specific neighborhood."],
  4: ["The Moon's needs are concentrated in home, family, roots, and private life.", "The human role is the person who protects the private base and reacts when it feels unsettled.", "Evidence should show a household problem, room, meal, family exchange, or need for privacy.", "A second example should show an immediate action taken to restore safety at home.", "A third example should show private feeling that is not visible in public.", "Over time, the condition of home strongly affects the person's ability to recover.", "The strength is fierce protection of people and places that feel like home.", "The complication is reacting before naming the need underneath the reaction.", "The reader should recognize what they do when their private base feels disturbed.", "Do not invent parental behavior, childhood conditions, trauma, housing status, or family structure."],
  5: ["The Moon seeks expression through romance, creativity, pleasure, play, and being received.", "The human role is the person who feels better after making, performing, flirting, playing, or sharing delight.", "Evidence should show a creative project, game, date, performance, or playful invitation.", "A second example should show audience response affecting mood.", "A third example should show personal feeling becoming something visible or enjoyable.", "Over time, emotional confidence grows through repeated chances to create and respond.", "The strength is generous emotional expression.", "The complication is treating attention or applause as proof of care.", "The reader should recognize how play and creativity restore them.", "Do not assume children, fertility, relationship status, fame, or artistic employment."],
  6: ["The Moon brings emotional needs into work, health habits, service, and daily routine.", "The human role is the person who notices the missed detail, unfinished task, symptom, or coworker needing help.", "Evidence should show a task list, meal, commute, appointment, work shift, or household chore.", "A second example should show stress following the person after the task should be over.", "A third example should show the instinct to repair what is not working.", "Over time, small problems can reorganize the entire day.", "The strength is practical responsiveness and useful care.", "The complication is treating every flaw as urgent.", "The reader should recognize when helpfulness becomes a day controlled by problems.", "Do not diagnose illness, prescribe treatment, or assume employment conditions."],
  7: ["The Moon seeks emotional orientation through close relationships and direct exchange.", "The human role is the person who reads the relationship while deciding what they feel.", "Evidence should show a negotiation, check-in, shared plan, disagreement, or decision between two people.", "A second example should show another person's response changing the person's mood.", "A third example should show care expressed through cooperation or adjustment.", "Over time, partnership becomes a primary place where emotional patterns become visible.", "The strength is responsiveness to another person's needs.", "The complication is losing track of one's own position while keeping the relationship steady.", "The reader should recognize how quickly a close relationship enters their emotional process.", "Do not assume marriage, dating status, dependency, or a specific partner history."],
  8: ["The Moon intensifies around trust, intimacy, shared money, and what is difficult to disclose.", "The human role is the person who notices what has not been said when the stakes are shared.", "Evidence should show a private conversation, shared bill, password, loan, secret, or boundary discussion.", "A second example should show caution before trust is extended.", "A third example should show a strong response when an agreement changes.", "Over time, emotional security depends on knowing what is shared and what remains protected.", "The strength is depth, loyalty, and attention to hidden consequences.", "The complication is reading uncertainty as evidence of betrayal before the facts are clear.", "The reader should recognize how trust changes their behavior.", "Do not assume inheritance, death, abuse, debt, sexual history, or crisis."],
  9: ["The Moon seeks emotional movement through travel, study, belief, and larger questions.", "The human role is the person who needs a wider view before a feeling makes sense.", "Evidence should show a book, class, trip, map, lecture, or conversation about belief.", "A second example should show restlessness when life feels too small or repetitive.", "A third example should show perspective changing the emotional response.", "Over time, meaning-making becomes part of recovery.", "The strength is the ability to regain hope by enlarging the frame.", "The complication is leaving the immediate feeling behind in pursuit of an explanation.", "The reader should recognize when distance or learning helps them breathe again.", "Do not assume education level, religion, travel access, immigration, or legal events."],
  10: ["The Moon's needs become visible through career, reputation, authority, and public responsibility.", "The human role is the person whose work and public role carry emotional weight.", "Evidence should show a meeting, deadline, client, performance review, public decision, or responsibility.", "A second example should show audience or authority response affecting mood.", "A third example should show private feeling managed while a public task continues.", "Over time, work experiences shape how safe and recognized the person feels.", "The strength is emotional investment in responsible public work.", "The complication is letting reputation decide what feelings are allowed.", "The reader should recognize how strongly public responsibility follows them home.", "Do not assume fame, promotion, unemployment, success, failure, or a specific profession."],
  11: ["The Moon seeks belonging through friends, groups, collective work, and future plans.", "The human role is the person who notices the group's mood and tries to keep people connected.", "Evidence should show a group chat, meeting, invitation, volunteer task, or shared plan.", "A second example should show inclusion or exclusion changing the person's mood.", "A third example should show care expressed through contribution to a group.", "Over time, belonging becomes tied to participation and shared purpose.", "The strength is emotional awareness of communities and networks.", "The complication is carrying the group's needs after everyone else has gone home.", "The reader should recognize how friendship and shared plans affect recovery.", "Do not assume popularity, isolation, activism, organizational membership, or social status."],
  12: ["The Moon's needs work behind the scenes through solitude, privacy, retreat, and unspoken feeling.", "The human role is the person who needs time alone before they can say what happened.", "Evidence should show a closed door, quiet room, private note, late hour, bath, walk, or cancelled plan.", "A second example should show feeling absorbed from an environment before it is named.", "A third example should show rest or privacy making the feeling legible.", "Over time, unprocessed emotion can accumulate out of view.", "The strength is sensitivity to what others miss and the ability to recover in solitude.", "The complication is disappearing before anyone knows support is needed.", "The reader should recognize the private rituals that help them return.", "Do not assume trauma, hospitalization, addiction, hidden enemies, spiritual gifts, or diagnosis."],
};

const QUALITY_INTENTIONS = [
  "Give the reader a recognizable human role rather than an astrology label.",
  "Use observable evidence that demonstrates the mechanism instead of decorating it.",
  "Name a lived consequence that develops through repetition.",
  "Place the complication after the strength and keep it specific.",
  "Use direct reader voice and ordinary language; do not add biography or coaching."
];

const MOON_4_BODY = "You need home to feel like a place where you can lower your guard and respond honestly. When something feels wrong there, you may act immediately: confronting the issue, rearranging the room, taking over a household problem, or leaving to clear your head. You can be fiercely protective of the people and places you consider yours.\n\nThe complication is that the reaction can arrive before you know what is underneath it. Anger may be the first feeling you recognize even when what you actually need is reassurance, privacy, or a stronger sense of safety. You recover faster when you have room to move, make a decision, and settle the problem directly.";
const MOON_6_BODY = "One small problem can take over your whole day. You notice the missed detail, the unfinished task, the physical symptom, or the coworker who suddenly needs help, and it can be hard to think about anything else until it is handled. Stress can follow you into lunch, your commute, or the hour you meant to spend resting because your mind is still running through what needs fixing. You are good at noticing what is not working and doing something about it. The harder part is knowing when the problem actually needs your attention and when your day is being reorganized around something that could have waited until tomorrow.";

const signReview = read(INPUT.signReview);
const evidence = read(INPUT.evidenceManifest);
const waveRows = [...read(INPUT.mechanismWave1).rows, ...read(INPUT.mechanismWave2).rows];
const approval = read(INPUT.mechanismApproval);
const fallback = read(INPUT.fallbackSource);

for (const source of evidence.sourceFiles) {
  const bytes = fs.readFileSync(p(source.path));
  if (sha256(bytes) !== source.sha256 || bytes.length !== source.byteLength) throw new Error(`Compatibility source drift: ${source.path}`);
}

const approvedByKey = new Map(approval.decisions.filter((row) => row.decision === "approve_internal_mechanism").map((row) => [row.runtimeKey, row]));
const mechanismByKey = new Map(waveRows.map((row) => [row.runtimeKey, row]));
const bridgeByHouse = new Map(fallback.hookRows.filter((row) => /^fallback-hook\/house-meaning\/\d+$/u.test(row.contentKey)).map((row) => [Number(row.contentKey.split("/").at(-1)), row]));

const signRows = signReview.rows.map((row) => {
  const childhoodBlock = row.youRemovedHistorySentences.join(" ");
  const withChildhood = `${row.youCandidate} ${childhoodBlock}`;
  const check = validateCopy(row.youCandidate, { family: "natal-placement", register: "second_person", surface: "natal-placement", plan: { sign: row.sign } });
  return {
    ...row,
    childhoodBlock,
    childhoodBlockSha256: sha256(childhoodBlock),
    withChildhoodCandidate: withChildhood,
    withChildhoodCandidateSha256: sha256(withChildhood),
    deterministicPrecheck: check.violations,
    candidateReadiness: check.violations.length ? "evidence_only_requires_surgical_revision" : "ready_for_owner_reader_copy_review",
    ownerSignVerdict: "",
    ownerSignEdit: "",
    ownerChildhoodDecision: "",
    ownerChildhoodEdit: "",
  };
});

const houseRows = Array.from({ length: 12 }, (_, index) => index + 1).map((house) => {
  const runtimeKey = `moon|${ordinal(house)} house`;
  const mechanism = mechanismByKey.get(runtimeKey);
  const decision = approvedByKey.get(runtimeKey);
  const bridge = bridgeByHouse.get(house);
  if (!mechanism || !decision || !bridge) throw new Error(`Missing Moon house authority for ${runtimeKey}`);
  if (mechanism.proposedAstrologySupportSha256 !== decision.proposedAstrologySupportSha256) throw new Error(`Mechanism hash mismatch: ${runtimeKey}`);
  const calibrationBody = house === 4 ? MOON_4_BODY : house === 6 ? MOON_6_BODY : "";
  const renderedCalibration = calibrationBody ? `${bridge.body_you}\n\n${calibrationBody}` : "";
  return {
    runtimeKey,
    house,
    bridgeContentKey: bridge.contentKey,
    bridge: bridge.body_you,
    bridgeSha256: sha256(bridge.body_you),
    mechanism: mechanism.proposedAstrologySupport,
    mechanismSha256: mechanism.proposedAstrologySupportSha256,
    sourceEvidenceSha256: mechanism.sourceEvidenceSha256,
    mechanismOwnerDecision: decision.decision,
    argumentCore: HOUSE_ARGUMENTS[house],
    argumentCoreSha256: sha256(JSON.stringify(HOUSE_ARGUMENTS[house])),
    qualityIntentions: QUALITY_INTENTIONS,
    ownerArgumentVerdict: "",
    ownerArgumentEdit: "",
    calibrationBody,
    calibrationBodySha256: calibrationBody ? sha256(calibrationBody) : "",
    renderedCalibration,
    renderedCalibrationSha256: renderedCalibration ? sha256(renderedCalibration) : "",
    calibrationStatus: calibrationBody ? "needs_exact_owner_reader_copy_review" : "blocked_pending_argument_approval_and_authoring",
  };
});

const renderRows = signRows.flatMap((sign) => houseRows.map((house) => {
  const available = Boolean(house.calibrationBody);
  const noChildhood = available ? `${sign.intro}\n\n${sign.youCandidate}\n\n${house.renderedCalibration}` : "";
  const withChildhood = available ? `${sign.intro}\n\n${sign.withChildhoodCandidate}\n\n${house.renderedCalibration}` : "";
  return {
    renderKey: `${sign.runtimeKey}|${house.house}`,
    signKey: sign.runtimeKey,
    houseKey: house.runtimeKey,
    renderStatus: available ? "calibration_only_needs_review" : "blocked_pending_house_argument_approval",
    noChildhood,
    noChildhoodSha256: noChildhood ? sha256(noChildhood) : "",
    withChildhood,
    withChildhoodSha256: withChildhood ? sha256(withChildhood) : "",
  };
}));

const artifact = {
  schema: "tldr-natal-moon-authoring-readiness/v2",
  createdAt: "2026-08-20",
  governance: {
    compatibilitySourcesReadOnly: true,
    approvedInternalMechanismsOnly: true,
    houseArgumentsRequireOwnerApprovalBeforeDrafting: true,
    childhoodDecisionSeparate: true,
    readerCopyApproved: false,
    servingChanges: false,
    friendCandidates: false,
    autoPublish: false,
    writerPromotion: false,
  },
  authority: {
    combinedPlan: "packages/astro-knowledge/review/natal-chart-writing-completion-and-publishing-plan-2026-08-20.md",
    bridgeRuling: "tldr-astro-phrasebank/TLDR-NATAL-HOUSE-BRIDGE-RULING-OWNER.md",
    mechanismRuling: "tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER.md",
    mechanismApproval: INPUT.mechanismApproval,
  },
  sourceFiles: evidence.sourceFiles,
  counts: {
    signRows: signRows.length,
    houseRows: houseRows.length,
    approvedHouseMechanisms: houseRows.filter((row) => row.mechanismOwnerDecision === "approve_internal_mechanism").length,
    houseArgumentVerdicts: 0,
    calibrationHouseBodies: houseRows.filter((row) => row.calibrationBody).length,
    renderRows: renderRows.length,
    calibrationRenders: renderRows.filter((row) => row.renderStatus === "calibration_only_needs_review").length,
    blockedRenders: renderRows.filter((row) => row.renderStatus.startsWith("blocked")).length,
    signRowsPassingDeterministicPrecheck: signRows.filter((row) => row.deterministicPrecheck.length === 0).length,
  },
  signRows,
  houseRows,
  renderRows,
};

fs.writeFileSync(p(OUTPUT), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Built ${OUTPUT}: ${artifact.counts.signRows} signs, ${artifact.counts.houseRows} approved mechanisms, ${artifact.counts.calibrationRenders} calibration renders, ${artifact.counts.blockedRenders} correctly blocked renders.`);
