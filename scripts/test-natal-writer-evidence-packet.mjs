#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  buildNatalWritingPacket,
  renderNatalModelInput
} = require("../.agents/skills/marie-satori-writer/scripts/natal-writing-packet.js");
const {
  buildAspectWritingPacket
} = require("../packages/astro-knowledge/scripts/build-aspect-writing-packet.js");

const ready = buildNatalWritingPacket({
  surface: "natal-aspect",
  key: "moon|sextile|venus"
});
assert.equal(ready.status, "ready");
assert.equal(ready.generationAllowed, true);
assert.ok(ready.ownerPassages.length >= 4 && ready.ownerPassages.length <= 6);
assert.ok(ready.ownerPassages.every((entry) => entry.authorityClass === "exact_owner_approved"));
assert.ok(new Set(ready.ownerPassages.map((entry) => entry.sourceRowId)).size >= 3);
for (const sourceRowId of new Set(ready.ownerPassages.map((entry) => entry.sourceRowId))) {
  assert.ok(ready.ownerPassages.filter((entry) => entry.sourceRowId === sourceRowId).length <= 2);
}
assert.match(ready.promptBlock, /FIVE-BEAT CONSTRAINTS/u);
assert.match(ready.promptBlock, /Mechanism to role/u);
assert.match(ready.promptBlock, /Evidence proves mechanism/u);
assert.match(ready.promptBlock, /Consequence over time/u);
assert.match(ready.promptBlock, /Complication after strength/u);
assert.match(ready.promptBlock, /direct, adult, specific, generous/u);
assert.match(ready.promptBlock, /TLDR-NATAL-PLACEMENT-DELINEATION-STANDARD-OWNER\.md/u);
assert.match(ready.promptBlock, /TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER\.md/u);
assert.match(ready.promptBlock, /TLDR-AUTHOR-FROM-MECHANISM-WHOLE-PASSAGE-CLARIFICATION-OWNER\.md/u);
assert.match(ready.promptBlock, /The AstrologySupport field is the source\. The existing prose is not the draft\./u);
assert.match(ready.promptBlock, /A passage does not pass because it contains one photographable clause\./u);
assert.match(ready.promptBlock, /OWNER_CORRECTIONS\.md/u);
assert.match(ready.promptBlock, /TLDR-BATCH-EDITORIAL-STANDARD-V2\.md/u);
assert.match(ready.promptBlock, /TLDR-VOICE-ENTRY-POINT-RULING-OWNER\.md/u);
assert.match(ready.promptBlock, /TWO INDEPENDENT AUTHORING TASKS/u);
assert.equal(ready.factBoundary.sourcePath, "packages/astro-knowledge/data/insights/natal-aspects/moon-sextile-venus.json");
assert.equal(ready.authoringSource.rowKey, "moon|sextile|venus");
assert.ok(ready.authoringSource.astrologySupport.length > 0);
assert.equal(ready.authoringSource.astrologySupportSha256.length, 64);
assert.equal("factMaterial" in ready.factBoundary, false, "Registry prose must not enter a natal writer packet.");
const currentCopy = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json"), "utf8"))
  .rows.find((row) => row.sheet === "AspectMeanings" && row.key === "moon|sextile|venus").copy;
const modelInput = renderNatalModelInput(ready, { task: "Write natal aspect copy." });
assert.match(modelInput, /AUTHORING SOURCE/u);
assert.ok(modelInput.includes(ready.authoringSource.astrologySupport));
assert.ok(!modelInput.includes(currentCopy), "Existing candidate prose must be absent from the writer context by construction.");
assert.doesNotMatch(modelInput, /TEXT TO REVISE/u);
assert.throws(
  () => renderNatalModelInput(ready, { inputText: currentCopy }),
  /PRIOR_COPY_FORBIDDEN/u
);
const friendModelInput = renderNatalModelInput(ready, { voice: "friend", task: "Write Friend natal aspect copy." });
assert.match(friendModelInput, /FRIEND ENTRY POINT/u);
assert.match(friendModelInput, /observer/u);
assert.doesNotMatch(friendModelInput, /SELF ENTRY POINT/u);
assert.throws(() => renderNatalModelInput(ready, { voice: "friend", inputText: modelInput }), /PRIOR_COPY_FORBIDDEN/u);

const pointReady = buildNatalWritingPacket({
  surface: "natal-aspect",
  key: "jupiter|conjunction|ascendant"
});
assert.equal(pointReady.generationAllowed, true);
assert.equal(pointReady.factBoundary.sourcePath, "packages/astro-knowledge/data/aspects/jupiter-conjunction-ascendant.json");
assert.equal(pointReady.factBoundary.registryKind, "natal-aspect-doctrine");

const routed = buildAspectWritingPacket({
  surface: "natal",
  entry: { id: "moon|sextile|venus" }
});
assert.equal(routed.packetType, "natal-writing-packet");
assert.equal(routed.generationAllowed, true);
assert.ok(routed.ownerPassages.length >= 4);

const blocked = buildNatalWritingPacket({
  surface: "natal-aspect",
  key: "moon|sextile|venus",
  indexEntries: []
});
assert.equal(blocked.status, "insufficient-evidence");
assert.equal(blocked.generationAllowed, false);
assert.ok(blocked.evidenceSummary.reasons.includes("fewer-than-four-owner-passages"));
assert.throws(() => renderNatalModelInput(blocked), /INSUFFICIENT_NATAL_WRITER_EVIDENCE/u);

const missingSupport = buildNatalWritingPacket({
  surface: "natal-aspect",
  key: "moon|sextile|venus",
  supportRegistry: { rows: [], sourceWorkbook: "synthetic.xlsx", sourceWorkbookSha256: "0".repeat(64) }
});
assert.equal(missingSupport.generationAllowed, false);
assert.ok(missingSupport.evidenceSummary.reasons.includes("missing-astrology-support"));

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-natal-writer-packet-"));
try {
  const cli = spawnSync(process.execPath, [
    ".agents/skills/marie-satori-writer/scripts/compile-writing-packet.js",
    "--surface", "natal-aspect",
    "--id", "moon|sextile|venus",
    "--task", "Write natal aspect copy.",
    "--out", tempDir
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.ok(fs.existsSync(path.join(tempDir, "packet.json")));
  assert.ok(fs.existsSync(path.join(tempDir, "model-input.md")));
  const rejectedInput = spawnSync(process.execPath, [
    ".agents/skills/marie-satori-writer/scripts/compile-writing-packet.js",
    "--surface", "natal-aspect",
    "--id", "moon|sextile|venus",
    "--input", currentCopy,
    "--out", tempDir
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(rejectedInput.status, 0);
  assert.match(rejectedInput.stderr, /PRIOR_COPY_FORBIDDEN/u);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("Natal writer evidence packet contract passed: registry boundary, exact owner evidence, five beats, and fail-closed behavior.");
