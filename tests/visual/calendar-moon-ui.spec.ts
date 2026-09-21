import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { watchBrowserErrors } from "./qaRuntimeGuards";

const output = "test-results/calendar-ui-qa";

for (const theme of ["light", "dark"] as const) {
  test(`Calendar season countdown clears view controls in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "New York City, NY", latitude: 40.7128, longitude: -74.006,
        timeZone: "America/New_York"
      }));
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mkdir(output, { recursive: true });
    for (const date of ["2026-09-24", "2026-12-31"]) {
      await page.goto(`/#calendar?view=day&date=${date}`);
      await expect(page.locator(".lunar-week-strip .lunar-week-day")).toHaveCount(7);
      await expect(page.locator(`.lunar-week-day[data-calendar-date="${date}"]`)).toBeVisible();
      for (const view of ["Day", "Week"]) {
        await page.getByRole("tab", { name: view, exact: true }).click();
        await expect(page.getByRole("tab", { name: view, exact: true })).toHaveAttribute("aria-selected", "true");
        for (const width of [1440, 1280, 1080, 960, 820, 768, 720, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => document.fonts.ready);
          const defects = await page.locator(".lunar-calendar-header").evaluate(header => {
            const bounds = header.getBoundingClientRect();
            const items = Array.from(header.querySelectorAll("h1, .lunar-calendar-controls, .calendar-header-season, .lunar-calendar-segmented, .lunar-calendar-subscribe"))
              .map(node => ({ label: node.className || node.tagName, rect: node.getBoundingClientRect() }))
              .filter(({ rect }) => rect.width && rect.height);
            return items.flatMap(({ label, rect }, index) => {
              const issues = rect.left < bounds.left - 1 || rect.right > bounds.right + 1 ? [`${label} exceeds header`] : [];
              for (const other of items.slice(index + 1)) {
                if (Math.min(rect.right, other.rect.right) - Math.max(rect.left, other.rect.left) > 1 &&
                    Math.min(rect.bottom, other.rect.bottom) - Math.max(rect.top, other.rect.top) > 1) {
                  issues.push(`${label} overlaps ${other.label}`);
                }
              }
              return issues;
            });
          });
          expect(defects, `${date} ${view} ${width}px ${theme}`).toEqual([]);
          if (width === 1440) {
            const column = await page.locator(".calendar-layout").boundingBox();
            const strip = await page.locator(".lunar-week-strip").boundingBox();
            expect(column!.width).toBe(1080);
            expect(Math.abs(strip!.x - column!.x)).toBeLessThan(1);
            expect(Math.abs(strip!.width - column!.width)).toBeLessThan(1);
          }
          if (date === "2026-09-24" && [1440, 768, 390].includes(width)) {
            await page.screenshot({ path: `${output}/header-${theme}-${width}-${view.toLowerCase()}.png` });
          }
        }
      }
    }
    assertNoErrors();
  });
}

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
        await expect(page.locator(".lunar-milestones")).toHaveCount(0);
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
