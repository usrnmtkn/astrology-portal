import { readerSession } from "../helpers/reader-session";
import { readerResponse } from '../helpers/reader-response';
import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page, theme: string, visual?: 'artwork') {
  await page.addInitScript(({ theme, visual }) => {
    localStorage.setItem('tldrastro:theme', theme);
    if (!localStorage.getItem('tldrastro:pageAnimations')) localStorage.setItem('tldrastro:pageAnimations', 'system');
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
  await readerSession(page, "illustrated-loader-fixture");
}

function hold() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
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
      const loader = screen === 'sky' ? page.locator('.sky-reading-layout__loading') : page.locator('.app-loading[aria-label="Loading Friends…"]');
      await expect(loader).toBeVisible({ timeout: 60_000 });
      if (screen === 'sky') {
        await expect(loader.getByRole('status').filter({ hasText: 'Loading the sky…' })).toHaveCount(1);
        await expect(loader.locator('.placement-table-wrap')).toHaveCount(2);
        for(const list of await loader.locator('.placement-table-wrap').all()) await expect(list).toHaveAttribute('aria-busy','true');
        await expect(loader.locator('.planet-placement-row--sky.card-skeleton')).toHaveCount(14);
        await expect(loader.locator('.loading-moon')).toHaveCount(0);
        await expect(loader.locator('.card-skeleton-bar').first()).toHaveCSS('animation-name', 'skeleton-pulse');
      } else {
        await expect(loader).toHaveAttribute('aria-busy', 'true');
        await expect(loader.locator('.loading-card')).toHaveCount(1);
        await expect(loader.locator('.loading-moon')).toHaveCount(0);
        await expect(loader.locator('.card-skeleton-bar').first()).toHaveCSS('animation-name', 'skeleton-pulse');
      }
      await expect(loader.locator('canvas, img')).toHaveCount(0);
      const hiddenShadows = page.locator('.sky-reading-layout__content[aria-hidden="true"] .loading-moon__shadow');
      for (const hidden of await hiddenShadows.all()) await expect(hidden).toHaveCSS('animation-name', 'none');
      const visibleLoading = screen === 'sky' ? loader.locator('.sky-summary-loading') : loader;
      const loaderBounds = await visibleLoading.boundingBox();
      const navigationBounds = await page.locator('.topbar').boundingBox();
      expect(loaderBounds!.y, 'The loading content must clear the fixed navigation').toBeGreaterThanOrEqual(navigationBounds!.y + navigationBounds!.height);
      await page.waitForTimeout(450);
      expect(await visibleLoading.boundingBox()).toEqual(loaderBounds);
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
    const skeleton = page.locator('.sky-reading-layout__loading .card-skeleton').first();
    await expect(skeleton).toBeVisible({ timeout: 60_000 });
    await expect(skeleton).toHaveCSS('animation-name', 'none');
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

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const reducedMotion of ['no-preference', 'reduce'] as const) for (const choice of ['system', 'on', 'off'] as const) {
  test(`report loading orbit keeps its card sizing at ${width} in ${theme} with ${reducedMotion} and ${choice}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion });
    await prepare(page, theme);
    await page.addInitScript(value => localStorage.setItem('tldrastro:pageAnimations', value), choice);
    const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, email: 'loader@example.test' };
    const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({ user, storageKey }) => {
      localStorage.setItem(storageKey, JSON.stringify({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
    }, { user, storageKey });
    await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
    const blocked = hold();
    await page.route('**/rest/v1/user_generated_interpretations*', async route => {
      await blocked.promise;
      await route.fulfill({ json: [] });
    });
    try {
      await page.goto('/reports/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading',{name:'Reports',exact:true})).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);
      const loading = page.locator('.report-state-card[aria-busy="true"]').filter({hasText:'Loading your reports…'});
      const moon = loading.locator('.report-loading');
      await expect(moon).toBeVisible();
      await expect(moon).toHaveCSS('width', '40px');
      await expect(moon).toHaveCSS('height', '40px');
      await expect(moon).toHaveCSS('color', theme === 'dark' ? 'rgb(236, 238, 242)' : 'rgb(28, 31, 38)');
      const shadow = moon;
      const bounds = await loading.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (reducedMotion === 'reduce' || choice === 'off') {
        await expect(shadow).toHaveCSS('animation-name', 'none');
        await expect(shadow).toHaveCSS('transform', 'none');
      } else {
        await expect(shadow).toHaveCSS('animation-name', 'report-orbit');
        const before = await shadow.evaluate(el => getComputedStyle(el).transform);
        await expect.poll(() => shadow.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
      }
      expect(await loading.boundingBox()).toEqual(bounds);
      await expect(loading.locator('p')).toHaveCSS('font-size', '19px');
      await page.screenshot({ path: info.outputPath('compact-moon.png') });
    } finally { blocked.release(); }
    await expect(page.locator('.report-state-card[aria-busy="true"]').filter({hasText:'Loading your reports…'})).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  });
}

for (const choice of ['On', 'Off', 'System'] as const) {
  test(`Settings ${choice} persists through reload and controls the next route moon`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: choice === 'Off' ? 'no-preference' : 'reduce' });
    await prepare(page, 'light');
    await page.goto('/#settings');
    const controls = page.getByRole('group', { name: 'Page animations', exact: true });
    await controls.getByRole('button', { name: choice, exact: true }).click();
    await expect(controls.getByRole('button', { name: choice, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tldrastro:pageAnimations'))).toBe(choice.toLowerCase());
    await page.reload();
    await expect(controls.getByRole('button', { name: choice, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const blocked = hold();
    await page.route(/\/assets\/CalendarRoute-.*\.js$/, async route => { await blocked.promise; await route.continue().catch(() => {}); });
    try {
      await page.getByRole('button', { name: 'Calendar', exact: true }).first().click();
      const loading = page.locator('.app-loading[aria-label="Loading calendar…"]');
      await expect(loading).toBeVisible();
      await expect(loading.locator('.loading-moon')).toHaveCount(0);
      await expect(loading.locator('.card-skeleton-bar').first()).toHaveCSS('animation-name', 'none');
    } finally { blocked.release(); }
    await expect(page.getByRole('region', { name: 'Lunar calendar', exact: true })).toBeVisible();
  });
}

for (const width of [390, 1024, 1440, 1768]) for (const theme of ['light', 'dark']) {
  test(`You loading and error cards stay inside the viewport at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await prepare(page, theme);
    const blocked = hold();
    await page.route('**/rest/v1/content_publications*', route => route.fulfill({ json: [{
      content_key: 'authored/transit-fixture', state: 'live', revision: 1, row_id: 'fixture-transit',
      row_updated_at: null, updated_at: '2026-10-15T00:00:00Z'
    }] }));
    await page.route('**/api/content-reader', async route => {
      await blocked.promise;
      await route.fulfill({ status: 503, json: { error: 'Fixture unavailable' } });
    });
    const assertContained = async () => {
      const bounds = await page.locator('.you-chart-page main.chart-layout__content').evaluate(column => {
        const parent = column.getBoundingClientRect();
        return {
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          left: parent.left,
          right: parent.right,
          children: [...column.children].map(child => {
            const rect = child.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          })
        };
      });
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.viewport);
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
      for (const child of bounds.children) {
        expect(child.left).toBeGreaterThanOrEqual(bounds.left - 1);
        expect(child.right).toBeLessThanOrEqual(bounds.right + 1);
      }
    };
    try {
      await page.goto('/#you', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.app-loading[aria-label="Loading transit readings…"]')).toBeVisible();
      await assertContained();
    } finally { blocked.release(); }
    await expect(page.getByRole('alert').filter({ hasText: 'The transit readings could not load.' })).toBeVisible();
    await assertContained();
  });
}
