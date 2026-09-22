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

async function expectAnimatedOrb(frame: ReturnType<Page['locator']>) {
  const orb = frame.locator('canvas');
  await expect(orb).toBeVisible({ timeout: 60_000 });
  await expect(frame.locator('img.is-active')).toHaveCount(0);
  await expect.poll(() => orb.evaluate(canvas => {
    const image = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return image.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  const animated = await orb.evaluate(canvas => canvas.toDataURL());
  await expect.poll(() => orb.evaluate(canvas => canvas.toDataURL())).not.toBe(animated);
}

for (const screen of ['sky', 'friends']) for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`${screen} thinking orb loads without movement at ${width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await prepare(page, theme);
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
      const frame = loader.locator('.loading-illustration');
      await expect(frame.locator('canvas')).toBeVisible();
      const bounds = await frame.boundingBox();
      const loaderBounds = await loader.boundingBox();
      const navigationBounds = await page.locator('.topbar').boundingBox();
      expect(loaderBounds!.y, 'The loading content must clear the fixed navigation').toBeGreaterThanOrEqual(navigationBounds!.y + navigationBounds!.height);
      await expectAnimatedOrb(frame);
      await page.waitForTimeout(450);
      expect(await frame.boundingBox()).toEqual(bounds);
      expect(await loader.boundingBox()).toEqual(loaderBounds);
      await page.screenshot({ path: info.outputPath('thinking-orb-loading.png') });
    } finally { blocked.release(); }
    if (screen === 'sky') {
      await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', { detail: { contentKey: '*', published: true, updatedAt: new Date().toISOString() } })));
      await page.waitForTimeout(2500);
      await expect(page.locator('.sky-reading-layout__loading')).toHaveCount(0);
    } else {
      await expect(page.getByRole('heading', { name: 'No charts yet.', exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.app-loading--illustrated:visible')).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'No charts yet.', exact: true })).toBeVisible({ timeout: 30_000 });
    }
    expect(errors).toEqual([]);
  });
}

test('thinking orb retains its waiting animation under reduced motion; the reading still arrives', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, 'light');
  const blocked = hold();
  await page.route('**/api/content-reader', async route => { await blocked.promise; await route.fulfill({ json: readerResponse([]) }); });
  try {
    await page.goto('/#sky', { waitUntil: 'domcontentloaded' });
    const frame = page.locator('.sky-reading-layout__loading .loading-illustration');
    await expect(frame).toBeVisible({ timeout: 60_000 });
    // The shared loader contract deliberately keeps this waiting indicator moving.
    await expectAnimatedOrb(frame);
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
  await expect(page.locator('.app-loading--illustrated:visible')).toHaveCount(0);
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

for (const screen of ['sky', 'friends']) for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`${screen} sunset artwork option cycles without movement at ${width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-14T16:00:00Z'));
    await prepare(page, theme, 'artwork');
    const blocked = hold();
    const requestPattern = screen === 'sky' ? '**/api/content-reader' : /\/assets\/ManualChartsPanel-[^/]+\.js$/;
    await page.route(requestPattern, async route => {
      await blocked.promise;
      if (screen === 'sky') await route.fulfill({ json: readerResponse([]) });
      else await route.continue();
    });
    try {
      await page.goto(screen === 'sky' ? '/?date=2026-09-14#sky' : '/#friends?tab=charts', { waitUntil: 'domcontentloaded' });
      const loader = screen === 'sky' ? page.locator('.sky-reading-layout__loading .app-loading') : page.getByRole('status').filter({ hasText: 'Loading Friends…' });
      const frame = loader.locator('.loading-illustration');
      await expect(frame.locator('img.is-active')).toHaveAttribute('src', '/loading-artwork/sun.png');
      await expect.poll(() => frame.locator('img.is-active').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(512);
      const bounds = await frame.boundingBox();
      await expect(frame.locator('img.is-active')).not.toHaveAttribute('src', '/loading-artwork/sun.png', { timeout: 8000 });
      expect(await frame.boundingBox()).toEqual(bounds);
      expect(await frame.locator('img.is-active').evaluate(img => getComputedStyle(img).filter)).toBe(theme === 'dark' ? 'invert(1)' : 'none');
      await page.screenshot({ path: info.outputPath('illustrated-loading.png') });
    } finally { blocked.release(); }
    if (screen === 'sky') await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
    else await expect(page.getByRole('heading', { name: 'No charts yet.', exact: true })).toBeVisible({ timeout: 30_000 });
  });
}

test('shipped illustrations retain transparent interiors and original canvas size', async ({ page }) => {
  await page.goto('/loading-artwork/sun.png');
  const samples = await page.evaluate(async () => {
    const names = ['sun', 'moon', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    return Promise.all(names.map(async name => {
      const image = new Image(); image.src = `/loading-artwork/${name}.png`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, 512, 512);
      let ink = 0, white = 0, transparentInterior = 0;
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const i = (y * 512 + x) * 4;
        if (data[i + 3] > 0) ink++;
        if (data[i + 3] > 0 && data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white++;
        if (x > 180 && x < 332 && y > 180 && y < 332 && data[i + 3] === 0) transparentInterior++;
      }
      return { name, width: image.naturalWidth, height: image.naturalHeight, ink, white, transparentInterior };
    }));
  });
  for (const sample of samples) {
    expect(sample.width).toBe(512); expect(sample.height).toBe(512);
    expect(sample.ink).toBeGreaterThan(500); expect(sample.white, sample.name).toBe(0);
    expect(sample.transparentInterior, sample.name).toBeGreaterThan(500);
  }
});
