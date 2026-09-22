import { readerResponse } from '../helpers/reader-response';
import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords } from "../../api/_lib/sky-placement-sources";
import { emptyLastKnownGoodSnapshot } from "../helpers/bundled-publications";

// Keep the browser in a different zone to prove the selected Sky location wins.
test.use({ timezoneId: "Pacific/Honolulu" });
for (const scenario of [
  { planet: "Sun", date: "2026-09-12", sign: "Virgo", timeZone: "America/New_York", card: "Aug 22 - Sep 22", entry: "August 22, 2026", exit: "September 22, 2026" },
  { planet: "Sun", date: "2026-09-12", sign: "Virgo", timeZone: "UTC", card: "Aug 23 - Sep 23", entry: "August 23, 2026", exit: "September 23, 2026" },
  { planet: "Sun", date: "2027-01-12", sign: "Capricorn", timeZone: "Asia/Tokyo", card: "Dec 22, 2026 - Jan 20, 2027", entry: "December 22, 2026", exit: "January 20, 2027" },
  { planet: "Venus", date: "2026-09-14", sign: "Scorpio", timeZone: "America/New_York", card: "Sep 10 - Oct 25", entry: "September 10, 2026", exit: "January 7, 2027", visitExit: "October 25, 2026" },
  { planet: "Venus", date: "2026-12-10", sign: "Scorpio", timeZone: "Asia/Tokyo", card: "Dec 4, 2026 - Jan 7, 2027", entry: "December 4, 2026", exit: "January 7, 2027", visitExit: "January 7, 2027" }
]) test(`${scenario.planet} card, article, and variables agree ${scenario.date} ${scenario.timeZone}`, async ({ page }) => {
  test.setTimeout(120_000);
  const key = `sky-placement/article/${scenario.planet.toLowerCase()}/${scenario.sign.toLowerCase()}`;
  const base = skyPlacementSourceRecords.get(key)!;
  const updatedAt = "2026-09-10T12:00:00.000Z";
  const template = "Fixture interval from {{entryDate}} to {{exitDate}}.";
  const source = { ...base, studio_version_status: "approved-serving-revision", placementArticle: template, placementArticleDirect: "", placementArticleRetrograde: "" };
  const row = {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd", content_key: key, surface: "sky", mode: "in_depth", status: "LIVE", lane: "serving", review_state: null, target_date: null,
    provider: "tldrastro-fallback-architecture-v3", updated_at: updatedAt, headline: base.headline, body: template, summary: base.summary,
    sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: base.source_package, content_role: base.content_role }, block_type: "fallback_hook", event_type: "fallback-hook"
  };
  await page.clock.setFixedTime(new Date(`${scenario.date}T12:00:00Z`));
  await page.addInitScript(timeZone => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "Test location", latitude: 40.7, longitude: -74, timeZone })), scenario.timeZone);
  // Isolated editorial data only; the worker calculates all placements/timestamps.
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([row]) }));
  await page.route('**/rest/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith("/content_runtime_revision") ? updatedAt
      : path.endsWith("/content_publications") ? [{ content_key: key, state: "live", revision: 1, row_id: row.id, row_updated_at: updatedAt, updated_at: updatedAt }]
      : [] });
  });
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  await emptyLastKnownGoodSnapshot(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/?date=${scenario.date}#sky`);
  const card = page.getByRole("button", { name: `Read more about ${scenario.planet} in ${scenario.sign}`, exact: true });
  await expect(card.locator(".planet-placement-row__meta--timing")).toHaveText(scenario.card, { timeout: 60_000 });
  await card.click();
  await expect(page.locator("#sky-detail-title")).toHaveText(`${scenario.planet} in ${scenario.sign}`);
  const primaryExit = scenario.visitExit ?? scenario.exit;
  const entry = scenario.entry.slice(-4) === primaryExit.slice(-4) ? scenario.entry.replace(/, \d{4}$/, "") : scenario.entry;
  await expect(page.locator(".sky-detail-id .article-duration").first()).toHaveText(`${entry} to ${primaryExit}`, { timeout: 60_000 });
  await expect(page.locator(".article-body-inner").first()).toContainText(`Fixture interval from ${scenario.entry} to ${scenario.exit}.`);
  await expect(page.locator(".article-body-inner").first()).not.toContainText("{{");
  if (scenario.planet === "Venus") await expect(page.locator(".sky-detail-id .article-duration").nth(1))
    .toHaveText("Full residency in Scorpio: September 10, 2026 to January 7, 2027");
  await page.reload();
  await expect(page.locator(".sky-detail-id .article-duration").first()).toHaveText(`${entry} to ${primaryExit}`, { timeout: 60_000 });
  await page.getByRole("button", { name: "Close detail", exact: true }).click();
  await expect(card.locator(".planet-placement-row__meta--timing")).toHaveText(scenario.card, { timeout: 60_000 });
  expect(errors).toEqual([]);
});
