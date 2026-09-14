import { expect, test, type Page } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';

const key = 'sky-placement/article/sun/virgo';
const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const baseline = skyPlacementSourceRecords.get(key)!;
const firstCopy = 'Fixture published Sun passage. The same complete passage stays visible while sources refresh.';
const secondCopy = 'Fixture revised Sun passage. Only an explicitly published revision replaces the passage.';

async function observe(page: Page, theme: string) {
  await page.addInitScript(theme => {
    localStorage.setItem('tldrastro:theme', theme);
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    (window as any).__readingStates = [];
    const sample = () => {
      const card = [...document.querySelectorAll('.planet-placement-row--sky')].find(el => el.querySelector('.planet-placement-row__title')?.textContent === 'Sun in Virgo');
      const article = document.querySelector('.article-body-inner');
      const state = {
        card: card?.querySelector('.planet-placement-row__description')?.textContent?.trim() ?? '',
        article: article?.getClientRects().length ? article.textContent?.trim() ?? '' : '',
        title: document.querySelector('#sky-detail-title')?.textContent ?? ''
      };
      const states = (window as any).__readingStates;
      if (JSON.stringify(state) !== JSON.stringify(states.at(-1))) states.push(state);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, theme);
}

async function installSources(page: Page) {
  let revision = 1;
  let retired = false;
  let unavailable = false;
  const timestamp = () => `2026-09-13T12:0${revision}:00.123456Z`;
  const row = () => ({
    id, content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null,
    target_date: null, provider: 'tldrastro-fallback-architecture-v3', updated_at: timestamp(),
    headline: baseline.headline, summary: '', body: baseline.body_you,
    sections: { packageRecord: { ...baseline, tldrWhat: '', tldrTakeaway: '',
      placementArticle: '', placementArticleDirect: revision === 1 ? firstCopy : secondCopy,
      studio_version_status: 'approved-serving-revision' } },
    facts: { fallbackArchitectureV3: true },
    source_snapshot: { sourcePackage: baseline.source_package, content_role: baseline.content_role },
    block_type: 'fallback_hook', event_type: 'fallback-hook'
  });
  // A failed fixture request must not install unrelated production publication
  // identities from the checked-in nightly snapshot before Retry is exercised.
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({
    json: { schema: 'content-studio-last-known-good-v1', rows: [], publications: [], rowCount: 0 }
  }));
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/content_publications')) {
      await new Promise(resolve => setTimeout(resolve, 250));
      return route.fulfill({ json: [{ content_key: key, state: retired ? 'retired' : 'live', revision,
        row_id: id, row_updated_at: timestamp(), updated_at: timestamp() }] });
    }
    if (url.pathname.endsWith('/content_runtime_revision')) return route.fulfill({ json: timestamp() });
    if (url.pathname.endsWith('/generated_interpretations')) {
      const query = decodeURIComponent(url.search);
      // Delay the canonical overlay, not calculations or the shipped corpus.
      await new Promise(resolve => setTimeout(resolve, 1800));
      if (unavailable) return route.fulfill({ status: 503, json: { message: 'Fixture source unavailable' } });
      const matches = !query.includes('content_key=') && !query.includes('id=in.')
        || query.includes(key) || query.includes(id);
      return route.fulfill({ json: matches && !retired ? [row()] : [] });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const notify = () => page.evaluate(key => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
    detail: { contentKey: key, published: true, updatedAt: new Date(Date.now() + ((window as any).__noticeSequence = ((window as any).__noticeSequence ?? 0) + 1)).toISOString() }
  })), key);
  return { notify,
    publish: async () => { revision++; await notify(); },
    retire: async () => { retired = true; revision++; await notify(); },
    fail: () => { unavailable = true; },
    recover: () => { unavailable = false; }
  };
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`placement publishes one resolved passage on cold load, refresh and navigation ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
    await observe(page, theme);
    const sources = await installSources(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-09-13#sky');
    const card = page.locator('.planet-placement-row--sky').filter({ has: page.getByText('Sun in Virgo', { exact: true }) });
    const prose = card.locator('.planet-placement-row__description');
    await expect(prose).toContainText(firstCopy, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    let states = await page.evaluate(() => (window as any).__readingStates);
    expect([...new Set(states.map((s: any) => s.card).filter(Boolean))]).toEqual([firstCopy]);
    const box = await prose.boundingBox();
    await sources.notify();
    await page.waitForTimeout(4000);
    expect(await prose.boundingBox()).toEqual(box);
    states = await page.evaluate(() => (window as any).__readingStates);
    const start = states.findIndex((s: any) => s.card === firstCopy);
    expect(states.slice(start).every((s: any) => s.card === firstCopy)).toBe(true);
    await card.click();
    const article = page.locator('.sky-detail-article .article-body-inner').first();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    states = await page.evaluate(() => (window as any).__readingStates);
    const bodies = [...new Set<string>(states.map((s: any) => s.article).filter(Boolean))];
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain(firstCopy);
    await page.screenshot({ path: `test-results/sky-placement-resolved-${width}-${theme}.png` });
    await page.reload();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    states = await page.evaluate(() => (window as any).__readingStates);
    expect([...new Set(states.map((s: any) => s.article).filter(Boolean))]).toHaveLength(1);
    expect(states.filter((s: any) => s.article).every((s: any) => s.article.includes(firstCopy))).toBe(true);
    await sources.publish();
    await expect(article).toContainText(secondCopy, { timeout: 60_000 });
    await expect(article).not.toContainText(firstCopy);
    await sources.retire();
    await expect(article).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator('.sky-detail-article')).not.toContainText(secondCopy);
    expect(errors).toEqual([]);
  });
}

test('known live placement failure shows retry rather than another authored version', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
  await observe(page, 'light');
  const sources = await installSources(page);
  sources.fail();
  await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
  await expect(page.getByText('The placement reading could not load. Please try again.')).toBeVisible({ timeout: 60_000 });
  expect(await page.locator('.sky-detail-article .article-body-inner').first().count()).toBe(0);
  sources.recover();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.sky-detail-article .article-body-inner').first()).toContainText(firstCopy, { timeout: 60_000 });
  const states = await page.evaluate(() => (window as any).__readingStates);
  expect(states.filter((s: any) => s.article).every((s: any) => s.article.includes(firstCopy))).toBe(true);
});
