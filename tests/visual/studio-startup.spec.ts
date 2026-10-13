import { expect, test } from "@playwright/test";

// The standalone Studio document paints before its React entry has downloaded.
test('Studio startup uses an animated moon before hydration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/assets\/index-[^/]+\.js$/, async route => {
    await held;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    const moon = page.locator('#app-startup .loading-moon');
    await expect(moon).toBeVisible();
    await expect(moon).toHaveCSS('width', '48px');
    await expect(page.locator('#app-startup')).toContainText('Loading Content Studio…');
    const shadow = moon.locator('.loading-moon__shadow');
    await expect(shadow).toHaveCSS('animation-name', 'startup-moon-phase');
    const before = await shadow.evaluate(el => getComputedStyle(el).transform);
    await expect.poll(() => shadow.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(shadow).toHaveCSS('animation-name', 'none');
  } finally { release(); }
  await expect(page.locator('#app-startup')).toHaveCount(0);
});
