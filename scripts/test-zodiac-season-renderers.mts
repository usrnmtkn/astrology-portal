import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ZODIAC_SIGNS, ZODIAC_SEASON_SOURCE_STARTERS} from '../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs';
import {skyPlacementSourceCorpus as corpus} from '../api/_lib/sky-placement-sources';
import {renderSkyV4ReaderRoute, renderSkyV4StudioPreview} from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import * as shipped from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
const root = 'apps/web/src/content/fallbackArchitectureV3';
const template = '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}';
const shared = ZODIAC_SEASON_SOURCE_STARTERS.map(row => ({...row, review_status: 'approved', body: `Fixture ${row.contentKey}.\n\nFixture second paragraph...  Exact spacing.`}));
const expected = (sign: string) => shared.filter(row => row.sign === sign).map(row => row.body).join('\n\n');
const rowData = JSON.parse(fs.readFileSync(`${root}/source-rows/fallback-source-rows-v3.json`, 'utf8'));
rowData.hookRows.push(...shared);
rowData.hookRows.find((row: any) => row.contentKey === 'fallback-hook/moon-void').body_you = template;
const templates = JSON.parse(fs.readFileSync(`${root}/templates/fallback-templates-v3.json`, 'utf8'));
const keys = ['fallback-template/natal.angle-in-sign', 'fallback-template/natal.planet-in-sign', 'fallback-template/transit.house', 'fallback-template/compat.same-sign', 'fallback-template/compat.cross-sign'];
for (const key of keys) {
 const t = templates.templates.find((row: any) => row.contentKey === key); assert(t, key);
 t.body = template; if ('body_you' in t) t.body_you = template; if ('body_they' in t) t.body_they = template; t.requiredSlots = [];
}
const outfile = join(tmpdir(), `zodiac-browser-${process.pid}.mjs`);
await build({entryPoints: [`${root}/resolver/index.browser.ts`], outfile, bundle: true, platform: 'browser', format: 'esm', logLevel: 'silent'});
const browser = await import(pathToFileURL(outfile).href);
// Exercise the unbundled Node reference against the same synthetic rows without
// changing any approved source on disk.
const originalRead = fs.readFileSync;
fs.readFileSync = ((path: any, ...args: any[]) => {
 const file = String(path);
 if (file.endsWith('/fallback-source-rows-v3.json')) return JSON.stringify(rowData);
 if (file.endsWith('/fallback-templates-v3.json')) return JSON.stringify(templates);
 const raw = (originalRead as any)(path, ...args);
 if (file.endsWith('.json') && typeof raw === 'string') {
  const data = JSON.parse(raw);
  if (Array.isArray(data.authoredCards)) data.authoredCards = [];
  return JSON.stringify(data);
 }
 return raw;
}) as any;
let nodeFallback: any, nodeTransit: any;
try {
 nodeFallback = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs');
 nodeTransit = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs');
} finally { fs.readFileSync = originalRead; }
const renderers = [
 {natal: nodeFallback, transit: nodeTransit, sky: renderSkyV4ReaderRoute},
 ...[browser, shipped].map(module => ({natal: module.createFallbackRenderer(templates, rowData), transit: module.createTransitSynastryRenderer({authoredCards: []}, templates, rowData), sky: module.renderSkyV4ReaderRoute}))
];
for (const sign of ZODIAC_SIGNS) {
 const next = ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(sign)+1)%12];
 const updated = structuredClone(corpus);
 const article = updated.content.continuous.find((row: any) => row.contentKey === `sky-placement/article/sun/${sign}`)!;
 article.placementArticle = template; article.placementArticleDirect = ''; article.placementArticleRetrograde = '';
 const lunation = updated.content.newMoon.find((row: any) => row.ContentKey === `sky-lunation/new-moon/${sign}`)!;
 lunation.NewMoonArticle = template; lunation.TLDR_What = '{{zodiacSeason}}';
 for (const renderer of renderers) {
  assert.equal(renderer.natal.renderNatalAngle({angle: 'ascendant', sign, voice: 'you'}).body, expected(sign));
  assert.equal(renderer.transit.renderCompat({planet: 'sun', signA: sign, signB: next, otherName: 'Fixture'}).body, expected(sign));
  assert.equal(renderer.transit.renderVoidOfCourse({sign, nextSign: next}).body, expected(sign));
  assert.equal(renderer.sky(updated, {route: 'placement', planet: 'sun', sign, zodiacSeasonSources: shared}).mainBody, expected(sign));
  const lunar = renderer.sky(updated, {route: 'new-moon', sign, zodiacSeasonSources: shared});
  assert(lunar.readerParts.includes(expected(sign)));
  assert.equal(lunar.readerParts[0], shared.find(row => row.contentKey === `fallback-hook/zodiac-season/${sign}`)!.body);
  assert.throws(() => renderer.sky(updated, {route: 'placement', planet: 'sun', sign}), /Publish/);
 }
 assert.equal(renderSkyV4StudioPreview(updated, {contentKey: article.contentKey, zodiacSeasonSources: shared}).mainBody, expected(sign));
}
console.log('PASS: all twelve signs resolve complete paragraphs identically in Node, browser source, shipped dist and Sky Studio preview; Natal, compatibility, Calendar and Sky use the correct shared sign.');
