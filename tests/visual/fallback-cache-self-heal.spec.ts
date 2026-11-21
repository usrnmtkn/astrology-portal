import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import skyHandler from "../../api/sky";

const cacheKey = "tldrastro:fallbackArchitectureV3:dashboardBundle";
const versionKey = "tldrastro:fallbackArchitectureV3:dashboardBundleVersion";
const staleJupiterHook = "Someone just took the stage without asking if they were invited.";
// Recovery follows the exact published snapshot, which may supersede the
// original bundled article. Preserve the complete opening and final paragraph.
const publishedSnapshot = JSON.parse(readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
const publishedJupiter = publishedSnapshot.rows.find((row: any) => row.content_key === "sky-placement/article/jupiter/leo");
if (!publishedJupiter?.body) throw new Error("The published Jupiter recovery passage is missing.");
const jupiterParagraphs = publishedJupiter.body.split(/\n\s*\n/u).map((paragraph: string) => paragraph.trim()).filter(Boolean);
const currentJupiterArticle = jupiterParagraphs[0];
const currentJupiterEnding = jupiterParagraphs.at(-1);

for (const width of [390, 1440]) test(`an old Jupiter/Lilith package cache self-heals and survives reload at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  // Exercise a content-store outage with working calculated facts. A static
  // preview otherwise answers /api/sky with HTML and leaks ledger reads to DNS.
  await page.route("**/api/sky?**", async route => {
    const response = { statusCode: 200, body: "", setHeader() {}, end(body: string) { this.body = body; } };
    await skyHandler({ method: "GET", url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    await route.fulfill({ status: response.statusCode, contentType: "application/json", body: response.body });
  });
  await page.route("**/rest/v1/**", route => route.fulfill({ status: 503, json: { message: "Synthetic content-store outage." } }));
  await page.route('**/api/content-reader', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Self-heal proof keeps the database unavailable." })
    });
  });

  await page.addInitScript(({ cacheKey, versionKey, staleJupiterHook }) => {
    const RealDate = Date;
    const fixedTime = new RealDate("2026-07-29T16:00:00.000Z").getTime();

    class FixedDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixedTime);
        } else {
          super(...args);
        }
      }

      static now() {
        return fixedTime;
      }
    }

    FixedDate.UTC = RealDate.UTC;
    FixedDate.parse = RealDate.parse;
    window.Date = FixedDate as DateConstructor;
    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
      label: "New York, NY",
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: "America/New_York"
    }));
    if (window.sessionStorage.getItem('qa:obsolete-cache-seeded')) return;
    window.sessionStorage.setItem('qa:obsolete-cache-seeded', 'true');
    window.localStorage.setItem(versionKey, "1722268800000");
    window.localStorage.setItem(cacheKey, JSON.stringify({
      schema: "fallback-architecture-v3-dashboard-cache-v2",
      packageVersion: "v3-2026-07-29o",
      dashboardVersion: 1722268800000,
      bundle: {
        transitLib: { authoredCards: [] },
        templatesFile: { templates: [] },
        rowsFile: {
          vocabularyRows: [],
          hookRows: [
            {
              contentKey: "fallback-hook/sky-placement-hook/jupiter/leo",
              content_role: "fallback_hook",
              body_you: staleJupiterHook,
              body_they: staleJupiterHook,
              review_status: "approved"
            },
            {
              contentKey: "fallback-hook/sky-placement-hook/lilith/sagittarius",
              content_role: "fallback_hook",
              body_you: "Stale Lilith cache control.",
              body_they: "Stale Lilith cache control.",
              review_status: "approved"
            }
          ]
        }
      }
    }));
  }, { cacheKey, versionKey, staleJupiterHook });

  await page.goto("/#sky/placement/jupiter", { waitUntil: "domcontentloaded" });
  const article = page.locator(".sky-detail-article").first();
  await expect(article).toBeVisible({ timeout: 15_000 });
  await expect(article).toContainText(currentJupiterArticle);
  await expect(article).toContainText(currentJupiterEnding);
  await expect(article).not.toContainText(staleJupiterHook);

  await expect.poll(async () => page.evaluate(
    ({ cacheKey, versionKey }) => ({
      bundle: window.localStorage.getItem(cacheKey),
      version: window.localStorage.getItem(versionKey)
    }),
    { cacheKey, versionKey }
  )).toEqual({ bundle: null, version: null });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(article).toBeVisible({ timeout: 15_000 });
  await expect(article).toContainText(currentJupiterArticle);
  await expect(article).toContainText(currentJupiterEnding);
  await expect(article).not.toContainText(staleJupiterHook);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/offline-reader-recovered-${width}.png` });
});
