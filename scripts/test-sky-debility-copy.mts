import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skyDebilityFields, skyDebilityField, skyDebilityTemplateErrors } from "../apps/web/src/content/skyDebilityCatalog.ts";
import { assembleSkyDebilityCopy, joinSkyDebilityList } from "../apps/web/src/content/skyDebilityAssembly.ts";
import { skyDebilityPhraseSets, skyDebilityPhraseNames, skyDebilityPhraseKey, skyDebilityPlacementId } from "../apps/web/src/content/skyDebilityPhrases.ts";
import { resolveSkyDebilityCopy, skyDebilityContentKeys } from "../apps/web/src/content/skyDebilityCopy.ts";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState.ts";
import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities } from "../apps/web/src/services/planetSignDignity.mjs";

const neutral = (planet: string) => DIGNITY_SIGNS.find(sign => !planetSignDebilities(planet, sign).length)!;
function positions(selected: Record<string, string> = {}) {
  return TRADITIONAL_DIGNITY_PLANETS.map(planet => ({ planet, sign: selected[planet] ?? neutral(planet) }));
}
const snapshot = (selected: Record<string, string> = {}) => traditionalSkyDebilities(positions(selected));
const defaultRead = (key: string) => skyDebilityField(key)?.body;
const withEdits = (edits: Record<string, string | null>) => (key: string) => Object.hasOwn(edits, key) ? edits[key] : defaultRead(key);
assert.equal(skyDebilityPhraseSets.length, 18);
assert.equal(new Set(skyDebilityContentKeys()).size, skyDebilityFields.length);
assert.equal(skyDebilityFields.length, 85);
assert.match(
  readFileSync(new URL("../apps/web/src/content/cmsSurfaceOverrides.ts", import.meta.url), "utf8"),
  /skyDebility:\s*\(\) => skyDebilityFields\.map\(field => field\.key\)/u
);
assert.ok(skyDebilityContentKeys().includes("cms/sky-debility/signConditionMany"));
assert.ok(skyDebilityContentKeys().includes("cms/sky-debility/signConditionOne"));
for (const field of skyDebilityFields) assert.deepEqual(skyDebilityTemplateErrors(field.key, field.body), [], field.key);
for (const planet of TRADITIONAL_DIGNITY_PLANETS) for (const sign of DIGNITY_SIGNS) {
  const authored = skyDebilityPhraseSets.filter(row => row.planetTitle === planet && row.signTitle === sign);
  assert.equal(authored.length, planetSignDebilities(planet, sign).length ? 1 : 0, `${planet}/${sign}`);
}
assert.equal(joinSkyDebilityList(["a", "b"], "or"), "a or b");
assert.equal(joinSkyDebilityList(["a", "b", "c"], "and"), "a, b, and c");
for (const row of skyDebilityPhraseSets) {
  const copy = assembleSkyDebilityCopy(snapshot({ [row.planetTitle]: row.signTitle }));
  assert.equal(copy.visible, true);
  assert.deepEqual(copy.errors, []);
  assert.equal(copy.countUnit, "planet");
  assert.equal(copy.countLabel, "1 of 7");
  assert.ok(copy.paragraphs[0].startsWith(`You may ${row.livedExperienceClause}.`));
  assert.ok(copy.paragraphs[1].endsWith(`It may help to ${row.responseClause}.`));
  assert.ok(copy.paragraphs[1].includes(` is in ${row.signTitle}, a sign that complicates how we ${row.planetFunctionVerbPhrase}.`));
  assert.equal(copy.slots.signTitle, row.signTitle);
}
assert.match(assembleSkyDebilityCopy(snapshot({ Sun: "Aquarius" })).paragraphs[1], /^The Sun is /u);
assert.match(assembleSkyDebilityCopy(snapshot({ Moon: "Scorpio" })).paragraphs[1], /^The Moon is /u);
assert.equal(assembleSkyDebilityCopy(snapshot()).visible, false);
assert.equal(assembleSkyDebilityCopy(snapshot()).openingHook, "");
assert.equal(assembleSkyDebilityCopy(traditionalSkyDebilities([])).hiddenReason, "incomplete-sky");

