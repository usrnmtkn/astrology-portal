import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { skyPlacementSourceCorpus as corpus } from '../api/_lib/sky-placement-sources';
import { renderSkyV4ReaderRoute, renderSkyV4StudioPreview } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import * as shipped from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
const root = 'apps/web/src/content/fallbackArchitectureV3';
const binding = { id: 'fixture-variable', name: 'myOpening', updatedAt: '2026-09-15T00:00:00Z', value: 'Fixture shared value.', overrides: [
  { scope: 'sign', sign: 'virgo', planet: '', value: 'Fixture Virgo value.' },
  { scope: 'planet', planet: 'sun', sign: '', value: 'Fixture Sun value.' },
  { scope: 'placement', planet: 'sun', sign: 'virgo', value: 'Fixture Sun in Virgo value.' }
] };
const template = '{{myOpening}}';
const ingress = { version: 5, enabled: true, sources: {}, modules: [{ id: 'main', label: 'Main', template: '{{myOpening}}', required: true, enabled: true, motion: 'all', duration: 'all', timing: 'all' }] };
const rowData = JSON.parse(fs.readFileSync(`${root}/source-rows/fallback-source-rows-v3.json`, 'utf8'));
const moon = rowData.hookRows.find((row: any) => row.contentKey === 'fallback-hook/moon-void');
moon.body_you = template; moon._studioVariables = [binding];
const templates = JSON.parse(fs.readFileSync(`${root}/templates/fallback-templates-v3.json`, 'utf8'));
for (const key of ['fallback-template/natal.angle-in-sign', 'fallback-template/compat.cross-sign']) {
  const row = templates.templates.find((item: any) => item.contentKey === key);
  row.body = template; if ('body_you' in row) row.body_you = template; if ('body_they' in row) row.body_they = template;
  row.requiredSlots = ['myOpening']; row._studioVariables = [binding];
}
const outfile = join(tmpdir(), `studio-variables-renderers-${process.pid}.mjs`);
await build({ entryPoints: [`${root}/resolver/index.browser.ts`], outfile, bundle: true, platform: 'browser', format: 'esm', logLevel: 'silent' });
const browser = await import(pathToFileURL(outfile).href);
const originalRead = fs.readFileSync;
fs.readFileSync = ((path: any, ...args: any[]) => {
  const file = String(path);
  if (file.endsWith('/fallback-source-rows-v3.json')) return JSON.stringify(rowData);
  if (file.endsWith('/fallback-templates-v3.json')) return JSON.stringify(templates);
  const raw = (originalRead as any)(path, ...args);
  if (file.endsWith('.json') && typeof raw === 'string') { const data = JSON.parse(raw); if (Array.isArray(data.authoredCards)) data.authoredCards = []; return JSON.stringify(data); }
  return raw;
}) as any;
let nodeFallback: any, nodeTransit: any;
try { nodeFallback = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs'); nodeTransit = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs'); }
finally { fs.readFileSync = originalRead; }
const renderers = [{ natal: nodeFallback, transit: nodeTransit, sky: renderSkyV4ReaderRoute }, ...[browser, shipped].map(module => ({ natal: module.createFallbackRenderer(templates, rowData), transit: module.createTransitSynastryRenderer({ authoredCards: [] }, templates, rowData), sky: module.renderSkyV4ReaderRoute }))];
for (const renderer of renderers) {
  assert.equal(renderer.natal.renderNatalAngle({ angle: 'ascendant', sign: 'virgo', voice: 'you' }).body, 'Fixture Virgo value.');
  assert.equal(renderer.natal.renderNatalAngle({ angle: 'ascendant', sign: 'aries', voice: 'you' }).body, 'Fixture shared value.', 'No context leaks between renders');
  assert.equal(renderer.transit.renderCompat({ planet: 'sun', signA: 'virgo', signB: 'pisces', otherName: 'Fixture' }).body, 'Fixture Sun in Virgo value.');
  assert.equal(renderer.transit.renderVoidOfCourse({ sign: 'virgo', nextSign: 'libra' }).body, 'Fixture Virgo value.');
  const updated = structuredClone(corpus);
  const article = updated.content.continuous.find((row: any) => row.contentKey === 'sky-placement/article/sun/virgo');
  article.placementArticle = template; article.placementArticleDirect = ''; article.placementArticleRetrograde = ''; article._studioVariables = [binding];
  const rendered = renderer.sky(updated, { route: 'placement', planet: 'sun', sign: 'virgo' });
  assert.equal(rendered.mainBody, 'Fixture Sun in Virgo value.');
  assert.equal(renderSkyV4StudioPreview(updated, { contentKey: article.contentKey }).mainBody, rendered.mainBody);
  article.placementArticle = ''; article.ingress = ingress;
  const composed = renderer.sky(updated, { route: 'placement', planet: 'sun', sign: 'virgo' });
  assert.equal(composed.mainBody, 'Fixture Sun in Virgo value.', 'Placement composition uses the same saved value');
}
console.log('PASS: custom values and scoped overrides resolve in Node reference, browser source and shipped reader; Natal, Compatibility, Calendar, Sky and Studio preview agree.');
