import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones";
import {
  natalSkySnapshotCacheKey,
  VERIFIED_SKY_CACHE_SCHEMA
} from "../../apps/web/src/services/verifiedSkyCache";

const fixtureLocation = {
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
  timeZone: "America/New_York"
};
const fixtureBirthDate = "1979-02-18";
const fixtureBirthTime = "8:24 AM";
const fixtureNow = "2026-08-28T14:00:00.000Z";
const budgets = {
  coldProfileReadyMs: 1_500,
  mobileProfileReadyMs: 1_500,
  slowNetworkMilestoneReadyMs: 1_000,
  slowNetworkProfileReadyMs: 1_500,
  warmNavigationReadyMs: 800
};

async function seedYouPerformanceState(page: Page) {
  const birthDateTime = zonedDateTimeToUtc(
    fixtureBirthDate,
    fixtureBirthTime,
    fixtureLocation.timeZone
  );
  const natalSky = await getAstrodienstSky(fixtureLocation, birthDateTime);
  const natalCacheKey = natalSkySnapshotCacheKey(fixtureLocation, birthDateTime);

  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({ status: 503, contentType: "text/plain", body: "Performance QA uses local calculations." });
  });
  await page.route("**/rest/v1/generated_interpretations*", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.addInitScript(({ fixtureBirthDate, fixtureBirthTime, fixtureLocation, fixtureNow, natalCacheKey, natalSky, verifiedSchema }) => {
    const RealDate = Date;
    const fixedTime = new RealDate(fixtureNow).getTime();

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
    window.localStorage.clear();
    window.localStorage.setItem("tldrastro:theme", "light");
    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(fixtureLocation));
    window.localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: "qa-you-performance-user",
      name: "Marie Satori",
      email: "qa-you-performance@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: fixtureLocation.label,
      currentLocationData: fixtureLocation,
      charts: [{
        id: "qa-you-performance-chart",
        name: "Marie Satori",
        type: "Birth chart",
        birthDate: fixtureBirthDate,
        birthTime: fixtureBirthTime,
        birthCity: fixtureLocation.label,
        birthLocation: fixtureLocation
      }]
    }));
    window.localStorage.setItem(natalCacheKey, JSON.stringify({
      schema: verifiedSchema,
      cacheKey: natalCacheKey,
      snapshot: natalSky,
      verifiedAt: fixtureNow
    }));
  }, {
    fixtureBirthDate,
    fixtureBirthTime,
    fixtureLocation,
    fixtureNow,
    natalCacheKey,
    natalSky,
    verifiedSchema: VERIFIED_SKY_CACHE_SCHEMA
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function expectYouProfileReady(page: Page) {
  await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
  await expect(page.getByLabel("Profile summary")).toBeVisible();
  await expect(page.getByText("Marie Satori")).toBeVisible();
}

test.describe("You loading performance matrix", () => {
  test("repeated cold direct links reveal the saved profile within budget", async ({ browser }) => {
    const samples = [];

    for (let index = 0; index < 3; index += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await seedYouPerformanceState(page);
      const startedAt = performance.now();

      await page.goto("/#you", { waitUntil: "domcontentloaded" });
      await expectYouProfileReady(page);
      samples.push(Math.round(performance.now() - startedAt));
      await context.close();
    }

    expect(Math.max(...samples), `Cold You profile samples: ${samples.join(", ")}ms`).toBeLessThanOrEqual(
      budgets.coldProfileReadyMs
    );
  });

  test("warm navigation reveals You without waiting for background enhancements", async ({ page }) => {
    await seedYouPerformanceState(page);
    await page.goto("/#sky", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    const youButton = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You" });
    await youButton.focus();
    const startedAt = performance.now();

    await youButton.click();
    await expectYouProfileReady(page);

    expect(
      Math.round(performance.now() - startedAt),
      "Warm You navigation must not wait for social-profile or manual-chart enhancement"
    ).toBeLessThanOrEqual(budgets.warmNavigationReadyMs);
  });

  test("mobile direct links reveal the saved profile within budget", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedYouPerformanceState(page);
    const startedAt = performance.now();

    await page.goto("/#you", { waitUntil: "domcontentloaded" });
    await expectYouProfileReady(page);

    expect(Math.round(performance.now() - startedAt)).toBeLessThanOrEqual(budgets.mobileProfileReadyMs);
  });

  test("slow chart data keeps the profile usable and reports the current milestone", async ({ page }) => {
    let releaseWasm: () => void = () => undefined;
    const wasmMayContinue = new Promise<void>((resolve) => {
      releaseWasm = resolve;
    });
    await page.route("**/*.wasm", async (route) => {
      await wasmMayContinue;
      await route.continue();
    });
    await seedYouPerformanceState(page);
    const startedAt = performance.now();

    await page.goto("/#you", { waitUntil: "domcontentloaded" });
    await expectYouProfileReady(page);
    const profileReadyMs = Math.round(performance.now() - startedAt);
    await expect(page.getByText("Adding today’s transits.", { exact: true })).toBeVisible();
    const milestoneReadyMs = Math.round(performance.now() - startedAt);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();

    expect(profileReadyMs).toBeLessThanOrEqual(budgets.slowNetworkProfileReadyMs);
    expect(milestoneReadyMs).toBeLessThanOrEqual(budgets.slowNetworkMilestoneReadyMs);
    releaseWasm();
    await expect(page.getByText("Adding today’s transits.", { exact: true })).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole("alert", { name: "Chart calculation error" })).toHaveCount(0);
    await expect(page.locator('[aria-label="Transit chart wheel"], [aria-label="Natal chart wheel"]')).toBeVisible();
  });
});
