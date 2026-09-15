import { bundledPublications } from "../helpers/bundled-publications";
import fs from "node:fs";
import { skyPlacementSourceRecords } from "../../api/_lib/sky-placement-sources";
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
const corpus = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", "utf8"));
const modifier = (planet: string) => corpus.content.retrogradeGeneric.find((row: { Planet: string }) => row.Planet === planet).Body;
const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();

async function expectSeparateHoroscopesAfterAspects(page: Page) {
  const card = page.locator(".sky-detail-rising-horoscopes-card");
  await expect(card).toBeVisible();
  await expect(card.locator("#sky-rising-horoscopes")).toHaveCount(1);
  await expect(page.locator(".sky-detail-card #sky-rising-horoscopes")).toHaveCount(0);
  await expect(page.locator(".article-related-aspects-card").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#sky-detail-key-dates-title")).toBeVisible({ timeout: 60_000 });
  const layout = await card.evaluate(element => {
    const aspects = [...document.querySelectorAll(".article-related-aspects-card")];
    const typography = (heading: Element) => {
      const style = getComputedStyle(heading);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight,
        style.letterSpacing, style.margin, style.textTransform, style.textAlign];
    };
    return {
      separate: element.parentElement?.classList.contains("article-shell"),
      belowAspects: aspects.every(aspect => aspect.getBoundingClientRect().bottom < element.getBoundingClientRect().top),
      heading: typography(element.querySelector("h2")!),
      establishedHeading: typography(document.querySelector("#sky-detail-key-dates-title")!),
    };
  });
  expect(layout.separate).toBe(true);
  expect(layout.belowAspects).toBe(true);
  expect(layout.heading).toEqual(layout.establishedHeading);
  await card.evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 240));
  const title = (await page.locator("#sky-detail-title").innerText()).replace(/\s+/gu, "-").toLowerCase();
  const theme = (await page.locator(".app-shell").getAttribute("class"))?.includes("theme-dark") ? "dark" : "light";
  await page.screenshot({ path: `test-results/horoscope-layout-${title}-${theme}-${page.viewportSize()!.width}.png` });
}

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
    await expect(aspectCard).toHaveCount(0);
    const card = page.getByRole("button", { name: "Read more about Neptune Rx in Aries", exact: true });
    await expect(card).toContainText(normalize(modifier("Neptune")), { timeout: 60_000 });
    await card.click();
    await expect(page.locator("#sky-detail-title")).toHaveText("Neptune Rx in Aries");
    const headerDates = page.locator(".sky-detail-id .article-duration");
    await expect(headerDates.first()).toHaveText(/Jul 7, 2026 - Dec 12, 2026/);
    await expect(headerDates.nth(1)).toHaveText(/Full residency in Aries: March 30, 2025 to March 23, 2039/);
    await expect(page.locator(".article-body-inner p").first()).toHaveText(modifier("Neptune"));
    // Preserve both the opening and final sentence of the owner-authored base unit.
    await expect(page.locator(".sky-detail-article")).toContainText("Neptune in Aries makes a new dream feel urgent before its shape is fully clear.");
    await expect(page.locator(".sky-detail-article")).toContainText("Let imagination lead without asking it to prove that every impulse is destiny.");
    await expect(page.locator(".article-related-aspect-row h4").filter({ hasText: /Neptune Rx/ }).first()).toBeVisible();
    const glyphs = page.locator(".article-related-aspect-row").filter({ hasText: /Neptune Rx/ }).first().locator(".aspect-row-glyphs");
    await expect(glyphs).toContainText("℞");
    await expectSeparateHoroscopesAfterAspects(page);
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
  await expect(page.locator(".sky-detail-rising-horoscopes-card")).toHaveCount(0);
});

