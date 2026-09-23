import { readerResponse } from '../helpers/reader-response';
import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page, theme: string, visual?: 'artwork') {
  await page.addInitScript(({ theme, visual }) => {
    localStorage.setItem('tldrastro:theme', theme);
    if (visual) localStorage.setItem('tldrastro:loadingVisual', visual);
    const location = { label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    localStorage.setItem('tldrastro:userProfile', JSON.stringify({
      id: 'illustrated-loader-fixture', name: 'Test Reader', email: 'reader@example.com', provider: 'email',
      sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini', currentLocation: location.label, currentLocationData: location,
      charts: [{ id: 'fixture-chart', name: 'Test Reader', type: 'Birth chart', birthDate: '1990-01-01', birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }]
    }));
  }, { theme, visual });
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
}

function hold() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function expectCssSpinner(spinner: ReturnType<Page['locator']>) {
  await expect(spinner).toBeVisible();
  await expect(spinner).toHaveCSS('animation-name', 'loading-spinner-spin');
  await expect(spinner).toHaveCSS('width', '32px');
  await expect(spinner).toHaveCSS('height', '32px');
  const before = await spinner.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => spinner.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
}

for (const screen of ['sky', 'friends']) for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`${screen} CSS loader keeps its layout at ${width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await prepare(page, theme, 'artwork');
    const decorativeRequests: string[] = [];
    page.on('request', request => { if (/thinking-orbs|loading-artwork/.test(request.url())) decorativeRequests.push(request.url()); });
    const blocked = hold();
    const requestPattern = screen === 'sky' ? '**/api/content-reader' : /\/assets\/ManualChartsPanel-[^/]+\.js$/;
    await page.route(requestPattern, async route => {
      await blocked.promise;
      if (screen === 'sky') await route.fulfill({ json: readerResponse([]) });
      else await route.continue();
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(screen === 'sky' ? '/?date=2026-09-14#sky' : '/#friends?tab=charts', { waitUntil: 'domcontentloaded' });
      const loader = screen === 'sky' ? page.locator('.sky-reading-layout__loading .app-loading') : page.getByRole('status').filter({ hasText: 'Loading Friends…' });
      await expect(loader).toBeVisible({ timeout: 60_000 });
      await expect(loader).toHaveAttribute('role', 'status');
      await expect(loader).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(loader).toHaveCSS('border-width', '0px');
      const spinner = loader.locator('.loading-spinner');
      await expect(loader.locator('canvas, img')).toHaveCount(0);
      await expectCssSpinner(spinner);
      const hiddenSpinners = page.locator('.sky-reading-layout__content[aria-hidden="true"] .loading-spinner');
      for (const hidden of await hiddenSpinners.all()) await expect(hidden).toHaveCSS('animation-name', 'none');
      const loaderBounds = await loader.boundingBox();
      const navigationBounds = await page.locator('.topbar').boundingBox();
      expect(loaderBounds!.y, 'The loading content must clear the fixed navigation').toBeGreaterThanOrEqual(navigationBounds!.y + navigationBounds!.height);
      await page.waitForTimeout(450);
      expect(await loader.boundingBox()).toEqual(loaderBounds);
      await page.screenshot({ path: info.outputPath('css-loading.png') });
    } finally { blocked.release(); }
    if (screen === 'sky') {
      await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', { detail: { contentKey: '*', published: true, updatedAt: new Date().toISOString() } })));
      await page.waitForTimeout(2500);
      await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
    } else {
      await expect(page.getByRole('heading', { name: 'No charts yet.', exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.app-loading--centered:visible')).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'No charts yet.', exact: true })).toBeVisible({ timeout: 30_000 });
    }
    expect(errors).toEqual([]);
    expect(decorativeRequests, "Legacy artwork preference must not load retired decorations").toEqual([]);
  });
}

test('CSS loader respects reduced motion and still dismisses when the reading arrives', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, 'light');
  const blocked = hold();
  await page.route('**/api/content-reader', async route => { await blocked.promise; await route.fulfill({ json: readerResponse([]) }); });
  try {
    await page.goto('/#sky', { waitUntil: 'domcontentloaded' });
    const spinner = page.locator('.sky-reading-layout__loading .loading-spinner');
    await expect(spinner).toBeVisible({ timeout: 60_000 });
    await expect(spinner).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.app-loading canvas')).toHaveCount(0);
  } finally { blocked.release(); }
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
});

test('returning to Sky after Calendar does not replay the page loader', async ({ page }) => {
  test.setTimeout(90_000);
  await prepare(page, 'light');
  await page.goto('/?date=2026-09-14#sky');
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Calendar', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Lunar calendar', exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Sky', exact: true }).first().click();
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
  await expect(page.locator('.app-loading--centered:visible')).toHaveCount(0);
});

test('opening a Sky Placement article from a revealed reading does not replay the page loader', async ({ page }) => {
  test.setTimeout(90_000);
  await prepare(page, 'light');
  await page.goto('/?date=2026-09-14#sky');
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
  await page.getByRole('link', { name: /Read about Sun in /i }).first().click();
  await expect(page.locator('#sky-detail-title')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Loading reading…', { exact: true })).toHaveCount(0);
  await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close detail', exact: true }).click();
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
  await expect(page.getByText('Loading reading…', { exact: true })).toHaveCount(0);
});
