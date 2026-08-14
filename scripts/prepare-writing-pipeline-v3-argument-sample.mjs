#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWritingPipeline } from "../src/astro-writing/runWritingPipeline.mjs";
import { approveArgumentOutline } from "../src/astro-writing/argumentGate.mjs";
import { selectOwnerCorrectionPairs, deduplicateOwnerCorrections } from "../src/astro-writing/selectOwnerCorrectionPairs.mjs";
import { missingContentSpines } from "../src/astro-writing/spineRegistry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const jsonl = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const allCorrections = deduplicateOwnerCorrections([
  ...jsonl("data/writing/owner-corrections.jsonl"),
  ...jsonl("data/writing/owner-feedback-corpus.jsonl")
]);
const meaningInput = {
  contentType: "placement_article",
  object: "venus",
  sign: "libra",
  objectFunction: "Venus governs relationships, creativity, attraction, and what is valued.",
  signMechanics: "Libra notices balance, exchange, connection, and how a shared choice is made.",
  coreTension: "Agreement can look fair while one side keeps adjusting.",
  likelyObservableBehaviors: [
    "A preference is withheld until everyone else has answered.",
    "A shared cost or responsibility stays uneven because naming the exact difference feels impolite.",
    "A connection changes once both sides can state what they want without punishment."
  ],
  likelyConsequences: [
    "The clearest voice makes the decision while the more accommodating side absorbs the cost.",
    "Resentment grows inside an arrangement that still looks calm.",
    "Honesty shows which connections can hold an actual preference."
  ],
  risks: ["Fairness is reduced to avoiding disagreement."],
  allowedLivedDomains: ["relationships", "work", "money", "creative decisions", "access"]
};
const argumentInput = {
  thesis: "Add why the existing imbalance can be hard to notice: Venus works easily in Libra, so smooth agreement can look complete before both preferences are known.",
  cultural_rule: "Do not replace the approved fairness argument; add only the assumption that an easy agreement must be a fair one.",
  transit_job: "Add a condition-based test of Venus in Libra's home-ground skill: can the connection stay easy after both sides state what they actually want?",
  failure_mechanism: "Clarify the existing mechanism by showing skill at compromise becoming automatic adjustment before anyone asks for it.",
  lived_scene_1: "Consolidate the approved shared-decision material into one collaboration where one side waits for the other preference before naming its own.",
  lived_scene_2: "Continue the same collaboration when the accommodating side absorbs the follow-up work or cost required to keep the agreement easy.",
  lived_scene_3: "Finish the same sequence when the withheld preference is stated and the other side's response shows whether the connection can hold honesty.",
  strategy: "Add one strategic bias inside the article: state the preference before smoothing the arrangement; do not add a tip list.",
  intended_close: "Keep the approved close's consequence rather than adding a second moral: the arrangement strains when the person who kept agreeing stops accepting what they do not want.",
  scope_guard: "Retain the existing one-sentence handoff; add no slow-mover contrast paragraph, romance default, dinner or scheduling scene, seventh-house substitution, or retrograde look-back.",
  planet_quality_intent: "Show Venus through a choice, cost, or follow-up consequence rather than a keyword list.",
  condition_quality_intent: "Explain Venus ruling Libra through consequence and use the scales to interpret how adjustment is measured.",
  handoff_quality_intent: "Name the shift from fixing in Virgo to making a shared choice in Libra after the dates.",
  thesis_quality_intent: "Name the easy-agreement rule and the person who benefits when the more accommodating side keeps adjusting.",
  lived_evidence_quality_intent: "Use two or three short situations with an actual choice, cost, and follow-up task plus one pull-quote line.",
  failure_mechanism_quality_intent: "Show the reader withholding a preference and then absorbing the resulting cost or work.",
  strategy_quality_intent: "Use at least two short imperatives that state the preference and divide the follow-up work.",
  close_quality_intent: "End on the consequence without may, might, can, or a date-bound escape."
};

const servingSource = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"
), "utf8"));
const approvedBaseline = servingSource.rows.find((row) => row.contentKey === "fallback-hook/sky-sign-copy/venus/libra");
if (!approvedBaseline || approvedBaseline.review_status !== "approved") throw new Error("Approved Venus in Libra baseline not found.");
const baselineBodyHash = sha256(approvedBaseline.body_you);

const result = await runWritingPipeline({
  meaningInput,
  examples: [],
  corrections: allCorrections,
  task: "Write a Venus in Libra fast-mover sky placement article.",
  family: "fast-mover-article",
  register: "collective",
  surface: "sky-placement-page",
  argumentInput
});
if (result.status !== "argument-review-pending" || result.draft !== null) throw new Error("Argument sample crossed the drafting gate.");
if (result.spine?.id !== "sky-placement-article-fast-mover-v1" || result.spine?.status !== "recorded") throw new Error("Approved fast-mover spine was not applied.");
const approvedArgumentOutline = approveArgumentOutline(result.argumentOutline, {
  exactOwnerRuling: "Venus in Libra v2 outline approved."
});