test("missing canonical Rx content never exposes direct-only placement prose", async ({ page }) => {
  test.setTimeout(90_000);
  await page.route("**/sky-v4-canonical-content-studio-stage-v1*.json", route => route.abort());
  await page.goto("/?date=2026-09-07#sky/placement/neptune/aries");
  await expect(page.getByText("The placement reading could not load. Please try again.")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#sky-detail-title")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Neptune in Aries makes a new dream feel urgent");
  await expect(page.locator("body")).not.toContainText(modifier("Neptune"));
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
  await expectSeparateHoroscopesAfterAspects(page);
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

for (const width of [390, 1440]) test(`Saturn date windows stay visible through live calculation refreshes ${width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  // Hold the real worker's enriched result to expose the interval between core
  // positions and timing windows. Content-update events do not exercise it.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const state = (window as any).__dateRefresh = { hold: false, held: [] as ((fail?: boolean) => void)[] };
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (options?.name !== "tldrastro-sky-calculation") return;
        const requests = new Map<number, any>();
        const nativePost = this.postMessage.bind(this);
        this.postMessage = (request: any) => { requests.set(request.id, request); nativePost(request); };
        this.addEventListener("message", event => {
          const request = requests.get(event.data.id);
          if (request?.kind !== "sky" || !request.options?.includeTransitWindows) return;
          requests.delete(event.data.id);
          if (state.hold) {
            event.stopImmediatePropagation();
            state.held.push((fail = false) => this.dispatchEvent(new MessageEvent("message", {
              data: fail ? { id: event.data.id, ok: false, error: "Test-only calculation failure" } : event.data
            })));
          }
        });
      }
    };
  });
  await page.goto("/?date=2026-09-07#sky/placement/saturn/aries");
  const dates = page.locator(".sky-detail-id .article-duration");
  await expect(dates).toHaveText([
    "Jul 26, 2026 - Dec 10, 2026",
    "In Aries: February 13, 2026 to April 12, 2028"
  ], { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  // The article can finish its own exact placement calculation before the
  // background Sky snapshot does. Hold only subsequent refreshes.
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => {
    if (!key.startsWith("tldrastro:verifiedSky:v2:live-")) return false;
    const snapshot = JSON.parse(localStorage.getItem(key)!).snapshot;
    return snapshot.generatedAt === "2026-09-07T16:00:00.000Z"
      && snapshot.positions.some((position: any) => position.planet === "Saturn" && position.transitStart && position.transitEnd);
  })), { timeout: 60_000 }).toBe(true);
  const before = await page.evaluate(() => {
    window.scrollTo(0, 500);
    const state = (window as any).__dateRefresh;
    state.hold = true;
    state.dates = [...document.querySelectorAll(".sky-detail-id .article-duration")].map(el => el.textContent);
    state.changed = false;
    state.observer = new MutationObserver(() => {
      const dates = [...document.querySelectorAll(".sky-detail-id .article-duration")].map(el => el.textContent);
      state.changed ||= JSON.stringify(dates) !== JSON.stringify(state.dates);
    });
    state.observer.observe(document.querySelector(".sky-detail-id"), { childList: true, subtree: true, characterData: true });
    return document.querySelector(".article-body-inner p")!.getBoundingClientRect().top;
  });
  for (const minute of [1, 2, 3]) {
    await page.clock.setFixedTime(new Date(`2026-09-07T16:0${minute}:00Z`));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => page.evaluate(() => (window as any).__dateRefresh.held.length), { timeout: 60_000 }).toBeGreaterThan(0);
    await expect(dates).toHaveCount(2);
    expect(await page.evaluate(() => (window as any).__dateRefresh.changed)).toBe(false);
    // A failed refresh must retain the verified date lines, and the next one
    // must install genuinely fresh facts rather than freezing the old snapshot.
    await page.evaluate(fail => (window as any).__dateRefresh.held.splice(0).forEach((release: (fail: boolean) => void) => release(fail)), minute === 2);
    await page.waitForTimeout(150); // Allow React to paint the completed calculation.
    expect(await page.evaluate(() => (window as any).__dateRefresh.changed)).toBe(false);
    expect(Math.abs(await page.locator(".article-body-inner p").first().evaluate(el => el.getBoundingClientRect().top) - before)).toBeLessThan(2);
    expect(await page.evaluate(minute => Object.keys(localStorage).some(key => {
      if (!key.startsWith("tldrastro:verifiedSky:v2:live-")) return false;
      return JSON.parse(localStorage.getItem(key)!).snapshot.generatedAt === `2026-09-07T16:0${minute}:00.000Z`;
    }), minute)).toBe(minute !== 2);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/saturn-stable-dates-${width}.png` });
  await page.evaluate(() => {
    (window as any).__dateRefresh.observer.disconnect();
    (window as any).__dateRefresh.hold = false;
    history.pushState(null, "", "/?date=2026-04-01#sky/placement/saturn/aries");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.locator("#sky-detail-title")).toHaveText("Saturn in Aries", { timeout: 60_000 });
  await expect(dates).not.toContainText(["Jul 26, 2026 - Dec 10, 2026"]);
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
 test(`canonical evergreen placement renders the Studio hooks ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(90_000);
  const row = skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!;
  const rx = skyPlacementSourceRecords.get("sky-placement/retrograde/saturn")!;
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
  await page.goto("/?date=2026-09-07&skyPlacementPreview=fallback#sky/placement/saturn/aries");
  await expect(page.locator("#sky-detail-title")).toHaveText("Saturn Rx in Aries", { timeout: 60_000 });
  const body = page.locator(".sky-detail-article .article-body-inner").first();
  const parts = body.locator("p");
  await expect(parts).toHaveText([rx.Body, row.tldrWhat, row.tldrTakeaway, row.fallback.hook, row.fallback.lived, row.fallback.turn]);
  await expect(body).not.toContainText(row.placementArticle);
  const dates = page.locator(".sky-detail-id .article-duration").first();
  await expect(dates).toHaveText("Jul 26, 2026 - Dec 10, 2026", { timeout: 60_000 });
  await page.screenshot({ path: `test-results/evergreen-reader-${width}-${theme}.png`, fullPage: true });
  await page.reload();
  await expect(parts).toHaveText([rx.Body, row.tldrWhat, row.tldrTakeaway, row.fallback.hook, row.fallback.lived, row.fallback.turn], { timeout: 60_000 });
  await page.goto("/?date=2026-09-07#sky/placement/saturn/aries");
  await expect(body).toContainText(row.placementArticle.split("\n\n")[0], { timeout: 60_000 });
  await expect(body).toContainText("The beginning matters more when it can survive the part nobody claps for.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 });
}

test.beforeEach(async ({ page }) => { await bundledPublications(page); });
