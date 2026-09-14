import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import * as nodeRenderer from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isRetiredCompositionKey } from "../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { isGovernedReaderEligible } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const require = createRequire(import.meta.url);
const pkg = "../apps/web/src/content/fallbackArchitectureV3/";
const bundle = [require(pkg + "source-rows/transit-synastry-rows-v1.json"), require(pkg + "templates/fallback-templates-v3.json"), require(pkg + "source-rows/fallback-source-rows-v3.json")];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "transit-retirement-"));
try {
  await build({ entryPoints: ["apps/web/src/utils/articleAspects.ts"], bundle: true, platform: "node", format: "esm", outfile: path.join(dir, "active-events.mjs"), logLevel: "silent" });
  const { skyActiveChartEvents } = await import(pathToFileURL(path.join(dir, "active-events.mjs")));
  const aspects = [
    { key: "north", heading: "Mars square your natal North Node", body: "Complete first passage. Its final sentence stays.\n\nIts final paragraph stays too." },
    { key: "moon", heading: "Mars trine your natal Moon", body: null },
    { key: "south", heading: "Mars square your natal South Node", body: "Complete second passage. Its final sentence stays." },
    { key: "other", heading: "Venus square your natal South Node", body: "A different transit remains separate." }
  ];
  const groups = skyActiveChartEvents(aspects);
  assert.deepEqual(groups.map(group => group.members.map(member => member.key)), [["north", "south"], ["moon"], ["other"]]);
  assert.equal(groups[0].members[0], aspects[0]);
  assert.equal(groups[0].members[1], aspects[2]);
  assert.equal(groups[0].members[0].body, aspects[0].body);
  assert.equal(groups[0].members[1].body, aspects[2].body);
  assert.deepEqual(skyActiveChartEvents([]), []);
  assert.equal(skyActiveChartEvents([aspects[0], { ...aspects[2], heading: "Mars trine your natal South Node" }]).length, 2);
  await build({ entryPoints: ["apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"], bundle: true, platform: "node", format: "esm", outfile: path.join(dir, "browser.mjs"), logLevel: "silent" });
  const browser = await import(pathToFileURL(path.join(dir, "browser.mjs")));
  await build({ entryPoints: ["apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.ts"], bundle: true, platform: "node", format: "esm", outfile: path.join(dir, "eligibility.mjs"), logLevel: "silent" });
  const browserEligibility = await import(pathToFileURL(path.join(dir, "eligibility.mjs")));
  const renderers = [nodeRenderer, browser.createTransitSynastryRenderer(...bundle), createTransitSynastryRenderer(...bundle)];
  renderers.forEach((renderer) => assert.equal(renderer.renderTransitHouseEvent, undefined));
  let checked = 0;
  for (const voice of ["you", "Alex"]) for (const house of [1, 4, 10]) for (const aspect of ["conjunction", "square", "opposition", "trine", "sextile"]) for (const natal of ["moon", "north-node", "neptune", "uranus"]) {
    const fact = { planet: "mars", sign: "virgo", house, voice, events: [{ natal, natalHouse: 7, aspect, window: "Until September 13" }] };
    const outputs = renderers.map((renderer) => {
      const expected = renderer.renderTransitAspect({ transiting: fact.planet, sign: fact.sign, natal, aspect, voice, window: fact.events[0].window });
      const actual = renderer.renderTransitHouse(fact);
      assert.equal(actual.parts.at(-1), expected.body, "House reading must retain the complete canonical aspect passage.");
      assert.ok(!actual.sourceKeys.some(isRetiredCompositionKey));
      return actual;
    });
    assert.deepEqual(outputs[1], outputs[0]);
    assert.deepEqual(outputs[2], outputs[0]);
    checked++;
  }
  for (const renderer of renderers) {
    const expected = renderer.renderTransitReturn({ planet: "mars" });
    const actual = renderer.renderTransitHouse({ planet: "mars", sign: "virgo", house: 4, events: [{ natal: "mars", aspect: "conjunction" }] });
    assert.equal(actual.parts.at(-1), expected.body);
  }
  for (const key of ["cms/personal-transit-aspect/you/template", "fallback-hook/transit-house-event-frame/sun", "fallback-template/transit.house-event"]) {
    assert.ok(isRetiredCompositionKey(key));
    assert.equal(browserEligibility.isGovernedReaderEligible({ contentKey: key, body: "Historical test copy.", review_status: "approved" }, { allowUnreviewed: true }), false);
    assert.equal(isGovernedReaderEligible({ contentKey: key, body: "Historical test copy.", review_status: "approved" }, { allowUnreviewed: true }), false);
  }
  for (const key of ["fallback-hook/transit-house-event-wants/sun/virgo", "fallback-hook/transit-house-event-natal/moon", "fallback-hook/transit-house-event-scenes/sun/moon/soft"]) assert.equal(isRetiredCompositionKey(key), false);
  const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");
  assert.match(appSource, /personalTransitPackageSection\(transit, generatedAt\.slice\(0, 10\)\)/u);
  assert.match(appSource, /body: packageSection\?\.body \?\? null/u);
  assert.doesNotMatch(appSource, /renderTransitHouseEvent|compiledAspect\?\.body/u);
  assert.match(appSource, /profileTransitsGeneratedAt === profileTransitSky\.generatedAt \? profileTransits : \[\]/u);
  assert.match(appSource, /JSON\.stringify\(skyPlacementPersonalizationTransits\)/u);
  console.log(`Transit composition retirement passed: ${checked} house/aspect/voice fixtures agree in Node, browser source, and shipped artifact; returns and immutable retirement verified.`);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
