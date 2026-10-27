import fs from "node:fs";
import { expect, test } from "@playwright/test";
import type { IncomingMessage, ServerResponse } from "node:http";
import calendarHandler from "../../api/calendar";
import skyHandler from "../../api/sky";
import { defaultLocation, getLunarCalendarWeek } from "../../apps/web/src/services/ephemeris";
import { bundledPublications } from "../helpers/bundled-publications";
import { watchBrowserErrors } from "./qaRuntimeGuards";

const copy = ["sun-opposition-moon", "moon-square-pluto"].map(name =>
  JSON.parse(fs.readFileSync(`packages/astro-knowledge/data/transits/${name}.json`, "utf8")).readerCopy.body as string);

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Calendar exact contacts and Full Moon orb ranking ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoErrors = watchBrowserErrors(page);
    const offline = width === 390 && theme === "dark";
    const old = structuredClone(await getLunarCalendarWeek(defaultLocation, new Date("2026-10-25T16:00:00Z")));
    old.events = old.events.filter(event => !["conjunction", "opposition"].includes(event.aspect ?? ""));
    old.days.forEach(day => { day.events = day.events.filter(event => !["conjunction", "opposition"].includes(event.aspect ?? "")); });
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-10-26T16:00:00Z"));
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" });
    await page.addInitScript(({ theme, old, location }) => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
      localStorage.setItem("tldr-lunar-calendar|v13|week|2026-10-25|40.7128|-74.0060|America/New_York",
        JSON.stringify({ savedAt: Date.now(), detail: "full", calendar: old }));
    }, { theme, old, location: defaultLocation });
    await bundledPublications(page);
    const calendarVersions: string[] = [];
    await page.route(/\/api\/(calendar|sky)\?/, async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/calendar" && url.searchParams.get("mode") !== "range") {
        calendarVersions.push(url.searchParams.get("factsVersion") ?? "");
        if (offline) return route.fulfill({ status: 503, json: { ok: false, error: "Synthetic calendar outage" } });
      }
      const res = { statusCode: 200, body: "", setHeader() {}, end(body: string) { this.body = body; } };
      await (url.pathname === "/api/calendar" ? calendarHandler : skyHandler)(
        { method: "GET", url: url.href } as IncomingMessage, res as unknown as ServerResponse);
      await route.fulfill({ status: res.statusCode, contentType: "application/json", body: res.body });
    });

    await page.goto("/?date=2026-10-25#calendar?view=day&date=2026-10-25");
    const venus = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: /Moon opposes Venus Rx/ });
    await expect(venus).toBeVisible({ timeout: 60_000 });
    await expect(venus).toContainText("6:59p");
    expect(calendarVersions).toContain("calendar-exact-aspects-v5");
    expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("tldr-lunar-calendar|v14|")))).toBe(true);
    await venus.click();
    const detail = page.getByRole("dialog", { name: "Event detail", exact: true });
    await expect(detail).toContainText("Moon opposes Venus Rx");
    await expect(detail.locator(".calendar-reading__body")).not.toBeEmpty();
    await detail.getByRole("button", { name: "Close", exact: true }).click();

    await page.goto("/?date=2026-10-26#sky/lunation/2026-10-26/taurus");
    const verifyFullMoon = async () => {
      await expect(page.locator("#sky-detail-title")).toHaveText("Full Moon in Taurus", { timeout: 60_000 });
      const aspects = page.locator(".article-related-aspects__copy");
      await expect(aspects.locator("h4")).toHaveText(["Sun Opposition Moon", "Moon Square Pluto"]);
      await expect(aspects.locator(".article-related-aspects__date")).toHaveText(["Exact · October 26", "Exact · October 26"]);
      for (const [index, body] of copy.entries()) await expect(aspects.nth(index).locator("p").last()).toHaveText(body);
    };
    await verifyFullMoon();
    await page.locator(".article-related-aspects-card").screenshot({ path: `test-results/full-moon-aspects-${width}-${theme}.png` });
    await page.reload();
    await verifyFullMoon();
    await page.goto("/?date=2026-10-23#calendar?view=day&date=2026-10-23");
    const conjunction = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: /Sun conjoins Venus Rx/ });
    await expect(conjunction).toBeVisible({ timeout: 60_000 });
    await page.reload();
    await expect(conjunction).toBeVisible({ timeout: 60_000 });
    assertNoErrors();
  });
}
