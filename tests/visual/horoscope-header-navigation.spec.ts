import { expect, test, type Page } from '@playwright/test';
import { READER_ROW_SCHEMA } from '../../apps/web/src/content/readerRowSchema.mjs';

async function headerStyle(page: Page) {
  await page.mouse.move(0, 0);
  return page.locator('.topbar').evaluate(header => {
    const style = (selector: string) => {
      const computed = getComputedStyle(header.querySelector(selector)!);
      return {
        display: computed.display,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        color: computed.color,
        background: computed.backgroundColor,
        padding: computed.padding,
        gap: computed.gap,
        borderRadius: computed.borderRadius,
      };
    };
    return { brand: style('.brand-word'), pill: style('.nav-pill'), menu: style('.menu-toggle') };
  });
}

for (const width of [390, 519, 800, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`Horoscopes uses the shared header and navigation at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
      let failed = false;
      await page.route('**/api/content-reader', route => route.fulfill(failed
        ? { status: 503, json: { error: 'Fixture unavailable' } }
        : { json: { schema: READER_ROW_SCHEMA, rows: [], publications: [], nextCursor: null } }));

      // Learn uses the same site header without Sky's additional date controls.
      await page.goto('/learn');
      await expect(page.locator('.app-shell')).toHaveClass(/mode-learn/);
      const brand = page.getByRole('button', { name: 'TLDR Astro home', exact: true });
      await expect(brand).toBeVisible();
      const expectedHeader = await headerStyle(page);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Horoscopes', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Horoscopes', exact: true })).toBeVisible();
      await expect(page.getByRole('menu', { name: 'Site menu' })).toHaveCount(0);
      await expect(brand).toBeVisible();
      await expect.poll(() => headerStyle(page)).toEqual(expectedHeader);
      await expect(page.getByRole('heading', { name: 'No daily reading yet' })).toBeVisible();

      const primary = page.getByRole('navigation', { name: 'Primary navigation' });
      if (width > 1080) {
        await expect(primary).toBeVisible();
        await expect(primary.getByRole('button', { name: 'Horoscopes', exact: true })).toHaveClass('active');
      } else {
        await expect(primary).toBeHidden();
      }
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await expect(page.getByRole('menuitem', { name: 'Horoscopes', exact: true })).toHaveClass('active');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();

      await page.reload();
      await expect(page.getByRole('heading', { name: 'No daily reading yet' })).toBeVisible();
      await expect(brand).toBeVisible();
      await expect.poll(() => headerStyle(page)).toEqual(expectedHeader);
      const brandBox = await page.locator('.nav-pill').boundingBox();
      const menuBox = await page.locator('.menu-toggle').boundingBox();
      expect(brandBox!.x + brandBox!.width).toBeLessThan(menuBox!.x);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/horoscope-header-${width}-${theme}.png` });

      failed = true;
      await page.reload();
      await expect(page.getByRole('alert')).toContainText('could not load');
      await expect(brand).toBeVisible();
      await expect.poll(() => headerStyle(page)).toEqual(expectedHeader);
      failed = false;
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'No daily reading yet' })).toBeVisible();
      await brand.click();
      await expect(page.locator('.app-shell')).toHaveClass(/mode-guest/);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Horoscopes', exact: true }).click();
      await expect(brand).toBeVisible();
      if (width > 1080) {
        await primary.getByRole('button', { name: 'Calendar', exact: true }).click();
        await expect(page.locator('.app-shell')).toHaveClass(/mode-calendar/);
        await primary.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      }
      await expect(page.getByRole('heading', { name: 'Horoscopes', exact: true })).toBeVisible();
    });
  }
}
