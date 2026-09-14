import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`Calendar day overview and complete Moon article ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.setFixedTime(new Date("2026-09-14T01:45:00Z"));
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => {
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York City, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
      }, theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/?date=2026-09-13#calendar?view=day&date=2026-09-13");
      const overview = page.locator(".calendar-day-reading__overview");
      const moon = page.locator(".calendar-day-reading__moon");
      await expect(overview).toContainText("Sun in Virgo", { timeout: 90_000 });
      await expect(overview).toContainText("Moon in Libra");
      await expect(overview).toContainText("Moon sextiles Jupiter");
      await expect(overview).toContainText("Moon squares Mars");
      await expect(overview).toContainText("Mercury trines Uranus Rx");
      await expect(overview).toContainText("Chiron Rx");
      await expect(overview).toContainText("Full Moon in Aries");
      await expect(overview.locator('a[href*="mercury/trine/uranus/at/"]')).toHaveCount(1);
      await expect(moon.locator(".calendar-day-reading__prose p").first()).toBeVisible({ timeout: 90_000 });
      await expect(moon).not.toContainText("This is a week for recalibration");
      const copy = await moon.locator(".calendar-day-reading__prose p").allTextContents();
      expect(copy.length).toBeGreaterThan(1);
      const headings = await page.locator(".lunar-selected-card__body > section > h3").allTextContents();
      expect(headings.slice(0, 3)).toEqual(["Day overview", "Moon in Libra", "Exact today"]);
      const metrics = await moon.locator(".calendar-day-reading__prose p").first().evaluate((element) => {
        const style = getComputedStyle(element);
        const probe = document.createElement("p");
        probe.style.cssText = "font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)";
        element.parentElement!.appendChild(probe);
        const expected = getComputedStyle(probe);
        const keys = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
        const result = keys.map((key) => [key, style[key], expected[key]]);
        probe.remove();
        return result;
      });
      for (const [key, actual, expected] of metrics) expect(actual, key).toBe(expected);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await mkdir("test-results/calendar-day-reading", { recursive: true });
      await page.screenshot({ path: `test-results/calendar-day-reading/${theme}-${width}.png`, fullPage: true });
      // Both surfaces must contain the identical opening and final authored paragraph.
      await overview.getByRole("link", { name: "Read about Moon in Libra" }).click();
      await expect(page.locator("body")).toContainText(copy[0]);
      await expect(page.locator("body")).toContainText(copy.at(-1)!);
      expect(errors).toEqual([]);
    });
  }
}
