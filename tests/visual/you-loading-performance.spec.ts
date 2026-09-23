import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones";
import {
  natalSkySnapshotCacheKey,
  VERIFIED_SKY_CACHE_SCHEMA
} from "../../apps/web/src/services/verifiedSkyCache";

const fixtureLocation = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};
const fixtureBirthDate = "1990-01-01";
const fixtureBirthTime = "12:00 PM";
const fixtureNow = "2026-08-28T14:00:00.000Z";
const budgets = {
  coldProfileReadyMs: 1_500,
  mobileProfileReadyMs: 1_500,
  slowNetworkMilestoneReadyMs: 1_000,
  slowNetworkProfileReadyMs: 1_500,
  warmNavigationReadyMs: 800
};

// Match the Friends performance matrix: tracing large response bodies and DOM
// snapshots competes with the browser during these sub-second measurements.
// Functional reader suites retain traces; these tests retain failure screenshots.
test.use({ trace: "off" });

async function seedYouPerformanceState(page: Page, cacheNatal = true, now = fixtureNow) {
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
  await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: [] }));
  await page.route('**/api/content-reader', async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.addInitScript(({ fixtureBirthDate, fixtureBirthTime, fixtureLocation, fixtureNow, natalCacheKey, natalSky, verifiedSchema, cacheNatal }) => {
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
    // Record first visible readiness in the browser; cross-process locator
    // completion can lag the paint under CI load.
    const visible = (element: Element | null) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.visibility !== "collapse";
    };
    const readiness: { profile?: number; milestone?: number; click?: number } = {};
    document.addEventListener("click", event => {
      if ((event.target as Element)?.closest('nav[aria-label="Primary navigation"] button')?.textContent?.trim() === "You") {
        readiness.click = performance.timeOrigin + performance.now();
      }
    }, true);
    (window as any).__youReadyAt = readiness;
    const observe = () => {
      const region = document.querySelector('section[aria-label="You"]');
      const summary = region?.querySelector('[aria-label="Profile summary"]') ?? null;
      const name = summary?.querySelector('h1') ?? null;
      if (!readiness.profile && visible(region) && visible(summary) && visible(name) && name?.textContent === "Project Author") {
        readiness.profile = performance.timeOrigin + performance.now();
      }
      if (!readiness.milestone && region) {
        const message = region.querySelector('[role="status"][aria-label="Adding today’s transits."]');
        if (visible(message)) readiness.milestone = performance.timeOrigin + performance.now();
      }
      if (!readiness.profile || !readiness.milestone) requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
    window.localStorage.clear();
    window.localStorage.setItem("tldrastro:theme", "light");
    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(fixtureLocation));
    window.localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: "qa-you-performance-user",
      name: "Project Author",
      email: "qa-you-performance@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: fixtureLocation.label,
      currentLocationData: fixtureLocation,
      charts: [{
        id: "qa-you-performance-chart",
        name: "Project Author",
        type: "Birth chart",
        birthDate: fixtureBirthDate,
        birthTime: fixtureBirthTime,
        birthCity: fixtureLocation.label,
        birthLocation: fixtureLocation
      }]
    }));
    if (cacheNatal) window.localStorage.setItem(natalCacheKey, JSON.stringify({
      schema: verifiedSchema,
      cacheKey: natalCacheKey,
      snapshot: natalSky,
      verifiedAt: fixtureNow
    }));
  }, {
    fixtureBirthDate,
    fixtureBirthTime,
    fixtureLocation,
    fixtureNow: now,
    natalCacheKey,
    natalSky,
    cacheNatal,
    verifiedSchema: VERIFIED_SKY_CACHE_SCHEMA
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function expectYouProfileReady(page: Page) {
  await page.waitForFunction(() => Number.isFinite((window as any).__youReadyAt?.profile));
  await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
  await expect(page.getByLabel("Profile summary")).toBeVisible();
  await expect(page.getByText("Project Author")).toBeVisible();
  return page.evaluate(() => (window as any).__youReadyAt.profile as number);
}

function elapsedSince(readyAt: number, startedAt: number) {
  expect(readyAt).toBeGreaterThanOrEqual(startedAt);
  return Math.round(readyAt - startedAt);
}

test.describe("You loading performance matrix", () => {
  test("repeated cold browser direct links with cached natal data reveal the saved profile within budget", async ({ browser }) => {
    const samples = [];

    for (let index = 0; index < 3; index += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await seedYouPerformanceState(page);
      const startedAt = Date.now();

      await page.goto("/#you", { waitUntil: "domcontentloaded" });
      const readyAt = await expectYouProfileReady(page);
      samples.push(elapsedSince(readyAt, startedAt));
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
    const startedAt = Date.now();

    await youButton.click();
    const readyAt = await expectYouProfileReady(page);

    const clickedAt = await page.evaluate(() => (window as any).__youReadyAt.click as number);
    // Measure the actual browser click. Playwright may wait for the previous
    // Sky layout to stabilize before delivering input (843 ms at 8x CPU).
    // That preparation is not You navigation; click-to-first-paint is.
    expect(clickedAt).toBeGreaterThanOrEqual(startedAt);
    console.log(JSON.stringify({ scenario: "warm You profile", elapsedMs: elapsedSince(readyAt, clickedAt),
      inputPreparationMs: Math.round(clickedAt - startedAt) }));
    expect(
      elapsedSince(readyAt, clickedAt),
      "Warm You navigation must not wait for social-profile or manual-chart enhancement"
    ).toBeLessThanOrEqual(budgets.warmNavigationReadyMs);
  });

  test("mobile direct links reveal the saved profile within budget", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedYouPerformanceState(page);
    const startedAt = Date.now();

    await page.goto("/#you", { waitUntil: "domcontentloaded" });
    const readyAt = await expectYouProfileReady(page);

    expect(elapsedSince(readyAt, startedAt)).toBeLessThanOrEqual(budgets.mobileProfileReadyMs);
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
    const startedAt = Date.now();

    await page.goto("/#you", { waitUntil: "domcontentloaded" });
    const readyAt = await expectYouProfileReady(page);
    const profileReadyMs = elapsedSince(readyAt, startedAt);
    await page.waitForFunction(() => Number.isFinite((window as any).__youReadyAt?.milestone));
    const milestoneReadyMs = elapsedSince(await page.evaluate(() => (window as any).__youReadyAt.milestone as number), startedAt);
    await expect(page.getByText("Adding today’s transits.", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();

    expect(profileReadyMs).toBeLessThanOrEqual(budgets.slowNetworkProfileReadyMs);
    expect(milestoneReadyMs).toBeLessThanOrEqual(budgets.slowNetworkMilestoneReadyMs);
    releaseWasm();
    await expect(page.getByText("Adding today’s transits.", { exact: true })).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole("alert", { name: "Chart calculation error" })).toHaveCount(0);
    await expect(page.locator('[aria-label="Transit chart wheel"], [aria-label="Natal chart wheel"]')).toBeVisible();
  });
});

test("uncached You reserves calculation bandwidth before deferred reading packages", async ({ page }) => {
  test.setTimeout(45_000);
  await seedYouPerformanceState(page, false, "2026-09-21T16:00:00.000Z");
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let calculationRequested = false;
  const proseRequests: string[] = [];
  page.on("request", request => {
    if (/\/assets\/fallback-content-(?:empty-house|deferred-core|transit)-[^/]+\.js$/u.test(request.url())) proseRequests.push(request.url());
  });
  await page.route("**/*.wasm", async route => {
    calculationRequested = true;
    await held;
    await route.continue();
  });
  try {
    await page.goto("/#you?tab=chart", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Profile summary")).toBeVisible();
    await expect.poll(() => calculationRequested).toBe(true);
    await expect(page.getByRole("region", { name: "Chart calculation", exact: true })).toBeVisible();
    // Allow the existing post-paint effects to run while the actual calculation
    // transport remains held. No timing budget is inferred from this fixture.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))));
    expect(proseRequests).toEqual([]);
  } finally { release(); }
  await expect(page.getByRole("region", { name: "Chart calculation", exact: true })).toHaveCount(0);
  await expect(page.locator('[aria-label="Bodies in signs and houses"] > *')).toHaveCount(13);
  await expect.poll(() => proseRequests.length).toBeGreaterThan(0);
  await expect(page.getByRole("alert", { name: "Chart calculation error" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Transits", exact: true }).click();
  await expect(page.getByLabel("Daily horoscope summary", { exact: true })).toBeVisible();
  await expect(page.getByLabel("This week's transits", { exact: true })).toBeVisible();
});


test("direct You navigation fetches its page while App is still downloading", async ({ page }) => {
  await seedYouPerformanceState(page);
  let releaseApp: () => void = () => undefined;
  const heldApp = new Promise<void>(resolve => { releaseApp = resolve; });
  await page.route(/\/assets\/App-[^/]+\.js/u, async route => {
    await heldApp;
    await route.continue();
  });
  const profileRequest = page.waitForRequest(/\/assets\/YouPage-[^/]+\.js/u);
  try {
    await page.goto("/#you", { waitUntil: "domcontentloaded" });
    await profileRequest;
  } finally {
    releaseApp();
  }
  await expectYouProfileReady(page);
});
