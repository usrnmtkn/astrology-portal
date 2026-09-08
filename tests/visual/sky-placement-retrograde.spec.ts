import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
const corpus = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", "utf8"));
const modifier = (planet: string) => corpus.content.retrogradeGeneric.find((row: { Planet: string }) => row.Planet === planet).Body;
const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();

test.beforeAll(() => {
  if (!fs.existsSync("test-results/sky-retrograde/calendar-motion-fixture.json") || !fs.existsSync("test-results/sky-retrograde/direct-neptune-event.json")) {
    execFileSync(process.execPath, ["--import", "tsx", "scripts/test-sky-motion-events.mts"], { stdio: "pipe" });
  }
});

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" })));
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-07", events: [] }] } } }));
});

for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`Rx placement card and article ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
    await page.goto("/?date=2026-09-07#sky");
    const aspectCard = page.getByRole("button", { name: "Read more about Neptune Rx sextile Pluto Rx", exact: true });
    await expect(aspectCard).toBeVisible({ timeout: 60_000 });
    await expect(aspectCard.locator(".aspect-row-glyphs")).toHaveText(/℞.*℞/);
    const card = page.getByRole("button", { name: "Read more about Neptune Rx in Aries", exact: true });
    await expect(card).toContainText(normalize(modifier("Neptune")), { timeout: 60_000 });
    await card.click();
    await expect(page.locator("#sky-detail-title")).toHaveText("Neptune Rx in Aries");
    const headerDates = page.locator(".sky-detail-id .article-duration");
    await expect(headerDates.first()).toHaveText(/Jul 7, 2026 - Dec 12, 2026/);
    await expect(headerDates.nth(1)).toHaveText(/In Aries: January 26, 2026 to March 23, 2039/);
    await expect(page.locator(".article-body-inner p").first()).toHaveText(modifier("Neptune"));
    // Preserve both the opening and final sentence of the owner-authored base unit.
    await expect(page.locator(".sky-detail-article")).toContainText("Neptune in Aries makes a new dream feel urgent before its shape is fully clear.");
    await expect(page.locator(".sky-detail-article")).toContainText("Let imagination lead without asking it to prove that every impulse is destiny.");
    await expect(page.locator(".article-related-aspects__copy-heading h4").filter({ hasText: /Neptune Rx/ }).first()).toBeVisible();
    const glyphs = page.locator(".article-related-aspects__copy-heading").filter({ hasText: /Neptune Rx/ }).first().locator(".aspect-row-glyphs");
    await expect(glyphs).toContainText("℞");
    const heading = await page.locator("#sky-detail-title").evaluate(el => {
      const style = getComputedStyle(el), root = getComputedStyle(document.documentElement);
      return { font: style.fontFamily, expectedFont: root.getPropertyValue("--font-display").trim(), weight: style.fontWeight,
        spacing: style.letterSpacing, lineHeight: style.lineHeight, size: style.fontSize, margin: style.margin, transform: style.textTransform,
        headings: [...document.querySelectorAll(".sky-detail-article h1")].map(h => h.textContent),
        fits: document.documentElement.scrollWidth <= innerWidth };
    });
    expect(heading.headings).toEqual(["Neptune Rx in Aries"]);
    expect(heading.fits).toBe(true);
    expect(heading.margin).toBe("0px");
    expect(heading.transform).toBe("none");
    await page.screenshot({ path: `test-results/sky-rx-${theme}-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.locator("#sky-detail-title")).toHaveText("Neptune Rx in Aries", { timeout: 60_000 });
    await expect(page.locator(".article-body-inner p").first()).toHaveText(modifier("Neptune"));
    // The analogous direct title must retain exactly the same typography.
    await page.goto("/?date=2026-04-01#sky/placement/neptune/aries");
    await expect(page.locator("#sky-detail-title")).toHaveText("Neptune in Aries", { timeout: 60_000 });
    const direct = await page.locator("#sky-detail-title").evaluate(el => { const s=getComputedStyle(el); return { font:s.fontFamily, weight:s.fontWeight, spacing:s.letterSpacing, lineHeight:s.lineHeight, size:s.fontSize, margin:s.margin, transform:s.textTransform }; });
    for (const key of Object.keys(direct)) expect(direct[key as keyof typeof direct]).toEqual(heading[key as keyof typeof heading]);
    await expect(page.locator(".sky-detail-article")).not.toContainText(modifier("Neptune"));
    expect(errors).toEqual([]);
  });
}

