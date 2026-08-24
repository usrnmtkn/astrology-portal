import assert from "node:assert/strict";
import fs from "node:fs";
import { fallbackHookDisplayTitle } from "../apps/admin/src/fallbackHookTitle.ts";

assert.equal(fallbackHookDisplayTitle("article/manual/example"), null);
assert.equal(fallbackHookDisplayTitle("fallback-hook/daily-body/house/1"), "1st House · Daily passage");
assert.equal(fallbackHookDisplayTitle("fallback-hook/daily-headline/house/12"), "12th House · Daily headline");
assert.equal(fallbackHookDisplayTitle("fallback-hook/house-glossary/1"), "1st House · House glossary");
assert.equal(fallbackHookDisplayTitle("fallback-hook/house-meaning/10"), "10th House · House meaning");
assert.equal(fallbackHookDisplayTitle("fallback-hook/placement-house-sentence/chiron/1"), "Chiron in the 1st House · Placement sentence");
assert.equal(fallbackHookDisplayTitle("fallback-hook/placement-house-sentence/jupiter/11"), "Jupiter in the 11th House · Placement sentence");
assert.equal(fallbackHookDisplayTitle("fallback-hook/placement-sentence/moon/scorpio"), "Moon in Scorpio · Planet-in-sign sentence");
assert.equal(fallbackHookDisplayTitle("fallback-hook/angle-sign/ascendant/aries"), "Ascendant · Aries · Angle-in-sign passage");
assert.equal(fallbackHookDisplayTitle("fallback-hook/natal-aspect-lived/lilith/conjunction/sun"), "Lilith + Sun · Conjunction · Natal aspect passage");
assert.equal(fallbackHookDisplayTitle("fallback-hook/synastry-pair/sun/moon/soft"), "Sun + Moon · Soft · Compatibility planet pair");
assert.equal(fallbackHookDisplayTitle("fallback-hook/transit-effect-hard/sun/variant-2"), "Sun · Variant 2 · Hard transit effect");

const source = JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url), "utf8"));
const hookRows = source.hookRows as Array<{ contentKey: string }>;
assert.ok(hookRows.length > 4_000, "The exhaustive title check must cover the complete hook catalog.");

for (const row of hookRows) {
  const title = fallbackHookDisplayTitle(row.contentKey);
  assert.ok(title, `${row.contentKey} must have a display title.`);
  assert.doesNotMatch(title, /^\d+$/u, `${row.contentKey} must not display as a bare number.`);
  assert.ok(title.length >= 8, `${row.contentKey} must have a descriptive display title.`);
}

console.log(`Fallback-hook titles passed: ${hookRows.length} complete catalog rows have descriptive titles.`);
