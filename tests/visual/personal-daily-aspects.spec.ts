import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from "../../apps/web/src/services/verifiedSkyCache";
import { bundledPublications } from "../helpers/bundled-publications";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const birth = new Date("1990-01-01T17:00:00Z");
function sectionPresentation(node: Element) {
  const s = getComputedStyle(node);
  return [node.tagName, node.getAttribute("role"), s.fontFamily, s.fontSize, s.fontWeight,
    s.lineHeight, s.letterSpacing, s.marginTop, s.marginRight, s.marginBottom, s.marginLeft,
    s.textTransform, s.textAlign];
}

async function verifySectionLabels(page: Page) {
  expect(await page.locator(".section-label").filter({ hasText: /^(Areas of Your Life|Long-term transits|House transits)$/ }).allTextContents())
    .toEqual(["Areas of Your Life", "Long-term transits", "House transits"]);
  const longTerm = await page.getByText("Long-term transits", { exact: true }).evaluate(sectionPresentation);
  expect(longTerm).toEqual(await page.getByText("House transits", { exact: true }).evaluate(sectionPresentation));
  expect(longTerm.slice(0, 2)).toEqual(["SPAN", null]);
}

async function seed(page: Page, theme: string) {
  const natal = await getAstrodienstSky(location, birth, { includeDailyEvents: false, includeTransitWindows: false });
  await bundledPublications(page);
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, body: "Synthetic QA uses local Swiss calculations" }));
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  await page.addInitScript(({ location, natal, cacheKey, schema, theme }) => {
    localStorage.setItem("tldrastro:theme", theme);
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: "qa-daily-peaks", name: "Aspect QA", email: "aspect-qa@example.com", provider: "email",
      sun: "Capricorn", moon: "Pisces", rising: natal.ascendant,
      currentLocation: location.label, currentLocationData: location,
      charts: [{ id: "qa-aspects", name: "Aspect QA", type: "Birth chart", birthDate: "1990-01-01", birthTime: "12:00 PM", birthCity: location.label, birthLocation: location }]
    }));
    localStorage.setItem(cacheKey, JSON.stringify({ schema, cacheKey, snapshot: natal, verifiedAt: new Date().toISOString() }));
  }, { location, natal, cacheKey: natalSkySnapshotCacheKey(location, birth), schema: VERIFIED_SKY_CACHE_SCHEMA, theme });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

for (const [width, theme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
  test(`daily peaks, long-term context and complete detail ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, theme);
    await page.goto("/?date=2026-10-09#you");
    const daily = page.getByLabel("Areas of your life", { exact: true });
    const ongoing = page.getByLabel("Long-term transits", { exact: true });
    await expect(daily.locator(".updates-aspect-row")).toHaveCount(4, { timeout: 60_000 });
    await expect(daily.locator(".updates-aspect-row__meta-line")).toHaveText([
      /Exact Oct 9, 2026/, /Exact Oct 9, 2026/, /Exact Oct 9, 2026/, /Exact Oct 9, 2026/
    ]);
    await expect(daily.locator(".updates-aspect-row__orb").first()).toHaveText(/\d+° \d{2}′|<1′/);
    await expect(ongoing.locator("button.updates-aspect-row").first()).toBeVisible({ timeout: 60_000 });
    await expect(ongoing).toContainText("Current contact:");
    const row = daily.locator("button.updates-aspect-row").filter({ hasText: "Moon square your Jupiter" });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/daily-peaks-${width}-${theme}.png`, fullPage: false });
    const description = await row.locator(".transit-card-preview").innerText();
    await row.click();
    const article = page.locator(".you-transit-article");
    await expect(article).toContainText("Current contact");
    await expect(article).toContainText("Full transit series");
    await expect(article).toContainText("Pass 1");
    await expect(article).toContainText(description.replace(/\.\.\.$/, "").slice(0, 75));
    const paragraphs = await article.locator(".article-section p").allTextContents();
    expect(paragraphs.length).toBeGreaterThan(0);
    expect(paragraphs.at(-1)?.length).toBeGreaterThan(20);
    await page.reload();
    await expect(daily.locator(".updates-aspect-row")).toHaveCount(4, { timeout: 60_000 });
    await page.goto("/?date=2026-10-10#you");
    await expect(daily.locator(".updates-aspect-row__meta-line").first()).toContainText("Oct 10, 2026", { timeout: 60_000 });
    await expect(daily.locator(".updates-aspect-row__meta-line")).not.toContainText(["Exact Oct 9, 2026"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    // The new label uses the same established section role as House transits.
    await verifySectionLabels(page);
  });
}

test("daily timing failure remains distinct from an empty day and retries", async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, "light");
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let rejected = false;
    window.Worker = class extends NativeWorker {
      postMessage(message: any, options?: any) {
        if (message.kind === "natal-daily-peaks" && !rejected) {
          rejected = true;
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: false, error: "Synthetic timing failure" } })), 500);
          return;
        }
        super.postMessage(message, options);
      }
    };
  });
  await page.goto("/?date=2026-10-09#you");
  const failure = page.getByLabel("Daily aspects unavailable");
  await expect(failure).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/No daily aspect highlights/)).toHaveCount(0);
  await failure.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Areas of your life", { exact: true }).locator(".updates-aspect-row")).toHaveCount(4, { timeout: 60_000 });
  await expect(failure).toHaveCount(0);
});

test("empty daily selection retains longer-term contacts", async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, "dark");
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: any, options?: any) {
        if (message.kind === "natal-daily-peaks") {
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: true, value: [] } })), 100);
          return;
        }
        super.postMessage(message, options);
      }
    };
  });
  await page.goto("/?date=2026-10-09#you");
  await expect(page.getByText(/No daily aspect highlights for/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Long-term transits", { exact: true }).locator(".updates-aspect-row")).toHaveCount(4);
  await expect(page.getByLabel("Transit setup", { exact: true })).toHaveCount(0);
  await verifySectionLabels(page);
});
