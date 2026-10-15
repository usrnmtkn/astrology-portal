import { expect, test } from '@playwright/test';
import { readerResponse } from '../helpers/reader-response';
import { educationReaderResponse, lessonRows } from '../helpers/astro101-reader-fixture';
import { emptyHoroscopeEdition, horoscopeEditionKey, horoscopeEditionBody } from '../../apps/web/src/content/horoscopeEditions.mjs';

const copy = '**Synthetic complete opening.**\n\n- First complete item\n- Final complete item';
const article = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: 'article/guide/cold-formatting',
  surface: 'education', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null,
  updated_at: '2026-10-14T12:00:00Z', headline: 'Synthetic formatting guide', body: copy, summary: '' };
const edition = emptyHoroscopeEdition({ period: 'weekly', audience: 'rising', timeZone: 'America/New_York', startsAt: '2026-10-12T04:00:00.000Z', endsAt: '2026-10-19T04:00:00.000Z' });
edition.passages = edition.passages.map(passage => ({ ...passage, headline: 'Synthetic formatted horoscope', body: copy }));
const horoscope = { ...article, id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: horoscopeEditionKey(edition.window), surface: 'sky', body: horoscopeEditionBody(edition), sections: { horoscopeEdition: edition } };

for (const width of [390, 1440]) for (const surface of ['articles', 'guide', 'horoscopes'] as const) {
  test(`${surface} first visible writing is formatted on direct load and reload ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await page.route('**/api/content-reader', async route => {
      const query = route.request().postDataJSON();
      if (query.prefix === 'education/astro-101/') {
        const lessons = [{ ...lessonRows[0], facts: { ...lessonRows[0].facts, related: [] }, sections: { kind: 'chapter', intro: '', blocks: [{ heading: '', level: 2, body: copy }] } }];
        const response = await educationReaderResponse(query, lessons);
        return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      }
      return route.fulfill({ json: readerResponse(query.horoscope || query.ids?.includes(horoscope.id) ? [horoscope] : [article]) });
    });
    const selector = surface === 'horoscopes' ? '.horoscope-prose' : '.learn-article-body';
    await page.addInitScript(selector => {
      (window as any).__writingFrames = [];
      const observe = () => {
        const body = document.querySelector(selector);
        if (body?.getClientRects().length && body.textContent?.trim()) {
          const state = { text: body.textContent, emphasis: body.querySelectorAll('strong').length, lists: body.querySelectorAll('ul').length };
          const frames = (window as any).__writingFrames;
          if (JSON.stringify(frames.at(-1)) !== JSON.stringify(state)) frames.push(state);
        }
        requestAnimationFrame(observe);
      };
      requestAnimationFrame(observe);
    }, selector);
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    let requested!: () => void;
    const request = new Promise<void>(resolve => { requested = resolve; });
    await page.route('**/assets/FormattedWritingContent-*.js', async route => { requested(); await blocked; await route.continue(); });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const href = surface === 'articles' ? `/#articles/${encodeURIComponent(article.content_key)}` : surface === 'guide' ? '/learn/astro-101/qa-chapter-1' : `/#horoscopes?period=weekly&sign=aries&edition=${horoscope.id}`;
    try {
      await page.goto(href, { waitUntil: 'domcontentloaded' });
      await request;
      await expect(page.getByText('**Synthetic complete opening.**', { exact: false })).toHaveCount(0);
      release();
      const body = page.locator(selector).first();
      await expect(body).toContainText('Final complete item');
      await expect(body.locator('strong')).toHaveText('Synthetic complete opening.');
      await expect(body.locator('li')).toHaveText(['First complete item', 'Final complete item']);
      const frames = await page.evaluate(() => (window as any).__writingFrames);
      expect(frames.length).toBeGreaterThan(0);
      expect(frames.every((frame: any) => frame.emphasis === 1 && frame.lists === 1 && !frame.text.includes('**'))).toBe(true);
      await page.reload();
      await expect(body).toContainText('Final complete item');
      await expect(body.locator('strong')).toHaveText('Synthetic complete opening.');
      expect(errors).toEqual([]);
    } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
  });
}

test('direct article does not wait for unrelated library inventory', async ({ page }) => {
  const queries: any[] = [];
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON(); queries.push(query);
    if (query.prefix) await blocked;
    await route.fulfill({ json: readerResponse(query.keys?.includes(article.content_key) || query.prefix === 'article/guide/' ? [{ ...article, body: 'Complete opening.\n\nComplete final sentence.' }] : []) });
  });
  try {
    await page.goto(`/#articles/${encodeURIComponent(article.content_key)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.learn-article-body')).toContainText('Complete final sentence.', { timeout: 5000 });
    expect(queries.some(query => query.keys?.includes(article.content_key))).toBe(true);
    expect(queries.some(query => query.prefix)).toBe(false);
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
});

test('article navigation retains loading until the requested publication resolves', async ({ page }) => {
  const next = { ...article, id: 'cccccccc-cccc-4ccc-accc-cccccccccccc', content_key: 'article/guide/next-publication', headline: 'Next synthetic guide', body: 'Complete next publication.' };
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const request = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON();
    if (query.keys?.includes(next.content_key)) { requested(); await blocked; }
    await route.fulfill({ json: readerResponse(query.keys?.includes(next.content_key) ? [next] : [article]) });
  });
  try {
    await page.goto(`/#articles/${encodeURIComponent(article.content_key)}`);
    await expect(page.locator('.learn-article-body')).toContainText('Final complete item');
    await page.evaluate(href => { location.hash = href; }, `articles/${encodeURIComponent(next.content_key)}`);
    await request;
    await expect(page.getByRole('status', { name: 'Loading articles and guides…' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Article unavailable' })).toHaveCount(0);
    await expect(page.locator('.learn-article-body')).toHaveCount(0);
    release();
    await expect(page.locator('.learn-article-body')).toHaveText(next.body);
    await page.goBack();
    await expect(page.locator('.learn-article-body')).toContainText('Final complete item');
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
});

test('failed formatter keeps navigation and explicit reload recovery', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([article]) }));
  let fail = true;
  await page.route('**/assets/FormattedWritingContent-*.js', route => fail ? route.abort('failed') : route.continue());
  await page.goto(`/#articles/${encodeURIComponent(article.content_key)}`);
  await expect(page.getByRole('alert')).toContainText('This page could not load.');
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Reload page', exact: true }).click();
  await expect(page.locator('.learn-article-body')).toContainText('Final complete item');
  await expect(page.locator('.learn-article-body strong')).toHaveText('Synthetic complete opening.');
});
