#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packetPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/calendar-collective-pressure-pass-2026-09-07/candidate-payloads.json"
);
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

const expectedKeys = new Set([
  "sky.aspect.pluto.conjunction.lilith",
  "sky.aspect.pluto.opposition.lilith",
  "sky.aspect.pluto.square.lilith",
  "sky.aspect.saturn.conjunction.lilith",
  "sky.aspect.saturn.opposition.lilith",
  "sky.aspect.uranus.conjunction.lilith",
  "sky.aspect.uranus.opposition.lilith",
  "sky.aspect.uranus.square.lilith",
  "sky.aspect.mars.conjunction.lilith",
  "sky.aspect.mars.opposition.lilith",
  "sky.aspect.mars.square.lilith",
  "sky.aspect.chiron.conjunction.lilith",
  "sky.aspect.chiron.opposition.lilith",
  "sky.aspect.chiron.square.lilith",
  "sky.aspect.mars.conjunction.saturn",
  "sky.aspect.mars.opposition.saturn",
  "sky.aspect.mars.conjunction.pluto",
  "sky.aspect.mars.opposition.pluto",
  "sky.aspect.mars.square.pluto",
  "sky.aspect.saturn.conjunction.uranus",
  "sky.aspect.saturn.opposition.uranus"
]);

const lockedKeys = new Set([
  "sky.aspect.saturn.square.lilith",
  "sky.aspect.mars.square.saturn",
  "sky.aspect.saturn.square.uranus"
]);

assert.equal(packet.reviewStatus, "needs_review");
assert.equal(packet.ownerApproved, false);
assert.equal(packet.promotionAuthorized, false);
assert.deepEqual(new Set(packet.lockedUnchanged), lockedKeys);

const entries = Object.entries(packet.entries ?? {});
assert.equal(entries.length, 21);
assert.deepEqual(new Set(entries.map(([key]) => key)), expectedKeys);
for (const key of lockedKeys) assert.equal(packet.entries[key], undefined, `${key}: locked passage must not be rewritten`);

const directReaderKeys = new Set();
for (const [key, candidate] of entries) {
  assert.equal(typeof candidate.summary, "string", `${key}: summary missing`);
  assert.equal(typeof candidate.body, "string", `${key}: body missing`);
  assert.ok(candidate.summary.trim(), `${key}: blank summary`);
  assert.ok(candidate.body.trim(), `${key}: blank body`);
  assert.ok(candidate.body.startsWith(candidate.summary), `${key}: body must begin with exact summary`);
  assert.match(candidate.body, /\bWhen\b/, `${key}: body must name the aspect mechanism`);

  const prose = `${candidate.summary}\n${candidate.body}`;
  assert.equal(prose.includes("—"), false, `${key}: em dash`);
  assert.equal(/\bwhether\b/i.test(prose), false, `${key}: whether`);
  assert.equal(/\bleverage\b/i.test(prose), false, `${key}: banned leverage`);
  assert.equal(/\bcomfort\b/i.test(prose), false, `${key}: banned comfort abstraction`);
  assert.equal(/collective energy/i.test(prose), false, `${key}: generic collective-energy filler`);
  assert.equal(/people may feel/i.test(prose), false, `${key}: generic people-may-feel scaffolding`);
  assert.equal(/(^|[.!?]\s+)You (?:are|have|were)\b/.test(candidate.body), false, `${key}: unsupported direct personal assertion`);
  assert.equal(/\bYour\b/.test(candidate.body), false, `${key}: unsupported personal possessive`);

  if (/\byou\b/i.test(candidate.body)) directReaderKeys.add(key);

  const [, , transiting, aspect, other] = key.split(".");
  const runtimePath = path.join(repoRoot, "packages/astro-knowledge/data/transits", `${transiting}-${aspect}-${other}.json`);
  assert.ok(fs.existsSync(runtimePath), `${key}: canonical runtime file missing`);
  const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
  assert.equal(runtime.status, "LIVE", `${key}: current runtime baseline must be LIVE`);
  assert.ok(runtime.readerCopy?.body, `${key}: current runtime body missing`);
  assert.notEqual(candidate.body, runtime.readerCopy.body, `${key}: candidate must be an actual refinement`);
}

assert.deepEqual(
  directReaderKeys,
  new Set([
    "sky.aspect.uranus.square.lilith",
    "sky.aspect.mars.opposition.lilith"
  ]),
  "Only the two intentionally conditional reader turns may use direct second person"
);

const lockedBodies = {
  "sky.aspect.saturn.square.lilith": "A rule becomes harder to obey when compliance repeatedly requires the same non-negotiable boundary to be violated. When Saturn squares Lilith, structure and autonomy create friction, bringing duty into conflict with a refusal that is no longer willing to carry the old cost. What looks like defiance can be the point where keeping the arrangement intact becomes more damaging than dealing with the consequence of challenging it. The rule is easier to judge once the cost of obedience is counted along with the cost of refusal.",
  "sky.aspect.mars.square.saturn": "Momentum meets resistance when action runs into rules, deadlines, delays, or limits that will not move on demand. When Mars squares Saturn, the push to act can make every constraint feel like a personal obstruction even when the restriction is simply part of the structure. More force is unlikely to make a fixed limit disappear. The useful question is which constraint is fixed, which one can change, and where effort can still produce movement.",
  "sky.aspect.saturn.square.uranus": "The urge to break free gets louder when a structure keeps requiring workarounds for a problem nobody is fixing. When Saturn squares Uranus, restriction and disruption create friction until the old method becomes difficult to maintain and the replacement still carries costs people do not want to absorb. Exhaustion can make total demolition look cleaner than it is. The change works better when it removes the restriction that caused the problem without discarding every support built around it."
};

for (const [key, expectedBody] of Object.entries(lockedBodies)) {
  const [, , transiting, aspect, other] = key.split(".");
  const runtimePath = path.join(repoRoot, "packages/astro-knowledge/data/transits", `${transiting}-${aspect}-${other}.json`);
  const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
  assert.equal(runtime.readerCopy?.body, expectedBody, `${key}: locked benchmark drifted`);
}

console.log("Calendar collective-pressure pass: 21 review candidates valid; 3 strong benchmarks locked; 2 conditional reader turns.");
