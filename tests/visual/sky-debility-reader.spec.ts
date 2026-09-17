import { expect, test } from "@playwright/test";
import { approvedThreePlanetContext } from "../fixtures/sky-effort-count-first";

// Uses the web app's actual ephemeris for a fixed test instant, not injected
// planet positions. Reader rendering and Studio assembly must agree.
for (const width of [390, 1440]) test(`count-first paragraph on the actual Sky reader ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-09-17T16:00:00.000Z"));
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-17", events: [] }] } } }));
  await page.goto("http://127.0.0.1:4298/#sky");
  const card = page.locator(".sky-debility-ledger:visible").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.locator(".sky-today-ledger__copy > p").nth(1)).toHaveText(approvedThreePlanetContext);
  await expect(card.locator(".sky-today-ledger__head")).toContainText("3 of 7");
  await expect(card.locator('a[href="#sky/placement/venus/scorpio"]')).toBeVisible();
  await expect(card.locator('a[href="#sky/placement/mars/cancer"]')).toBeVisible();
  await expect(card.locator('a[href="#sky/placement/saturn/aries"]')).toBeVisible();
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({ path: `test-results/effort-reader-count-first-${width}.png` });
});
