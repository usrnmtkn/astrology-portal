#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/empty-house-v14");
const canonicalPath = path.join(reviewRoot, "empty-house-v14-owner-approved-rows.json");
const friendReviewPath = path.join(reviewRoot, "empty-house-v14-friend-variants-review.json");
const approvalPath = path.join(reviewRoot, "friend-variant-approval-record.json");
const importManifestPath = path.join(reviewRoot, "import-manifest.json");
const projection3FlagsPath = path.join(reviewRoot, "body-they-flagged-for-owner.json");
const projection4CorrectionsPath = path.join(reviewRoot, "body-they-corrections.json");
const projection4DecisionAidPath = path.join(reviewRoot, "body-they-decision-aid.json");
const authoredInputPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/empty-house-v14-modern-v1.json"
);
const sourceRowsPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
const promote = process.argv.includes("--promote");
const hookPrefix = "fallback-hook/empty-house/";
const expectedCounts = {
  empty_house_essay: 12,
  empty_house_sign: 144,
  empty_house_ruler_generic: 121,
  empty_house_ruler_house1_specific: 132,
  empty_house_ruler_planet_example: 132,
  principle: 9,
};
const modernRulers = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "pluto",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "uranus",
  pisces: "neptune",
};
const tierByCategory = {
  empty_house_essay: "base",
  empty_house_sign: "sign",
  empty_house_ruler_generic: "generic",
  empty_house_ruler_house1_specific: "house1_sign_planet",
  empty_house_ruler_planet_example: "planet_example",
};
const projection3BodyTheyDigest = "74e0052ee3c3ce8660b22317b328ad46b01adb97a23e42e1ec48e4ad28f5568d";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stablePayload = (rows) => JSON.stringify(rows.map(({ corpus_key, body_they }) => ({ corpus_key, body_they })));
const ordinal = (house) => house === 1 ? "1st" : house === 2 ? "2nd" : house === 3 ? "3rd" : `${house}th`;

function contentKey(entry) {
  const sign = entry.sign?.toLowerCase();
  const rulerPlanet = entry.ruler_planet?.toLowerCase();
  if (entry.category === "empty_house_essay") {
    return `${hookPrefix}base/${entry.house}`;
  }
  if (entry.category === "empty_house_sign") {
    return `${hookPrefix}sign/${entry.house}/${sign}`;
  }
  if (entry.category === "empty_house_ruler_generic") {
    return `${hookPrefix}ruler-house/${entry.house}/${entry.ruler_house}`;
  }
  if (entry.category === "empty_house_ruler_house1_specific") {
    return `${hookPrefix}rising-ruler/${sign}/${rulerPlanet}/${entry.ruler_house}`;
  }
  if (entry.category === "empty_house_ruler_planet_example") {
    return `${hookPrefix}ruler-planet/${entry.house}/${rulerPlanet}/${entry.ruler_house}`;
  }
  throw new Error(`No serving key mapping for ${entry.key}.`);
}

const objectPrepositions = [
  "about", "above", "across", "against", "alongside", "among", "around", "at",
  "behind", "below", "beneath", "beside", "between", "beyond", "by", "for", "from", "including",
  "in", "inside", "into", "near", "of", "off", "on", "onto", "outside", "over", "past", "through",
  "to", "toward", "towards", "under", "underneath", "with", "within", "without"
];
const objectVerbs = [
  "add", "adds", "affect", "affects", "allow", "allows", "ask", "asking", "asks", "assign", "assigned", "assigns", "benefit", "benefits",
  "bother", "bothering", "bothers", "bring", "brings", "call", "calls", "carry", "carries", "change", "changes", "challenge", "challenges",
  "choose", "chooses", "consume", "consumes", "convince", "convinces", "cost", "costs", "drain", "drains", "draw", "draws", "drop", "dropped", "drops", "excite", "excites",
  "expect", "expects", "expose", "exposes", "find", "finds", "follow", "follows", "get", "gets", "give", "gives", "giving", "ground", "grounds",
  "hand", "handing", "hands", "has", "have", "hear", "hears", "help", "helps", "hire", "hires", "introduce", "introduces", "invite", "invites",
  "keep", "keeps", "know", "knows", "leave", "leaves", "let", "lets", "like", "likes", "make", "makes", "making", "meet", "meets", "miss",
  "misses", "move", "moves", "pay", "paying", "pays", "place", "places", "protect", "protected", "protects", "prove", "proves", "proving", "pull",
  "pulling", "pulls", "push", "pushes", "put", "puts", "putting", "qualify", "qualifies", "reach", "reaches", "recommend", "recommends", "refer",
  "refers", "remember", "remembers", "remind", "reminds", "require", "requires", "requiring", "restore", "restored", "restores", "see", "sees", "send", "sends",
  "settle", "settles", "shape", "shapes", "show", "showing", "shows", "slow", "slows", "stop", "stops", "suit", "suits", "support", "supports", "following",
  "teach", "teaches", "tell", "tells", "told", "test", "tests", "throw", "throws", "transform", "transforms", "treat", "treating", "treats", "trust",
  "trusts", "turn", "turning", "turns", "watch", "watched", "watches"
];
function replaceObjectYou(text) {
  const prepositions = objectPrepositions.join("|");
  const verbs = objectVerbs.join("|");
  return text
    .replace(new RegExp(`\\b(${prepositions}) you\\b`, "giu"), (_match, prefix) => `${prefix} them`)
    .replace(new RegExp(`\\b(${verbs}) you\\b`, "giu"), (_match, verb) => `${verb} them`);
}

