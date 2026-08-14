#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const outlineRecord = JSON.parse(fs.readFileSync(
  path.join(reviewRoot, "venus-libra-fast-mover-argument-outline-v2.json"),
  "utf8"
));
const source = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"),
  "utf8"
));
const baseline = source.rows.find((row) => row.contentKey === "fallback-hook/sky-sign-copy/venus/libra");
const engineFacts = JSON.parse(fs.readFileSync(
  path.join(reviewRoot, "venus-libra-engine-facts-2026-08-13.json"),
  "utf8"
));
if (!baseline || baseline.review_status !== "approved") throw new Error("Approved Venus in Libra source row is unavailable.");
if (outlineRecord.argumentOutline?.ownerApproved !== true) throw new Error("Venus in Libra v2 argument outline is not owner-approved.");

const approvedPlan = outlineRecord.meaningPlan;
const preservedOpening = "After moving through Virgo from July 9 to August 6, Venus enters Libra and the focus shifts from what needs fixing to how two people make a choice together. Venus governs relationships, creativity, attraction, and what we value. Venus rules Libra, so compromise comes easily here. You can see both sides, find the middle ground, and make an arrangement work without much friction. That is useful until your own preference disappears somewhere inside the compromise.";
const preservedTensionOpening = "The cost appears when keeping the agreement easy matters more than saying what you actually want. You ask what works for everyone else first, then shape your answer around what is left.";
const preservedClose = baseline.close;
const meaningInput = {
  contentType: approvedPlan.content_type,
  object: approvedPlan.object,
  sign: approvedPlan.sign,
  objectFunction: approvedPlan.objectFunction,
  signMechanics: approvedPlan.signMechanics,
  coreTension: approvedPlan.coreTension,
  likelyObservableBehaviors: approvedPlan.likelyObservableBehaviors,
  likelyConsequences: approvedPlan.likelyConsequences,
  risks: approvedPlan.risks,
  allowedLivedDomains: approvedPlan.allowedLivedDomains
};
const request = {
  meaningInput,
  task: [
    "PARTIAL REWRITE ONLY. Return exactly one JSON field named development. Write only the replacement lived section. Do not return or regenerate the opening, tension, or close.",
    "Spine slots are semantic checks, not sentence templates. CUT the job sentence entirely and do not replace it. The protected first paragraph already carries the transit's job. Do not announce 'the job of,' 'this is a period for,' or 'the collective lesson is.'",
    "The harness assembles your development between three byte-protected owner-authored fields after the call. You have no authority to alter those fields.",
    "Keep the approved argument recorded in the outline, but discard the old Venus article's voice. The old article is not a register model or positive evidence.",
    "HARD REGISTER REQUIREMENT: speak directly to the reader using you/your under the 2026-08-12 sky-page ruling. Third-person observations may appear inside lived scenes, but the page must address the reader's life.",
    "Use the Saturn in Capricorn register-gold page as the PRIMARY model for register and scene specificity. The other owner passages are supporting voice evidence, not equal concreteness models.",
    "Replace the failed single website scenario with two or three quick concrete situations drawn primarily from the approved Venus in Libra house-core scene evidence. Name the actual decision, the actual cost, and the actual follow-up work across the situations. No niche professional scenario may carry the article.",
    "Remove the sentence 'A real compromise needs two stated positions.' Express any necessary consequence without an empty intensifier and without copying the sentence into a new form.",
    "The page's one allowed negation-pivot budget is already spent by the protected tension opening. Use zero further negation pivots. Do not use 'X is not Y. It is Z.,' 'the problem is not,' 'X is not the problem,' or 'not X but Y.' State consequences directly.",
    "Use {{exitDate}} once in the protected close. Do not introduce any other placeholders.",
    "Do not add a retrograde look-back, an era or recurrence layer, romance as the default, a dinner scene, a scheduling scene, a house interpretation, a tip list, headings, or aspect copy.",
    "The prose is unapproved and will be shown to the owner exactly once for a cold read.",
    `PROTECTED OPENING — BYTE-EXACT\n${preservedOpening}`,
    `PROTECTED TENSION OPENING — BYTE-EXACT\n${preservedTensionOpening}`,
    `PROTECTED APPROVED CLOSE — BYTE-EXACT\n${preservedClose}`
  ].join("\n\n"),
  family: "fast-mover-article",
  register: "second_person",
  surface: "sky-placement-page",
  engineFacts,
  argumentSource: {
    contentKey: baseline.contentKey,
    sourcePath: "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json",
    authority: "exact-current-owner-approved",
    ownerApproved: true,
    permittedUse: "argument-and-close-only-not-voice-evidence",
    opening: baseline.opening,
    tension: baseline.tension,
    development: baseline.development,
    close: baseline.close
  },
  argumentInput: Object.fromEntries([
    "thesis",
    "cultural_rule",
    "transit_job",
    "failure_mechanism",
    "lived_scene_1",
    "lived_scene_2",
    "lived_scene_3",
    "strategy",
    "intended_close",
    "scope_guard"
  ].map((key) => [key, outlineRecord.argumentOutline[key]])),
  approvedArgumentOutline: outlineRecord.argumentOutline,
  partialRewrite: {
    mode: "lived-section-only",
    generatedFields: ["development"],
    protectedFields: {
      opening: preservedOpening,
      tension: preservedTensionOpening,
      close: preservedClose
    },
    jobSentence: "cut-without-replacement",
    websiteScenario: "remove",
    emptyIntensifierSentence: "remove"
  },
  reservedNegationPivots: 1,
  expectedPlaceholders: ["exitDate"],
  protectedOwnerLines: [preservedOpening, preservedTensionOpening, preservedClose],
  literalEvidenceRequirements: {
    field: "development",
    forbiddenAbstractPlaceholders: ["one collaboration", "one person", "the other"],
    requiredConceptTerms: {
      decision: ["decision", "decisions", "choose", "chooses", "chosen", "choice", "choices", "agree", "agreed", "preference", "preferences", "approve", "option", "options"],
      cost: ["cost", "costs", "pay", "paid", "money", "fee", "fees", "bill", "bills", "hour", "hours", "time", "workload", "extra work", "budget", "expense", "expenses"],
      follow_up_work: ["follow-up", "follow up", "revision", "revisions", "correction", "corrections", "reminder", "reminders", "invoice", "invoices", "message", "messages", "email", "emails", "draft", "drafts", "redo", "finish", "fix", "update", "updates"]
    }
  },
  additionalOwnerEvidenceSourceIds: ["owner-article:libra-season-autumn-equinox:p095"],
  preferredEvidenceContentKeys: [
    "owner-article:libra-season-autumn-equinox:p016",
    "owner-article:libra-season-autumn-equinox:p095"
  ],
  excludedEvidenceContentKeys: [
    baseline.contentKey,
    "owner-article:gemini-season-2025:p018"
  ],
  models: {
    writer: {
      provider: "openai",
      model: "gpt-5.6-sol",
      reasoningEffort: "xhigh",
      maxOutputTokens: 12000
    }
  },
  governance: {
    authorization: "I authorize exactly one billed Sol-xhigh Venus in Libra partial-rewrite call, capped at 12,000 output tokens, with no Terra and no retries.",
    authorizedCalls: 1,
    nextAuthorizationRequired: null,
    estimatedCalls: 1,
    reviewerCalls: 0,
    retries: 0,
    stagingAuthorized: false,
    servingAuthorized: false,
    retrogradeLookbackAuthorized: false,
    partialRewriteOnly: true,
    spineSlotsAreChecksNotTemplates: true
  }
};

const outPath = path.join(reviewRoot, "venus-libra-v2-rewrite-request-pending.json");
fs.writeFileSync(outPath, `${JSON.stringify(request, null, 2)}\n`);
console.log(outPath);
