import { expect, test } from '@playwright/test';

test('Sky renders on first load and reload before the publication service responds', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T04:06:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:content-publications:v1', JSON.stringify([{
      content_key: 'cms/sky-daily-summary/sun/virgo', state: 'retired',
      revision: 100, row_id: null, row_updated_at: null,
      updated_at: '2026-09-08T00:00:00Z'
    }]));
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let requests = 0;
  await page.route('**/rest/v1/content_publications?**', async route => {
    requests += 1;
    // Keep the request pending beyond the first-render budget. This models
    // the production outage without slowing down the ephemeris or app assets.
    await new Promise(resolve => setTimeout(resolve, 10_000));
    await route.abort().catch(() => {});
  });
  for (const reload of [false, true]) {
    const started = Date.now();
    if (reload) await page.reload({ waitUntil: 'domcontentloaded' });
    else await page.goto('/#sky', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 5000 });
    expect(Date.now() - started).toBeLessThan(6000);
    console.log(`${reload ? 'Refresh' : 'Initial load'} summary: ${Date.now() - started}ms`);
    await expect(page.getByLabel('Daily sky summary')).not.toContainText('turns our attention');
    await expect(page.locator('.app-shell')).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/sky-refresh-performance.png' });
  expect(requests).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('a background publication response updates the mounted summary', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T04:06:00Z'));
  let release!: () => void;
  const responseReady = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/content_publications?**', async route => {
    await responseReady;
    await route.fulfill({ json: [{
      content_key: 'cms/sky-daily-summary/sun/virgo', state: 'retired',
      revision: 100, row_id: null, row_updated_at: null,
      updated_at: '2026-09-08T00:00:00Z'
    }] });
  });
  await page.goto('/#sky');
  const summary = page.getByLabel('Daily sky summary');
  await expect(summary).toContainText('turns our attention', { timeout: 5000 });
  release();
  await expect(summary).not.toContainText('turns our attention');
  await expect(summary).toContainText('Sun');
});
