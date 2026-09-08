import assert from "node:assert/strict";
import fs from "node:fs";
import * as source from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import * as browser from "../apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts";
import * as shipped from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSkyPlacement as nodePlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
const base = "apps/web/src/content/fallbackArchitectureV3/";
const read = (name: string) => JSON.parse(fs.readFileSync(base + name, "utf8"));
const baselineCorpus = read("authored-inputs/sky-v4-canonical-content-studio-stage-v1.json");
const chunks = [1,2,3,4].map(i => read(`authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-${i}.json`));
const correctedCorpus = source.applySkyV4ContinuousCorpusCorrection(baselineCorpus, { ...read("authored-inputs/sky-v4-continuous-corpus-correction-v1.json"), chunks, records: chunks.flatMap(c => c.records) });
const signs = "aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" ");
const contextFor = (row: any) => Object.fromEntries(["SubjectFamily", "SubjectBody", "SubjectSign", "SubjectCondition", "ContextKind", "ContextBodyOrEvent", "ContextSign", "ContextCondition"].map(key => [key[0].toLowerCase() + key.slice(1), row[key]]));
const fixtureFacts = Object.fromEntries([...JSON.stringify(baselineCorpus).matchAll(/\{\{(\w+)\}\}/g)].map(match => [match[1], "September 8, 2026"]));
const fillFixture = (copy: string) => copy.replace(/\{\{(\w+)\}\}/g, (_, slot) => fixtureFacts[slot]);
let checked = 0;
for (const corpus of [baselineCorpus, correctedCorpus]) for (const engine of [source, browser, shipped]) {
  for (const row of corpus.content.continuous) {
    const input = { route: "placement", planet: row.planet, sign: row.sign, aspects: [], facts: fixtureFacts };
    const actual = engine.renderSkyV4ReaderRoute(corpus, input);
    assert.equal(actual.contentKey, row.contentKey);
    assert.deepEqual(actual, source.renderSkyV4ReaderRoute(corpus, input));
    const fallback = engine.renderSkyV4ContinuousPreview(corpus, { ...input, articleAvailable: false });
    assert.equal(fallback.contentKey, row.contentKey);
    assert.equal(fallback.resolution, "exact-fallback");
    for (const copy of Object.values(row.fallback) as string[]) assert.ok(fallback.page.includes(fillFixture(copy)));
    assert.throws(() => engine.renderSkyV4ReaderRoute(corpus, { ...input, contentKey: row.contentKey.replace(/[^/]+$/, signs[(signs.indexOf(row.sign.toLowerCase()) + 1) % 12]) }), /PLACEMENT_IDENTITY/);
    checked++;
  }
  for (const planet of ["north-node", "south-node", "lilith"]) for (const sign of signs) {
    const input = { route: "placement", planet, sign, aspects: [] };
    assert.deepEqual(engine.renderSkyV4ReaderRoute(corpus, input), source.renderSkyV4ReaderRoute(corpus, input));
    assert.throws(() => engine.renderSkyV4ReaderRoute(corpus, { ...input, contentKey: "sky-placement/article/sun/aries" }), /PLACEMENT_IDENTITY/);
  }
  for (const overlay of corpus.content.contextualTransitOverlays.filter((r: any) => r.SubjectFamily.toLowerCase() === "continuous")) {
    const input = { route: "placement", facts: fixtureFacts, planet: overlay.SubjectBody, sign: overlay.SubjectSign, contexts: [contextFor(overlay)], overlaySettings: { includeContextualOverlayInFallbackHook: true }, articleAvailable: false };
    if (!corpus.content.continuous.some((r: any) => r.planet.toLowerCase() === input.planet.toLowerCase() && r.sign.toLowerCase() === input.sign.toLowerCase())) continue;
    const matching = engine.renderSkyV4ContinuousPreview(corpus, input);
    assert.ok(matching.selectedOverlayKeys.includes(overlay.OverlayKey));
    const wrongSign = signs[(signs.indexOf(input.sign.toLowerCase()) + 1) % 12];
    const mismatched = { ...input, sign: wrongSign };
    assert.deepEqual(engine.renderSkyV4ContinuousPreview(corpus, mismatched).selectedFallbackOverlayKeys, []);
    assert.deepEqual(engine.renderSkyV4ReaderRoute(corpus, mismatched).selectedOverlayKeys, []);
  }
  assert.throws(() => engine.renderSkyV4ContinuousPreview(corpus, { planet: "sun", sign: "sagittarius", articleOverride: corpus.content.continuous[0] }), /PLACEMENT_IDENTITY/);
}
// An unrelated aspect must not get interpreted as an aspect of the placement.
const rows = read("source-rows/fallback-source-rows-v3.json");
const extra = read("source-rows/sky-article-v1.json");
const template = read("templates/fallback-templates-v3.json");
const facts = { planet: "lilith", sign: "sagittarius", entryDate: "October 25, 2025", exitDate: "January 3, 2027", events: [] };
for (const render of [nodePlacement, ...[browser, shipped].map(engine => engine.createTransitSynastryRenderer({ authoredCards: [] }, template, { ...rows, hookRows: [...rows.hookRows, ...extra.hookRows] }).renderSkyPlacement)]) {
  const baseline = render(facts);
  const unrelated = render({ ...facts, events: [{ type: "aspect", a: "sun", b: "moon", aSign: "sagittarius", bSign: "gemini", aspect: "opposition", exactDate: "November 24, 2026" }] });
  assert.equal(unrelated.body, baseline.body);
}
console.log(`PASS: ${checked} continuous article/fallback checks, all node/Lilith signs, overlay identity, wrong-key rejection, and Node/browser/dist unrelated-aspect parity.`);
