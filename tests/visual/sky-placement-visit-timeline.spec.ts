import { expect, test } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";

test.beforeEach(async ({ page }) => {
  await bundledPublications(page);
  await page.route("**/api/calendar?**", (route) => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
});

test("Chiron Rx Key dates and Gifts follow the retrograde window", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-09-19T12:00:00Z"));
  await page.addInitScript(() => {
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
      label: "New York",
      latitude: 40.7,
      longitude: -74,
      timeZone: "America/New_York"
    }));
  });
  await page.goto("/?date=2026-09-19#sky/placement/chiron/aries");
  await expect(page.locator("#sky-detail-title")).toHaveText(/Chiron Rx in Aries/u, { timeout: 60_000 });
  const dates = page.locator(".sky-placement-key-dates dl > div");
  await expect(dates.first()).toBeVisible({ timeout: 60_000 });
  const rows = await dates.evaluateAll((nodes) => nodes.map((row) => ({
    date: row.querySelector("dt")?.textContent ?? "",
    label: row.querySelector("dd")?.textContent ?? ""
  })));
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThan(40);
  expect(rows.map((row) => row.date).join(" ")).not.toMatch(/2018/);
  expect(rows.some((row) => /stations Retrograde/u.test(row.label))).toBe(true);
  expect(rows.some((row) => /enters Aries/u.test(row.label))).toBe(false);
  expect(rows.some((row) => /completes its passage/u.test(row.label))).toBe(false);
  const giftDates = page.locator(".article-related-aspects__date");
  await expect(giftDates.first()).toBeVisible();
  const giftDateText = await giftDates.allTextContents();
  expect(giftDateText.join(" ")).not.toMatch(/2018/);
  expect(giftDateText.join(" ")).toMatch(/2026|2027/);
});

test("Sun in Virgo still shows the complete short-visit Key dates", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-09-12T12:00:00Z"));
  await page.addInitScript(() => {
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
      label: "New York",
      latitude: 40.7,
      longitude: -74,
      timeZone: "America/New_York"
    }));
  });
  await page.goto("/?date=2026-09-12#sky/placement/sun/virgo");
  await expect(page.locator("#sky-detail-title")).toHaveText("Sun in Virgo", { timeout: 60_000 });
  const dates = page.locator(".sky-placement-key-dates dl > div");
  await expect(dates).toHaveCount(8, { timeout: 60_000 });
  await expect(dates.first()).toContainText("August 22, 2026");
  await expect(dates.last()).toContainText("September 22, 2026");
});
