import { expect, test } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';

for (const width of [390, 1440]) test(`placement publication stays authoritative at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-13T23:40:00Z'));
  const key = 'sky-placement/article/sun/virgo';
  const base = skyPlacementSourceRecords.get(key)!;
  let revision = 1000;
  let retired = false;
  const copy = () => `{{myCustomOpening}}\n\nFixture published final sentence ${revision}.`;
  const timestamp = () => `2026-09-13T23:00:00.${String(revision).padStart(6, '0')}Z`;
  const row = () => ({
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', content_key: key, surface: 'sky', mode: 'in_depth',
    status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
    provider: 'tldrastro-fallback-architecture-v3', updated_at: timestamp(), headline: base.headline,
    body: copy(), summary: base.summary, sections: { packageRecord: { ...base,
      _studioVariables: [{ id: 'fixture-custom-variable', name: 'myCustomOpening', value: 'Fixture shared opening.', overrides: [{ scope: 'placement', planet: 'sun', sign: 'virgo', value: `Fixture published opening ${revision}.` }] }],
      studio_version_status: 'approved-serving-revision', placementArticle: copy(), placementArticleDirect: copy(),
      fallback: { ...base.fallback, sections: [{ id: 'fixture', label: '', body: copy() }] }
    } }, facts: { fallbackArchitectureV3: true },
    source_snapshot: { sourcePackage: base.source_package, content_role: base.content_role },
    block_type: 'fallback_hook', event_type: 'fallback-hook'
  });
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    (window as any).__articlePaints = [];
    new MutationObserver(() => {
      const article = document.querySelector('.article-body-inner');
      const text = article?.textContent?.trim();
      if (!text) return;
      const samples = (window as any).__articlePaints;
      if (samples.at(-1) !== text) samples.push(text);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v1', rows: [], publications: [], rowCount: 0 } }));
  await page.route('**/rest/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/content_publications')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return route.fulfill({ json: [{ content_key: key, state: retired ? 'retired' : 'live', revision,
        row_id: row().id, row_updated_at: timestamp(), updated_at: timestamp() }] });
    }
    if (path.endsWith('/generated_interpretations')) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      return route.fulfill({ json: retired ? [] : [row()] });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const article = page.locator('.article-body-inner').first();
  const assertCopy = async () => {
    await expect(article).toContainText(`Fixture published opening ${revision}.`, { timeout: 60_000 });
    await expect(article).toContainText(`Fixture published final sentence ${revision}.`);
    await page.waitForTimeout(4000);
    const paints = await page.evaluate(() => (window as any).__articlePaints as string[]);
    expect(paints.length).toBeGreaterThan(0);
    expect(paints.every(text => text.includes('Fixture published opening'))).toBe(true);
  };
  await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
  await assertCopy();
  await page.reload();
  await assertCopy();
  await page.getByRole('button', { name: 'Close detail', exact: true }).click();
  await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
  await assertCopy();
  const notify = () => page.evaluate(key => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
    detail: { contentKey: key, published: true, updatedAt: new Date().toISOString() + Math.random() }
  })), key);
  const height = await article.evaluate(el => el.getBoundingClientRect().height);
  await notify();
  for (let sample = 0; sample < 12; sample++) {
    await expect(article).toContainText('Fixture published final sentence 1000.');
    expect(await article.evaluate(el => el.getBoundingClientRect().height)).toBe(height);
    await page.waitForTimeout(300);
  }
  revision++;
  await notify();
  await expect(article).toContainText('Fixture published final sentence 1001.', { timeout: 30_000 });
  await expect(article).not.toContainText('Fixture published opening 1000.');
  retired = true; revision++;
  await notify();
  await expect(page.locator('.sky-detail-article')).not.toContainText('Fixture published opening', { timeout: 30_000 });
  await expect(article).toHaveCount(0);
  await expect(page.locator('.sky-detail-article')).not.toContainText('Virgo season makes');
  await expect(page.locator('.sky-detail-article')).not.toContainText('After moving through Leo');
});
