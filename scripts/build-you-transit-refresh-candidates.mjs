#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const sunRelative = "packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json";
const nonSunRelative = "packages/astro-knowledge/review/transit-aspect-friends-completion-v1.json";
const sunAscAuthorityRelative = "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json";
const venusMoonAuthorityRelative = "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json";
const candidateRelative = "packages/astro-knowledge/review/transit-aspect-you-refresh-candidates-2026-09-04.json";
const reviewRelative = "packages/astro-knowledge/review/transit-aspect-you-refresh-review-2026-09-04.json";
const write = process.argv.includes("--write");

const protectedKeys = new Set([
  "authored/transit-aspect/sun/ascendant/hard",
  "authored/transit-aspect/venus/moon/hard"
]);

const ownerInstruction = "please proceed with You corpus fix: Bring the You Personal Transit corpus up to the current writing standard.";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const writeJson = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);

function deinflectThirdPersonVerb(word) {
  const lower = word.toLowerCase();
  const irregular = new Map([
    ["is", "are"],
    ["has", "have"],
    ["does", "do"],
    ["was", "were"],
    ["goes", "go"],
    ["tries", "try"],
    ["carries", "carry"],
    ["relies", "rely"],
    ["applies", "apply"],
    ["worries", "worry"],
    ["studies", "study"],
    ["flies", "fly"],
    ["says", "say"],
    ["pays", "pay"],
    ["lays", "lay"]
  ]);
  let next = irregular.get(lower);
  if (!next) {
    if (/[^aeiou]ies$/u.test(lower)) next = `${lower.slice(0, -3)}y`;
    else if (/(?:ches|shes|sses|xes|zes|oes)$/u.test(lower)) next = lower.slice(0, -2);
    else if (/s$/u.test(lower) && !/(?:ss|us|is)$/u.test(lower)) next = lower.slice(0, -1);
    else next = lower;
  }
  return /^[A-Z]/u.test(word) ? next.charAt(0).toUpperCase() + next.slice(1) : next;
}