function repairRelativeClauseSubjects(text) {
  // The first pass deliberately favors object-case after common verbs. These
  // are the finite/relative clauses in this corpus where "you" is instead the
  // subject of the following verb.
  return text
    .replace(/\b(place) them (return|are|know|can|live|go)\b/giu, "$1 they $2")
    .replace(/\b(test) them (are)\b/giu, "$1 they $2")
    .replace(/\b(know|knows) them (are|were|have|will)\b/giu, "$1 they $2")
    .replace(/\b(prove|proves|proving) them (can|matter)\b/giu, "$1 they $2")
    .replace(/\b(places) them (have)\b/giu, "$1 they $2");
}

const projection3Corrections = {
  "empty-4th|virgo": [["calm they", "calm them"]],
  "empty-6th|gemini": [["Give themselves", "Give them"]],
  "empty-8th|pisces": [["Get the joint account, loan, medication, or other high-stakes detail clear in writing.", "They should get the joint account, loan, medication, or other high-stakes detail clear in writing."]],
  "empty-1st|leo|sun-in-2nd": [["reassuring they that", "reassuring them that"]],
  "empty-1st|leo|sun-in-4th": [["places them most want", "places they most want"]],
  "empty-1st|leo|sun-in-7th": [["places them feel", "places they feel"]],
  "empty-1st|scorpio|pluto-in-2nd": [["protected them feel", "protected they feel"]],
  "empty-1st|sagittarius|jupiter-in-2nd": [["future they pay", "future them pay"]],
  "empty-1st|aquarius|uranus-in-5th": [["interests they once", "interests them once"]],
  "empty-6th|ruler-in-2nd": [["know them earned", "know they earned"]],
  "empty-2nd|neptune-in-9th": [["point they somewhere", "point them somewhere"]],
  "empty-6th|venus-in-1st": [["experience they as", "experience them as"]],
  "empty-9th|pluto-in-10th": [["changed they enough", "changed them enough"]],
  "empty-10th|ruler-in-6th": [["earning they more work", "earning them more work"], ["earning they more room", "earning them more room"]],
  "empty-12th|saturn-in-11th": [["meeting they back", "meeting them back"]],
};

function applyProjection3Corrections(corpusKey, text) {
  let corrected = text;
  for (const [from, to] of projection3Corrections[corpusKey] ?? []) {
    if (!corrected.includes(from)) throw new Error(`${corpusKey} is missing expected projection-3 correction source: ${from}`);
    corrected = corrected.replace(from, to);
  }
  return corrected;
}

