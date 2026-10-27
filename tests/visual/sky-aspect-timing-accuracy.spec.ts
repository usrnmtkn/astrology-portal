import { expect, test } from "@playwright/test";
import type { IncomingMessage, ServerResponse } from "node:http";
import skyHandler from "../../api/sky";
import { bundledPublications } from "../helpers/bundled-publications";
import { watchBrowserErrors } from "./qaRuntimeGuards";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Sky verified slow-aspect date range ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-07-01T16:00:00Z"));
    await page.emulateMedia({ colorScheme: theme as "light" | "dark", reducedMotion: "reduce" });
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
    }, theme);
    await bundledPublications(page);
    await page.route(/\/api\/sky\?/, async route => {
      const res = { statusCode: 200, body: "", setHeader() {}, end(body: string) { this.body = body; } };
      await skyHandler({ method: "GET", url: route.request().url() } as IncomingMessage, res as unknown as ServerResponse);
      await route.fulfill({ status: res.statusCode, contentType: "application/json", body: res.body });
    });
    await page.goto("/?date=2026-07-01#sky/aspect/chiron/sextile/north-node");
    const verify = async () => {
      await expect(page.locator("#sky-detail-title")).toHaveText(/Chiron.*Sextile.*North Node/, { timeout: 60_000 });
      await expect(page.locator(".sky-detail-id .article-duration").first()).toHaveText("Jun 25 - Nov 9, 2026");
    };
    await verify();
    await page.reload();
    await verify();
    await page.locator(".sky-detail-id").screenshot({ path: `test-results/sky-timing-verified-${width}-${theme}.png` });
    assertNoErrors();
  });
}
