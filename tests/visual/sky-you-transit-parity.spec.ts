import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones";
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from "../../apps/web/src/services/verifiedSkyCache";
import { bundledPublications } from "../helpers/bundled-publications";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
// Synthetic chart selected for a calculated Virgo North Node near September's Sun.
const birthDate = "1997-11-01";

const birthTime = "12:00 PM";

async function seed(page: Page, now: string, theme: string) {
  const birth = zonedDateTimeToUtc(birthDate, birthTime, location.timeZone);
  const natalSky = await getAstrodienstSky(location, birth);
  const node = natalSky.positions.find(position => position.planet === "North Node");
  expect(node?.sign, "The synthetic chart must exercise the asserted Sun/Node conjunction").toBe("Virgo");
  expect(node?.degree).toBeGreaterThan(17);
  expect(node?.degree).toBeLessThan(20);
  const cacheKey = natalSkySnapshotCacheKey(location, birth);
  await page.clock.setFixedTime(new Date(now));
  await bundledPublications(page);
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, body: "QA uses local calculations" }));
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  await page.addInitScript(({ now, theme, location, birthDate, birthTime, natalSky, cacheKey, schema }) => {
    localStorage.setItem("tldrastro:theme", theme);
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: "qa-sky-you-parity", name: "Transit QA", email: "transit-qa@example.com", provider: "email",
      sun: natalSky.positions.find(position => position.planet === "Sun")?.sign,
      moon: natalSky.positions.find(position => position.planet === "Moon")?.sign,
      rising: natalSky.ascendant,
      currentLocation: location.label, currentLocationData: location,
      charts: [{ id: "qa-chart", name: "Transit QA", type: "Birth chart", birthDate, birthTime, birthCity: location.label, birthLocation: location }]
    }));
    localStorage.setItem(cacheKey, JSON.stringify({ schema, cacheKey, snapshot: natalSky, verifiedAt: now }));
  }, { now, theme, location, birthDate, birthTime, natalSky, cacheKey, schema: VERIFIED_SKY_CACHE_SCHEMA });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

for (const [day, hour, width, theme] of [
  ["2026-09-10", "23:20", 1440, "light"],
  ["2026-09-10", "04:20", 390, "dark"],
  ["2026-09-10", "04:20", 390, "light"],
  ["2026-09-10", "23:20", 1440, "dark"]
] as const) test(`Sky and You share complete aspect copy and dates ${day} ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 });
  await seed(page, `${day}T${hour}:00Z`, theme);
  await page.goto(`/?date=${day}#sky/placement/sun/virgo`);
  const aspect = page.locator(".sky-detail-personalized-aspect").filter({ has: page.getByRole("heading", { name: "Sun conjunction your North Node · Sun opposition your South Node", exact: true }) });
  await expect(aspect).toContainText("You may be offered a role that feels slightly ahead", { timeout: 60_000 });
  await expect(aspect).toContainText("learn from what happens next.");
  const skyParagraphs = await aspect.locator("p").allTextContents();
  expect(skyParagraphs.length).toBeGreaterThan(1);
  await expect(aspect).not.toContainText("the window is clean");
  await page.locator("#sky-personalized-placement").screenshot({ path: `test-results/sky-you-parity-${day}-${width}-${theme}.png` });
  await page.reload();
  await expect(aspect.locator("p")).toHaveText(skyParagraphs, { timeout: 60_000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("tldrastro:content-update", { detail: { contentKey: "sky-placement/article/sun/virgo", published: true } })));
  await expect(aspect.locator("p")).toHaveText(skyParagraphs);
  await page.goto(`/?date=${day}#you`);
  await page.getByRole("tab", { name: /updates|transits/i }).click();
  const row = page.locator("button.updates-aspect-row").filter({ hasText: "Sun conjunction your North Node" });
  await expect(row).toBeVisible({ timeout: 60_000 });
  await row.click();
  const article = page.locator(".you-transit-article");
  await expect(article).toContainText("You may be offered a role that feels slightly ahead");
  await expect(article).toContainText("learn from what happens next.");
  const youParagraphs = await article.locator(".article-section").filter({ has: page.getByRole("heading", { name: "Sun Conjunction North Node", exact: true }) }).locator("p").allTextContents();
  // Sky groups both ends of the nodal axis. You opens the selected North Node
  // contact, whose complete two-paragraph fixture must still match exactly.
  expect(youParagraphs).toHaveLength(2);
  expect(skyParagraphs).toHaveLength(3);
  expect(skyParagraphs.slice(0, 2)).toEqual(youParagraphs);
  expect(skyParagraphs[2]).toContain("opposing your natal South Node");
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
