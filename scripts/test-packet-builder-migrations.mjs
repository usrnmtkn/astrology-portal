#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skyCompiler = require(path.join(repoRoot, ".agents/skills/satori-writer/scripts/compile-writing-packet.js"));
const skySurface = require(path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/sky-placement.json"));
const daily = require(path.join(repoRoot, "packages/astro-knowledge/scripts/daily-glance-writer-runtime.js"));

const legacySky = skyCompiler.astrologyEvidence("jupiter", "libra", skySurface);
const governedSky = skyCompiler.governedPlacementEvidence("jupiter", "libra", skySurface);
assert.deepEqual(governedSky.canonicalIds, ["placement-sign/jupiter/libra"]);
assert.equal(governedSky.governedPacket.selectionFilterId, "sky-placement-output-ban-safe-evidence-v1");
assert.ok(governedSky.governedPacket.exclusions.filteredRecords > 0);
for (const retained of [legacySky.planetFunction, legacySky.timing, legacySky.combinedMeaning, legacySky.collectiveGift]) {
  assert.ok(governedSky.governedPacket.evidence.some((record) => record.text === retained), `Missing retained Sky evidence: ${retained}`);
}
assert.ok(governedSky.governedPacket.evidence.every((record) => record.sourceSha256 && record.evidenceSha256));

let dailyKeys = 0;
for (const configPath of [daily.configPath, daily.batch1ConfigPath, daily.batch2ConfigPath, daily.batch3ConfigPath]) {
  const config = daily.readJson(configPath);
  for (const target of config.keys) {
    const packet = daily.compileDailyPacket(target.key, config);
    assert.equal(packet.governedEvidence.canonicalId, `daily/${target.key}`);
    assert.equal(packet.governedEvidence.surface, "daily");
    assert.equal(packet.governedEvidence.register, "daily");
    assert.deepEqual(packet.verifiedAstrology.map((fact) => fact.text), target.facts.map((fact) => fact.text), `${target.key}: Daily fact text changed.`);
    assert.ok(packet.verifiedAstrology.every((fact) => fact.sourceSha256 && fact.evidenceSha256));
    dailyKeys += 1;
  }
}
assert.equal(dailyKeys, 31);

console.log("Packet-builder migrations passed: Sky evidence delta is explicit and all 31 Daily fact packets remain byte-identical.");
