#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import { validateCopy } from "../../../src/astro-writing/validateCopy.mjs";

const READINESS_PATH = "packages/astro-knowledge/review/natal-moon-authoring-readiness-v2.json";
const APPROVAL_PATH = "packages/astro-knowledge/review/natal-moon-house-argument-owner-approval-2026-08-20.json";
const OUTPUT_PATH = "packages/astro-knowledge/review/natal-moon-final-rendered-review-v3.json";
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const HOUSE_BODIES = {
  1: "People usually know how you feel before you have decided what to say about it. Your face changes, your voice sharpens or softens, or you start moving before the room has caught up. When a plan stalls, you may be the first person to react, name the problem, or change direction. That immediacy makes you responsive and easy to read. It can also make the first feeling look more final than it is. You do better when you give the reaction a minute to become information before letting it decide what happens next.",
  2: "You relax more easily when the basics are handled and the things you rely on are where you expect them to be. A paid bill, a stocked fridge, a familiar blanket, or enough money left after the week's expenses can change your mood more than a vague promise that everything will work out. You are good at noticing what needs to be maintained and protecting what matters. The complication begins when uncertainty makes you hold too tightly to money, objects, food, or a routine that has stopped helping. Security matters, but it works best when it supports your life instead of narrowing it.",
  3: "You often understand a feeling by talking through it, writing it down, or moving through the ordinary errands of the day. A message that sounds different, a question left unanswered, or a conversation that ends too quickly can stay on your mind until you know what changed. You notice tone and timing before many people do, and putting the details into words can help you decide what you need. The complication is that you can keep asking, explaining, or collecting information after the feeling is already clear. Sometimes the useful answer arrives when you stop the conversation long enough to hear your own reaction.",
  4: "You need home to feel like a place where you can lower your guard and respond honestly. When something feels wrong there, you may act immediately: confronting the issue, rearranging the room, taking over a household problem, or leaving to clear your head. You can be fiercely protective of the people and places you consider yours. The complication is that the reaction can arrive before you know what is underneath it. Anger may be the first feeling you recognize even when what you actually need is privacy, a clear answer, or a stronger sense of safety. You recover faster when you have room to move, make a decision, and deal with the problem directly.",
  5: "Your mood lifts when you have something to make, enjoy, perform, or share. You may reach for a sketchbook, a playlist, a game, a date, or a joke when the day has become too heavy. Being received matters too. A warm response can bring you back to yourself, while silence after you offer something personal can land harder than you expected. You have a generous instinct for making life more expressive and enjoyable. The complication is treating attention as proof that you are cared for. Play and creativity restore you most reliably when they are allowed to matter even before anyone applauds.",
  6: "One small problem can take over your whole day. You notice the missed detail, the unfinished task, the physical symptom, or the coworker who suddenly needs help, and it can be hard to think about anything else until it is handled. Stress can follow you into lunch, your commute, or the hour you meant to spend resting because your mind is still running through what needs fixing. You are good at noticing what is not working and doing something about it. The harder part is knowing when the problem actually needs your attention and when your day is being reorganized around something that could have waited until tomorrow.",
  7: "Close relationships have a direct line to your mood. A changed tone, an unreturned message, or a plan made without you can affect the rest of your day, even when everything else is going well. You are quick to notice what another person needs and may adjust the schedule, reopen the conversation, or offer a compromise before they ask. That responsiveness can make you a thoughtful partner and a careful negotiator. The complication is losing track of your own position while you work to keep the relationship intact. Cooperation helps most when both people are allowed to have a clear answer.",
  8: "Trust changes what you reveal, what you share, and how closely you watch the details. A private conversation, a shared bill, a password, or a promise about money can carry more emotional weight for you than it appears to carry on the surface. You notice when an agreement shifts or when someone avoids the part of the story that matters. That attention can make you loyal and careful with other people's vulnerabilities. The complication is deciding that uncertainty means betrayal before you have the full account. You feel safer when shared responsibilities and private boundaries are named clearly instead of left for you to infer.",
  9: "When life starts feeling small, your mood often improves once you have somewhere larger to point your attention. A book, a class, a long conversation, a trip, or even planning where you want to go next can help you understand what the current moment means. You recover by finding perspective and remembering that today's problem is not the whole story. That instinct can restore hope quickly. The complication is reaching for the explanation before you have dealt with the immediate feeling. A larger view helps most when it brings you back to the life in front of you instead of carrying you away from it.",
  10: "Work can follow you home because public responsibility carries emotional weight for you. A meeting that went well, a client who went quiet, a deadline, or a comment from someone in charge can change how you feel long after the workday ends. You care about doing something useful and being known as someone who can be trusted with responsibility. That investment can make you attentive and dependable in visible roles. The complication is letting reputation decide which feelings you are allowed to show. You need a private place where a difficult day can simply be difficult before it becomes a judgment about your future.",
  11: "You notice quickly when a group chat changes tone, an invitation does not arrive, or a shared plan starts moving without you. Friendship and belonging are not background details for you; they affect how hopeful and connected you feel. You may be the person who checks in, organizes the meeting, remembers who has gone quiet, or keeps a future plan alive. That awareness helps groups hold together. The complication is carrying everyone's needs after the conversation has ended. Community supports you best when contribution moves in more than one direction and you are not responsible for keeping every person connected.",
  12: "You need more private time than people may realize. A closed door, a quiet room, a long bath, a late walk, or a cancelled plan can give you enough space to understand what you absorbed during the day. Feelings may arrive without a clear label, especially after crowded rooms or emotionally charged conversations. Solitude helps you separate your own reaction from everything you noticed around you. The complication is disappearing before anyone knows you need support. Privacy restores you, but it works best when at least one trusted person knows how to reach you and when you plan to return.",
};