function toTheyVoice(text, corpusKey) {
  let adapted = text
    .replace(/\bYou're\b/gu, "They're")
    .replace(/\byou're\b/gu, "they're")
    .replace(/\bYou've\b/gu, "They've")
    .replace(/\byou've\b/gu, "they've")
    .replace(/\bYou'll\b/gu, "They'll")
    .replace(/\byou'll\b/gu, "they'll")
    .replace(/\bYou'd\b/gu, "They'd")
    .replace(/\byou'd\b/gu, "they'd")
    .replace(/\bYourself\b/gu, "Themselves")
    .replace(/\byourself\b/gu, "themselves")
    .replace(/\bYours\b/gu, "Theirs")
    .replace(/\byours\b/gu, "theirs")
    .replace(/\bYour\b/gu, "Their")
    .replace(/\byour\b/gu, "their");
  adapted = repairRelativeClauseSubjects(replaceObjectYou(adapted)
    .replace(/\bYou\b/gu, "They")
    .replace(/\byou\b/gu, "they"));
  return applyProjection3Corrections(corpusKey, adapted);
}

const canonicalBytes = fs.readFileSync(canonicalPath);
const canonical = JSON.parse(canonicalBytes);
const projection3Flags = JSON.parse(fs.readFileSync(projection3FlagsPath, "utf8"));
const projection4Corrections = JSON.parse(fs.readFileSync(projection4CorrectionsPath, "utf8"));
const projection4DecisionAid = JSON.parse(fs.readFileSync(projection4DecisionAidPath, "utf8"));
if (projection3Flags.source_body_they_digest_sha256 !== projection3BodyTheyDigest) {
  throw new Error("Projection-3 Friend review flags do not match the supplied body_they digest.");
}
if (projection3Flags.count !== 65 || Object.keys(projection3Flags.flags).length !== 65) {
  throw new Error("Projection-3 must retain exactly 65 owner-attention flags.");
}
if (projection4Corrections.rows?.length !== 34) {
  throw new Error("Projection-4 must contain exactly 34 owner-adopted Friend corrections.");
}
if (projection4DecisionAid.rows?.length !== 65) {
  throw new Error("Projection-4 decision aid must disposition exactly 65 flagged rows.");
}
const correctionByKey = new Map(projection4Corrections.rows.map((row) => [row.corpus_key, row]));
const decisionByKey = new Map(projection4DecisionAid.rows.map((row) => [row.corpus_key, row]));
if (correctionByKey.size !== 34 || decisionByKey.size !== 65) {
  throw new Error("Projection-4 correction and decision-aid keys must be unique.");
}
const correctionDecisions = projection4DecisionAid.rows.filter((row) => row.verdict === "corrected_wording_proposed");
const approvedAsIsDecisions = projection4DecisionAid.rows.filter((row) => row.verdict === "approve_as_is");
if (correctionDecisions.length !== 34 || approvedAsIsDecisions.length !== 31) {
  throw new Error("Projection-4 decision aid must contain 34 corrections and 31 approve-as-is dispositions.");
}
for (const decision of projection4DecisionAid.rows) {
  if (projection3Flags.flags[decision.corpus_key] !== decision.flag) {
    throw new Error(`${decision.corpus_key}: decision-aid flag does not match projection 3.`);
  }
  const correction = correctionByKey.get(decision.corpus_key);
  if (decision.verdict === "corrected_wording_proposed") {
    if (!correction || correction.contentKey !== decision.contentKey || correction.body_they !== decision.body_they_proposed) {
      throw new Error(`${decision.corpus_key}: adopted correction does not match the decision aid.`);
    }
  } else if (decision.verdict === "approve_as_is") {
    if (correction) throw new Error(`${decision.corpus_key}: approve-as-is row must not have a correction.`);
  } else {
    throw new Error(`${decision.corpus_key}: unknown decision-aid verdict ${decision.verdict}.`);
  }
}
if (canonical.schema !== "tldrastro.empty-house.rows.v14") {
  throw new Error(`Unexpected V14 schema: ${canonical.schema}.`);
}
if (JSON.stringify(canonical.ruler_policy?.sign_rulers) !== JSON.stringify(modernRulers)) {
  throw new Error("V14 modern ruler map does not match the Phase 1 contract.");
}

const keys = new Set();
for (const [category, expected] of Object.entries(expectedCounts)) {
  const actual = canonical.entries.filter((entry) => entry.category === category).length;
  if (actual !== expected) throw new Error(`Expected ${expected} ${category} rows; received ${actual}.`);
}
for (const entry of canonical.entries) {
  if (keys.has(entry.key)) throw new Error(`Duplicate V14 key: ${entry.key}.`);
  keys.add(entry.key);
  if (!entry.owner_approved || entry.governance !== canonical.governance) {
    throw new Error(`${entry.key} is not covered by V14 full-workbook approval.`);
  }
  if (entry.category.startsWith("empty_house_ruler_") && entry.house === entry.ruler_house) {
    throw new Error(`${entry.key} incorrectly places the ruler inside its empty house.`);
  }
  if (
    entry.category === "empty_house_ruler_house1_specific"
    && modernRulers[entry.sign.toLowerCase()] !== entry.ruler_planet.toLowerCase()
  ) {
    throw new Error(`${entry.key} does not match the V14 modern ruler map.`);
  }
}

const readerEntries = canonical.entries.filter((entry) => entry.category !== "principle");
const friendRows = readerEntries.map((entry) => {
  const draftedBodyThey = toTheyVoice(entry.copy_you, entry.key);
  const correction = correctionByKey.get(entry.key);
  const decision = decisionByKey.get(entry.key);
  if (decision && decision.body_they_drafted !== draftedBodyThey) {
    throw new Error(`${entry.key}: projection-4 decision aid does not match the deterministic draft.`);
  }
  const bodyThey = correction?.body_they ?? draftedBodyThey;
  const originalFlag = projection3Flags.flags[entry.key] ?? null;
  const bodyTheyFlag = correction
    ? `corrected wording adopted by owner 2026-08-10 (was: ${originalFlag})`
    : originalFlag;
  const flagDisposition = decision?.verdict === "corrected_wording_proposed"
    ? "corrected_wording_adopted"
    : decision?.verdict ?? null;
  return {
    corpus_key: entry.key,
    contentKey: contentKey(entry),
    body_you_sha256: sha256(entry.copy_you),
    body_they: bodyThey,
    body_they_sha256: sha256(bodyThey),
    review_status: "needs_review",
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    body_they_flag: bodyTheyFlag,
    flag_disposition: flagDisposition,
    flags: [],
  };
});
const friendPayloadSha256 = sha256(stablePayload(friendRows));
const dispositionCounts = {
  corrected_wording_adopted: friendRows.filter((row) => row.flag_disposition === "corrected_wording_adopted").length,
  approve_as_is: friendRows.filter((row) => row.flag_disposition === "approve_as_is").length,
  unresolved: friendRows.filter((row) => row.body_they_flag && !row.flag_disposition).length,
};
const friendReview = {
  schema: "tldrastro.empty-house.friend-variants-review.v1",
  version: "empty-house-v14-modern-friend-review-projection-4-2026-08-10",
  source_version: canonical.version,
  source_rows_sha256: sha256(canonicalBytes),
  prior_projection_body_they_digest_sha256: projection3BodyTheyDigest,
  payload_sha256: friendPayloadSha256,
  status: "needs_review",
  ownerApproved: false,
  promotionAuthorized: false,
  canonical: false,
  generation_policy: "Deterministic offline voice adaptation only; no runtime pronoun replacement. Exact owner approval is required before serving.",
  counts: { rows: friendRows.length, dispositions: dispositionCounts },
  rows: friendRows,
};

const authoredRows = readerEntries.map((entry, index) => ({
  contentKey: contentKey(entry),
  corpus_key: entry.key,
  content_role: "fallback_hook",
  grammar_frame: "complete_sentence",
  body_you: entry.copy_you,
  body_they: friendRows[index].body_they,
  review_status: "needs_review",
  body_you_review_status: "approved",
  body_they_review_status: "needs_review",
  body_they_flag: friendRows[index].body_they_flag,
  body_they_flag_disposition: friendRows[index].flag_disposition,
  source_keys: [
    `empty-house-v14/${entry.source_sheet}/${entry.source_row}`,
    `AR/page/${entry.page_ref}`,
  ],
  approved_via: canonical.governance,
  governance: canonical.governance,
  version: canonical.version,
  judge_verdict: "pending",
  corpus_version: canonical.version,
  tier: tierByCategory[entry.category],
  ruler_system: entry.category === "empty_house_ruler_house1_specific"
    || entry.category === "empty_house_ruler_planet_example"
    ? "modern"
    : "any",
  source_archive: entry.archive,
  source_page_ref: entry.page_ref,
  source_workbook_sha256: canonical.source_workbook_sha256,
  source: {
    archive: entry.archive,
    page_ref: entry.page_ref,
    workbook_sha256: canonical.source_workbook_sha256,
    sheet: entry.source_sheet,
    row: entry.source_row,
  },
  body_you_sha256: sha256(entry.copy_you),
  body_they_sha256: friendRows[index].body_they_sha256,
  friend_variant_review: "packages/astro-knowledge/review/empty-house-v14/empty-house-v14-friend-variants-review.json",
}));
const authoredInput = {
  schema: "tldrastro.empty-house.authored-input.v14-modern-v1",
  version: "empty-house-v14-modern-v1",
  source_version: canonical.version,
  source_rows_sha256: sha256(canonicalBytes),
  prior_projection_body_they_digest_sha256: projection3BodyTheyDigest,
  friend_payload_sha256: friendPayloadSha256,
  distribution_state: "staged",
  serving_blocker: "Friend variants require exact owner approval.",
  counts: { rows: authoredRows.length },
  rows: authoredRows,
};

fs.writeFileSync(friendReviewPath, `${JSON.stringify(friendReview, null, 2)}\n`);
fs.writeFileSync(authoredInputPath, `${JSON.stringify(authoredInput, null, 2)}\n`);

const existingApproval = fs.existsSync(approvalPath)
  ? JSON.parse(fs.readFileSync(approvalPath, "utf8"))
  : null;
const approvalMatches = Boolean(existingApproval?.status === "approved"
  && existingApproval.payload_sha256 === friendPayloadSha256
  && existingApproval.row_count === friendRows.length
  && typeof existingApproval.approval_statement === "string"
  && existingApproval.approval_statement.trim());
if (!approvalMatches) {
  fs.writeFileSync(approvalPath, `${JSON.stringify({
    schema: "tldrastro.empty-house.friend-variant-approval.v1",
    status: "needs_review",
    source_version: canonical.version,
    row_count: friendRows.length,
    payload_sha256: friendPayloadSha256,
    approval_statement: null,
    approved_at: null,
    source: null,
    note: "The owner-approved V14 body_you wording is immutable. These explicit body_they variants remain non-serving until the owner approves this exact payload digest.",
  }, null, 2)}\n`);
}

const approvedRows = approvalMatches
  ? authoredRows.map((row) => ({
    ...row,
    review_status: "approved",
    body_they_review_status: "approved",
    approved_via: `${row.approved_via}; ${existingApproval.approval_statement}`,
    approval: {
      approvalLevel: "exact_owner_approved",
      recordPath: path.relative(repoRoot, approvalPath),
      payloadSha256: friendPayloadSha256,
      approvedAt: existingApproval.approved_at,
    },
  }))
  : authoredRows;

if (approvalMatches) {
  friendReview.status = "approved";
  friendReview.ownerApproved = true;
  friendReview.promotionAuthorized = true;
  friendReview.canonical = true;
  friendReview.rows = friendRows.map((row) => ({
    ...row,
    review_status: "approved",
    ownerApproved: true,
    promotionAuthorized: true,
    canonical: true,
  }));
  authoredInput.distribution_state = promote ? "serving" : "approved";
  authoredInput.serving_blocker = null;
  authoredInput.rows = approvedRows;
  fs.writeFileSync(friendReviewPath, `${JSON.stringify(friendReview, null, 2)}\n`);
  fs.writeFileSync(authoredInputPath, `${JSON.stringify(authoredInput, null, 2)}\n`);
}

const importManifest = JSON.parse(fs.readFileSync(importManifestPath, "utf8"));
importManifest.friend_variants.payload_sha256 = friendPayloadSha256;
importManifest.friend_variants.status = approvalMatches ? "approved" : "needs_review";
importManifest.friend_variants.serving_blocked = !approvalMatches;
fs.writeFileSync(importManifestPath, `${JSON.stringify(importManifest, null, 2)}\n`);

if (promote) {
  if (!approvalMatches) {
    throw new Error("Friend approval record does not cover the exact V14 variant payload.");
  }
  const sourceRows = JSON.parse(fs.readFileSync(sourceRowsPath, "utf8"));
  sourceRows.hookRows = [
    ...(sourceRows.hookRows ?? []).filter((row) => !String(row.contentKey ?? "").startsWith(hookPrefix)),
    ...approvedRows,
  ];
  fs.writeFileSync(sourceRowsPath, `${JSON.stringify(sourceRows, null, 1)}\n`);
  console.log(`Promoted ${approvedRows.length} V14 modern empty-house rows.`);
} else {
  console.log(`Prepared ${friendRows.length} Friend variants for review; promotion remains blocked.`);
}
console.log(`Friend payload SHA-256: ${friendPayloadSha256}`);
console.log(`Flag dispositions: ${JSON.stringify(dispositionCounts)}`);
