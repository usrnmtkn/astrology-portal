import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "packages/astro-knowledge/dist");

function readPackage(name) {
  return JSON.parse(fs.readFileSync(path.join(distRoot, `${name}.json`), "utf8"));
}

function packagePayload(bundle) {
  const { version: _version, generatedAt: _generatedAt, ...payload } = bundle;
  return payload;
}

const shared = readPackage("shared-web");
const skyRuntime = readPackage("sky-runtime-web");
const natalInsights = readPackage("natal-insights-web");
const natalTransits = readPackage("natal-transits-web");
const natalPlacements = readPackage("natal-placements-web");
const relationshipSynastry = readPackage("relationships-synastry-web");
const relationshipComposite = readPackage("relationships-composite-web");

assert.deepEqual(
  { ...packagePayload(shared), ...packagePayload(skyRuntime) },
  packagePayload(readPackage("sky-web")),
  "Partitioned Sky package must preserve the legacy runtime payload",
);
assert.deepEqual(
  {
    ...packagePayload(shared),
    ...packagePayload(natalInsights),
    ...packagePayload(natalTransits),
    ...packagePayload(natalPlacements),
  },
  packagePayload(readPackage("natal-web")),
  "Partitioned Natal packages must preserve the legacy runtime payload",
);
assert.deepEqual(
  {
    ...packagePayload(shared),
    ...packagePayload(relationshipSynastry),
    ...packagePayload(relationshipComposite),
  },
  packagePayload(readPackage("relationships-web")),
  "Partitioned Relationships packages must preserve the legacy runtime payload",
);

for (const [name, bundle] of [
  ["sky-runtime-web", skyRuntime],
  ["natal-insights-web", natalInsights],
  ["natal-transits-web", natalTransits],
  ["natal-placements-web", natalPlacements],
  ["relationships-synastry-web", relationshipSynastry],
  ["relationships-composite-web", relationshipComposite],
]) {
  assert.equal(bundle.primitives, undefined, `${name} must use shared primitives`);
  assert.equal(bundle.voiceContent, undefined, `${name} must use shared voice content`);
}

console.log("Web knowledge package partitions preserve Sky, Natal, and Relationships payloads without duplicating shared content.");
