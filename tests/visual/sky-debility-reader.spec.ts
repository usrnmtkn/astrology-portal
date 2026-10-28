import { expect, test } from "@playwright/test";
import { linkedThreePlanetContext, highlightedCountStatement } from "../fixtures/sky-effort-short";
import { expectEffortCardSpacing } from "./sky-debility-layout";
import { readerResponse } from "../helpers/reader-response";
import { bundledPublications } from "../helpers/bundled-publications";

// The actual ephemeris supplies sign and motion at the regression instant.
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`inline effort paragraph ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-09-17T16:00:00.000Z"));
  await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-17", events: [] }] } } }));
  await page.goto("/#sky");
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
    probe.style.cssText = "font-family:var(--font-display);font-size:var(--type-section-display-size);font-weight:var(--weight-regular);letter-spacing:var(--tracking-dialog-title);line-height:var(--leading-compact-title)";
    if (innerWidth <= 800) { probe.style.fontSize = 'var(--type-mobile-section-display-size)'; probe.style.lineHeight = 'var(--leading-placement-title)'; }
    el.append(probe);
    const expected = getComputedStyle(probe);
    const matches = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].every(key => actual[key as any] === expected[key as any]);
    probe.remove();
    return matches;
  });
  expect(headingType).toBe(true);
  await expect(card.locator('mark.content-highlight')).toHaveCount(0);
  await expect(paragraphs.nth(1)).toContainText(highlightedCountStatement);
  await expect(paragraphs.nth(1).getByRole('link')).toHaveCount(3);
  await expect(card.locator('.sky-debility-card')).toHaveCount(3);
  for (const link of await paragraphs.nth(1).getByRole('link').all()) expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('underline');
  await expect(paragraphs.nth(1).getByRole('link')).toHaveText(['Venus in Scorpio', 'Mars in Cancer', 'Saturn retrograde in Aries']);
  await expect(paragraphs.nth(1)).toHaveCSS('font-family', /Newsreader/);
  await expect(paragraphs.nth(1)).toHaveCSS('font-size', '19px');
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({ path: `test-results/effort-reader-inline-${width}-${theme}.png` });
  await paragraphs.nth(1).getByRole("link", { name: "Read about Saturn retrograde in Aries", exact: true }).click();
  await expect(page).toHaveURL(/#sky\/placement\/saturn\/aries$/);
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`complete effort reading follows the actual sky ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-10-05T16:00:00.000Z"));
  await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
  await bundledPublications(page);
  const fields = { surface: "sky", mode: "card", status: "LIVE", lane: "serving", review_state: null, headline: "Fixture interpretation for October", summary: "", sections: null,
    source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", allowedSlots: ["planetList", "countWord", "totalWord", "countVerb", "detrimentCount", "fallCount", "detrimentPlanetList", "fallPlanetList"] }, updated_at: "2026-10-05T12:00:00.000Z" };
  const october = { ...fields, id: "october-fixture", content_key: "cms/sky-debility/reading/sun-libra-direct__venus-scorpio-retrograde__saturn-aries-retrograde",
    body: "October fixture opening stays complete.\n\n{countWord} of the {totalWord} classical planets {countVerb} currently in detriment or fall: {detrimentPlanetList} is in detriment; {fallPlanetList} are in fall.\n\nOctober fixture ending stays complete." };
  const september = { ...fields, id: "september-fixture", content_key: "cms/sky-debility/reading/venus-scorpio-direct__mars-cancer-direct__saturn-aries-retrograde", headline: "Fixture interpretation for September",
    body: "September fixture opening stays complete.\n\n{planetList}.\n\nSeptember fixture ending stays complete." };
  let rows = [october, september];
  let revision = 1;
  await page.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: {
    schema: "content-studio-last-known-good-v2", rowCount: rows.length, rows,
    publications: [october, september].map(row => ({ content_key: row.content_key, state: "live", revision, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at }))
  } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse(rows, [october, september].map(row => ({ content_key: row.content_key, state: 'live', revision, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at }))) }));
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const card = page.locator(".sky-debility-ledger:visible").first();
  await page.goto("/?date=2026-09-17#sky");
  await expect(card).toContainText("September fixture opening stays complete.", { timeout: 60_000 });
  await expect(card).toContainText("September fixture ending stays complete.");
  await expect(card.locator(".sky-today-ledger__copy").getByRole("link")).toHaveCount(3);
  await page.goto("/?date=2026-10-05#sky");
  await expect(card).toContainText("October fixture opening stays complete.", { timeout: 60_000 });
  await expect(card).toContainText("October fixture ending stays complete.");
  await expect(card).not.toContainText("September fixture");
  const count = card.locator('.sky-today-ledger__copy');
  await expect(card.locator('mark.content-highlight')).toHaveCount(0);
  await expect(count).toContainText(highlightedCountStatement);
  await expect(card).toContainText('the Sun in Libra and Saturn retrograde in Aries are in fall.');
  await expect(count.getByRole('link')).toHaveText(['Venus retrograde in Scorpio', 'the Sun in Libra', 'Saturn retrograde in Aries']);
  for (const link of await count.getByRole('link').all()) expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('underline');
  await expect(card.getByRole("heading", { level: 3 })).toHaveText(october.headline);
  await expectEffortCardSpacing(card);
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.reload();
  await expect(card).toContainText("October fixture ending stays complete.", { timeout: 60_000 });
  await expect(count).toContainText(highlightedCountStatement);
  await card.screenshot({ path: `test-results/effort-complete-${width}-${theme}.png` });
  // A known published reading with unavailable body stays unavailable.
  rows = []; revision++;
  await page.reload();
  await expect(page.locator(".sky-debility-ledger")).toHaveCount(0, { timeout: 30_000 });
});
