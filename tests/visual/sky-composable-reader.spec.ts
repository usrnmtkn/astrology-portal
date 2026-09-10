import { expect, test } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { makeSkyIngressComposition } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';

test('published V5 sentences assemble on the reader with calculated occurrence values', async ({ page }) => {
 test.setTimeout(120_000);
 const key = 'sky-placement/article/mercury/cancer';
 const base = skyPlacementSourceRecords.get(key)!;
 const ingress = makeSkyIngressComposition();
 ingress.enabled = true;
 for (const module of ingress.modules.filter(item => item.required)) {
  for (const [, name] of module.template.matchAll(/\{\{(\w+)\}\}/gu)) ingress.sources[name].text = `Fixture ${name} for {{planetTitle}} in {{signTitle}}.`;
 }
 ingress.sources.openingHook.text = 'Fixture calculated interval {{passEntryDate}} to {{passExitDate}}.';
 ingress.modules.reverse();
 const updatedAt = '2026-07-09T12:00:00.000Z';
 const source = { ...base, studio_version_status: 'approved-serving-revision', placementArticle: '', placementArticleDirect: '', placementArticleRetrograde: '', ingress };
 const row = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
  provider: 'tldrastro-fallback-architecture-v3', updated_at: updatedAt, headline: base.headline, body: '', summary: base.summary,
  sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: base.source_package, content_role: base.content_role }, block_type: 'fallback_hook', event_type: 'fallback-hook' };
 await page.clock.setFixedTime(new Date('2026-07-10T12:00:00Z'));
 await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' })));
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await page.route('**/rest/v1/**', route => {
  const path = new URL(route.request().url()).pathname;
  return route.fulfill({ json: path.endsWith('/content_runtime_revision') ? updatedAt
   : path.endsWith('/content_publications') ? [{ content_key: key, state: 'live', revision: 1, row_id: row.id, row_updated_at: updatedAt, updated_at: updatedAt }]
   : path.endsWith('/generated_interpretations') ? [row] : [] });
 });
 await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
 await page.goto('/?date=2026-07-10#sky/placement/mercury/cancer');
 const article = page.locator('.sky-detail-article');
 await expect(article).toContainText('Fixture planetFunctionSentence for Mercury in Cancer.', { timeout: 60_000 });
 await expect(article).toContainText(/Fixture calculated interval [A-Z][a-z]+ \d+, 2026 to [A-Z][a-z]+ \d+, 2026\./);
 await expect(article).not.toContainText('{{');
 const text = await article.innerText();
 expect(text.indexOf('Fixture challengeSentence')).toBeLessThan(text.indexOf('Fixture planetFunctionSentence'));
 expect(text.indexOf('Fixture planetFunctionSentence')).toBeLessThan(text.indexOf('Fixture calculated interval'));
 expect(errors).toEqual([]);
 await page.screenshot({ path: 'test-results/sky-v5-reader.png', fullPage: true });
});

test('published motion blocks receive real residency and retrograde aspect facts on the reader route', async ({ page }) => {
 test.setTimeout(120_000);
 const key = 'sky-placement/article/mercury/cancer';
 const base = skyPlacementSourceRecords.get(key)!;
 const updatedAt = '2026-07-09T12:00:00.000Z';
 const source = { ...base, studio_version_status: 'approved-serving-revision',
  placementArticleDirect: 'Fixture direct article.',
  placementArticleRetrograde: 'Fixture retrograde article. {{aspectsInSignCount}} residency aspects. {{aspectsWhileRetrogradeCount}} cycle aspects.\n\n{{aspectsInSign}}\n\nFixture article end.',
  fallback: { ...base.fallback, sections: [
   { id: 'shared', label: 'Shared', role: 'main', depth: 'deep', paragraphs: [{ id: 'opening', job: 'Main mechanism', phrases: [{ id: 'first', text: 'Fixture shared', joinBefore: '', source: 'fixture#first', role: 'mechanism' }, { id: 'last', text: 'block.', joinBefore: ' ', source: 'fixture#last', role: 'example' }] }] },
   { id: 'direct', label: 'Direct', motion: 'direct', body: 'Fixture direct block.' },
   { id: 'rx', label: 'Rx', motion: 'retrograde', body: 'Fixture retrograde block. {{aspectsWhileRetrograde}}\n\nFixture block end.' },
   { id: 'practical', role: 'practical', label: 'Guide', items: [{ id: 'action', action: 'Fixture action.', phrases: [{ id: 'explanation', role: 'example', text: 'Fixture practical explanation.', joinBefore: ' ' }] }] }
  ] }
 };
 const row = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
  provider: 'tldrastro-fallback-architecture-v3', updated_at: updatedAt, headline: base.headline, body: base.body_you, summary: base.summary,
  sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: base.source_package, content_role: base.content_role }, block_type: 'fallback_hook', event_type: 'fallback-hook' };
 await page.clock.setFixedTime(new Date('2026-07-10T12:00:00Z'));
 await page.addInitScript(() => {
  localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'New York', latitude:40.7, longitude:-74, timeZone:'America/New_York' }));
  const WorkerBase = window.Worker;
  (window as any).__aspectRequests = [];
  window.Worker = class extends WorkerBase {
   postMessage(message: any, ...args: any[]) { if(message.kind === 'placement-sky') (window as any).__aspectRequests.push(message); return super.postMessage(message, ...args); }
  };
 });
 await page.route('**/rest/v1/**', route => {
  const path = new URL(route.request().url()).pathname;
  const data = path.endsWith('/content_runtime_revision') ? updatedAt
   : path.endsWith('/content_publications') ? [{ content_key:key, state:'live', revision:1, row_id:row.id, row_updated_at:updatedAt, updated_at:updatedAt }]
   : path.endsWith('/generated_interpretations') ? [row] : [];
  return route.fulfill({ json: data });
 });
 await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok:true, calendar:{ days:[] } } }));
 await page.goto('/?date=2026-07-10#sky/placement/mercury/cancer');
 const body = page.locator('.sky-detail-article');
 await expect(body).toContainText('Fixture retrograde article. 4 residency aspects. 1 cycle aspects.', { timeout: 60_000 });
 await expect(body).toContainText('Fixture article end.');
 await expect(body).not.toContainText('Fixture direct article.');
 await expect(body).not.toContainText('{{aspects');
 expect(await page.evaluate(() => (window as any).__aspectRequests.some((r:any) => r.includeAspectLists === true))).toBe(true);
 await page.goto('/?date=2026-07-10&skyPlacementPreview=fallback#sky/placement/mercury/cancer');
 await expect(body).toContainText('Fixture shared block.', { timeout: 60_000 });
 await expect(body).toContainText('Fixture retrograde block.');
 await expect(body).toContainText('Fixture block end.');
 await expect(body).toContainText('Fixture action. Fixture practical explanation.');
 await expect(body).not.toContainText('Main mechanism');
 await expect(body).not.toContainText('Fixture direct block.');
 await expect(body).not.toContainText('{{aspects');
 await page.screenshot({ path:'test-results/sky-composable-reader.png', fullPage:true });
});