// Owner refinement: name the single planet's calculated sign and remove the disclaimer.
const saturn = snapshot({ Saturn: "Aries" });
const refinedSaturn = "Saturn is in Aries, a sign that complicates how we take responsibility. Detriment and fall describe signs where a planet has a harder time doing its usual work. It may help to give yourself time to think before committing.";
assert.equal(assembleSkyDebilityCopy(saturn).paragraphs[1], refinedSaturn);
const connectorKey = "cms/sky-debility/signConditionOne";
assert.deepEqual(skyDebilityField(connectorKey)?.allowedSlots, ["signTitle"]);
for (const bad of ["is in a sign that complicates", "is in {unknown}, a sign that complicates", "is in {{signTitle}}, a sign that complicates", "is in {signTitle} and {signTitle}", "is in {signTitle}, a sign that complicates {responseList}", "is in <b>{signTitle}</b>, a sign that complicates"]) {
  assert.ok(skyDebilityTemplateErrors(connectorKey, bad).length, bad);
  assert.equal(assembleSkyDebilityCopy(saturn, withEdits({ [connectorKey]: bad })).visible, false);
}
const customConnector = "moves through {signTitle}, a sign that complicates";
assert.deepEqual(skyDebilityTemplateErrors(connectorKey, customConnector), []);
assert.ok(assembleSkyDebilityCopy(saturn, withEdits({ [connectorKey]: customConnector })).paragraphs[1].startsWith("Saturn moves through Aries, a sign that complicates"));
assert.ok(skyDebilityTemplateErrors(skyDebilityPhraseKey("Saturn", "Aries", "responseClause"), "consider {signTitle}").length);

