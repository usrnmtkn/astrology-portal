import { readerResponse } from '../helpers/reader-response';
import { expect, test } from "@playwright/test";
import { calendarMonthlyEditorialPattern } from "../../apps/admin/src/skyForecastTemplates";
import { CALENDAR_MONTHLY_OVERVIEW_KEY } from "../../apps/web/src/features/calendar/monthlyOverview";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const days = Array.from({ length: 30 }, (_, index) => {
  const dateKey = `2026-09-${String(index + 1).padStart(2, "0")}`;
  return {
    date: `${dateKey}T16:00:00.000Z`, dateKey, inMonth: true, moonSign: "Virgo", moonSignGlyph: "♍",
    moonPhase: "Waxing", illumination: 40, activeAspects: [], events: []
  };
});
const events = [
  { id: "nm", type: "lunation", title: "New Moon in Virgo", startsAt: "2026-09-07T16:00:00.000Z", dateKey: "2026-09-07", glyph: "●", primary: true, sign: "Virgo" },
  { id: "libra", type: "ingress", title: "Sun enters Libra", startsAt: "2026-09-22T16:00:00.000Z", dateKey: "2026-09-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Libra" },
  { id: "virgo", type: "ingress", title: "Sun enters Virgo", startsAt: "2026-08-22T12:00:00.000Z", dateKey: "2026-08-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Virgo" },
  { id: "scorpio", type: "ingress", title: "Sun enters Scorpio", startsAt: "2026-10-23T12:00:00.000Z", dateKey: "2026-10-23", glyph: "☉", primary: true, planet: "Sun", toSign: "Scorpio" }
];

test("Calendar month view renders a published monthly overview", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript((nextLocation) => {
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(nextLocation));
    localStorage.setItem("tldrastro:theme", "light");
  }, location);
  await page.route("**/api/calendar?**", route => route.fulfill({
    json: { ok: true, calendar: { month: "2026-09", timeZone: location.timeZone, location, days, events } }
  }));
  await page.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: {
    schema: "content-studio-last-known-good-v2", rowCount: 0, rows: [], publications: []
  } }));
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
  await page.route('**/api/content-reader', route => {
    const keys: string[] = route.request().postDataJSON().keys ?? [];
    if (!keys.includes(CALENDAR_MONTHLY_OVERVIEW_KEY)) {
      return route.fulfill({ json: readerResponse([]) });
    }
    return route.fulfill({ json: readerResponse([{
      id: "monthly-overview",
      content_key: CALENDAR_MONTHLY_OVERVIEW_KEY,
      surface: "calendar",
      mode: "template",
      status: "LIVE",
      lane: "serving",
      review_state: null,
      event_type: null,
      target_date: null,
      headline: null,
      summary: null,
      body: calendarMonthlyEditorialPattern(),
      sections: { calendarOverview: { seasonOpening: "From {{entryDate}} to {{exitDate}}, the Sun moves through {{signTitle}}." } },
      block_type: null,
      flags: null,
      provider: null,
      model: null,
      updated_at: "2026-09-16T00:00:00.000Z"
    }]) });
  });
  await page.goto("/?date=2026-09-15#calendar?view=month&date=2026-09-15");
  const overview = page.getByRole("region", { name: "Monthly overview", exact: true });
  await expect(overview).toBeVisible({ timeout: 60_000 });
  await expect(overview).toContainText("Virgo");
  await expect(overview).not.toContainText("{{");
  const heading = overview.getByRole("heading", { name: "Monthly overview", exact: true });
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveClass(/sr-only/);
});
