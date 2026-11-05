import { expect, test } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { installSyntheticNetworkGuard } from "../helpers/synthetic-network-guard";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";

const scenarios = [
  {
    name: "observer ahead of browser",
    deviceZone: "America/New_York",
    instant: "2026-11-04T17:00:00Z",
    location: { label: "Auckland, New Zealand", latitude: -36.8485, longitude: 174.7633, timeZone: "Pacific/Auckland" },
    dates: [
      { date: "2026-11-05", cell: "Thursday, November 5, 2026", label: "Today" },
      { date: "2026-11-06", cell: "Friday, November 6, 2026", label: "Tomorrow" },
      { date: "2026-11-04", cell: "Wednesday, November 4, 2026", label: "Nov 4" }
    ]
  },
  {
    name: "observer behind browser",
    deviceZone: "UTC",
    instant: "2026-11-05T00:30:00Z",
    location: { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" },
    dates: [
      { date: "2026-11-04", cell: "Wednesday, November 4, 2026", label: "Today" },
      { date: "2026-11-05", cell: "Thursday, November 5, 2026", label: "Tomorrow" },
      { date: "2026-11-03", cell: "Tuesday, November 3, 2026", label: "Nov 3" }
    ]
  }
] as const;

for (const scenario of scenarios) test.describe(scenario.name, () => {
  test.use({ timezoneId: scenario.deviceZone, locale: "en-US" });
  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    test(`observer civil date labels ${width} ${theme}`, async ({ page, context, baseURL }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 1000 });
      const guard = await installSyntheticNetworkGuard(context, new URL(baseURL!).origin);
      const calculations: Promise<void>[] = [];
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
          const sky = await getAstrodienstSky(location, new Date(url.searchParams.get("at")!),
            { includeTransitWindows: true, includeAspectTiming: false });
          await route.fulfill({ json: { sky } });
        })();
        calculations.push(calculation);
        return calculation;
      });
      await page.addInitScript(({ location, theme }) => {
        localStorage.setItem("tldrastro:pageAnimations", "off");
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
      }, { location: scenario.location, theme });
      await page.clock.setFixedTime(new Date(scenario.instant));

      const civilDate = (value: string) => new Intl.DateTimeFormat("en-CA", {
        timeZone: scenario.location.timeZone, year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date(value));
      const calculatedResponse = (date: string) => page.waitForResponse(response => {
        const url = new URL(response.url());
        return /^\/api\/sky(?:-reader)?$/.test(url.pathname) && response.status() === 200
          && Number(url.searchParams.get("lat")) === scenario.location.latitude
          && Number(url.searchParams.get("lon")) === scenario.location.longitude
          && url.searchParams.get("timeZone") === scenario.location.timeZone
          && civilDate(url.searchParams.get("at")!) === date;
      });

      try {
        for (const [index, expected] of scenario.dates.entries()) {
          const responsePromise = calculatedResponse(expected.date);
          if (index === 0) await page.goto("/#sky");
          else {
            await page.locator("#header-date-trigger").click();
            const dialog = page.getByRole("dialog", { name: "Date and location" });
            await dialog.getByRole("tab", { name: "Date", exact: true }).click();
            await dialog.getByRole("gridcell", { name: expected.cell, exact: true }).click();
            await dialog.getByRole("button", { name: /^Show / }).click();
          }
          const response = await responsePromise;
          expect(await response.finished()).toBeNull();
          const { sky } = await response.json();
          expect(sky.positions).toHaveLength(14);
          expect(sky.location).toMatchObject({ latitude: scenario.location.latitude,
            longitude: scenario.location.longitude, timeZone: scenario.location.timeZone });
          expect(civilDate(sky.generatedAt)).toBe(expected.date);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          const trigger = page.locator("#header-date-trigger");
          await expect(trigger.locator(".sky-header-date-button__date")).toHaveText(expected.label);
          await expect(trigger).toHaveAttribute("aria-label", `${expected.label}, ${scenario.location.label}`);
          await trigger.click();
          const dialog = page.getByRole("dialog", { name: "Date and location" });
          await expect(dialog).toContainText(scenario.location.label);
          await dialog.getByRole("tab", { name: "Date", exact: true }).click();
          await expect(dialog.getByRole("gridcell", { name: scenario.dates[0].cell, exact: true })).toHaveClass(/today/);
          if (index > 0) await expect(dialog.getByRole("gridcell", { name: expected.cell, exact: true })).not.toHaveClass(/today/);
          await dialog.getByRole("button", { name: "Close date and location", exact: true }).filter({ visible: true }).click();
        }
        expect(guard.unhandledExternal).toEqual([]);
      } finally {
        await Promise.all(calculations);
        await guard.finishStaticFonts();
      }
    });
  }
});
