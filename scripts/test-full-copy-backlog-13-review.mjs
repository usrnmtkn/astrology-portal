import assert from "node:assert/strict";
import fs from "node:fs";

const packet = JSON.parse(fs.readFileSync(
  "packages/astro-knowledge/review/full-copy-backlog-13-2026-09-05/review.json",
  "utf8"
));

assert.equal(packet.schema, "tldrastro-full-copy-backlog-review/v1");
assert.equal(packet.count, 13);
assert.equal(packet.candidates.length, 13);
assert.equal(packet.owner_approved, false);
assert.equal(packet.serving_enabled, false);
assert.match(packet.promotion_policy, /explicitly approves the exact wording/u);

const keys = packet.candidates.map((candidate) => candidate.contentKey);
assert.equal(new Set(keys).size, 13);
assert.equal(keys.filter((key) => key.startsWith("authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/")).length, 12);
assert.ok(keys.includes("authored/sky-lunation-macro/new-moon/aquarius"));

const eclipse = packet.candidates.filter((candidate) => candidate.kind === "eclipse-lunar");
assert.deepEqual(eclipse.map((candidate) => candidate.house).sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9,10,11,12]);
assert.equal(new Set(eclipse.map((candidate) => candidate.risingSign)).size, 12);

for (const candidate of packet.candidates) {
  assert.equal(candidate.review_status, "needs_review", `${candidate.contentKey}: review wall drift`);
  assert.equal(candidate.owner_approved, false, `${candidate.contentKey}: owner approval must remain false`);
  assert.equal(candidate.serving_enabled, false, `${candidate.contentKey}: serving must remain false`);
  assert.ok(typeof candidate.body === "string" && candidate.body.trim().split(/\s+/u).length >= 100, `${candidate.contentKey}: candidate is too short`);
  assert.doesNotMatch(candidate.body, /\u2014/u, `${candidate.contentKey}: em dash`);
  assert.doesNotMatch(candidate.body, /\b(?:alignment|activation|performance|whether)\b/iu, `${candidate.contentKey}: owner-style banned term`);
  assert.doesNotMatch(candidate.body, /\bportals? into your soul\b|\bflow with the current\b/iu, `${candidate.contentKey}: legacy eclipse filler leaked into rewrite`);
}

console.log("Full-copy backlog 13 review packet passed: 13 needs-review, non-serving candidates.");
