import fs from "node:fs";
import { expect, test } from "@playwright/test";

async function expectCalendarEventBody(page: import("@playwright/test").Page, title: RegExp, body: string) {
  const card = page.locator(".calendar-day-events").getByRole("button", { name: title });
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.click();
  const reading = page.getByRole("dialog", { name: "Event detail" });
  await expect(reading.getByText(body, { exact: true })).toBeVisible({ timeout: 60_000 });
  await reading.getByRole("button", { name: "Close", exact: true }).click();
  await expect(reading).toHaveCount(0);
}

test("Calendar renders complete collective passages after Studio hydration and reload", async ({ page }) => {
  test.setTimeout(120_000);
  // Current engine facts put Mercury trine Pluto on this day. Saturn square
  // Lilith is covered with explicit event facts below, not an obsolete date.
  const copies = [JSON.parse(fs.readFileSync("packages/astro-knowledge/data/transits/mercury-trine-pluto.json", "utf8")).readerCopy];
  await page.goto("/#calendar?view=day&date=2026-09-12");
  for (let load = 0; load < 2; load += 1) {
    for (const copy of copies) {
      await expectCalendarEventBody(page, /Mercury(?: Rx)? trines Pluto(?: Rx)?/i, copy.body);
    }
    if (load === 0) await page.reload();
  }
});

test("Calendar serves the owner's published Saturn revision with incomplete event metadata", async ({ page }) => {
  const snapshot = JSON.parse(fs.readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
  const row = snapshot.rows.find((row: { content_key: string }) => row.content_key === "sky.aspect.saturn.square.lilith");
  expect(row?.body).toContain("A rule stops making sense");
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/content_publications?**", route => route.fulfill({ json: snapshot.publications }));
  const requested = new Set<string>();
  await page.route("**/rest/v1/generated_interpretations?**", route => {
    const query = new URL(route.request().url()).searchParams.get("content_key");
    const keys = query?.startsWith("in.(") ? query.slice(4, -1).split(",").map(key => key.replaceAll('"', '')) : [];
    keys.forEach(key => requested.add(key));
    // Return only requested rows so a broad fixture cannot conceal missing hydration.
    return route.fulfill({ json: snapshot.rows.filter((candidate: { content_key: string }) => keys.includes(candidate.content_key)) });
  });
  const dateKey = "2026-09-12";
  const event = { id: "qa-saturn-lilith", type: "aspect", primary: true, glyph: "□", title: "Saturn square Lilith", planets: ["Saturn", "Lilith"], aspect: "square", startsAt: `${dateKey}T12:00:00Z`, dateKey };
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: {
    month: "2026-09", timeZone: "America/New_York", location: { latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" },
    days: [{ date: event.startsAt, dateKey, inMonth: true, moonSign: "Libra", moonSignGlyph: "♎", moonPhase: "Waxing Crescent", illumination: 4, activeAspects: [], events: [event] }], events: [event]
  } } }));
  await page.goto(`/#calendar?view=day&date=${dateKey}`);
  for (let load = 0; load < 2; load++) {
    await expectCalendarEventBody(page, /Saturn(?: Rx)? squares Lilith/i, row.body);
    expect(requested.has(row.content_key)).toBe(true);
    await expect(page.getByText(/A rule becomes harder to obey when compliance/)).toHaveCount(0);
    if (load === 0) {
      requested.clear();
      await page.reload();
    }
  }
});
