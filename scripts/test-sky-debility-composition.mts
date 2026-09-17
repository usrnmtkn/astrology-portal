import assert from "node:assert/strict";
import { buildSkyDebilityComposition, skyDebilityMappedText, skyDebilityTemplateTokens } from "../apps/admin/src/skyDebilityComposition.ts";
import { assembleSkyDebilityCopy } from "../apps/web/src/content/skyDebilityAssembly.ts";
import { skyDebilityField } from "../apps/web/src/content/skyDebilityCatalog.ts";
import { skyDebilityPhraseKey, skyDebilityPhraseSets } from "../apps/web/src/content/skyDebilityPhrases.ts";
import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities } from "../apps/web/src/services/planetSignDignity.mjs";
import { approvedThreePlanetContext } from "../tests/fixtures/sky-effort-count-first.ts";

const snapshot = (selected: Record<string, string> = {}) => traditionalSkyDebilities(TRADITIONAL_DIGNITY_PLANETS.map(planet => ({ planet,
  sign: selected[planet] ?? DIGNITY_SIGNS.find(sign => !planetSignDebilities(planet, sign).length)! })));
const base = (key: string) => skyDebilityField(key)?.body;
const edits = (values: Record<string, string | null>) => (key: string) => Object.hasOwn(values, key) ? values[key] : base(key);
let checked = 0;
function verify(selected: Record<string, string>) {
  const sky = snapshot(selected), result = buildSkyDebilityComposition(sky);
  assert.deepEqual(result.copy, assembleSkyDebilityCopy(sky));
  assert.deepEqual(result.errors, []);
  if (result.copy.visible) {
    assert.equal(skyDebilityMappedText(result.heading), result.copy.openingHook);
    assert.deepEqual(result.paragraphs.map(skyDebilityMappedText), result.copy.paragraphs);
    for (const part of [result.heading, result.countLabel, result.countUnit, ...result.paragraphs].flat()) {
      if (part.kind === "fact" || part.kind === "grammar") assert.equal(part.sourceKey, undefined);
      else assert.ok(skyDebilityField(part.sourceKey!), `${part.kind} needs an exact editable source`);
    }
    for (const slot of ["countWord", "totalWord", "countVerb", "planetReference"]) {
      assert.equal(skyDebilityMappedText(result.slots[slot]), result.copy.slots[slot]);
      assert.ok(result.slots[slot].every(part => part.kind === "fact" && !part.sourceKey));
    }
    assert.ok(result.paragraphs[1].some(part => part.sourceKey === `cms/sky-debility/dignityExplanation${sky.count === 1 ? "One" : "Many"}`));
    for (const key of result.copy.selectedPlacementKeys) for (const name of ["livedExperienceClause", "situationPhrase", "responseClause"] as const)
      assert.ok(result.paragraphs.flat().some(part => part.sourceKey === `cms/sky-debility/placement/${key}/${name}`));
    for (const key of result.copy.omittedExamplePlacementKeys) {
      assert.ok(result.paragraphs.flat().some(part => part.sourceKey === `cms/sky-debility/placement/${key}/planetFunctionVerbPhrase`));
      assert.ok(!result.paragraphs.flat().some(part => part.sourceKey === `cms/sky-debility/placement/${key}/responseClause`));
    }
  } else assert.deepEqual(result.paragraphs, []);
  checked++;
}
function all(index: number, selected: Record<string, string>) {
  if (index === TRADITIONAL_DIGNITY_PLANETS.length) return verify(selected);
  const planet = TRADITIONAL_DIGNITY_PLANETS[index];
  all(index + 1, selected);
  for (const row of skyDebilityPhraseSets.filter(row => row.planetTitle === planet)) all(index + 1, { ...selected, [planet]: row.signTitle });
}
all(0, {});
assert.equal(checked, 6912);
const original = snapshot({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" });
assert.equal(skyDebilityMappedText(buildSkyDebilityComposition(original).paragraphs[1]), approvedThreePlanetContext);
const venusKey = skyDebilityPhraseKey("Venus", "Scorpio", "livedExperienceClause");
const marsKey = skyDebilityPhraseKey("Mars", "Cancer", "livedExperienceClause");
const sameText = "need more time to answer";
const identical = buildSkyDebilityComposition(original, edits({ [venusKey]: sameText, [marsKey]: sameText }));
assert.deepEqual(identical.errors, []);
assert.deepEqual(identical.slots.livedExperienceList.filter(part => part.text === sameText).map(part => part.sourceKey), [venusKey, marsKey]);
const contextKey = "cms/sky-debility/contextTemplate";
const custom = buildSkyDebilityComposition(original, edits({ [contextKey]: "It may help to {responseList}. {planetList} {signConditionClause} how we {planetFunctionList}." }));
assert.deepEqual(custom.errors, []);
assert.equal(skyDebilityMappedText(custom.paragraphs[1]), custom.copy.paragraphs[1]);
assert.equal(custom.paragraphs[1][0].sourceKey, contextKey);
assert.equal(custom.copy.legacyContext, true);
const one = buildSkyDebilityComposition(snapshot({ Saturn: "Aries" }));
assert.deepEqual(one.errors, []);
assert.ok(one.paragraphs[1].some(part => part.text === "Aries" && part.kind === "fact" && !part.sourceKey));
assert.ok(one.paragraphs[1].some(part => part.sourceKey === "cms/sky-debility/dignityExplanationOne"));
const editedExplanation = buildSkyDebilityComposition(snapshot({ Saturn: "Aries" }), edits({ "cms/sky-debility/dignityExplanationOne": "For this example the calculated sign is {signTitle}." }));
assert.deepEqual(editedExplanation.errors, []);
assert.ok(editedExplanation.copy.body.includes("For this example the calculated sign is Aries."));
const reordered = buildSkyDebilityComposition(snapshot({ Mercury: "Pisces", Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" }), edits({
  "cms/sky-debility/exampleOrder": "Saturn, Venus, Mars, Mercury, Moon, Sun, Jupiter"
}));
assert.deepEqual(reordered.errors, []);
assert.deepEqual(reordered.copy.selectedPlacementKeys, ["saturn/aries", "venus/scorpio", "mars/cancer"]);
for (const missing of [null, ""]) for (const key of [venusKey, "cms/sky-debility/dignityExplanationMany"]) {
  const gap = buildSkyDebilityComposition(original, edits({ [key]: missing }));
  assert.equal(gap.copy.visible, false);
  assert.equal(gap.paragraphs.length, 0);
}
const reads = new Map<string, number>();
buildSkyDebilityComposition(original, key => { reads.set(key, (reads.get(key) ?? 0) + 1); return base(key); });
assert.ok([...reads.values()].every(count => count === 1), "Map and reader must share one captured source snapshot");
assert.deepEqual(skyDebilityTemplateTokens("You may {livedExperienceList}. {situationList}. {livedExperienceList}"), ["livedExperienceList", "situationList"]);
console.log(JSON.stringify({ result: "passed", mappedCombinationStates: checked, parity: "byte-for-byte with reader assembler", exactSourceRouting: true, calculatedCountTokens: true, singleReadSnapshot: true }, null, 2));
