import { expect, test } from "@playwright/test";

const cacheKey = "tldrastro:fallbackArchitectureV3:dashboardBundle";
const versionKey = "tldrastro:fallbackArchitectureV3:dashboardBundleVersion";
const staleJupiterHook = "Someone just took the stage without asking if they were invited.";
const currentJupiterHook = "Jupiter in Leo makes it easier to admit that we want more.";
const currentSunJupiterAspect = "Confidence opens doors hesitation kept locked";

test("an old Jupiter/Lilith package cache self-heals to the bundled package", async ({ page }) => {
  await page.route("**/rest/v1/generated_interpretations*", async (route) => {
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
  await expect(article).toContainText(currentJupiterHook);
  await expect(article).toContainText(currentSunJupiterAspect);
  await expect(article).not.toContainText(staleJupiterHook);

  await expect.poll(async () => page.evaluate(
    ({ cacheKey, versionKey }) => ({
      bundle: window.localStorage.getItem(cacheKey),
      version: window.localStorage.getItem(versionKey)
    }),
    { cacheKey, versionKey }
  )).toEqual({ bundle: null, version: null });
});