function convertExplicitNameSubjects(value) {
  return value
    .replace(/\{\{Name\}\}[’']s/gu, "your")
    // Only the explicit {{Name}} subject needs third-person verb agreement
    // removed. Pronoun-based Friends sentences already use plural/base verbs.
    .replace(/\{\{Name\}\}\s+([A-Za-z]+)\b/gu, (_match, verb) => `you ${deinflectThirdPersonVerb(verb)}`)
    .replace(/\{\{Name\}\}/gu, "you");
}

function convertFriendPronouns(value) {
  return value
    .replace(/\bThey[’']re\b/gu, "You're")
    .replace(/\bthey[’']re\b/gu, "you're")
    .replace(/\bThey[’']ve\b/gu, "You've")
    .replace(/\bthey[’']ve\b/gu, "you've")
    .replace(/\bThey[’']ll\b/gu, "You'll")
    .replace(/\bthey[’']ll\b/gu, "you'll")
    .replace(/\bThey[’']d\b/gu, "You'd")
    .replace(/\bthey[’']d\b/gu, "you'd")
    .replace(/\bThemselves\b/gu, "Yourself")
    .replace(/\bthemselves\b/gu, "yourself")
    .replace(/\bThemself\b/gu, "Yourself")
    .replace(/\bthemself\b/gu, "yourself")
    .replace(/\bTheirs\b/gu, "Yours")
    .replace(/\btheirs\b/gu, "yours")
    .replace(/\bTheir\b/gu, "Your")
    .replace(/\btheir\b/gu, "your")
    .replace(/\bThem\b/gu, "You")
    .replace(/\bthem\b/gu, "you")
    .replace(/\bThey\b/gu, "You")
    .replace(/\bthey\b/gu, "you");
}

function normalizeSentenceStarts(value) {
  return value
    .replace(/(^|[.!?]\s+|\n\n)you\b/gu, (_match, prefix) => `${prefix}You`)
    .replace(/(^|[.!?]\s+|\n\n)your\b/gu, (_match, prefix) => `${prefix}Your`);
}

function adaptFriendBodyToYou(bodyThey) {
  // Do not globally rewrite "you is/has/does/was" or "you <verb>s". In a
  // phrase such as "the person in front of you is...", "you" is an object,
  // not the subject. Explicit {{Name}} subjects are handled before pronouns.
  return normalizeSentenceStarts(convertFriendPronouns(convertExplicitNameSubjects(bodyThey)));
}

function sentences(value) {
  return value
    .split(/(?<=[.!?])\s+|\n\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

const thirdPartyAntecedent = /\b(?:everyone|someone|anyone|nobody|people|coworkers|colleagues|managers|clients|parents|friends|others|both people|either person|the other person|another person|a person|the person|the team|family members|decision-makers|decision makers|customers|audience members|neighbors|neighbours)\b/iu;
const friendPronoun = /\b(?:they|their|them|themselves|themself)\b/iu;

function sourceCoreferenceFlags(bodyThey) {
  return sentences(bodyThey)
    .filter((sentence) => thirdPartyAntecedent.test(sentence) && friendPronoun.test(sentence))
    .map((sentence) => sentence);
}

const source = readJson(sourceRelative);
const sun = readJson(sunRelative);
const nonSun = readJson(nonSunRelative);
const sunAscAuthority = readJson(sunAscAuthorityRelative);
const venusMoonAuthority = readJson(venusMoonAuthorityRelative);

assert.equal(sun.records.length, 27);
assert.equal(nonSun.records.length, 351);
assert.equal(sunAscAuthority.contentKey, "authored/transit-aspect/sun/ascendant/hard");
assert.equal(venusMoonAuthority.contentKey, "authored/transit-aspect/venus/moon/hard");

const friendRecords = [...sun.records, ...nonSun.records];
assert.equal(friendRecords.length, 378);
assert.equal(new Set(friendRecords.map((record) => record.contentKey)).size, 378);

const sourceRows = source.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
assert.equal(sourceRows.length, 378);
const sourceByKey = new Map(sourceRows.map((row) => [row.contentKey, row]));

const candidates = [];
const reviewFlags = [];
for (const record of friendRecords) {
  const row = sourceByKey.get(record.contentKey);
  assert.ok(row, `${record.contentKey}: source row missing.`);
  if (protectedKeys.has(record.contentKey)) continue;
  assert.equal(typeof record.body_they, "string", `${record.contentKey}: Friends body missing.`);
  assert.ok(record.body_they.trim(), `${record.contentKey}: Friends body blank.`);
  const proposedBodyYou = adaptFriendBodyToYou(record.body_they);
  const placeholdersThey = [...record.body_they.matchAll(/\{\{[^}]+\}\}/gu)].map((match) => match[0]).sort();
  const placeholdersYou = [...proposedBodyYou.matchAll(/\{\{[^}]+\}\}/gu)].map((match) => match[0]).sort();
  const residualFriendTokens = [...proposedBodyYou.matchAll(/\{\{Name\}\}|\b(?:they|their|them|themselves|themself)\b/giu)].map((match) => match[0]);
  const badYouAgreement = [...proposedBodyYou.matchAll(/(?:^|[.!?]\s+|\n\n)You\s+(?:is|has|does|was)\b/gu)].map((match) => match.trim());
  const coreference = sourceCoreferenceFlags(record.body_they);

  if (residualFriendTokens.length || badYouAgreement.length || coreference.length || JSON.stringify(placeholdersThey.filter((token) => token !== "{{Name}}")) !== JSON.stringify(placeholdersYou)) {
    reviewFlags.push({
      contentKey: record.contentKey,
      residualFriendTokens,
      badYouAgreement,
      sourceCoreferenceFlags: coreference,
      sourceBodyThey: record.body_they,
      proposedBodyYou
    });
  }

  candidates.push({
    contentKey: record.contentKey,
    method: "second_person_adaptation_of_current_friend_semantic_authority",
    sourceBodyThey: record.body_they,
    sourceBodyTheySha256: sha256(record.body_they),
    priorBodyYou: row.body_you ?? row.body ?? null,
    priorBodyYouSha256: typeof (row.body_you ?? row.body) === "string" ? sha256(row.body_you ?? row.body) : null,
    proposedBodyYou,
    proposedBodyYouSha256: sha256(proposedBodyYou)
  });
}

assert.equal(candidates.length, 376);
assert.equal(candidates.some((record) => protectedKeys.has(record.contentKey)), false);

const candidateDocument = {
  schema: "tldrastro-transit-aspect-you-refresh-candidates-v1",
  status: "generated_for_corpus_review",
  createdAt: "2026-09-04",
  surface: "personal-transits-you",
  ownerInstruction,
  semanticAuthority: "current explicit Friends body_they for the same contentKey",
  method: "Preserve the current Friends passage's thesis, examples, stakes, paragraph structure, and practical conclusion while adapting the person naturally into second person. This is a perspective adaptation, not a new astrology interpretation.",
  protectedRows: [
    {
      contentKey: sunAscAuthority.contentKey,
      reason: "Exact owner-published Content Studio You revision from 2026-09-03 remains authoritative.",
      bodyYouSha256: sha256(sunAscAuthority.body_you)
    },
    {
      contentKey: venusMoonAuthority.contentKey,
      reason: "Exact owner-published Content Studio You revision from 2026-09-02 remains authoritative and Friends remains intentionally blank.",
      bodyYouSha256: venusMoonAuthority.body_you_sha256
    }
  ],
  count: candidates.length,
  records: candidates
};

const reviewDocument = {
  schema: "tldrastro-transit-aspect-you-refresh-review-v1",
  createdAt: "2026-09-04",
  candidateCount: candidates.length,
  protectedCount: protectedKeys.size,
  flaggedCount: reviewFlags.length,
  flagMeaning: "Flags identify sentences where an unrelated third-party antecedent may own a they/their pronoun, or where deterministic person adaptation left suspicious grammar. Flagged rows require inspection before serving promotion.",
  flags: reviewFlags
};

if (write) {
  writeJson(candidateRelative, candidateDocument);
  writeJson(reviewRelative, reviewDocument);
} else {
  assert.equal(fs.readFileSync(path.join(root, candidateRelative), "utf8"), `${JSON.stringify(candidateDocument, null, 2)}\n`, "Candidate file is stale; run with --write.");
  assert.equal(fs.readFileSync(path.join(root, reviewRelative), "utf8"), `${JSON.stringify(reviewDocument, null, 2)}\n`, "Review file is stale; run with --write.");
}

console.log(JSON.stringify({
  mode: write ? "write" : "check",
  candidateCount: candidates.length,
  protectedCount: protectedKeys.size,
  flaggedCount: reviewFlags.length,
  candidateRelative,
  reviewRelative
}, null, 2));
