import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  natalPlacementResolverDependencyKeys
} from "../apps/admin/src/natalPlacementSources.ts";

const jupiterLeoRx = new Set(natalPlacementResolverDependencyKeys("jupiter", "leo", "3", "retrograde"));
for (const key of [
  "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/retrograde",
  "fallback-hook/natal-you-placement-sign-final/jupiter/leo",
  "fallback-hook/placement-sign-lived/jupiter/leo",
  "fallback-hook/sign-lived/leo",
  "fallback-hook/planet-lived/jupiter",
  "fallback-hook/planet-intro/jupiter",
  "fallback-hook/planet-best/jupiter",
  "fallback-hook/placement-sentence/jupiter/leo",
  "fallback-vocab/planet-topic/jupiter",
  "fallback-vocab/planet-excess/jupiter",
  "fallback-vocab/planet-productive/jupiter",
  "fallback-vocab/planet-core/jupiter",
  "fallback-vocab/sign-style/leo",
  "fallback-vocab/sign-need/leo",
  "fallback-vocab/planet-verb/jupiter",
  "fallback-vocab/sign-adverb/leo",
  "fallback-template/natal.planet-in-sign/jupiter",
  "fallback-template/natal.planet-in-sign",
  "fallback-template/natal.modifier.retrograde",
  "fallback-hook/natal-you-placement-house-final/jupiter/3",
  "fallback-hook/placement-house-lived/jupiter/3",
  "fallback-hook/house-lived/3",
  "fallback-hook/house-meaning/3",
  "fallback-hook/placement-house-sentence/jupiter/3",
  "fallback-template/natal.house-context"
]) {
  assert.ok(jupiterLeoRx.has(key), `Missing production natal resolver dependency: ${key}`);
}
for (let index = 0; index < 8; index += 1) {
  assert.ok(jupiterLeoRx.has(`fallback-vocab/placement-gerund/jupiter/leo/${index}`));
}
assert.ok(
  !jupiterLeoRx.has("fallback-hook/natal-you-placement-complete-final/jupiter/leo/3"),
  "Retrograde preview must not hydrate the Direct exact full-copy key."
);
assert.ok(jupiterLeoRx.size < 64, "A selected natal placement must remain below the preview API override cap.");

const direct = new Set(natalPlacementResolverDependencyKeys("jupiter", "leo", "3", "direct"));
assert.ok(direct.has("fallback-hook/natal-you-placement-complete-final/jupiter/leo/3"));
assert.ok(!direct.has("fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/retrograde"));
assert.ok(!direct.has("fallback-template/natal.modifier.retrograde"));

const northNodeAries = new Set(natalPlacementResolverDependencyKeys("north-node", "aries", "1", "direct"));
assert.ok(northNodeAries.has("fallback-hook/node-journey/north-node"));
assert.ok(northNodeAries.has("fallback-vocab/node-direction/libra"));
assert.ok(northNodeAries.has("fallback-template/natal.node-in-sign"));

const previewSource = readFileSync("apps/admin/src/NatalPlacementReaderPreview.tsx", "utf8");
assert.match(
  previewSource,
  /natalPlacementResolverDependencyKeys\(planet, sign, house, motion\)/u,
  "Content Studio must send every production resolver dependency, not only the visible source-card subset."
);
assert.doesNotMatch(
  previewSource,
  /natalPlacementSourceGroups\(planet, sign, house, motion\).*flatMap/u,
  "Content Studio hydration must not be limited to the visible authoring cards."
);

console.log("Natal placement preview dependency hydration covers exact, composed, generic-floor, motion, house, and node resolver paths.");
