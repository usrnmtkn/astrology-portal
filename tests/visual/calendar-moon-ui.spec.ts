import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { watchBrowserErrors } from "./qaRuntimeGuards";

const output = "test-results/calendar-ui-qa";

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 768, 1440]) {
    test(`lunar geometry and calendar layout at ${width}px in ${theme}`, async ({ page }) => {
      test.setTimeout(60_000);
      const assertNoErrors = watchBrowserErrors(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => {
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
          label: "New York City, NY", latitude: 40.7128, longitude: -74.006,
          timeZone: "America/New_York"
        }));
      }, theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/#calendar?view=day&date=2026-09-07");
      await expect(page.locator(".lunar-week-strip .lunar-week-day")).toHaveCount(7);
      await mkdir(output, { recursive: true });

      for (const view of ["Day", "Week", "Month"]) {
        await page.getByRole("tab", { name: view, exact: true }).click();
        await expect(page.getByRole("tab", { name: view, exact: true })).toHaveAttribute("aria-selected", "true");
        const moons = page.locator(".lunar-milestones .lunar-moon-disc.is-crescent, .lunar-milestones .lunar-moon-disc.is-gibbous");
        if (await moons.count()) {
          await expect(moons.first()).toBeVisible();
          const geometry = await moons.evaluateAll((elements) => elements.map((element) => {
            const disc = getComputedStyle(element);
            const shadow = getComputedStyle(element, "::after");
            const bounds = element.getBoundingClientRect();
            return {
              radius: shadow.borderRadius,
              square: Math.abs(bounds.width - bounds.height) < 0.5,
              shrink: disc.flexShrink,
              continuousShadow: !element.classList.contains("is-crescent") || disc.backgroundColor === shadow.backgroundColor
            };
          }));
          for (const moon of geometry) {
            // A 999px pill radius resolves to a near-rectangle on this half-disc.
            expect(moon.radius).toMatch(/100%/);
            expect(moon.square).toBe(true);
            expect(moon.shrink).toBe("0");
            expect(moon.continuousShadow).toBe(true);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const clippedControls = await page.locator(".lunar-calendar-controls button, .lunar-calendar-segmented button, .calendar-day-panel")
          .evaluateAll((nodes) => nodes.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.left < 0 || box.right > innerWidth + 1;
          }).map((node) => node.textContent));
        expect(clippedControls, "Controls and event times remain visible, even inside overflow-clipped parents").toEqual([]);
        if (view === "Month") {
          const overlaps = await page.locator(".lunar-calendar-day").evaluateAll((days) => days.flatMap((day) => {
            const lunar = day.querySelector(".lunar-calendar-day__lunar")?.getBoundingClientRect();
            const phase = day.querySelector(".lunar-calendar-day__phase")?.getBoundingClientRect();
            return lunar && phase && lunar.bottom > phase.top + 1 ? [day.getAttribute("data-calendar-date")] : [];
          }));
          expect(overlaps, "Moon/sign and illumination rows do not overlap").toEqual([]);
        }
        if (view === "Day" && width === 1440) {
          const clippedTimes = await page.locator(".lunar-week-day__events .event-void span:last-child")
            .evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent));
          expect(clippedTimes).toEqual([]);
        }
        await page.screenshot({ path: `${output}/${theme}-${width}-${view.toLowerCase()}.png`, fullPage: true });
      }
      assertNoErrors();
    });
  }
}
