import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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
const fullRelationshipMeaning = new Map(readPackage("relationships").synastryAspects.map(entry => [entry.id, entry]));

for (const entry of relationshipSynastry.synastryAspects) {
  const full = fullRelationshipMeaning.get(entry.id);
  assert(full?.plainTranslation, 'Full relationship meaning remains available for authoring.');
  if (entry.plainTranslation === undefined) {
    assert.equal(full.status, 'DRAFT');
    assert.equal(full.authoringStatus, 'draft');
    assert(full.summaryShort?.trim() && full.summaryDeep?.trim());
    // These are the exact two fields used by domainRegistry before its primary
    // fallback; no complete reader field is shortened or substituted.
    assert.equal(entry.summaryShort, full.summaryShort);
    assert.equal(entry.summaryDeep, full.summaryDeep);
  } else {
    assert.equal(entry.plainTranslation, full.plainTranslation);
  }
}

execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-'], {
  cwd: repoRoot,
  input: `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { createDomainRegistry } from './apps/web/src/content/domainRegistry.ts';
    const root = 'packages/astro-knowledge/dist/';
    const browser = JSON.parse(fs.readFileSync(root + 'relationships-web.json', 'utf8'));
    const full = new Map(JSON.parse(fs.readFileSync(root + 'relationships.json', 'utf8')).synastryAspects.map(row => [row.id, row]));
    const control = { ...browser, synastryAspects: browser.synastryAspects.map(row => ({ ...row, plainTranslation: full.get(row.id).plainTranslation })) };
    const before = createDomainRegistry(control);
    const after = createDomainRegistry(browser);
    for (const row of browser.synastryAspects) {
      assert.deepEqual(after.approvedVoiceOrKnowledgeFallback(row.id), before.approvedVoiceOrKnowledgeFallback(row.id));
    }
  `,
  stdio: ['pipe', 'pipe', 'pipe']
});

assert.ok(
  shared.voiceContent.every((entry) => (
    typeof entry.sourceId === "string"
    && entry.sourceId.trim()
    && typeof entry.voiceId === "string"
    && entry.voiceId.trim()
  )),
  "Shared web voice content must contain only rows addressable by the runtime sourceId + voiceId index.",
);
assert.equal(
  shared.voiceContent.some((entry) => Array.isArray(entry.entries)),
  false,
  "Authoring corpora must not ship in the reader runtime voice-content package.",
);

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
