import { expect, test } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";

// The selected location must win over the browser's clock and time zone.
test.use({ timezoneId: "Pacific/Honolulu" });
for (const scenario of [
  { timeZone: "America/New_York", width: 1440, theme: "light", start: "Aug 22", end: "Sep 22", article: "August 22 to September 22, 2026", fullMoon: "Aug 28, 12:18 AM", exactTime: "3:52 PM" },
  { timeZone: "UTC", width: 390, theme: "dark", start: "Aug 23", end: "Sep 23", article: "August 23 to September 23, 2026", fullMoon: "Aug 28, 4:18 AM", exactTime: "7:52 PM" },
  { timeZone: "Asia/Tokyo", width: 1440, theme: "dark", start: "Aug 23", end: "Sep 23", article: "August 23 to September 23, 2026", fullMoon: "Aug 28, 1:18 PM", exactTime: "4:52 AM" }
]) test(`event dates agree through navigation and reload ${scenario.timeZone}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date("2026-09-14T12:00:00Z"));
  await page.setViewportSize({ width: scenario.width, height: 1000 });
  await page.addInitScript(({ timeZone, theme }) => {
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "Test location", latitude: 40.7, longitude: -74, timeZone }));
    localStorage.setItem("tldrastro:theme", theme);
  }, scenario);
  await bundledPublications(page);
  // A local reader preview has no deployed API. Exercise its real Swiss worker
  // fallback; no event, sign, timestamp or season is mocked in this test.
  await page.route("**/api/calendar?**", route => route.fulfill({ status: 503, json: { ok: false } }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?date=2026-09-14#sky");
  const card = page.getByRole("button", { name: "Read more about Sun in Virgo", exact: true });
  await expect(card.locator(".planet-placement-row__meta--timing")).toHaveText(`${scenario.start} - ${scenario.end}`, { timeout: 60_000 });
  await card.click();
  await expect(page.locator(".sky-detail-id .article-duration")).toHaveText(scenario.article, { timeout: 60_000 });
  await expect(page.getByLabel("Article details")).toContainText(scenario.timeZone === "America/New_York" ? "8D" : "9D");
  // Preserve the complete owner passage while changing only calculated metadata.
  await expect(page.locator(".article-body-inner").first()).toContainText("The Sun in Virgo makes the systems that keep life functioning easier to see");
  await expect(page.locator(".article-body-inner").first()).toContainText("The system that works is the one that makes your life easier to live.");
  if (scenario.width < 600) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Calendar", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
  }
  const arc = page.getByRole("region", { name: "Virgo season lunar arc", exact: true });
  await expect(arc).toContainText(`${scenario.start} – ${scenario.end}`, { timeout: 60_000 });
  await expect(arc).toContainText(scenario.fullMoon, { timeout: 60_000 });
  await page.getByRole("tab", { name: "Week", exact: true }).click();
  await expect(page.locator(".lunar-weekly-day__events")).not.toHaveCount(0);
  await page.getByRole("tab", { name: "Month", exact: true }).click();
  await expect(page.getByRole("heading", { name: "September 2026", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Day", exact: true }).click();
  await expect(arc).toContainText(`${scenario.start} – ${scenario.end}`, { timeout: 60_000 });
  await page.reload();
  await expect(arc).toContainText(`${scenario.start} – ${scenario.end}`, { timeout: 60_000 });
  await expect(arc).toContainText(scenario.fullMoon);
  await arc.screenshot({ path: `test-results/season-${scenario.timeZone.replaceAll("/", "-")}.png` });

  // The same exact event has a different civil date in Tokyo. Calendar's row
  // and the article opened from it must agree on both the date and the time.
  const exactDay = scenario.timeZone === "Asia/Tokyo" ? "2026-09-15" : "2026-09-14";
  await page.goto(`/?date=${exactDay}#calendar?view=day&date=${exactDay}`);
  const movement = page.getByLabel("Daily transits and aspects").getByRole("button", { name: "Sun sextiles Mars", exact: true });
  await expect(movement).toContainText(scenario.exactTime, { timeout: 60_000 });
  await movement.click();
  await expect(page.locator(".sky-detail-id .article-duration")).toContainText(scenario.exactTime, { timeout: 60_000 });
  await expect(page.locator(".sky-detail-id .article-duration")).toContainText(`September ${exactDay.endsWith("15") ? "15" : "14"}, 2026`);
  expect(errors).toEqual([]);
});
