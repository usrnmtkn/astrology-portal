import { expect, test } from "@playwright/test";
import { linkedThreePlanetContext, highlightedCountStatement } from "../fixtures/sky-effort-count-first";

// Read-only production verification after the exact merge commit deploys.
// No mocked responses, credentials, CMS writes, or injected sky positions.
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`public deployed inline effort paragraph ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-09-17T16:00:00.000Z"));
  await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
  await page.goto("https://tldrastro.vercel.app/#sky");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  const card = page.locator(".sky-debility-ledger:visible").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  const paragraphs = card.locator(".sky-today-ledger__copy > p");
  await expect(paragraphs).toHaveCount(2);
  await expect(paragraphs.nth(0)).toContainText("You may want reassurance but find it hard to ask for");
  await expect(paragraphs.nth(1)).toHaveText(linkedThreePlanetContext, { timeout: 30_000 });
  await expect(paragraphs.nth(1).getByTestId("effort-count-statement")).toHaveText(highlightedCountStatement);
  const head = card.locator(".sky-today-ledger__head");
  await expect(head).toHaveText("Things may take more effort right now");
  await expect(head.locator(":scope > :not(h3)")).toHaveCount(0);
  await expect(card.getByRole("link")).toHaveCount(3);
  await expect(paragraphs.nth(1).getByRole("link")).toHaveText(["Venus in Scorpio", "Mars in Cancer", "Saturn Rx in Aries"]);
  for (const placement of ["venus/scorpio", "mars/cancer", "saturn/aries"])
    await expect(paragraphs.nth(1).locator(`a[href="#sky/placement/${placement}"]`)).toBeVisible();
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({ path: `test-results/effort-production-inline-${width}-${theme}.png` });
});