test("fallback-only placement preserves the full Rx modifier", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/?date=2026-09-07&skyPlacementPreview=fallback#sky/placement/neptune/aries");
  await expect(page.locator("#sky-detail-title")).toHaveText("Neptune Rx in Aries", { timeout: 60_000 });
  await expect(page.locator(".article-body-inner").first()).toContainText(normalize(modifier("Neptune")), { timeout: 60_000 });
  await expect(page.locator(".sky-detail-id .article-duration").first()).toHaveText(/Jul 7, 2026 - Dec 12, 2026/);
});

test("all current Rx cards open matching motion-aware articles", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [planet, sign] of [["Saturn", "Aries"], ["Pluto", "Aquarius"], ["Chiron", "Taurus"]]) {
    await page.goto(`/?date=2026-09-07#sky/placement/${planet.toLowerCase()}/${sign.toLowerCase()}`);
    await expect(page.locator("#sky-detail-title")).toHaveText(`${planet} Rx in ${sign}`, { timeout: 60_000 });
    await expect(page.locator(".article-body-inner p").first()).toHaveText(modifier(planet));
  }
});

test("both retrograde endpoints survive standalone aspect rendering", async ({ page }) => {
  await page.goto("/?date=2026-09-07#sky/aspect/neptune/sextile/pluto");
  await expect(page.locator("#sky-detail-title")).toHaveText("Neptune Rx Sextile Pluto Rx", { timeout: 60_000 });
  await expect(page.locator(".article-eyebrow")).toHaveAttribute("aria-label", /Aspect: Neptune Neptune Retrograde sextile Pluto Pluto Retrograde/);
  await expect(page.locator(".article-eyebrow__glyphs")).toHaveText(/℞.*℞/);
});

test("missing canonical Rx content never exposes direct-only placement prose", async ({ page }) => {
  await page.route("**/sky-v4-canonical-content-studio-stage-v1*.json", route => route.abort());
  await page.goto("/?date=2026-09-07#sky/placement/neptune/aries");
  await expect(page.locator("#sky-detail-title")).toHaveText("Neptune Rx in Aries", { timeout: 60_000 });
  await expect(page.locator(".sky-detail-article")).not.toContainText("Neptune in Aries makes a new dream feel urgent");
  await expect(page.locator(".sky-detail-article")).not.toContainText(modifier("Neptune"));
  await expect(page.locator(".sky-detail-id .article-duration").first()).toHaveText(/Jul 7, 2026 - Dec 12, 2026/);
});

for (const [theme, width] of [["light", 1440], ["dark", 390]] as const) {
  test(`Calendar and daily summary retain event motion ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    const calendar = JSON.parse(fs.readFileSync("test-results/sky-retrograde/calendar-motion-fixture.json", "utf8"));
    await page.unroute("**/api/calendar?**");
    await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar } }));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
    await page.goto("/?date=2026-09-07#sky");
    const link = page.getByRole("link", { name: "Moon trines Neptune Rx", exact: true });
    await expect(link).toBeVisible({ timeout: 60_000 });
    await expect(link).toHaveAttribute("href", /\/at\/2026-09-07T22/);
    await link.click();
    await expect(page.locator("#sky-detail-title")).toHaveText("Moon Trine Neptune Rx");
    await expect(page.locator(".sky-detail-id .article-duration")).toHaveText(/Exact · September 7, 2026/);
    await page.reload();
    await expect(page.locator("#sky-detail-title")).toHaveText("Moon Trine Neptune Rx", { timeout: 60_000 });
    await expect(page.locator(".sky-detail-id .article-duration")).toHaveText(/Exact · September 7, 2026/);
    await page.goto("/?date=2026-09-12#calendar");
    await page.getByRole("button", { name: /^Saturday, September 12\./ }).click();
    const title = page.getByRole("button", { name: "Mercury trines Pluto Rx", exact: true }).first();
    await expect(title).toBeVisible({ timeout: 60_000 });
    await expect(title.locator(".lunar-selected-card__daily-event-glyph")).toContainText("℞");
    const typography = await title.evaluate(el => { const s=getComputedStyle(el); return { family:s.fontFamily, size:s.fontSize, weight:s.fontWeight, line:s.lineHeight, spacing:s.letterSpacing, margin:s.margin, casing:s.textTransform }; });
    const directTitle = page.locator(".lunar-selected-card__daily-event.event-station").first();
    await expect(directTitle).toBeVisible();
    expect(await directTitle.evaluate(el => { const s=getComputedStyle(el); return { family:s.fontFamily, size:s.fontSize, weight:s.fontWeight, line:s.lineHeight, spacing:s.letterSpacing, margin:s.margin, casing:s.textTransform }; })).toEqual(typography);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/sky-retrograde/calendar-${theme}-${width}.png`, fullPage: true });
    await title.click();
    await expect(page.locator("#sky-detail-title")).toHaveText("Mercury Trine Pluto Rx");
    await page.reload();
    await expect(page.locator("#sky-detail-title")).toHaveText("Mercury Trine Pluto Rx", { timeout: 60_000 });
  });
}

