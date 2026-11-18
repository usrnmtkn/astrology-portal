import { expect, test, type Locator } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { installSyntheticNetworkGuard } from "../helpers/synthetic-network-guard";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { expectReadableTheme } from "../helpers/theme-contrast";
import { writeFileSync } from "node:fs";

async function expectUnclipped(control: Locator) {
  await expect(control).toBeVisible();
  expect(await control.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const panel = node.closest('[role="dialog"]')!.getBoundingClientRect();
    const inside = rect.left >= panel.left && rect.right <= panel.right
      && rect.top >= panel.top && rect.bottom <= panel.bottom
      && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
    return inside && [[.1, .5], [.5, .5], [.9, .5]].every(([x, y]) => {
      const target = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
      return target === node || !!target && node.contains(target);
    });
  })).toBe(true);
}

test.use({ timezoneId: "America/New_York", locale: "en-US" });
for (const viewport of [
  { width: 320, height: 568 }, { width: 390, height: 740 },
  { width: 1024, height: 640 }, { width: 1440, height: 900 }
]) for (const theme of ["light", "dark"]) {
  test(`date picker confirmation ${viewport.width} ${theme}`, async ({ page, context, baseURL }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const origin = new URL(baseURL!).origin;
    const guard = await installSyntheticNetworkGuard(context, origin);
    const calculations: Promise<void>[] = [], errors: { name: string; message: string }[] = [];
    page.on("pageerror", error => errors.push({ name: error.name, message: error.message }));
    await bundledPublications(page);
    await page.route("https://location-api.invalid/**", route => route.fulfill({
      status: 503, json: { message: "Synthetic offline auxiliary service" }
    }));
    await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    await page.route("**/api/sky{,-reader}?**", route => {
      const calculation = (async () => {
        const url = new URL(route.request().url());
        const location = { label: "Calculated fixture", latitude: Number(url.searchParams.get("lat")),
          longitude: Number(url.searchParams.get("lon")), timeZone: url.searchParams.get("timeZone")! };
        const detail = url.searchParams.get("detail");
        expect(["core", "placements", "full"]).toContain(detail);
        const sky = await getAstrodienstSky(location, new Date(url.searchParams.get("at")!),
          { includeTransitWindows: detail !== "core", includeAspectTiming: detail === "full" });
        await route.fulfill({ json: { sky } });
      })();
      calculations.push(calculation);
      return calculation;
    });
    await page.addInitScript(({ origin, theme }) => {
      if (window !== window.top || window.location.origin !== origin) return;
      localStorage.setItem("tldrastro:pageAnimations", "off");
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "Concord, NH", latitude: 43.2081, longitude: -71.5376, timeZone: "America/New_York"
      }));
    }, { origin, theme });
    await page.clock.setFixedTime(new Date("2026-11-04T17:00:00Z"));
    const trigger = page.locator("#header-date-trigger");
    const dialog = page.getByRole("dialog", { name: "Date and location", exact: true });
    const apply = dialog.getByRole("button", { name: "Apply date", exact: true });
    const open = async () => { await trigger.click(); await dialog.getByRole("tab", { name: "Date", exact: true }).click(); };
    const changeDate = async (date: string, action: () => Promise<unknown>) => {
      const response = page.waitForResponse(response => {
        const url = new URL(response.url());
        return /^\/api\/sky(?:-reader)?$/.test(url.pathname) && response.status() === 200
          && new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric",
            month: "2-digit", day: "2-digit" }).format(new Date(url.searchParams.get("at")!)) === date;
      });
      await action();
      const completed = await response;
      expect(await completed.finished()).toBeNull();
      const { sky } = await completed.json();
      expect(sky.positions).toHaveLength(14);
      expect(sky.calculationDetail).toBe(new URL(completed.url()).searchParams.get("detail"));
      expect(sky.location).toMatchObject({ latitude: 43.2081, longitude: -71.5376, timeZone: "America/New_York" });
      expect(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric",
        month: "2-digit", day: "2-digit" }).format(new Date(sky.generatedAt))).toBe(date);
    };
    try {
      await changeDate("2026-11-04", () => page.goto("/#sky"));
      await expect(trigger).toHaveText("Today");
      await open();
      await page.evaluate(() => document.fonts.ready);
      for (const tab of await dialog.getByRole("tab").all()) {
        await expectUnclipped(tab);
        expect(await tab.evaluate(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const text = range.getBoundingClientRect(), control = node.getBoundingClientRect();
          const group = node.parentElement!.getBoundingClientRect();
          return text.left >= control.left && text.right <= control.right
            && text.left >= group.left && text.right <= group.right
            && [text.left + 1, text.left + text.width / 2, text.right - 1].every(x => {
              const target = document.elementFromPoint(x, text.top + text.height / 2);
              return target === node || !!target && node.contains(target);
            });
        })).toBe(true);
      }
      await dialog.getByRole("button", { name: "Previous month", exact: true }).click();
      await expect(dialog.getByRole("grid")).toHaveAccessibleName("October 2026");
      await page.evaluate(() => document.fonts.ready);
      const header = dialog.locator(".date-picker-header");
      const expectMonthControls = async () => {
        await expectUnclipped(header.getByRole("button", { name: "Previous month", exact: true }));
        await expectUnclipped(header.getByRole("button", { name: "Next month", exact: true }));
        expect(await header.locator("strong").evaluate(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const text = range.getBoundingClientRect(), title = node.getBoundingClientRect();
          const header = node.parentElement!.getBoundingClientRect();
          return text.left >= title.left && text.right <= title.right
            && text.left >= header.left && text.right <= header.right && text.top >= header.top && text.bottom <= header.bottom
            && [text.left + 1, text.left + text.width / 2, text.right - 1].every(x => {
              const target = document.elementFromPoint(x, text.top + text.height / 2);
              return target === node || !!target && node.contains(target);
            });
        })).toBe(true);
      };
      await expectMonthControls();
      await header.getByRole("button", { name: "Next month", exact: true }).click();
      await expect(dialog.getByRole("grid")).toHaveAccessibleName("November 2026");
      await expectMonthControls();
      await header.getByRole("button", { name: "Previous month", exact: true }).click();
      await dialog.getByRole("gridcell", { name: "Wednesday, September 30, 2026", exact: true }).click();
      await expect(dialog.getByRole("gridcell", { name: "Wednesday, September 30, 2026", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(apply).toHaveText("Apply date");
      await expect(page).toHaveURL(/\/#sky$/);
      await expectUnclipped(apply);
      await expectUnclipped(dialog.getByRole("button", { name: "Cancel", exact: true }));
      expect(await apply.evaluate(node => node.getBoundingClientRect().bottom
        <= node.closest('[role="dialog"]')!.querySelector(".header-date-content")!.getBoundingClientRect().top)).toBe(true);
      await dialog.locator(".header-date-content").evaluate(node => { node.scrollTop = node.scrollHeight; });
      await expectUnclipped(apply);
      await expectUnclipped(dialog.getByRole("button", { name: "Cancel", exact: true }));
      await dialog.locator(".header-date-content").evaluate(node => { node.scrollTop = 0; });
      await expectReadableTheme(page, ".header-date-actions button, .date-picker-header strong");
      writeFileSync(info.outputPath("picker-geometry.json"), JSON.stringify(await dialog.evaluate(panel => {
        const rect = (node: Element) => {
          const r = node.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const title = panel.querySelector(".date-picker-header strong")!;
        const style = getComputedStyle(title);
        return { panel: rect(panel), header: rect(panel.querySelector(".date-picker-header")!),
          actions: rect(panel.querySelector(".header-date-actions")!),
          title: { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight,
            lineHeight: style.lineHeight, letterSpacing: style.letterSpacing } };
      }), null, 2));
      await dialog.screenshot({ path: info.outputPath("picker-confirmation.png") });
      await changeDate("2026-09-30", () => apply.click());
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(page).toHaveURL(/date=2026-09-30/);
      await expect(trigger).toHaveText("Sep 30");
      await changeDate("2026-09-30", () => page.reload());
      await expect(trigger).toHaveText("Sep 30");
      for (const dismiss of ["cancel", "close", "escape", "backdrop"]) {
        await open();
        await expect(dialog.getByRole("gridcell", { name: "Wednesday, September 30, 2026", exact: true })).toHaveAttribute("aria-selected", "true");
        await dialog.getByRole("gridcell", { name: "Tuesday, September 29, 2026", exact: true }).click();
        await expect(dialog.getByRole("gridcell", { name: "Tuesday, September 29, 2026", exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(apply).toHaveText("Apply date");
        if (dismiss === "cancel") await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        else if (dismiss === "close") await dialog.getByRole("button", { name: "Close date and location", exact: true }).filter({ visible: true }).click();
        else if (dismiss === "escape") await page.keyboard.press("Escape");
        else await page.locator(".header-date-modal .modal-positioner").click({ position: { x: 1, y: 1 } });
        await expect(dialog).toBeHidden();
        await expect(trigger).toHaveText("Sep 30");
        await expect(trigger).toBeFocused();
        await expect(page).toHaveURL(/date=2026-09-30/);
      }
      await open();
      await dialog.getByRole("gridcell", { name: "Tuesday, September 29, 2026", exact: true }).focus();
      await page.keyboard.press("Enter");
      await apply.focus(); await changeDate("2026-09-29", () => page.keyboard.press("Enter"));
      await expect(trigger).toHaveText("Sep 29");
      await expect(page).toHaveURL(/date=2026-09-29/);
      await trigger.click(); await changeDate("2026-11-05", () => dialog.getByRole("tab", { name: "Tomorrow", exact: true }).click());
      await expect(trigger).toHaveText("Tomorrow");
      await expect(page).toHaveURL(/date=2026-11-05/);
      await trigger.click(); await changeDate("2026-11-04", () => dialog.getByRole("tab", { name: "Today", exact: true }).click());
      await expect(trigger).toHaveText("Today");
      expect(new URL(page.url()).searchParams.has("date")).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await guard.finishStaticFonts();
      expect(errors).toEqual([]);
      expect(guard.unhandledExternal).toEqual([]);
    } finally {
      await Promise.all(calculations);
      await guard.finishStaticFonts();
    }
  });
}
