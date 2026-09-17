import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assembleSkyDebilityCopy } from "../apps/web/src/content/skyDebilityAssembly.ts";
import { skyDebilityField } from "../apps/web/src/content/skyDebilityCatalog.ts";
import { skyDebilityPhraseSets } from "../apps/web/src/content/skyDebilityPhrases.ts";
import { buildSkyDebilityComposition } from "../apps/admin/src/skyDebilityComposition.ts";
import { SkyDebilityCard } from "../apps/web/src/features/sky/SkyDebilityCard.tsx";
import { presentSkyDebilityParts, skyDebilityPlacementLinks, skyDebilityTemplateParts, type SkyDebilityDisplayPart } from "../apps/web/src/content/skyDebilityPresentation.ts";
import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities } from "../apps/web/src/services/planetSignDignity.mjs";
import { linkedThreePlanetContext, highlightedCountStatement } from "../tests/fixtures/sky-effort-count-first.ts";

const textOf = (parts: readonly SkyDebilityDisplayPart[]) => parts.map(part => part.text).join("");
const positions = (selected: Record<string, string>, motion: "direct" | "retrograde" = "direct") => TRADITIONAL_DIGNITY_PLANETS.map(planet => ({
  planet, sign: selected[planet] ?? DIGNITY_SIGNS.find(sign => !planetSignDebilities(planet, sign).length)!, motion
}));
let combinations = 0, presentations = 0;
const countCoverage = new Set<number>();
function verify(selected: Record<string, string>) {
  combinations++;
  for (const motion of ["direct", "retrograde"] as const) {
    const skyPositions = positions(selected, motion);
    const snapshot = traditionalSkyDebilities(skyPositions);
    const copy = assembleSkyDebilityCopy(snapshot);
    const map = buildSkyDebilityComposition(snapshot);
    assert.deepEqual(map.errors, []);
    countCoverage.add(snapshot.count);
    if (!copy.visible) { assert.equal(snapshot.count, 0); assert.deepEqual(copy.paragraphTemplates, []); continue; }
    const links = skyDebilityPlacementLinks(copy.allPlacementKeys, skyPositions);
    assert.equal(links.length, snapshot.count);
    for (const [index, template] of copy.paragraphTemplates.entries()) {
      const reader = presentSkyDebilityParts(skyDebilityTemplateParts(template, copy.slots), links);
      const mapped = presentSkyDebilityParts(map.paragraphs[index], links);
      assert.equal(textOf(reader), textOf(mapped), "All formatted map and reader paragraphs must agree");
      assert.deepEqual(reader.filter(part => part.href).map(({ text, href }) => ({ text, href })), index === 1 ? links : []);
      if (index === 0) assert.equal(textOf(reader), copy.paragraphs[0], "The complete experience paragraph is unchanged");
      else {
        assert.equal(textOf(reader.filter(part => part.emphasized)), `${copy.slots.countWord} out of the seven classical planets ${snapshot.count === 1 ? "is" : "are"} currently in detriment or fall`);
        assert.equal(reader.filter(part => part.href).length, snapshot.count, "Include every qualifying planet, not just the three examples");
        assert.equal(new Set(reader.filter(part => part.href).map(part => part.href)).size, snapshot.count);
        for (const link of links) {
          const key = link.href.split("/placement/")[1];
          const position = skyPositions.find(row => `${row.planet.toLowerCase()}/${row.sign.toLowerCase()}` === key)!;
          const rx = motion === "retrograde" && !["Sun", "Moon"].includes(position.planet);
          assert.equal(link.text, `${position.planet}${rx ? " Rx" : ""} in ${position.sign}`);
        }
      }
    }
    presentations++;
  }
}
function all(index: number, selected: Record<string, string>) {
  if (index === TRADITIONAL_DIGNITY_PLANETS.length) return verify(selected);
  const planet = TRADITIONAL_DIGNITY_PLANETS[index];
  all(index + 1, selected);
  for (const row of skyDebilityPhraseSets.filter(row => row.planetTitle === planet)) all(index + 1, { ...selected, [planet]: row.signTitle });
}
all(0, {});
assert.equal(combinations, 6912);
assert.equal(presentations, 13822);
assert.deepEqual([...countCoverage].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);

const original = positions({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" }).map(row => ({ ...row, motion: row.planet === "Saturn" ? "retrograde" as const : "direct" as const }));
const snapshot = traditionalSkyDebilities(original), copy = assembleSkyDebilityCopy(snapshot);
const links = skyDebilityPlacementLinks(copy.allPlacementKeys, original);
const display = presentSkyDebilityParts(skyDebilityTemplateParts(copy.paragraphTemplates[1], copy.slots), links);
assert.equal(textOf(display), linkedThreePlanetContext);
assert.equal(textOf(display.filter(part => part.emphasized)), highlightedCountStatement);
assert(!skyDebilityPlacementLinks(["saturn/aries"])[0].text.includes("Rx"));
assert(!skyDebilityPlacementLinks(["saturn/aries"], [{ planet: "Saturn", sign: "Pisces", motion: "retrograde" }])[0].text.includes("Rx"));
assert.equal(skyDebilityPlacementLinks(["saturn/aries"], [{ planet: " SATURN ", sign: " aries ", motion: "retrograde" }])[0].text, "Saturn Rx in Aries");
for (const motion of ["direct", "retrograde", "direct"] as const)
  assert.equal(skyDebilityPlacementLinks(["saturn/aries"], [{ planet: "Saturn", sign: "Aries", motion }])[0].text, `Saturn${motion === "retrograde" ? " Rx" : ""} in Aries`);

// Reordered/custom owner wording must not be reconstructed or overwritten.
const customTemplate = "It may help to {responseList}. {countWord} out of the {totalWord} classical planets {countVerb} in detriment or fall: {planetList}. {dignityExplanationSentence} With {planetReference}, it can take more effort to {planetFunctionList}.";
const customMap = buildSkyDebilityComposition(snapshot, key => key.endsWith("/contextTemplate") ? customTemplate : skyDebilityField(key)?.body);
assert.deepEqual(customMap.errors, []);
const custom = presentSkyDebilityParts(customMap.paragraphs[1], links);
assert.equal(textOf(custom), textOf(presentSkyDebilityParts(skyDebilityTemplateParts(customTemplate, customMap.copy.slots), links)));
assert.equal(textOf(custom.filter(part => part.emphasized)), "Three out of the seven classical planets are in detriment or fall");
assert(custom.some(part => part.sourceKey === "cms/sky-debility/contextTemplate"));

// Actual React card markup: two body paragraphs and exactly one inline list.
const html = renderToStaticMarkup(createElement(SkyDebilityCard, { positions: original }));
assert.equal((html.match(/href="#sky\/placement\//gu) ?? []).length, 3);
assert.equal((html.match(/<p>/gu) ?? []).length, 3); // header + two body paragraphs
assert(html.includes(`${highlightedCountStatement}</strong>: `));
assert(html.includes("Saturn Rx in Aries</a>"));
assert.equal(renderToStaticMarkup(createElement(SkyDebilityCard, { positions: positions({}) })), "");
assert.equal(renderToStaticMarkup(createElement(SkyDebilityCard, { positions: original.slice(1) })), "");
console.log(JSON.stringify({ result: "passed", combinations, directAndRetrogradePresentations: presentations, countCoverage: [...countCoverage].sort(), exactOwnerDisplay: true, inlineLinksOnly: true, sourceMapParity: true }, null, 2));
