#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
);
const approval = readJson("packages/astro-knowledge/review/timing-event-reader-copy-v2-approved.json");
const serving = readJson(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/timing-event-reader-copy-v2.json"
);

assert.equal(approval.status, "APPROVED");
assert.equal(approval.serving_authorization, "Import and wire the four approved V2 cards");
assert.equal(serving.version, approval.version);
assert.equal(serving.authoredCards.length, 4);

const approvedByKey = new Map(approval.cards.map((card) => [card.contentKey, card]));

for (const card of serving.authoredCards) {
  const approved = approvedByKey.get(card.contentKey);

  assert.ok(approved, `Serving card must have an owner-approved source: ${card.contentKey}`);
  assert.equal(card.headline, approved.title, `Headline drifted: ${card.contentKey}`);
  assert.equal(card.body, approved.body, `Body drifted: ${card.contentKey}`);
  assert.equal(card.review_status, "approved", `Card must remain approved: ${card.contentKey}`);
  assert.equal(card.owner_authored, true, `Card must retain owner provenance: ${card.contentKey}`);
  assert.equal(card.source_keys[0], approved.sourceId, `Source ID drifted: ${card.contentKey}`);
  assert.ok(
    card.source_keys.includes("owner/timing-event-reader-copy-v2-approved"),
    `Approval provenance missing: ${card.contentKey}`
  );
}

const bundleFile = path.join(os.tmpdir(), "tldrastro-calendar-timing-copy.bundle.mjs");

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/generatedContent.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const { fallbackArchitectureV3AuthoredContentForKey } = await import(
  `${pathToFileURL(bundleFile).href}?t=${Date.now()}`
);

for (const approved of approval.cards) {
  const resolved = fallbackArchitectureV3AuthoredContentForKey(approved.contentKey);

  assert.ok(resolved, `Calendar adapter did not resolve approved copy: ${approved.contentKey}`);
  assert.equal(resolved.headline, approved.title);
  assert.equal(resolved.body, approved.body);
  assert.equal(resolved.provider, "tldrastro-fallback-architecture-v3");
  assert.equal(resolved.sourceSnapshot.canonicalKey, approved.contentKey);
  assert.equal(resolved.sourceSnapshot.reviewStatus, "approved");
  assert.equal(resolved.sourceSnapshot.sourceKeys[0], approved.sourceId);
}

assert.equal(
  fallbackArchitectureV3AuthoredContentForKey("sky.station.unapproved.example.retrograde"),
  null,
  "Unknown timing keys must remain source gaps."
);

console.log("Calendar timing-event copy wiring passed", {
  cards: approval.cards.length,
  version: serving.version
});
