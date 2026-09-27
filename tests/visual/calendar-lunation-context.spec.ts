import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { bundledPublications } from "../helpers/bundled-publications";

const entries = JSON.parse(readFileSync("apps/web/src/features/calendar/data/lunar-journal.entries.json", "utf8")).entries;
const ariesFull = entries.find((entry: any) => entry.type === "full" && entry.sign === "Aries");
const paragraphs = ariesFull.blocks.filter((block: any) => block.type === "para").map((block: any) => block.text);
const newMoon = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"))
  .authoredCards.find((row: any) => row.contentKey === "authored/sky-lunation-macro/new-moon/aries").body.split(/\n\n+/);

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Weekly Moon references and previous-cycle reading ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-09-27T16:00:00Z"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await bundledPublications(page);
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
    }, theme);
    await page.goto("/?date=2026-10-03#calendar?view=weekly&date=2026-10-03");
    const day = page.locator("#calendar-day-group-2026-09-27");
    const context = day.getByLabel("Lunar cycle readings");
    await expect(context).toContainText("Previous: Full Moon in Aries · Sep 26, 2026", { timeout: 60_000 });
    await expect(context).toContainText("Next: New Moon in Libra · Oct 10, 2026");
    await expect(day).not.toContainText("Keep the part that became clear");
    await expect(day).toContainText("The Full Moon in Aries was on September 26.");
    await day.screenshot({ path: `test-results/calendar-week-context-${width}-${theme}.png` });
    await context.getByRole("button", { name: "Full Moon in Aries · Sep 26, 2026", exact: true }).click();
    const reading = page.getByRole("dialog", { name: "Event detail", exact: true });
    await expect(reading.getByRole("heading", { name: "Full Moon in Aries", exact: true })).toBeVisible();
    const typography = (element: Element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
    };
    const titleStyle = await reading.locator("h2").evaluate(typography);
    await expect(reading).toContainText(paragraphs[0]);
    await expect(reading).toContainText(paragraphs.at(-1));
    await expect(reading.getByText("Go to prev", { exact: true })).toHaveCount(0);
    const previous = reading.getByRole("button", { name: "Read New Moon in Aries · Apr 17, 2026", exact: true });
    await expect(previous).toBeVisible({ timeout: 30_000 });
    await previous.focus();
    await page.keyboard.press("Enter");
    await expect(reading.getByRole("heading", { name: "New Moon in Aries", exact: true })).toBeVisible();
    await expect(reading.locator(".calendar-reading__meta")).toContainText("Apr 17, 2026");
    await expect(reading.locator("h2")).toBeFocused();
    expect(await reading.locator("h2").evaluate(typography)).toEqual(titleStyle);
    await expect(reading).not.toContainText("New Moon in Sagittarius");
    await expect(reading.locator(".calendar-reading__body")).not.toBeEmpty();
    await expect(reading).toContainText(newMoon[0]);
    await expect(reading).toContainText(newMoon.at(-1));
    expect(await reading.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/calendar-cycle-${width}-${theme}.png` });
    await reading.getByRole("button", { name: "Close", exact: true }).click();
    await expect(reading).toHaveCount(0);
    await expect(context).toBeVisible();
    expect(errors).toEqual([]);
  });
}
