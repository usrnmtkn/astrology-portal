#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const manualPath = "apps/web/src/features/friends/ManualChartsPanel.tsx";
const compatibilityPath = "apps/web/src/features/friends/CompatibilityTab.tsx";
const mapPath = "apps/admin/src/writingSurfaceSourceMap.ts";
const manual = fs.readFileSync(manualPath, "utf8");
const compatibility = fs.readFileSync(compatibilityPath, "utf8");
const map = fs.readFileSync(mapPath, "utf8");

assert.match(manual, /betweenYouTwoV2BondReading,[\s\S]*betweenYouTwoV2SharedMoonReading/u);
assert.match(manual, /fallbackV3HookBody,/u);
assert.match(
  manual,
  /endpointOwner: group\.endpointOwner,[\s\S]*effectFamily: bondEffectFamily/u,
  "Ranked bond cards must retain endpoint direction for direction-safe V2 copy."
);
assert.match(
  manual,
  /const selectedBondTransit = selectedBondTransitCards\[0\];[\s\S]*if \(selectedBondTransit\) \{[\s\S]*betweenYouTwoV2BondReading\(\{[\s\S]*direction: selectedBondTransit\.endpointOwner === "reader" \? "you" : "they"/u,
  "The top-ranked direct bond condition must lead before shared-Moon fallback."
);
assert.match(
  manual,
  /if \(!element \|\| readerDriver\?\.kind !== "aspect" \|\| friendDriver\?\.kind !== "aspect"\) \{[\s\S]*return null;[\s\S]*betweenYouTwoV2SharedMoonReading/u,
  "Shared-Moon V2 may render only when both charts have qualifying Moon-aspect drivers."
);
assert.doesNotMatch(
  manual,
  /selectedPairDailySelection/u,
  "The Compatibility daily surface must no longer assemble the V1 reader-clause/friend-clause/shared-bridge paragraph."
);
assert.doesNotMatch(
  manual,
  /renderShared\(selectedPairDailySelection/u,
  "V2 must not silently fall back to the V1 relationship composer."
);
assert.match(
  manual,
  /readerContext = readerDriver[\s\S]*fallbackV3HookBody\(pairDailyClauseKey\(readerDriver\), "you"\)[\s\S]*friendContext = friendDriver[\s\S]*fallbackV3HookBody\(pairDailyClauseKey\(friendDriver\), "they"\)/u,
  "Individual daily weather must be retained only as separately sourced supporting context."
);

assert.match(compatibility, /daily\?: BetweenYouTwoV2Daily \| null;/u);
assert.match(compatibility, /Between you two · Today - \{daily\.dateLabel\}/u);
assert.match(compatibility, /\{daily\.headline\}/u);
assert.match(compatibility, /What each of you is carrying today/u);
assert.match(compatibility, /One useful move/u);
assert.match(compatibility, /<strong>You:<\/strong>/u);
assert.match(compatibility, /<strong>\{friendName\}:<\/strong>/u);

assert.match(map, /surface: "Friends: Between You Two V2"/u);
assert.match(map, /shared relationship evidence/u);
assert.match(map, /pair-daily-v2-rows\.json/u);
assert.match(map, /approval is directional/u);

console.log("Between You Two V2 source wiring contract passed: relationship-first, direction-safe, Moon-gated, no V1 synthesis fallback.");
