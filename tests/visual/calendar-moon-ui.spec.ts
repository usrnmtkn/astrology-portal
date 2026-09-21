import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { bundledPublications } from "../helpers/bundled-publications";
import { watchBrowserErrors } from "./qaRuntimeGuards";

const output = "test-results/calendar-ui-qa";

const virgoBlocks = JSON.parse(readFileSync("apps/web/src/features/calendar/data/lunar-journal.entries.json", "utf8"))
  .entries.find((entry: { type: string; sign: string }) => entry.type === "season" && entry.sign === "Virgo").blocks as Array<{
    type: string; text?: string; label?: string; items?: string[];
  }>;

for (const theme of ["light", "dark"] as const) for (const width of [320, 390, 430, 1440]) {
  test(`Calendar controls and reading spacing ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width, height: 844 });
    await page.clock.setFixedTime(new Date("2026-09-21T16:00:00Z"));
    await bundledPublications(page);
    await page.addInitScript(({ theme, prompts }) => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:journalPrompts", String(prompts));
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "New York City, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York"
      }));
    }, { theme, prompts: width >= 430 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#calendar?view=day&date=2026-09-21");
    await expect(page.locator('.lunar-week-day[data-calendar-date="2026-09-21"]')).toBeVisible();
    await mkdir(output, { recursive: true });
    for (const view of ["Day", "Week", "Month"]) {
      await page.getByRole("tab", { name: view, exact: true }).click();
      const tabs = page.locator(".lunar-calendar-segmented");
      const box = (await tabs.boundingBox())!;
      for (const tab of await tabs.getByRole("tab").all()) {
        const item = (await tab.boundingBox())!;
        if (width < 720) expect(item.height).toBeGreaterThanOrEqual(44);
        expect(item.y).toBeGreaterThan(box.y);
        expect(item.y + item.height).toBeLessThan(box.y + box.height);
      }
      for (const button of await page.locator(".lunar-calendar-controls button").all()) {
        const bounds = (await button.boundingBox())!;
        if (width < 720) expect(Math.min(bounds.width, bounds.height)).toBeGreaterThanOrEqual(44);
      }
      if (view === "Month") {
        await expect.poll(() => page.locator(".calendar-month-chip").count()).toBeGreaterThan(10);
        const clipped = await page.locator(".lunar-calendar-day__events").evaluateAll(groups => groups.flatMap(group => {
          const viewport = group.getBoundingClientRect();
          return Array.from(group.querySelectorAll<HTMLElement>(":scope > .calendar-month-chip")).flatMap(chip => {
            const rect = chip.getBoundingClientRect();
            if (rect.top >= viewport.bottom - 1) return [];
            const issues = rect.bottom > viewport.bottom + 1 ? ["partial event row"] : [];
            if (chip.scrollWidth > chip.clientWidth + 1) issues.push("clipped chip contents");
            return issues;
          });
        }));
        expect(clipped).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `${output}/mobile-${theme}-${width}-${view.toLowerCase()}.png` });
    }
    await page.locator('.lunar-calendar-day[data-calendar-date="2026-09-25"]').click();
    const day = page.getByRole("dialog", { name: "Day slideout", exact: true });
    await expect(day).toBeVisible();
    const toolbar = (await day.locator(".calendar-slideout__toolbar").boundingBox())!;
    const date = (await day.locator(".calendar-sky-card__date").boundingBox())!;
    expect(date.y - (toolbar.y + toolbar.height)).toBeGreaterThanOrEqual(0);
    if (width < 720) expect(date.y - (toolbar.y + toolbar.height)).toBeLessThanOrEqual(24);
    await page.screenshot({ path: `${output}/mobile-${theme}-${width}-day-reading.png` });
    await day.evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
    if (width < 720) await expect(day.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
    await day.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: "Day", exact: true }).click();
    await page.locator('.lunar-week-day[data-calendar-date="2026-09-21"]').click();
    await page.locator(width < 720 ? ".calendar-season-pill" : ".calendar-header-season").click();
    const reading = page.getByRole("dialog", { name: "Event detail", exact: true });
    await expect(reading.getByRole("heading", { level: 2, name: /Virgo/ })).toBeVisible();
    const body = reading.locator(".calendar-reading__body");
    for (const block of virgoBlocks) {
      if (block.text) await expect(body).toContainText(block.text);
      for (const item of block.items ?? []) await expect(body).toContainText(item);
    }
    await expect(reading.locator(".calendar-reading__mark")).toHaveCount(0);
    const spacing = await reading.locator(".calendar-reading__card").evaluateAll(cards => cards.flatMap(card => {
      const children = Array.from(card.children);
      return children.slice(1).map((child, i) => child.getBoundingClientRect().top - children[i].getBoundingClientRect().bottom);
    }));
    for (const gap of spacing) expect(gap).toBeGreaterThanOrEqual(8);
    const bodyStyles = await body.locator("p, li").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
    }));
    expect(new Set(bodyStyles.map(style => JSON.stringify(style))).size).toBe(1);
    const prompt = reading.locator(".calendar-reading__card").filter({ hasText: "Journal prompt" });
    await prompt.scrollIntoViewIfNeeded();
    if (width < 720) await expect(reading.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
    await page.screenshot({ path: `${output}/mobile-${theme}-${width}-prompts.png` });
    if (width >= 430) {
      const write = reading.getByRole("button", { name: "Write about this" });
      expect((await write.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await write.click();
      const checkIn = page.getByRole("dialog", { name: "Check-in", exact: true });
      await expect(checkIn).toBeVisible();
      await expect(checkIn.getByRole("heading", { name: virgoBlocks.find(block => block.type === "prompt")!.text!, exact: true })).toBeVisible();
      await expect(checkIn.locator("textarea")).toBeEditable();
    }
    assertNoErrors();
  });
}

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
