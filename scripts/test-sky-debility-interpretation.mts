import assert from "node:assert/strict";
import { skyDebilityInterpretationKey, skyDebilityInterpretationPlacements, skyDebilityInterpretationErrors, skyDebilityInterpretationSlots } from "../apps/web/src/content/skyDebilityInterpretation.ts";
import { resolveSkyDebilityCopy } from "../apps/web/src/content/skyDebilityCopy.ts";
import { skyDebilityField, skyDebilityTemplateErrors } from "../apps/web/src/content/skyDebilityCatalog.ts";
import { traditionalSkyDebilities } from "../apps/web/src/services/planetSignDignity.mjs";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState.ts";
import { buildSkyDebilityComposition, skyDebilityMappedText } from "../apps/admin/src/skyDebilityComposition.ts";
import { presentSkyDebilityParts, skyDebilityPlacementLinks, skyDebilityTemplateParts, type SkyDebilityDisplayPosition } from "../apps/web/src/content/skyDebilityPresentation.ts";
import type { LiveGeneratedContent } from "../apps/web/src/services/generatedContent.ts";

// Synthetic content-state fixtures; these are not calculated historical skies.
const positions: SkyDebilityDisplayPosition[] = [
  { planet: "Sun", sign: "Libra", motion: "direct" }, { planet: "Moon", sign: "Taurus", motion: "direct" },
  { planet: "Mercury", sign: "Gemini", motion: "direct" }, { planet: "Venus", sign: "Scorpio", motion: "retrograde" },
  { planet: "Mars", sign: "Aries", motion: "direct" }, { planet: "Jupiter", sign: "Leo", motion: "direct" },
  { planet: "Saturn", sign: "Aries", motion: "retrograde" }
];
const change = (planet: string, values: Partial<SkyDebilityDisplayPosition>) => positions.map(row => row.planet === planet ? { ...row, ...values } : row);
const key = skyDebilityInterpretationKey(positions)!;
assert.equal(key, "cms/sky-debility/reading/sun-libra-direct__venus-scorpio-retrograde__saturn-aries-retrograde");
assert.equal(skyDebilityInterpretationKey([...positions].reverse()), key);
assert.equal(skyDebilityInterpretationKey(positions.map(row => ({ ...row, planet: ` ${row.planet.toUpperCase()} `, sign: row.sign.toLowerCase() }))), key);
assert.equal(skyDebilityInterpretationKey(change("Sun", { motion: "retrograde" })), key, "Luminary motion is always direct.");
for (const input of [positions.slice(1), change("Venus", { motion: undefined }), [...positions, positions[3]], [...positions, { ...positions[1], sign: "Scorpio" }]]) assert.equal(skyDebilityInterpretationKey(input), null);
for (const input of [change("Moon", { sign: "Scorpio" }), change("Venus", { sign: "Virgo" }), change("Venus", { motion: "direct" }), change("Saturn", { sign: "Pisces" })]) assert.notEqual(skyDebilityInterpretationKey(input), key);
assert.equal(skyDebilityInterpretationPlacements(key)?.length, 3);
for (const bad of [key + "__saturn-aries-retrograde", key.replace("libra", "aries"), key.replace("sun-libra-direct", "sun-libra-retrograde"), key.replace("retrograde", "unknown"), key + "-extra"]) assert.equal(skyDebilityInterpretationPlacements(bad), null);
assert.deepEqual(skyDebilityField(key)?.allowedSlots, skyDebilityInterpretationSlots);
const body = "Fixture opening retained in full.\n\n{countWord} of the {totalWord} classical planets {countVerb} represented here: {planetList}.\n\nFixture final sentence retained in full.";
assert.deepEqual(skyDebilityTemplateErrors(key, body, "Fixture heading"), []);
for (const bad of ["", body.replace("{planetList}", ""), body + " {livedExperienceList}", body + " {planetList}", body + " {{count}}", body + " <b>markup</b>"]) assert.ok(skyDebilityInterpretationErrors(key, bad).length);
assert.ok(skyDebilityTemplateErrors(key, body, "").length);
const row: LiveGeneratedContent = { id: "fixture-reading", contentKey: key, headline: "Fixture heading", body, summary: null, surface: "sky", mode: "card", eventType: null, targetDate: null, sections: null, model: null, updatedAt: "2026-10-05T12:00:00.000Z", status: "LIVE" };
const content = new Map([[key, row]]);
const snapshot = traditionalSkyDebilities(positions);
const copy = resolveSkyDebilityCopy(content, snapshot, positions);
assert.equal(copy.interpretationKey, key);
assert.equal(copy.openingHook, row.headline);
assert.equal(copy.paragraphs[0], "Fixture opening retained in full.");
assert.equal(copy.paragraphs.at(-1), "Fixture final sentence retained in full.");
assert.equal(copy.selectedPlacementKeys.length, 3);
assert.equal(copy.omittedExamplePlacementKeys.length, 0);
assert.deepEqual(copy.requiredKeys, [key]);
const composition = buildSkyDebilityComposition(snapshot, () => null, row);
assert.deepEqual(composition.paragraphs.map(skyDebilityMappedText), copy.paragraphs);
const incomplete = buildSkyDebilityComposition(snapshot, () => null, { ...row, headline: "", body: "Incomplete fixture draft." });
assert.equal(incomplete.copy.visible, false);
assert.equal(incomplete.copy.interpretationKey, key);
assert.deepEqual(incomplete.copy.paragraphTemplates, ["Incomplete fixture draft."]);
const links = skyDebilityPlacementLinks(copy.allPlacementKeys, positions, "reading");
for (let i = 0; i < copy.paragraphs.length; i++) {
  const plain = presentSkyDebilityParts(skyDebilityTemplateParts(copy.paragraphTemplates[i], copy.slots), links);
  const mapped = presentSkyDebilityParts(composition.paragraphs[i], links);
  assert.equal(plain.map(part => part.text).join(""), mapped.map(part => part.text).join(""));
  assert.equal(plain.map(part => part.text).join(""), copy.paragraphs[i]);
}
assert.deepEqual(links.map(link => link.text), ["the Sun in Libra", "Venus retrograde in Scorpio", "Saturn retrograde in Aries"]);
assert.equal(copy.slots.planetList, "the Sun in Libra, Venus retrograde in Scorpio, and Saturn retrograde in Aries");
assert.deepEqual(skyDebilityPlacementLinks(copy.allPlacementKeys, positions).map(link => link.text), ["Sun in Libra", "Venus Rx in Scorpio", "Saturn Rx in Aries"], "Existing cards keep their approved compact presentation.");
for (const status of ["DRAFT", "REVIEWED", "ARCHIVED"] as const) assert.equal(resolveSkyDebilityCopy(new Map([[key, { ...row, status }]]), snapshot, positions).interpretationKey, "");
for (const input of [change("Moon", { sign: "Scorpio" }), change("Venus", { motion: "direct" })]) {
  assert.equal(resolveSkyDebilityCopy(content, traditionalSkyDebilities(input), input).interpretationKey, "");
  const nextKey = skyDebilityInterpretationKey(input)!;
  const next = { ...row, id: "fixture-next-reading", contentKey: nextKey, headline: "Different fixture heading", body: "Different fixture opening.\n\n{planetList}.\n\nDifferent fixture ending." };
  const nextCopy = resolveSkyDebilityCopy(new Map([...content, [nextKey, next]]), traditionalSkyDebilities(input), input);
  assert.equal(nextCopy.openingHook, next.headline);
  assert.equal(nextCopy.paragraphs[0], "Different fixture opening.");
  assert.equal(nextCopy.allPlacementKeys.length, traditionalSkyDebilities(input).count);
}
installContentPublications([{ content_key: key, state: "live", revision: 1, row_id: row.id, row_updated_at: row.updatedAt, updated_at: row.updatedAt }]);
assert.equal(resolveSkyDebilityCopy(content, snapshot, positions).visible, true);
assert.equal(resolveSkyDebilityCopy(undefined, snapshot, positions).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[key, { ...row, updatedAt: "2026-10-04T12:00:00.000Z" }]]), snapshot, positions).visible, false);
installContentPublications([{ content_key: key, state: "retired", revision: 2, row_id: row.id, row_updated_at: row.updatedAt, updated_at: "2026-10-05T13:00:00.000Z" }]);
assert.equal(resolveSkyDebilityCopy(content, snapshot, positions).visible, false);
console.log("Complete effort readings: exact combination/motion, full copy, editor parity, draft/stale/retired boundaries passed.");
