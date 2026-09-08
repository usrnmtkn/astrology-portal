import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createTransitSynastryRenderer } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { renderSkyAspectCard } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
const json = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const source = json('../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json');
const phrasebook = json('../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json');
const renderer = createTransitSynastryRenderer(
  json('../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json'),
  json('../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json'),
  { ...source, hookRows: [...source.hookRows, ...phrasebook.hookRows] }
);
const matrix = json('../docs/content-review/sky-aspects/2026-07-31/canonical-noon-matrix.json');
for (const row of matrix.aspects) {
  const [a, aspect, b, aSign, bSign] = row.key.split('|');
  const facts = { a, aspect, b, aSign, bSign };
  let node;
  try { node = renderSkyAspectCard(facts); }
  catch (error) {
    assert.match(String(error), /SOURCE_GAP: no approved collective Sky aspect copy/);
    assert.throws(() => renderer.renderSkyAspectCard(facts), /SOURCE_GAP: no approved collective Sky aspect copy/);
    continue;
  }
  const browser = renderer.renderSkyAspectCard(facts);
  assert.match(node.contentKey, /^fallback-hook\/sky-aspect-/);
  assert.equal(browser.contentKey, node.contentKey, row.key);
  assert.equal(browser.body, node.body, row.key);
}
console.log(`All ${matrix.aspects.length} canonical aspect routes preserve browser/Node parity and fail-closed gaps.`);
