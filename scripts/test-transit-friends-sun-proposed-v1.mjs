#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { friendVoiceFromReaderCopy } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const proposalPath = new URL(
  "../packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json",
  import.meta.url
);
const sourcePath = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json",
  import.meta.url
);

const proposal = JSON.parse(await readFile(proposalPath, "utf8"));
const source = JSON.parse(await readFile(sourcePath, "utf8"));

assert.equal(proposal.schema, "tldrastro-transit-aspect-friends-independent-proposed-v1");
assert.equal(proposal.status, "proposed_owner_review");
assert.equal(proposal.servingEnabled, false);
assert.equal(proposal.transitingBody, "sun");
assert.equal(proposal.count, 27);
assert.equal(proposal.records.length, 27);

const sourceRows = new Map(
  source.authoredCards
    .filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"))
    .map((row) => [row.contentKey, row])
);
assert.equal(sourceRows.size, 27, "Sun proposal must cover the complete current 27-row Sun corpus.");

const keys = new Set();
const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu;
const malformedFriendGrammar = /(?:[.!?]\s+they\b|\b(?:for|to|with|from|around|near|behind|beside|under|over|inside|outside)\s+they\b)/u;
const requiredSlots = ["{{Name}}", "{{aspectWord}}", "{{untilDate}}"];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function firstSentence(value) {
  return value.match(/^[\s\S]*?[.!?](?:\s|$)/u)?.[0] ?? value;
}

function legacyNameAnchor(value) {
  if (/{{Name}}/u.test(firstSentence(value))) return value;
  const properOpening = /^(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node)\b/u;
  return properOpening.test(value)
    ? `For {{Name}}, ${value}`
    : `For {{Name}}, ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

for (const record of proposal.records) {
  assert.match(record.contentKey, /^authored\/transit-aspect\/sun\//u);
  assert.equal(keys.has(record.contentKey), false, `${record.contentKey}: duplicate proposal key.`);
  keys.add(record.contentKey);

  assert.equal(record.review_status, "proposed", `${record.contentKey}: must remain proposed.`);
  assert.equal(record.authorship, "independent_friend_authoring", `${record.contentKey}: authorship contract drifted.`);
  assert.equal(typeof record.body_they, "string");
  assert.ok(record.body_they.trim().length > 0);

  for (const slot of requiredSlots) {
    assert.ok(record.body_they.includes(slot), `${record.contentKey}: missing ${slot}.`);
  }
  assert.doesNotMatch(record.body_they, secondPerson, `${record.contentKey}: second-person leakage.`);
  assert.doesNotMatch(record.body_they, /—/u, `${record.contentKey}: em dash is not allowed in this corpus.`);
  assert.doesNotMatch(record.body_they, malformedFriendGrammar, `${record.contentKey}: malformed third-person grammar.`);
  assert.equal(sha256(record.body_they), record.body_they_sha256, `${record.contentKey}: hash mismatch.`);

  const sourceRow = sourceRows.get(record.contentKey);
  assert.ok(sourceRow, `${record.contentKey}: missing governed source row.`);
  const readerBody = typeof sourceRow.body_you === "string" && sourceRow.body_you.trim()
    ? sourceRow.body_you
    : sourceRow.body;
  assert.equal(typeof readerBody, "string", `${record.contentKey}: source row lacks reader copy.`);

  const legacyConversion = legacyNameAnchor(friendVoiceFromReaderCopy(readerBody, "{{Name}}"));
  assert.notEqual(
    record.body_they,
    legacyConversion,
    `${record.contentKey}: proposal is exact legacy You-to-Friends conversion output.`
  );
}

assert.deepEqual(
  [...keys].sort(),
  [...sourceRows.keys()].sort(),
  "Sun proposal must contain exactly the current governed Sun keys."
);

assert.equal(
  proposal.records.some((record) => record.body_they.startsWith("For {{Name}},")),
  false,
  "Independent Sun batch must not reproduce the backfill's universal 'For {{Name}},' name-anchor wrapper."
);

console.log("Independent Sun Friends transit proposal contract passed for 27/27 rows.");
