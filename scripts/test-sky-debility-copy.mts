import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skyDebilityFields, skyDebilityField, skyDebilityTemplateErrors } from "../apps/web/src/content/skyDebilityCatalog.ts";
import { assembleSkyDebilityCopy, joinSkyDebilityList } from "../apps/web/src/content/skyDebilityAssembly.ts";
import { skyDebilityPhraseSets, skyDebilityPhraseKey, skyDebilityPlacementId } from "../apps/web/src/content/skyDebilityPhrases.ts";
import { resolveSkyDebilityCopy, skyDebilityContentKeys } from "../apps/web/src/content/skyDebilityCopy.ts";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState.ts";
import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities } from "../apps/web/src/services/planetSignDignity.mjs";
import { approvedThreePlanetContext, singularSaturnContext } from "../tests/fixtures/sky-effort-count-first.ts";

const neutral = (planet: string) => DIGNITY_SIGNS.find(sign => !planetSignDebilities(planet, sign).length)!;
const positions = (selected: Record<string, string> = {}) => TRADITIONAL_DIGNITY_PLANETS.map(planet => ({ planet, sign: selected[planet] ?? neutral(planet) }));
const snapshot = (selected: Record<string, string> = {}) => traditionalSkyDebilities(positions(selected));
const defaultRead = (key: string) => skyDebilityField(key)?.body;
const withEdits = (edits: Record<string, string | null>) => (key: string) => Object.hasOwn(edits, key) ? edits[key] : defaultRead(key);
const contextKey = "cms/sky-debility/contextTemplate";
const oneKey = "cms/sky-debility/dignityExplanationOne";
const manyKey = "cms/sky-debility/dignityExplanationMany";
const connectorKey = "cms/sky-debility/signConditionOne";
const legacyContext = "{planetList} {signConditionClause} how we {planetFunctionList}. It may help to {responseList}.";
const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
assert.equal(skyDebilityPhraseSets.length, 18);
assert.equal(new Set(skyDebilityContentKeys()).size, skyDebilityFields.length);
assert.equal(skyDebilityFields.length, 87);
assert.match(readFileSync(new URL("../apps/web/src/content/cmsSurfaceOverrides.ts", import.meta.url), "utf8"), /skyDebility:\s*\(\) => skyDebilityFields\.map\(field => field\.key\)/u);
for (const key of [oneKey, manyKey, connectorKey, "cms/sky-debility/signConditionMany"]) assert.ok(skyDebilityContentKeys().includes(key));
for (const field of skyDebilityFields) assert.deepEqual(skyDebilityTemplateErrors(field.key, field.body), [], field.key);
for (const planet of TRADITIONAL_DIGNITY_PLANETS) for (const sign of DIGNITY_SIGNS) {
  assert.equal(skyDebilityPhraseSets.filter(row => row.planetTitle === planet && row.signTitle === sign).length, planetSignDebilities(planet, sign).length ? 1 : 0, `${planet}/${sign}`);
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
  assert.ok(copy.paragraphs[1].startsWith("One out of the seven classical planets is currently in detriment or fall: "));
  assert.ok(copy.paragraphs[1].includes(`moving through ${row.signTitle}, a sign that makes it harder for it`));
  assert.ok(copy.paragraphs[1].includes(`With this planet involved, you may notice that it takes more effort to ${row.planetFunctionVerbPhrase}.`));
  assert.ok(copy.paragraphs[1].endsWith(`It may help to ${row.responseClause}.`));
  assert.equal(copy.slots.signTitle, row.signTitle);
}
assert.match(assembleSkyDebilityCopy(snapshot({ Sun: "Aquarius" })).paragraphs[1], /fall: the Sun\./u);
assert.match(assembleSkyDebilityCopy(snapshot({ Moon: "Scorpio" })).paragraphs[1], /fall: the Moon\./u);
assert.equal(assembleSkyDebilityCopy(snapshot()).visible, false);
assert.equal(assembleSkyDebilityCopy(snapshot()).openingHook, "");
assert.equal(assembleSkyDebilityCopy(traditionalSkyDebilities([])).hiddenReason, "incomplete-sky");
const saturn = snapshot({ Saturn: "Aries" });
assert.equal(assembleSkyDebilityCopy(saturn).paragraphs[1], singularSaturnContext);
for (const bad of [null, "", "This means it is in a difficult sign.", "This means it is in {unknown}.", "This means it is in {{signTitle}}.", "{signTitle} and {signTitle}.", "This means it is in <b>{signTitle}</b>."]) {
  if (bad !== null) assert.ok(skyDebilityTemplateErrors(oneKey, bad).length);
  assert.equal(assembleSkyDebilityCopy(saturn, withEdits({ [oneKey]: bad })).visible, false);
}
assert.equal(assembleSkyDebilityCopy(saturn, withEdits({ [manyKey]: null })).paragraphs[1], singularSaturnContext);
assert.equal(assembleSkyDebilityCopy(saturn, withEdits({ [connectorKey]: "is in {signTitle}, a sign that has a harder time doing it's usual work" })).paragraphs[1], singularSaturnContext);
assert.equal(assembleSkyDebilityCopy(saturn, withEdits({ [connectorKey]: null })).paragraphs[1], singularSaturnContext);
// Previous owner-edited templates retain their own complete slot contract.
const customConnector = "moves through {signTitle}, a sign that complicates";
assert.deepEqual(skyDebilityTemplateErrors(contextKey, legacyContext), []);
assert.ok(assembleSkyDebilityCopy(saturn, withEdits({ [contextKey]: legacyContext, [connectorKey]: customConnector })).paragraphs[1].startsWith("Saturn moves through Aries"));
for (const bad of ["is in a sign that complicates", "is in {unknown}", "is in {{signTitle}}", "is in {signTitle} and {signTitle}"]) {
  assert.ok(skyDebilityTemplateErrors(connectorKey, bad).length);
  assert.equal(assembleSkyDebilityCopy(saturn, withEdits({ [contextKey]: legacyContext, [connectorKey]: bad })).visible, false);
}
for (const slot of skyDebilityField(contextKey)!.allowedSlots) {
  const body = defaultRead(contextKey)!;
  assert.ok(skyDebilityTemplateErrors(contextKey, body.replace(`{${slot}}`, "")).length, slot);
  assert.ok(skyDebilityTemplateErrors(contextKey, body + ` {${slot}}`).length, slot);
}
assert.ok(skyDebilityTemplateErrors(contextKey, `${defaultRead(contextKey)} {signConditionClause}`).length);
assert.ok(skyDebilityTemplateErrors(skyDebilityPhraseKey("Saturn", "Aries", "responseClause"), "consider {signTitle}").length);