const selectedPairs = selectOwnerCorrectionPairs(allCorrections, {
  family: "fast-mover-article",
  count: 8,
  failureCategories: [
    "natural_language",
    "constructed_sentence",
    "abstraction_over_consequence",
    "register_consistency",
    "synonym_redundancy"
  ]
});
const addsToExistingApprovedArticle = [
  "Adds the home-ground condition: Venus rules Libra, so its relational tools operate easily and that ease can hide an incomplete agreement.",
  "Keeps the existing handoff exactly as the light one-sentence opening move required by the approved spine.",
  "Turns the existing list of decision, expense, and relationship examples into one continuous collaboration sequence.",
  "Adds a strategy inside the argument: state the preference before smoothing the arrangement.",
  "Keeps the existing consequence at the close instead of adding another summary or moral."
];
const doesNotAdd = [
  "No new fairness thesis.",
  "No slow-mover era, recurrence, or handoff paragraph.",
  "No romance, dinner-plan, or scheduling default.",
  "No retrograde look-back. The separate degree-matched proposal is unapproved and excluded from this writer packet."
];

fs.mkdirSync(reportRoot, { recursive: true });
const outlineJsonPath = path.join(reportRoot, "venus-libra-fast-mover-argument-outline-v2.json");
const outlineMarkdownPath = path.join(reportRoot, "venus-libra-fast-mover-argument-outline-v2.md");
fs.writeFileSync(outlineJsonPath, `${JSON.stringify({
  target: "venus-in-libra",
  version: "v4-reissued-against-sky-placement-article-fast-mover-v1",
  status: "argument-approved-prose-not-drafted",
  proseDrafted: false,
  billedCalls: 0,
  existingApprovedArticle: {
    contentKey: approvedBaseline.contentKey,
    reviewStatus: approvedBaseline.review_status,
    bodySha256: baselineBodyHash,
    source: "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"
  },
  addsToExistingApprovedArticle,
  doesNotAdd,
  meaningPlan: result.plan,
  argumentOutline: approvedArgumentOutline,
  spine: result.spine,
  selectedCorrectionPairsForFuturePrompt: selectedPairs
}, null, 2)}\n`);

fs.writeFileSync(outlineMarkdownPath, `# Venus in Libra fast-mover argument outline, v2

Status: **argument-approved; prose not drafted**  
Spine: **sky-placement-article-fast-mover-v1, owner-approved**  
Prose drafted: **no**  
Billed calls: **0**

Existing approved article: \`${approvedBaseline.contentKey}\`  
Existing approved body SHA-256: \`${baselineBodyHash}\`

## What this outline adds to the existing approved article

${addsToExistingApprovedArticle.map((item) => `- ${item}`).join("\n")}

## What it does not add

${doesNotAdd.map((item) => `- ${item}`).join("\n")}

## Ten-line argument outline

1. **Thesis:** ${argumentInput.thesis}
2. **Cultural rule:** ${argumentInput.cultural_rule}
3. **Job of the transit:** ${argumentInput.transit_job}
4. **Failure mechanism:** ${argumentInput.failure_mechanism}
5. **Lived scene 1:** ${argumentInput.lived_scene_1}
6. **Lived scene 2:** ${argumentInput.lived_scene_2}
7. **Lived scene 3:** ${argumentInput.lived_scene_3}
8. **Strategy:** ${argumentInput.strategy}
9. **Intended close:** ${argumentInput.intended_close}
10. **Scope guard:** ${argumentInput.scope_guard}

## Eight spine-quality intentions

1. **Planet:** ${argumentInput.planet_quality_intent}
2. **Condition:** ${argumentInput.condition_quality_intent}
3. **Handoff:** ${argumentInput.handoff_quality_intent}
4. **Thesis:** ${argumentInput.thesis_quality_intent}
5. **Lived evidence:** ${argumentInput.lived_evidence_quality_intent}
6. **Failure mechanism:** ${argumentInput.failure_mechanism_quality_intent}
7. **Strategy:** ${argumentInput.strategy_quality_intent}
8. **Close:** ${argumentInput.close_quality_intent}

Outline SHA-256: \`${approvedArgumentOutline.approvedOutlineHash}\`

## Spine trace

1. **Planet:** retain the existing brief Venus education.
2. **Condition:** add that Venus rules Libra and explain the practical consequence of that ease.
3. **Handoff:** retain the existing one opening sentence with prior-sign dates.
4. **Job:** add the test of whether the connection remains easy after both preferences are stated.
5. **Thesis:** preserve the approved fairness argument; add only the home-ground distinction.
6. **Lived evidence:** consolidate the existing material into one collaboration sequence.
7. **Failure:** clarify automatic adjustment as the failure mechanism.
8. **Strategy:** state the preference before smoothing the arrangement.
9. **Close:** preserve the approved consequence without stacking another ending.

Owner approval recorded verbatim: **“Venus in Libra v2 outline approved.”**

This approval allows a later, separately authorized writer call to fill the approved spine.
It does not approve prose, staging, serving, or a model prose judgment.
`);

console.log(JSON.stringify({
  outline: path.relative(repoRoot, outlineMarkdownPath),
  outlineHash: approvedArgumentOutline.approvedOutlineHash,
  existingApprovedBodyHash: baselineBodyHash,
  spine: result.spine.id,
  combinedCorrectionCount: allCorrections.length,
  selectedCorrectionPairs: selectedPairs.pairs.length,
  missingSpines: missingContentSpines(),
  billedCalls: 0
}, null, 2));
