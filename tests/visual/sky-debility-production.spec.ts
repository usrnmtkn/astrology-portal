import { expect, test } from "@playwright/test";
import { approvedThreePlanetContext } from "../fixtures/sky-effort-count-first";

// Run only after the merge commit's Vercel status completes. No mocked
// responses, credentials, CMS writes, or injected astronomical positions.
for (const width of [390, 1440]) test(`public deployed Sky count-first paragraph ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-09-17T16:00:00.000Z"));
  await page.goto("https://tldrastro.vercel.app/#sky");
  const card = page.locator(".sky-debility-ledger:visible").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.locator(".sky-today-ledger__copy > p").nth(0)).toContainText("You may want reassurance but find it hard to ask for");
  await expect(card.locator(".sky-today-ledger__copy > p").nth(1)).toHaveText(approvedThreePlanetContext, { timeout: 30_000 });
  await expect(card.locator(".sky-today-ledger__head")).toContainText("3 of 7");
  for (const placement of ["venus/scorpio", "mars/cancer", "saturn/aries"])
    await expect(card.locator(`a[href="#sky/placement/${placement}"]`)).toBeVisible();
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({ path: `test-results/effort-production-${width}.png` });
});
