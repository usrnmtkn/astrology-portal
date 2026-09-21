import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords } from "../../api/_lib/sky-placement-sources";
import { getLunarCalendarWeek } from "../../apps/web/src/services/ephemeris";
import { emptyLastKnownGoodSnapshot } from "../helpers/bundled-publications";

const timeline = [
  ["August 22, 2026", "Sun enters Virgo"],
  ["August 27, 2026", "Sun conjunction Mercury"],
  ["August 28, 2026", "Sun square Uranus"],
  ["September 2, 2026", "Sun trine Lilith"],
  ["September 10, 2026", "Sun trine Lilith"],
  ["September 14, 2026", "Sun sextile Mars"],
  ["September 20, 2026", "Sun square Lilith"],
  ["September 22, 2026", "Sun completes its passage through Virgo"]
];
for (const width of [390, 1440]) for (const withVariable of [false, true]) {
  test(`placement Key dates ${width} ${withVariable ? "inline aspects" : "without aspect token"}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-09-12T12:00:00Z"));
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" }));
    }, withVariable ? "dark" : "light");
    const key = "sky-placement/article/sun/virgo";
    const base = skyPlacementSourceRecords.get(key)!;
    const updatedAt = "2026-09-11T12:00:00.000Z";
    const template = withVariable ? "Fixture exact dates: {{aspectsInSign}}." : "Fixture placement article without any aspect variable.";
    const source = { ...base, studio_version_status: "approved-serving-revision", placementArticle: template, placementArticleDirect: "", placementArticleRetrograde: "" };
    const row = { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", content_key: key, surface: "sky", mode: "in_depth", status: "LIVE", lane: "serving", review_state: null, target_date: null,
      provider: "tldrastro-fallback-architecture-v3", updated_at: updatedAt, headline: base.headline, body: template, summary: base.summary,
      sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: base.source_package, content_role: base.content_role }, block_type: "fallback_hook", event_type: "fallback-hook" };
    await page.route("**/rest/v1/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path.endsWith("/content_runtime_revision") ? updatedAt
        : path.endsWith("/content_publications") ? [{ content_key: key, state: "live", revision: 1, row_id: row.id, row_updated_at: updatedAt, updated_at: updatedAt }]
        : path.endsWith("/generated_interpretations") ? [row] : [] });
    });
    await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    await emptyLastKnownGoodSnapshot(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/?date=2026-09-12#sky/placement/sun/virgo");
    const dates = page.locator(".sky-placement-key-dates");
    const verifyDates = async () => {
      await expect(dates.locator("dl > div")).toHaveCount(timeline.length, { timeout: 60_000 });
      expect(await dates.locator("dl > div").evaluateAll(rows => rows.map(row => [row.querySelector("dt")?.textContent, row.querySelector("dd")?.textContent]))).toEqual(timeline);
    };
    await verifyDates();
    const body = page.locator(".article-body-inner").first();
    await expect(body).toContainText(withVariable ? `Fixture exact dates: ${timeline.slice(1, -1).map(([date, label]) => `${date}: ${label}`).join(", ")}.` : template);
    await expect(body).not.toContainText("{{");
    await dates.scrollIntoViewIfNeeded();
    await dates.screenshot({ path: `test-results/sky-key-dates-${width}-${withVariable}.png` });
    await page.getByRole("link", { name: "Read more about Sun Sextile Mars", exact: true }).click();
    await expect(page.locator("#sky-detail-title")).toHaveText("Sun Sextile Mars");
    await page.getByRole("button", { name: "Close detail", exact: true }).click();
    await verifyDates();
    await page.reload();
    await verifyDates();
    await page.getByRole("button", { name: "Close detail", exact: true }).click();
    await page.getByRole("button", { name: "Read more about Sun in Virgo", exact: true }).click();
    await verifyDates();
    expect(errors).toEqual([]);
  });
}

test("Calendar ingress opens the complete placement Key dates", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-08-22T12:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" })));
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
  const calendar = await getLunarCalendarWeek({ label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" }, new Date("2026-08-22T12:00:00Z"), { detail: "full" });
  expect(calendar.events.some(event => event.type === "ingress" && event.planet === "Sun" && event.toSign === "Virgo")).toBe(true);
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar } }));
  await page.goto("/?date=2026-08-22#calendar");
  await page.getByRole("button", { name: /^Saturday, August 22\./ }).click();
  await page.getByRole("button", { name: "Sun enters Virgo", exact: true }).first().click();
  await page.getByRole("dialog", { name: "Event detail", exact: true }).getByRole("button", { name: "Read article", exact: true }).click();
  await expect(page.locator("#sky-detail-title")).toHaveText("Sun in Virgo", { timeout: 60_000 });
  const rows = page.locator(".sky-placement-key-dates dl > div");
  await expect(rows).toHaveCount(timeline.length, { timeout: 60_000 });
  expect(await rows.evaluateAll(rows => rows.map(row => [row.querySelector("dt")?.textContent, row.querySelector("dd")?.textContent]))).toEqual(timeline);
});
