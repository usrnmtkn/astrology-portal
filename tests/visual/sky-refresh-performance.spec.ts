import { expect, test } from '@playwright/test';

test('Sky shell and loading feedback render before the publication service responds', async ({ page }) => {
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
    await new Promise(resolve => setTimeout(resolve, 10_000));
    await route.abort().catch(() => {});
  });
  for (const reload of [false, true]) {
    const started = Date.now();
    if (reload) await page.reload({ waitUntil: 'domcontentloaded' });
    else await page.goto('/#sky', { waitUntil: 'domcontentloaded' });
    const summary = page.getByLabel('Daily sky summary', { exact: true });
    await expect(page.getByText('Loading the sky…', { exact: true })).toBeVisible({ timeout: 5000 });
    expect(Date.now() - started).toBeLessThan(6000);
    console.log(`${reload ? 'Refresh' : 'Initial load'} Sky loading feedback: ${Date.now() - started}ms`);
    await expect(page.getByRole('button', { name: 'Calendar', exact: true })).toBeVisible();
    await expect(summary).not.toContainText('turns our attention');
    await expect(page.locator('.app-shell')).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/sky-refresh-performance.png' });
  expect(requests).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('a cold summary waits for publication identity rather than flashing retired copy', async ({ page }) => {
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
  await page.route('**/rest/v1/generated_interpretations?**', route => route.fulfill({ json: [] }));
  await page.goto('/#sky');
  const summary = page.getByLabel('Daily sky summary', { exact: true });
  await expect(page.getByText('Loading the sky…', { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(summary).not.toContainText('turns our attention');
  release();
  await expect(summary).toContainText('Sun', { timeout: 30000 });
  await expect(summary).not.toContainText('turns our attention');
  await expect(summary.getByRole('status')).toHaveCount(0);
});