const readiness = JSON.parse(fs.readFileSync(READINESS_PATH, "utf8"));
const approval = JSON.parse(fs.readFileSync(APPROVAL_PATH, "utf8"));
const decisionByKey = new Map(approval.decisions.map((row) => [row.runtimeKey, row]));

if (approval.scope.readerCopyApproved || approval.scope.servingAuthorized) throw new Error("Argument approval cannot authorize reader copy or serving.");

const houseRows = readiness.houseRows.map((row) => {
  const decision = decisionByKey.get(row.runtimeKey);
  if (!decision || decision.decision !== "approve_argument_core_for_drafting_only") throw new Error(`Missing drafting approval: ${row.runtimeKey}`);
  if (decision.argumentCoreSha256 !== row.argumentCoreSha256) throw new Error(`Stale argument core: ${row.runtimeKey}`);
  const body = HOUSE_BODIES[row.house];
  const rendered = `${row.bridge}\n\n${body}`;
  const check = validateCopy(rendered, {
    family: "natal-placement",
    register: "second_person",
    surface: "natal-placement",
    plan: { house: row.house },
    protectedOwnerLines: [row.bridge],
  });
  return {
    ...row,
    argumentOwnerDecision: decision.decision,
    body,
    bodySha256: sha256(body),
    rendered,
    renderedSha256: sha256(rendered),
    wordCount: rendered.split(/\s+/u).filter(Boolean).length,
    deterministicPrecheck: check.violations,
    reviewStatus: "needs_review",
    ownerReaderCopyVerdict: "",
    ownerReaderCopyEdit: "",
  };
});

const signRows = readiness.signRows.map((row) => ({
  runtimeKey: row.runtimeKey,
  sign: row.sign,
  intro: row.intro,
  introSha256: row.introSha256,
  body: row.youCandidate,
  bodySha256: row.youCandidateSha256,
  childhoodStatus: "excluded_from_current_batch_preserved_for_later_review",
  childhoodBlock: row.childhoodBlock,
  childhoodBlockSha256: row.childhoodBlockSha256,
  deterministicPrecheck: row.deterministicPrecheck,
  reviewStatus: "needs_review",
  ownerReaderCopyVerdict: "",
  ownerReaderCopyEdit: "",
}));

const renderRows = signRows.flatMap((sign) => houseRows.map((house) => {
  const rendered = `${sign.intro}\n\n${sign.body}\n\n${house.rendered}`;
  const check = validateCopy(rendered, {
    family: "natal-placement",
    register: "second_person",
    surface: "natal-placement",
    plan: { sign: sign.sign, house: house.house },
    protectedOwnerLines: [house.bridge],
  });
  return {
    renderKey: `${sign.runtimeKey}|${house.house}`,
    signKey: sign.runtimeKey,
    houseKey: house.runtimeKey,
    rendered,
    renderedSha256: sha256(rendered),
    wordCount: rendered.split(/\s+/u).filter(Boolean).length,
    deterministicPrecheck: check.violations,
    reviewStatus: "needs_review",
    ownerRenderedVerdict: "",
    ownerRenderedEdit: "",
  };
}));

const result = {
  schema: "tldr-natal-moon-final-rendered-review/v3",
  createdAt: "2026-08-20",
  governance: {
    argumentCoresOwnerApprovedForDrafting: true,
    childhoodExcludedAndPreserved: true,
    finishedRenderedSamplesRequireOwnerApproval: true,
    readerCopyApproved: false,
    servingChanges: false,
    compatibilityChanges: false,
    friendCandidates: false,
    autoPublish: false,
    writerPromotion: false,
  },
  authority: {
    draftingApproval: APPROVAL_PATH,
    readinessArtifact: READINESS_PATH,
  },
  counts: {
    signRows: signRows.length,
    houseRows: houseRows.length,
    renderedSamples: renderRows.length,
    childhoodBlocksExcluded: signRows.length,
    deterministicFailures: [...signRows, ...houseRows, ...renderRows].filter((row) => row.deterministicPrecheck.length).length,
    ownerReaderCopyVerdicts: 0,
    servingRowsChanged: 0,
  },
  signRows,
  houseRows,
  renderRows,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Built ${renderRows.length} Moon rendered samples; ${result.counts.deterministicFailures} deterministic failures; reader copy remains review-gated.`);
