import { expect, test, type Locator, type Page } from '../helpers/polish-test';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

async function expectHeaderAlignment(page: Page, back: Locator) {
  await page.mouse.move(0, 0);
  await expect(back).toBeVisible();
  const nav = page.locator('.nav-pill');
  await expect(nav).toBeVisible();
  await expect.poll(async () => {
    const b = (await back.boundingBox())!, n = (await nav.boundingBox())!;
    return Math.abs(b.y + b.height / 2 - n.y - n.height / 2);
  }).toBeLessThan(1);
  const b = (await back.boundingBox())!, n = (await nav.boundingBox())!;
  expect(Math.abs(b.height - n.height)).toBeLessThan(1);
  expect(b.x + b.width).toBeLessThan(n.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const menu = (await page.getByRole('button', { name: 'Open menu', exact: true }).boundingBox())!;
  expect(n.x + n.width).toBeLessThan(menu.x);
}

for (const width of [390, 768, 1024, 1440]) for (const theme of ['light', 'dark']) {
  test(`child Back controls share the main navigation row ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-24T16:00:00Z'));
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    await page.route('**/auth/v1/**', route => route.fulfill({ json: null }));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
      localStorage.setItem('tldrastro:userProfile', JSON.stringify({ id: 'header-fixture', name: 'Synthetic Reader', email: 'header@example.test', provider: 'email', charts: [] }));
    }, theme);

    await page.goto('/?date=2026-10-24#sky/placement/mercury/scorpio');
    await expect(page.locator('#sky-detail-title')).toHaveText('Mercury Rx in Scorpio', { timeout: 60_000 });
    const articleBack = page.getByRole('button', { name: 'Close detail', exact: true });
    await expectHeaderAlignment(page, articleBack);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expectHeaderAlignment(page, articleBack);
    await page.reload();
    await expect(page.locator('#sky-detail-title')).toBeVisible({ timeout: 60_000 });
    await expectHeaderAlignment(page, articleBack);
    await page.screenshot({ path: `test-results/child-back-${width}-${theme}.png` });
    await articleBack.click();
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });

    // Published child readings retain the aligned Back control. Unavailable
    // readings use the handoff's single recovery action instead.
    await page.route('**/api/content-reader', route => {
      const query = route.request().postDataJSON();
      return query.keys?.includes('article/guide/navigation-fixture') ? route.fulfill({ json: readerResponse([{
        id: 'navigation-fixture', content_key: 'article/guide/navigation-fixture', headline: 'Navigation fixture guide', body: 'Complete fixture opening.\n\nComplete fixture ending.', surface: 'education', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, updated_at: '2026-10-24T16:00:00Z'
      }]) }) : route.fallback();
    });
    await page.goto('/#articles/article%2Fguide%2Fnavigation-fixture');
    await expect(page.getByRole('heading', { name: 'Navigation fixture guide', exact: true })).toBeVisible();
    const guideBack = page.getByRole('link', { name: 'Back to Articles & Guides', exact: true });
    await expectHeaderAlignment(page, guideBack);
    await guideBack.click();
    await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();

    await page.goto('/#settings?view=blocked-accounts');
    const settingsBack = page.getByRole('button', { name: 'Back to Settings', exact: true });
    await expectHeaderAlignment(page, settingsBack);
    await settingsBack.click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  });
}
