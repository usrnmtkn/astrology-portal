import { expect, test } from "@playwright/test";
import { linkedThreePlanetContext, highlightedCountStatement } from "../fixtures/sky-effort-count-first";

// The actual ephemeris supplies sign and motion at the regression instant.
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`inline effort paragraph ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-09-17T16:00:00.000Z"));
  await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-17", events: [] }] } } }));
  await page.goto("http://127.0.0.1:4298/#sky");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  const card = page.locator(".sky-debility-ledger:visible").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  const paragraphs = card.locator(".sky-today-ledger__copy > p");
  await expect(paragraphs).toHaveCount(2);
  await expect(paragraphs.nth(0)).toContainText("You may want reassurance but find it hard to ask for");
  await expect(paragraphs.nth(1)).toHaveText(linkedThreePlanetContext);
  await expect(card.locator(".sky-today-ledger__head")).toContainText("3 of 7");
  const emphasis = paragraphs.nth(1).getByTestId("effort-count-statement");
  await expect(emphasis).toHaveText(highlightedCountStatement);
  await expect(emphasis.getByRole("link")).toHaveCount(0);
  await expect(card.getByRole("link")).toHaveCount(3);
  await expect(paragraphs.nth(1).getByRole("link")).toHaveText(["Venus in Scorpio", "Mars in Cancer", "Saturn Rx in Aries"]);
  for (const placement of ["venus/scorpio", "mars/cancer", "saturn/aries"])
    await expect(paragraphs.nth(1).locator(`a[href="#sky/placement/${placement}"]`)).toBeVisible();
  const typography = await emphasis.evaluate(el => {
    const actual = getComputedStyle(el), body = getComputedStyle(el.parentElement!);
    return { emphasized: Number(actual.fontWeight), regular: Number(body.fontWeight),
      same: ["fontFamily", "fontSize", "lineHeight", "letterSpacing"].every(key => actual[key as any] === body[key as any]) };
  });
  expect(typography.emphasized).toBeGreaterThan(typography.regular);
  expect(typography.same).toBe(true);
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({ path: `test-results/effort-reader-inline-${width}-${theme}.png` });
  await paragraphs.nth(1).getByRole("link", { name: "Read about Saturn Rx in Aries", exact: true }).click();
  await expect(page).toHaveURL(/#sky\/placement\/saturn\/aries$/);
});
