#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import {
  FRIEND_NATAL_SECOND_PERSON_VOCABULARY_KEYS,
  SourceGapError,
  vocabularyBodyForVoice
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"),
  "utf8"
));
const contract = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/contracts/FRIEND-NATAL-SECOND-PERSON-VOCABULARY-V1.json"),
  "utf8"
));

assert.equal(source.vocabularyRows.length, 720);
assert.equal(source.vocabularyRows.filter((row) => typeof row.body === "string").length, 720);
assert.equal(source.vocabularyRows.filter((row) => typeof row.body_you === "string").length, 0);
assert.equal(source.vocabularyRows.filter((row) => typeof row.body_they === "string").length, 0);
assert.equal(contract.contentKeys.length, 40);
assert.equal(new Set(contract.contentKeys).size, 40);
assert.deepEqual(new Set(contract.contentKeys), FRIEND_NATAL_SECOND_PERSON_VOCABULARY_KEYS);

for (const row of source.vocabularyRows) {
  assert.equal(vocabularyBodyForVoice(row, "you"), row.body, `${row.contentKey}: You body changed.`);
  assert.equal(
    vocabularyBodyForVoice(row, "they"),
    FRIEND_NATAL_SECOND_PERSON_VOCABULARY_KEYS.has(row.contentKey) ? null : row.body,
    `${row.contentKey}: Friend body did not follow the governed 40-row boundary.`
  );
}

assert.equal(
  source.vocabularyRows.filter((row) => vocabularyBodyForVoice(row, "they") !== null).length,
  680,
  "Exactly 680 body-only vocabulary rows must remain available to they voice."
);

const bundleFile = path.join(os.tmpdir(), `tldrastro-friends-natal-runtime-${process.pid}.mjs`);
await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node",
  stdin: {
    loader: "tsx",
    resolveDir: repoRoot,
    contents: `
      export {
        fallbackRendererV3,
        isDeferredFallbackArchitectureV3BundleLoaded,
        loadDeferredFallbackArchitectureV3Bundle
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
      export {
        FRIEND_NATAL_SECOND_PERSON_VOCABULARY_KEYS as browserFriendNatalSecondPersonVocabularyKeys
      } from "./apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";
      export { friendDetailHasReaderFacingContent } from "./apps/web/src/features/friends/friendDetailAvailability.ts";
    `
  }
});

const runtime = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);
assert.deepEqual(
  runtime.browserFriendNatalSecondPersonVocabularyKeys,
  FRIEND_NATAL_SECOND_PERSON_VOCABULARY_KEYS,
  "Browser and Node Friends natal second-person inventories must remain identical."
);
const safePlacement = { planet: "saturn", sign: "aquarius", house: 7, voice: "Alex" };

assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), false);
assert.throws(
  () => runtime.fallbackRendererV3.renderNatalPlacement(safePlacement),
  /SOURCE_GAP/u,
  "Friends natal placement must be unavailable before its deferred source bundle loads."
);
assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), true);

const placement = runtime.fallbackRendererV3.renderNatalPlacement(safePlacement);
assert.ok(placement.body.trim(), "An ordinary Friends natal placement must render a non-empty body after the bundle loads.");
assert.doesNotMatch(placement.body, /\b(?:you|your|yours|yourself)\b/iu);

const aspect = runtime.fallbackRendererV3.renderNatalAspect({
  planetA: "saturn",
  planetB: "venus",
  aspect: "trine",
  voice: "Alex"
});
assert.ok(aspect.body.trim(), "An ordinary Friends natal aspect must render a non-empty body after the bundle loads.");

assert.equal(runtime.friendDetailHasReaderFacingContent({ body: [], sections: [] }), false);
assert.equal(runtime.friendDetailHasReaderFacingContent({
  body: [],
  sections: [{ heading: "Placement", body: placement.body }]
}), true);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
assert.match(
  appSource,
  /const friendDeferredFallbackRequested = friendNatalContentRequested\s*\|\|/u,
  "Opening the Friends Natal tab must request the deferred natal resolver rows."
);

const panelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);
assert.match(panelSource, /friendDetailHasReaderFacingContent\(detail\)/u);
assert.doesNotMatch(
  panelSource.replace(/onOpenDetail\(detail\);/u, ""),
  /onOpenDetail\(/u,
  "Every Friends detail opener must pass through the shared non-empty guard."
);

console.log("Friends natal fallback runtime: 680 vocabulary rows resolve; 40 fail closed; placement/aspect bodies render after deferred load; all detail opens are guarded.");