const original = snapshot({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" });
const originalCopy = assembleSkyDebilityCopy(original);
assert.equal(originalCopy.paragraphs[0], "You may want reassurance but find it hard to ask for, hold in your frustration until it comes out more sharply than you intended, or feel pressure to make a decision before you are ready. A conversation with someone you love, a disagreement at work, or a new commitment can take more out of you than you expected.");
assert.equal(originalCopy.paragraphs[1], approvedThreePlanetContext);
assert.equal(originalCopy.slots.signTitle, undefined);
assert.deepEqual(assembleSkyDebilityCopy(original, withEdits({ [oneKey]: null, "cms/sky-debility/signConditionMany": "are now in signs that complicate" })), originalCopy);
assert.deepEqual(assembleSkyDebilityCopy(traditionalSkyDebilities([...positions({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" })].reverse())), originalCopy);
const duplicateMercury = traditionalSkyDebilities([...positions({ Mercury: "Pisces" }), { planet: "Mercury", sign: "Pisces" }, { planet: "Uranus", sign: "Leo" }]);
assert.equal(duplicateMercury.count, 1);
assert.deepEqual(duplicateMercury.planets[0].dignities, ["detriment", "fall"]);
assert.match(assembleSkyDebilityCopy(duplicateMercury).paragraphs[1], /^One out of the seven classical planets is/u);

// Cartesian content states, not a claim every tuple occurs in the physical sky.
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
    assert.ok(copy.paragraphs[1].startsWith(`${words[sky.count]} out of the seven classical planets ${sky.count === 1 ? "is" : "are"} currently in detriment or fall: `));
    assert.doesNotMatch(copy.paragraphs[1], /signs that complicate|not a prediction/u);
    assert.ok(copy.paragraphs[1].includes(sky.count === 1 ? "With this planet involved" : "With these planets involved"));
    if (sky.count > 1) assert.ok(copy.paragraphs[1].includes("This means they are moving through signs that make it harder for them to do their usual work."));
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
assert.match(reordered.paragraphs[1], /^Four out of the seven/u);
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
const editedBody = "need support but hesitate to name what would help";
const changed = assembleSkyDebilityCopy(original, withEdits({ [venusKey]: editedBody }));
assert.ok(changed.body.includes(editedBody));
assert.ok(changed.body.includes("ask directly for the support you need"));
assert.ok(!assembleSkyDebilityCopy(snapshot({ Venus: "Aries" }), withEdits({ [venusKey]: editedBody })).body.includes("hesitate to name"));

const liveTime = "2026-09-16T00:00:00.000Z";
const row = (key: string, body: string, status = "LIVE") => ({ id: `live:${key}`, contentKey: key, body, status, updatedAt: liveTime });
assert.ok(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody)]]) as never, original).body.includes(editedBody));
for (const status of ["DRAFT", "REVIEWED", "ARCHIVED"]) assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody, status)]]) as never, original).body, originalCopy.body);
assert.equal(resolveSkyDebilityCopy(new Map([[connectorKey, row(connectorKey, customConnector)]]) as never, saturn).paragraphs[1], singularSaturnContext);
assert.ok(resolveSkyDebilityCopy(new Map([[contextKey, row(contextKey, legacyContext)], [connectorKey, row(connectorKey, customConnector)]]) as never, saturn).paragraphs[1].startsWith("Saturn moves through Aries"));
installContentPublications([{ content_key: venusKey, state: "live", revision: 1, row_id: `live:${venusKey}`, row_updated_at: liveTime, updated_at: liveTime }]);
assert.equal(resolveSkyDebilityCopy(undefined, original).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, { ...row(venusKey, editedBody), id: "stale" }]]) as never, original).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody)]]) as never, original).visible, true);
installContentPublications([{ content_key: venusKey, state: "retired", revision: 2, row_id: null, row_updated_at: null, updated_at: liveTime }]);
assert.equal(resolveSkyDebilityCopy(new Map([[venusKey, row(venusKey, editedBody)]]) as never, original).visible, false);
assert.equal(resolveSkyDebilityCopy(undefined, snapshot({ Venus: "Aries" })).visible, true);
const explanation = "This is a saved explanation for {signTitle}.";
assert.ok(resolveSkyDebilityCopy(new Map([[oneKey, row(oneKey, explanation)]]) as never, saturn).body.includes("This is a saved explanation for Aries."));
assert.equal(resolveSkyDebilityCopy(new Map([[oneKey, row(oneKey, explanation, "DRAFT")]]) as never, saturn).paragraphs[1], singularSaturnContext);
installContentPublications([{ content_key: oneKey, state: "live", revision: 3, row_id: `live:${oneKey}`, row_updated_at: liveTime, updated_at: liveTime }]);
assert.equal(resolveSkyDebilityCopy(undefined, saturn).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[oneKey, { ...row(oneKey, explanation), id: "stale" }]]) as never, saturn).visible, false);
assert.equal(resolveSkyDebilityCopy(new Map([[oneKey, row(oneKey, explanation)]]) as never, saturn).visible, true);
installContentPublications([{ content_key: oneKey, state: "retired", revision: 4, row_id: null, row_updated_at: null, updated_at: liveTime }]);
assert.equal(resolveSkyDebilityCopy(undefined, saturn).visible, false);
console.log(JSON.stringify({ result: "passed", placementSets: 18, catalogFields: skyDebilityFields.length, combinationStatesChecked: checked, countsByQualifyingPlanets: counts, lifecycleChecks: "live/draft/stale/retired", ownerParagraph: "exact match", legacyOverrides: "preserved without mixing", countAndGrammar: "calculated for every combination" }, null, 2));