const original = snapshot({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" });
const originalCopy = assembleSkyDebilityCopy(original);
assert.equal(originalCopy.paragraphs[0], "You may want reassurance but find it hard to ask for, hold in your frustration until it comes out more sharply than you intended, or feel pressure to make a decision before you are ready. A conversation with someone you love, a disagreement at work, or a new commitment can take more out of you than you expected.");
assert.equal(originalCopy.paragraphs[1], "Venus, Mars, and Saturn are in signs that complicate how we connect, handle anger, and take responsibility. Detriment and fall describe signs where a planet has a harder time doing its usual work. It may help to ask directly for the support you need, say what is bothering you before resentment builds, and give yourself time to think before committing.");
assert.equal(originalCopy.slots.signTitle, undefined);
assert.deepEqual(assembleSkyDebilityCopy(original, withEdits({ [connectorKey]: null })), originalCopy);
assert.deepEqual(assembleSkyDebilityCopy(traditionalSkyDebilities([...positions({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" })].reverse())), originalCopy);
const duplicateMercury = traditionalSkyDebilities([...positions({ Mercury: "Pisces" }), { planet: "Mercury", sign: "Pisces" }, { planet: "Uranus", sign: "Leo" }]);
assert.equal(duplicateMercury.count, 1);
assert.deepEqual(duplicateMercury.planets[0].dignities, ["detriment", "fall"]);

// Exhaustive content states, not a claim that every tuple can occur on a date.
// Each body has one non-qualifying state plus each of its qualifying signs.
let checked = 0;
const counts = Array(8).fill(0);
function checkCombination(index: number, selected: Record<string, string>) {
  if (index === TRADITIONAL_DIGNITY_PLANETS.length) {
    const sky = snapshot(selected), copy = assembleSkyDebilityCopy(sky);
    checked++; counts[sky.count]++;
    assert.deepEqual(copy.errors, []);
    assert.equal(copy.visible, sky.count > 0);
    assert.equal(copy.allPlacementKeys.length, sky.count);
    assert.equal(copy.selectedPlacementKeys.length, Math.min(3, sky.count));
    if (!sky.count) return;
    assert.equal(copy.paragraphs.length, 2);
    assert.doesNotMatch(copy.body, /undefined|null|\{[^}]*\}|\.\.|\s[,.]/u);
    assert.ok(copy.body.includes("Detriment and fall describe signs where a planet has a harder time doing its usual work."));
    assert.ok(!copy.body.includes("not a prediction"));
    if (sky.count === 1) assert.ok(copy.paragraphs[1].includes(` is in ${sky.planets[0].sign}, a sign that complicates`));
    for (const planet of sky.planets) {
      assert.ok(copy.slots.planetList.includes(planet.planet));
      const key = skyDebilityPlacementId(planet.planet, planet.sign);
      const row = skyDebilityPhraseSets.find(row => skyDebilityPlacementId(row.planetTitle, row.signTitle) === key)!;
      assert.ok(copy.slots.planetFunctionList.includes(row.planetFunctionVerbPhrase));
      if (copy.selectedPlacementKeys.includes(key)) {
        assert.ok(copy.slots.livedExperienceList.includes(row.livedExperienceClause));
        assert.ok(copy.slots.situationList.toLowerCase().includes(row.situationPhrase.toLowerCase()));
        assert.ok(copy.slots.responseList.includes(row.responseClause));
      } else {
        assert.ok(copy.omittedExamplePlacementKeys.includes(key));
        assert.ok(!copy.slots.responseList.includes(row.responseClause));
      }
    }
    return;
  }
  const planet = TRADITIONAL_DIGNITY_PLANETS[index];
  checkCombination(index + 1, selected);
  for (const row of skyDebilityPhraseSets.filter(row => row.planetTitle === planet)) checkCombination(index + 1, { ...selected, [planet]: row.signTitle });
}
checkCombination(0, {});
assert.equal(checked, 6912);
assert.ok(counts.every(count => count > 0));

const four = snapshot({ Mercury: "Pisces", Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" });
const reordered = assembleSkyDebilityCopy(four, withEdits({ "cms/sky-debility/exampleOrder": "Saturn, Venus, Mars, Mercury, Moon, Sun, Jupiter" }));
assert.deepEqual(reordered.selectedPlacementKeys, ["saturn/aries", "venus/scorpio", "mars/cancer"]);
assert.deepEqual(reordered.omittedExamplePlacementKeys, ["mercury/pisces"]);
assert.equal(reordered.countLabel, "4 of 7");
assert.ok(reordered.slots.planetFunctionList.includes("make ourselves understood"));
const venusKey = skyDebilityPhraseKey("Venus", "Scorpio", "livedExperienceClause");
for (const bad of ["", "You may need support", "need support.", "and need support", "need {anotherField}"]) {
  assert.ok(skyDebilityTemplateErrors(venusKey, bad).length);
  assert.equal(assembleSkyDebilityCopy(original, withEdits({ [venusKey]: bad })).visible, false);
}
assert.equal(assembleSkyDebilityCopy(original, withEdits({ [venusKey]: null })).visible, false);
assert.ok(skyDebilityTemplateErrors("cms/sky-debility/experienceTemplate", "You may {wrong}.").length);
assert.ok(skyDebilityTemplateErrors("cms/sky-debility/exampleOrder", "Sun, Sun, Moon").length);
assert.ok(skyDebilityTemplateErrors("cms/sky-debility/many", "Two planets.").some(error => error.includes("{count}")));
const changed = assembleSkyDebilityCopy(original, withEdits({ [venusKey]: "need support but hesitate to name what would help" }));
assert.ok(changed.body.includes("need support but hesitate to name what would help"));
assert.ok(changed.body.includes("ask directly for the support you need"));
assert.ok(!assembleSkyDebilityCopy(snapshot({ Venus: "Aries" }), withEdits({ [venusKey]: "need support but hesitate to name what would help" })).body.includes("hesitate to name"));

const liveTime = "2026-09-16T00:00:00.000Z";
const row = (key: string, body: string, status = "LIVE") => ({ id: `live:${key}`, contentKey: key, body, status, updatedAt: liveTime });
assert.ok(resolveSkyDebilityCopy(new Map([[connectorKey, row(connectorKey, customConnector)]]) as never, saturn).paragraphs[1].startsWith("Saturn moves through Aries"));
assert.equal(resolveSkyDebilityCopy(new Map([[connectorKey, row(connectorKey, customConnector, "DRAFT")]]) as never, saturn).paragraphs[1], refinedSaturn);
const editedBody = "need support but hesitate to name what would help";
assert.ok(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody)]]) as never, original).body.includes(editedBody));
for (const status of ["DRAFT", "REVIEWED", "ARCHIVED"]) {
  assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody, status)]]) as never, original).body, originalCopy.body);
}
installContentPublications([{ content_key: venusKey, state: "live", revision: 1, row_id: `live:${venusKey}`, row_updated_at: liveTime, updated_at: liveTime }]);
assert.equal(resolveSkyDebilityCopy(undefined, original).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, { ...row(venusKey, editedBody), id: "stale" }]]) as never, original).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody)]]) as never, original).visible, true);
installContentPublications([{ content_key: venusKey, state: "retired", revision: 2, row_id: null, row_updated_at: null, updated_at: liveTime }]);
assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody)]]) as never, original).visible, false);
assert.equal(resolveSkyDebilityCopy(undefined, snapshot({ Venus: "Aries" })).visible, true);
console.log(JSON.stringify({ result: "passed", placementSets: skyDebilityPhraseSets.length, catalogFields: skyDebilityFields.length, activeEditableFields: 80, retainedLegacyFields: 5, combinationStatesChecked: checked, countsByQualifyingPlanets: counts, lifecycleChecks: "live/draft/stale/retired", refinedSaturnExample: "exact match", sharedExplanation: "updated for every combination" }, null, 2));
