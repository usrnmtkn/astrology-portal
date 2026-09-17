import { expect, test } from "@playwright/test";
import { linkedThreePlanetContext, highlightedCountStatement } from "../fixtures/sky-effort-count-first";
import { expectEffortCardSpacing } from "./sky-debility-layout";

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
  await expectEffortCardSpacing(card);
  const head = card.locator(".sky-today-ledger__head");
  await expect(head).toHaveText("Things may take more effort right now");
  await expect(head.locator(":scope > :not(h3)")).toHaveCount(0);
  const heading = head.getByRole("heading", { level: 3 });
  const headingType = await heading.evaluate(el => {
    const actual = getComputedStyle(el), probe = document.createElement("span");
    probe.style.cssText = "font-family:var(--font-display);font-size:var(--sky-ledger-title-size);font-weight:var(--weight-regular);letter-spacing:var(--tracking-tight);line-height:var(--leading-h1)";
    el.append(probe);
    const expected = getComputedStyle(probe);
    const matches = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].every(key => actual[key as any] === expected[key as any]);
    probe.remove();
    return matches;
  });
  expect(headingType).toBe(true);
  const emphasis = paragraphs.nth(1).locator("mark.content-highlight");
  await expect(emphasis).toHaveText(highlightedCountStatement);
  await expect(emphasis.getByRole("link")).toHaveCount(0);
  await expect(card.getByRole("link")).toHaveCount(3);
  await expect(paragraphs.nth(1).getByRole("link")).toHaveText(["Venus in Scorpio", "Mars in Cancer", "Saturn Rx in Aries"]);
  for (const placement of ["venus/scorpio", "mars/cancer", "saturn/aries"])
    await expect(paragraphs.nth(1).locator(`a[href="#sky/placement/${placement}"]`)).toBeVisible();
  const typography = await emphasis.evaluate(el => {
    const actual = getComputedStyle(el);
    const probe = document.createElement("span");
    probe.style.cssText = "font-family:var(--font-highlight);font-size:var(--text-highlight);font-weight:var(--weight-highlight);line-height:var(--leading-highlight);letter-spacing:var(--tracking-highlight)";
    el.append(probe);
    const expected = getComputedStyle(probe);
    const matches = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].every(key => actual[key as any] === expected[key as any]);
    probe.remove();
    return { matches, background: actual.backgroundImage, wrapping: actual.boxDecorationBreak };
  });
  expect(typography.matches).toBe(true);
  expect(typography.background).toContain("linear-gradient");
  expect(typography.wrapping).toBe("clone");
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({ path: `test-results/effort-reader-inline-${width}-${theme}.png` });
  await paragraphs.nth(1).getByRole("link", { name: "Read about Saturn Rx in Aries", exact: true }).click();
  await expect(page).toHaveURL(/#sky\/placement\/saturn\/aries$/);
});