test("dated aspect reload uses post-station motion even with an Rx Sky date", async ({ page }) => {
  const event = JSON.parse(fs.readFileSync("test-results/sky-retrograde/direct-neptune-event.json", "utf8"));
  const route = `sky/aspect/${event.planets[0].toLowerCase()}/${event.aspect}/neptune/at/${encodeURIComponent(event.startsAt)}`;
  await page.goto(`/?date=2026-09-07#${route}`);
  const title = `${event.planets[0]} ${event.aspect[0].toUpperCase() + event.aspect.slice(1)} Neptune`;
  await expect(page.locator("#sky-detail-title")).toHaveText(title, { timeout: 60_000 });
  await expect(page.locator(".sky-detail-id .article-duration")).toContainText("December");
  await expect(page.locator(".article-eyebrow__glyphs")).not.toContainText("℞");
});

test("Saturn detail survives background refresh without feed flash or scroll reset", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/?date=2026-09-07#sky/placement/saturn/aries");
  const article = page.locator(".sky-detail-article");
  await expect(page.locator("#sky-detail-title")).toHaveText("Saturn Rx in Aries", { timeout: 60_000 });
  await expect(article).toContainText(modifier("Saturn"));
  await expect(article).toContainText("The beginning matters more when it can survive the part nobody claps for.");
  await page.evaluate(() => document.fonts.ready);
  const before = await page.evaluate(() => {
    window.scrollTo(0, 700);
    const article = document.querySelector(".sky-detail-article");
    (window as any).__saturnRefresh = { article, replaced: false, feedSeen: false };
    const observer = new MutationObserver(() => {
      const state = (window as any).__saturnRefresh;
      state.replaced ||= document.querySelector(".sky-detail-article") !== article;
      state.feedSeen ||= Boolean(document.querySelector('.placement-section[aria-label="Transits"]'));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    (window as any).__saturnRefresh.observer = observer;
    return { scroll: window.scrollY, top: document.querySelector(".article-body-inner p")!.getBoundingClientRect().top };
  });
  expect(before.scroll).toBeGreaterThan(300);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("tldrastro:content-update", { detail: { contentKey: "sky-placement/article/saturn/aries", published: true, updatedAt: new Date().toISOString() } })));
  await page.waitForTimeout(1500); // Observe the asynchronous revalidation and both package completions.
  const after = await page.evaluate(() => {
    const state = (window as any).__saturnRefresh;
    state.observer.disconnect();
    return { scroll: window.scrollY, top: document.querySelector(".article-body-inner p")!.getBoundingClientRect().top, replaced: state.replaced, feedSeen: state.feedSeen };
  });
  expect(after.replaced).toBe(false);
  expect(after.feedSeen).toBe(false);
  expect(after.scroll).toBeGreaterThan(300);
  expect(Math.abs(after.top - before.top)).toBeLessThan(5);
  await expect(article).toContainText(modifier("Saturn"));
});
