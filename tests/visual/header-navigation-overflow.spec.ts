import { expect, test, type Page } from '@playwright/test';
import { READER_ROW_SCHEMA } from '../../apps/web/src/content/readerRowSchema.mjs';

async function expectFittingHeader(page: Page) {
  await expect.poll(() => page.locator('.topbar').evaluate(header => {
    const pill = header.querySelector<HTMLElement>('.nav-pill')!;
    const actions = header.querySelector<HTMLElement>('.topbar-actions')!;
    const pillBox = pill.getBoundingClientRect();
    const buttons = Array.from(header.querySelectorAll<HTMLElement>('.site-nav button'))
      .filter(button => button.getBoundingClientRect().width > 0);
    pill.scrollLeft = 100;
    return {
      scrollLeft: pill.scrollLeft,
      fits: buttons.every(button => {
        const box = button.getBoundingClientRect();
        return box.left >= pillBox.left && box.right <= pillBox.right;
      }),
      separate: pillBox.right < actions.getBoundingClientRect().left,
      pageFits: document.documentElement.scrollWidth <= innerWidth,
      scrollable: ['auto', 'scroll'].includes(getComputedStyle(pill).overflowX),
    };
  })).toEqual({ scrollLeft: 0, fits: true, separate: true, pageFits: true, scrollable: false });
}

for (const profile of [false, true]) for (const theme of ['light', 'dark']) {
  test(`header overflow keeps whole items and Guide reachable: ${profile ? 'member' : 'guest'}, ${theme}`, async ({ page }) => {
    await page.addInitScript(({ profile, theme }) => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      if (profile) localStorage.setItem('tldrastro:userProfile', JSON.stringify({
        id: 'header-fixture', name: 'Synthetic Reader', email: 'header@example.test', provider: 'email', charts: [],
      }));
    }, { profile, theme });
    await page.route('**/api/content-reader', route => route.fulfill({
      json: { schema: READER_ROW_SCHEMA, rows: [], publications: [], nextCursor: null },
    }));
    await page.goto('/learn');
    const primary = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(primary.getByRole('button', { name: 'Guide', exact: true })).toBeVisible();
    if (profile) await expect(primary.getByRole('button', { name: 'Friends', exact: true })).toBeVisible();

    const destinations = ['Sky', 'Calendar', 'Horoscopes', 'Guide', ...(profile ? ['You', 'Friends'] : [])];
    let overflowedDesktop = false;
    for (const width of [1440, 1200, 1100, 1081, 1080, 800, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectFittingHeader(page);
      const visible = await primary.locator('button:visible').allTextContents();
      if (width > 1080 && visible.length < destinations.length) overflowedDesktop = true;
      if (width === 1440) expect(visible).toEqual(destinations);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      for (const name of destinations) {
        await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
      }
      await expect(page.getByRole('menuitem', { name: 'Articles & Guides', exact: true })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
      if (width === 1081 || width === 390) {
        await page.screenshot({ path: `test-results/header-${profile ? 'member' : 'guest'}-${theme}-${width}.png` });
      }
    }
    if (profile) expect(overflowedDesktop).toBe(true);

    // Keyboard focus follows an item into the menu when that item no longer fits.
    if (profile) {
      await primary.getByRole('button', { name: 'Friends', exact: true }).focus();
      await page.setViewportSize({ width: 1081, height: 1000 });
      await expect(primary.getByRole('button', { name: 'Friends', exact: true })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
    }

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Guide', exact: true }).click();
    await expect(page).toHaveURL(/#articles$/u);
    await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
    await expect(page.getByRole('menu', { name: 'Site menu' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
    await expectFittingHeader(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(primary.getByRole('button', { name: 'Guide', exact: true })).toHaveClass('active');
    await expectFittingHeader(page);
  });
}

test('reports shares the stationary header and mobile menu', async ({ page }) => {
  await page.goto('/reports/');
  await expect(page.locator('.report-topbar')).toBeVisible();
  for (const width of [1440, 1081, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectFittingHeader(page);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    for (const name of ['Sky', 'Calendar', 'You', 'Friends']) {
      await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
  }
});
