import { expect, test } from '@playwright/test';
import { compileSkyArticleEdition } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import { skyIngressEssayFields } from '../../apps/web/src/content/skyIngressEssay.mjs';
import { readerResponse } from '../helpers/reader-response';

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`approved ingress edition preserves the complete reader article after reload ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-10-09T12:00:00Z'));
  const slots = Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic ${name}.`]));
  Object.assign(slots, { articleTitle: 'Libra Season 2026', when: 'Synthetic calculated date field.',
   overviewHeading: 'Synthetic overview', overviewBody: 'Synthetic complete ingress opening.\n\nSynthetic overview final sentence.',
   majorTransitSections: '## Synthetic transit\n\nSynthetic transit opening.\n\nSynthetic transit final sentence.',
   priorOccurrenceSection: '', otherDatesSection: '', closingHeading: 'Synthetic close',
   closingBody: 'Synthetic close opening.\n\nSynthetic complete ingress final sentence.' });
  const edition = await compileSkyArticleEdition({ format: 'ingress-essay-v2', planet: 'sun', sign: 'libra', entryYear: 2026,
   validFrom: '2026-09-22', validTo: '2026-10-23', transitStartInstant: '2026-09-23T00:05:14Z', transitEndInstant: '2026-10-23T09:37:57Z',
   referenceTimeZone: 'America/New_York', templateKey: 'sky/article-template/sun/libra', templateBody: '',
   tldr: 'Synthetic explicit ingress summary.', slotValues: slots, housePassages: [] });
  const row = { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: edition.contentKey, surface: 'sky', mode: 'article',
   status: 'LIVE', lane: 'serving', review_state: null, event_type: 'sky-article-edition', block_type: 'sky_article',
   updated_at: '2026-10-09T00:00:00Z', headline: edition.headline, body: edition.body, summary: edition.tldr,
   sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: {
    approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey, templateKey: edition.templateKey,
    templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash
   } } };
  const publications = [{ content_key: row.content_key, state: 'live', revision: 1, row_id: row.id,
   row_updated_at: row.updated_at, updated_at: row.updated_at }];
  await page.addInitScript(theme => {
   localStorage.setItem('tldrastro:theme', theme);
   localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
  }, theme);
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
   schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications } }));
  let exactEditionRequests = 0;
  await page.route('**/api/content-reader', route => {
   const query = route.request().postDataJSON();
   // Never hand the article to unrelated aspect/package requests. Its key
   // must be discovered from the publication ledger and explicitly fetched.
   const requested = query.keys?.includes(row.content_key) === true;
   if (requested) exactEditionRequests++;
   return route.fulfill({ json: readerResponse(requested ? [row] : [], publications) });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?date=2026-10-09#sky/placement/sun/libra');
  const article = page.locator('.sky-detail-article').first();
  const assertComplete = async () => {
   await expect(article).toContainText('Synthetic complete ingress opening.', { timeout: 60_000 });
   await expect(article).toContainText('Synthetic complete ingress final sentence.');
   await expect(article).toContainText('Synthetic transit final sentence.');
   await expect(article.getByRole('heading', { name: 'Libra Season 2026', exact: true })).toBeVisible();
   await expect(article).not.toContainText('priorOccurrenceSection');
  };
  await assertComplete();
  expect(exactEditionRequests).toBeGreaterThan(0);
  const beforeReload = exactEditionRequests;
  await page.reload();
  await assertComplete();
  expect(exactEditionRequests).toBeGreaterThan(beforeReload);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/sky-ingress-reader-${width}-${theme}.png`, fullPage: true });
 });
}
