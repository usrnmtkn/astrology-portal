import { expect, test, type Page } from '../helpers/polish-test';
import { READER_ROW_SCHEMA } from '../../apps/web/src/content/readerRowSchema.mjs';

async function expectFittingHeader(page: Page) {
  await expect.poll(() => page.locator('.topbar').evaluate(header => {
    const pill = header.querySelector<HTMLElement>('.nav-pill')!;
    const actions = header.querySelector<HTMLElement>('.topbar-actions')!;
    const pillBox = pill.getBoundingClientRect();
      const logoBox = pill.querySelector('.brand-dot')!.getBoundingClientRect();
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
      logoFits: logoBox.left >= pillBox.left && logoBox.right <= pillBox.right,
      pageFits: document.documentElement.scrollWidth <= innerWidth,
      scrollable: ['auto', 'scroll'].includes(getComputedStyle(pill).overflowX),
    };
  })).toEqual({ scrollLeft: 0, fits: true, separate: true, logoFits: true, pageFits: true, scrollable: false });
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

    const destinations = ['Sky', 'Calendar', 'Horoscopes', 'Guide', 'You', 'Friends'];
    for (const width of [1440, 1200, 1100, 1081, 1080, 800, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectFittingHeader(page);
      const visible = await primary.locator('button:visible').allTextContents();
      if (width === 1440) expect(visible).toEqual(destinations);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      expect((await page.getByRole('menu', { name: 'Site menu' }).getByRole('menuitem').allTextContents()).slice(0, destinations.length)).toEqual(destinations);
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
    // Larger labels exercise overflow even when the compact design fits every destination.
    if (profile) {
      await primary.getByRole('button', { name: 'Friends', exact: true }).focus();
      const enlargedLabels = await page.addStyleTag({ content: '.site-nav button { min-width: 180px; }' });
      await page.setViewportSize({ width: 1081, height: 1000 });
      await expectFittingHeader(page);
      await expect(primary.getByRole('button', { name: 'Friends', exact: true })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
      await enlargedLabels.evaluate(element => element.remove());
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
    const destinations = ['Sky', 'Calendar', 'Horoscopes', 'Guide', 'You', 'Friends'];
    expect(await page.locator('.site-nav button').allTextContents()).toEqual(destinations);
    expect((await page.getByRole('menu', { name: 'Site menu' }).getByRole('menuitem').allTextContents()).slice(0, destinations.length)).toEqual(destinations);
    for (const name of destinations) {
      await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
  }
});

for (const theme of ['light', 'dark']) {
  test(`design handoff shell retains its layout and menu after reload: ${theme}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
    }, theme);
    await page.route('**/api/content-reader', route => route.fulfill({
      json: { schema: READER_ROW_SCHEMA, rows: [], publications: [], nextCursor: null },
    }));
    await page.goto('/#articles');
    await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
    const guide = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Guide', exact: true });
    await expect(guide).toHaveClass('active');
    await expect(guide).toHaveCSS('font-size', '15px');
    await expect(guide).toHaveCSS('font-weight', '600');
    if (theme === 'light') {
      await expect(guide).toHaveCSS('background-color', 'rgb(214, 240, 235)');
      await expect(guide).toHaveCSS('color', 'rgb(0, 75, 69)');
    }
    await expect(page.locator('.brand-word')).toHaveCSS('font-family', /system-ui/u);
    const group = await page.locator('.topbar').evaluate(header => {
      const pill = header.querySelector('.nav-pill')!.getBoundingClientRect();
      const actions = header.querySelector('.topbar-actions')!.getBoundingClientRect();
      return { top: pill.top, height: pill.height, center: (pill.left + actions.right) / 2 };
    });
    expect(group).toEqual({ top: 56, height: 56, center: 720 });
    await page.screenshot({ path: `test-results/design-handoff-shell-${theme}-desktop.png` });

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expectFittingHeader(page);
      if (width === 390) await expect(page.locator('.brand-word')).toBeVisible();
      await expect(page.locator('.menu-toggle')).toHaveCSS('width', '48px');
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      const menu = page.getByRole('menu', { name: 'Site menu' });
      await expect(menu).toBeVisible();
      const box = (await menu.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
      await expectFittingHeader(page);
      if (width === 390) await page.screenshot({ path: `test-results/design-handoff-shell-${theme}-mobile.png` });
    }
    expect(errors).toEqual([]);
  });
}

for (const theme of ['light', 'dark']) {
  test(`Sky date controls share the floating header without crowding: ${theme}`, async ({ page }) => {
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
    }, theme);
    await page.route('**/api/content-reader', route => route.fulfill({
      json: { schema: READER_ROW_SCHEMA, rows: [], publications: [], nextCursor: null },
    }));
    await page.goto('/#sky');
    const date = page.locator('.sky-header-date-button');
    await expect(date).toBeVisible();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectFittingHeader(page);
      const controls = await page.locator('.topbar').evaluate(header => {
        const boxes = ['.nav-pill', '.sky-header-date-button', '.menu-toggle'].map(selector => header.querySelector(selector)!.getBoundingClientRect());
        return boxes.every((box, index) => box.left >= 0 && box.right <= innerWidth && (index === 0 || boxes[index - 1].right < box.left));
      });
      expect(controls).toBe(true);
      await date.click();
      const picker = page.getByRole('dialog', { name: 'Date and location', exact: true });
      await expect(picker).toBeVisible();
      await expect(picker.getByRole('tab', { name: 'Today', exact: true })).toBeVisible();
      await expect(picker.getByRole('tab', { name: 'Tomorrow', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(picker).toHaveCount(0);
      await page.screenshot({ path: `test-results/design-handoff-sky-${theme}-${width}.png` });
    }
  });
}
