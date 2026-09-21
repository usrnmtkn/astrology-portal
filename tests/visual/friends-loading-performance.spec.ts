import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import {
  FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS,
  FRIENDS_LOADING_SAMPLE_COUNT,
  FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND,
  FRIENDS_SLOW_NETWORK_LATENCY_MS,
  friendsLoadingPerformanceBudgets
} from "./friendsLoadingPerformanceBudgets";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const fixtureUserId = "qa-friends-performance-user";
const fixtureFriendName = "Nikki";

type FixtureOptions = {
  incompleteChart?: boolean;
  slowCalculation?: boolean;
  slowRelationshipContent?: boolean;
};

type PreparedPage = {
  dashboardMirrorRequests: () => number;
  delayedCalculationRequests: () => number;
  delayedDeferredFallbackRequests: () => number;
  delayedRelationshipRequests: () => number;
  emptyHouseFallbackRequests: () => number;
  timezoneResolutionRequests: () => number;
};

type TimedSample = {
  label: string;
  elapsedMs: number;
};

function url(path: string) {
  return `${baseUrl}${path}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function preparePage(page: Page, options: FixtureOptions = {}): Promise<PreparedPage> {
  let delayedCalculationRequests = 0;
  let delayedDeferredFallbackRequests = 0;
  let delayedRelationshipRequests = 0;
  let dashboardMirrorRequests = 0;
  let emptyHouseFallbackRequests = 0;
  let timezoneResolutionRequests = 0;

  page.on("request", (request) => {
    const requestUrl = decodeURIComponent(request.url());

    if (
      requestUrl.includes("/rest/v1/generated_interpretations")
      && requestUrl.includes("provider=eq.tldrastro-fallback-architecture-v3")
    ) {
      dashboardMirrorRequests += 1;
    }
    if (/\/assets\/fallback-content-empty-house[^/]*\.js$/.test(requestUrl)) {
      emptyHouseFallbackRequests += 1;
    }
    if (/\/assets\/(?:fallback-content-relationships|fallback-content-shared-placement|astro-knowledge-relationships)[^/]*\.js$/.test(requestUrl)) {
      delayedRelationshipRequests += 1;
    }
    if (/\/assets\/(?:fallback-content-transit|fallback-content-deferred-core)[^/]*\.js$/.test(requestUrl)) {
      delayedDeferredFallbackRequests += 1;
    }
    if (requestUrl.includes("/utils/timezone")) {
      timezoneResolutionRequests += 1;
    }
  });

  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "text/plain",
      body: "Friends performance QA uses deterministic local calculations."
    });
  });
  await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/generated_interpretations*", async (route) => {
    if (options.slowRelationshipContent) {
      await delay(FRIENDS_SLOW_NETWORK_LATENCY_MS);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([])
    });
  });

  if (options.slowCalculation) {
    await page.route(/\/assets\/swisseph-[^/]*\.(?:js|wasm)$/, async (route) => {
      delayedCalculationRequests += 1;
      await delay(FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS);
      await route.continue();
    });
  }

  await page.addInitScript(({ fixtureUserId, fixtureFriendName, incompleteChart }) => {
    if (window.localStorage.getItem("tldrastro:friendsPerformanceSeeded")) {
      return;
    }

    window.localStorage.clear();
    window.localStorage.setItem("tldrastro:friendsPerformanceSeeded", "true");
    window.localStorage.setItem("tldrastro:theme", "light");
    window.localStorage.setItem("tldrastro:sunriseOrb", "true");
    window.localStorage.setItem("tldrastro:dyslexiaFont", "false");
    window.localStorage.setItem("tldrastro:friendsTab", "charts");

    const location = {
      label: "New York, NY",
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: "America/New_York"
    };
    const signs = [
      ["Aries", "♈"], ["Taurus", "♉"], ["Gemini", "♊"], ["Cancer", "♋"],
      ["Leo", "♌"], ["Virgo", "♍"], ["Libra", "♎"], ["Scorpio", "♏"],
      ["Sagittarius", "♐"], ["Capricorn", "♑"], ["Aquarius", "♒"], ["Pisces", "♓"]
    ];
    const planets = [
      ["Sun", "☉", "core self"], ["Moon", "☽", "inner world"],
      ["Mercury", "☿", "communication"], ["Venus", "♀", "values"],
      ["Mars", "♂", "energy"], ["Jupiter", "♃", "growth"],
      ["Saturn", "♄", "structure"], ["Uranus", "♅", "change"],
      ["Neptune", "♆", "dreams"], ["Pluto", "♇", "power"],
      ["Chiron", "⚷", "repair"], ["Lilith", "⚸", "refusal"],
      ["North Node", "☊", "growth edge"], ["South Node", "☋", "familiar pattern"]
    ];
    const fixtureSky = (signOffset: number) => ({
      location,
      generatedAt: "2026-08-08T16:00:00.000Z",
      ascendant: signs[(11 + signOffset) % signs.length][0],
      ascendantLongitude: (330 + signOffset * 30) % 360,
      midheaven: signs[(8 + signOffset) % signs.length][0],
      midheavenLongitude: (240 + signOffset * 30) % 360,
      moonPhase: "Waxing Crescent",
      dominantElement: signOffset % 2 === 0 ? "Fire" : "Water",
      positions: planets.map(([planet, glyph, theme], index) => {
        const [sign, signGlyph] = signs[(index + signOffset) % signs.length];
        const longitude = ((index + signOffset) * 27 + 6) % 360;

        return {
          planet,
          glyph,
          sign,
          signGlyph,
          longitude,
          degree: longitude % 30,
          house: (index % 12) + 1,
          motion: index === 2 || index === 6 ? "retrograde" : "direct",
          theme
        };
      }),
      aspects: [
        { from: "Sun", to: "Moon", type: "trine", orb: 1.2, meaning: "Flowing emotional rhythm." },
        { from: "Venus", to: "Mars", type: "square", orb: 2.1, meaning: "Creative friction." }
      ]
    });
    const profile = {
      id: fixtureUserId,
      name: "Project Author",
      email: "qa-friends-performance@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: location.label,
      currentLocationData: location,
      charts: [{
        id: "profile-birth-chart",
        name: "Project Author",
        type: "Birth chart",
        birthDate: "1990-01-01",
        birthTime: "12:00 PM",
        birthCity: location.label,
        birthLocation: location
      }]
    };
    const friendChart = {
      id: incompleteChart ? "friend-incomplete" : "friend-nikki",
      ownerUserId: fixtureUserId,
      chartType: "person",
      displayName: incompleteChart ? "Casey" : fixtureFriendName,
      firstName: incompleteChart ? "Casey" : fixtureFriendName,
      lastName: null,
      relationshipType: "friend",
      birthDate: "1988-04-03",
      birthTime: "09:15",
      birthTimeUnknown: false,
      birthPlace: location.label,
      birthLocation: location,
      natalChart: incompleteChart ? null : fixtureSky(2),
      notes: null,
      createdAt: "2026-08-08T16:00:00.000Z",
      updatedAt: "2026-08-08T16:00:00.000Z"
    };

    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    window.localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    window.localStorage.setItem(
      `tldrastro:manualCharts:${fixtureUserId}`,
      JSON.stringify([friendChart])
    );
  }, {
    fixtureUserId,
    fixtureFriendName,
    incompleteChart: options.incompleteChart ?? false
  });

  return {
    dashboardMirrorRequests: () => dashboardMirrorRequests,
    delayedCalculationRequests: () => delayedCalculationRequests,
    delayedDeferredFallbackRequests: () => delayedDeferredFallbackRequests,
    delayedRelationshipRequests: () => delayedRelationshipRequests,
    emptyHouseFallbackRequests: () => emptyHouseFallbackRequests,
    timezoneResolutionRequests: () => timezoneResolutionRequests
  };
}

async function withContext<T>(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0],
  run: (context: BrowserContext, page: Page) => Promise<T>
) {
  const context = await browser.newContext(options);
  const page = await context.newPage();

  try {
    return await run(context, page);
  } finally {
    await context.close();
  }
}

// Standard locator assertions back off to 500 ms between observations. That
// latency is useful for functional tests but distorts an 800 ms paint budget.
// Keep the exact visibility/text conditions, sampled without that backoff.
async function waitForMeasuredVisibility(locator: Locator) {
  await expect.poll(() => locator.isVisible(), { intervals: [16] }).toBe(true);
}

async function hasCompletedChartSignatures(locator: Locator) {
  // textContent matches toContainText's default semantics. innerText applies
  // CSS text-transform, turning "pending" into "PENDING" on some layouts.
  const text = await locator.textContent();
  return await locator.isVisible() && Boolean(text?.trim()) && !/pending/i.test(text!);
}

async function timed(label: string, action: () => Promise<void>): Promise<TimedSample> {
  const startedAt = performance.now();
  await action();
  return { label, elapsedMs: Math.round(performance.now() - startedAt) };
}

function assertSamples(samples: TimedSample[], budgetMs: number, maximumBudgetMs = budgetMs * 2) {
  const maximum = Math.max(...samples.map(({ elapsedMs }) => elapsedMs));
  const ordered = [...samples].sort((first, second) => first.elapsedMs - second.elapsedMs);
  const median = ordered[Math.floor(ordered.length / 2)]?.elapsedMs ?? 0;

  console.log(JSON.stringify({
    scenario: samples[0]?.label,
    samplesMs: samples.map(({ elapsedMs }) => elapsedMs),
    medianMs: median,
    maximumMs: maximum,
    budgetMs
  }));
  expect.soft(median, `${samples[0]?.label} median should remain within ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
  expect.soft(maximum, `${samples[0]?.label} maximum should remain within ${maximumBudgetMs}ms`).toBeLessThanOrEqual(maximumBudgetMs);
}

function logSamples(samples: TimedSample[], budgetMs: number | null) {
  const maximum = Math.max(...samples.map(({ elapsedMs }) => elapsedMs));
  const ordered = [...samples].sort((first, second) => first.elapsedMs - second.elapsedMs);
  const median = ordered[Math.floor(ordered.length / 2)]?.elapsedMs ?? 0;

  console.log(JSON.stringify({
    scenario: samples[0]?.label,
    samplesMs: samples.map(({ elapsedMs }) => elapsedMs),
    medianMs: median,
    maximumMs: maximum,
    budgetMs
  }));
}

test.describe("Friends loading performance matrix", () => {
  test("repeated cold loads paint cached chart rows within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, {}, async (_context, page) => {
        const prepared = await preparePage(page);
        const result = await timed("cold Friends list", async () => {
          await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
          await waitForMeasuredVisibility(page.getByRole("button", { name: `Open ${fixtureFriendName}` }));
        });
        await page.waitForTimeout(250);
        await expect(page.locator('.app-loading--illustrated:visible'), 'Cached chart rows stay visible without a loading illustration during refresh.').toHaveCount(0);
        expect(prepared.dashboardMirrorRequests(), "A bare Friends list must not hydrate the complete dashboard mirror.").toBe(0);
        expect(prepared.emptyHouseFallbackRequests(), "A bare Friends list must not download empty-house content.").toBe(0);
        expect(prepared.delayedRelationshipRequests(), "A bare Friends list must not download relationship packages.").toBe(0);
        expect(prepared.delayedDeferredFallbackRequests(), "A bare Friends list must not download Natal/Transit packages.").toBe(0);
        return result;
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.coldListReadyMs);
  });

  test("repeated warm-cache opens render chart detail within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, {}, async (_context, page) => {
        const prepared = await preparePage(page);
        await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
        const chartButton = page.getByRole("button", { name: `Open ${fixtureFriendName}` });
        await chartButton.hover();
        await expect.poll(
          prepared.delayedRelationshipRequests,
          { message: "Chart intent must start the relationship package before selection." }
        ).toBeGreaterThan(0);
        expect(
          prepared.delayedDeferredFallbackRequests(),
          "Compatibility intent must not download the unrelated Natal/Transit package."
        ).toBe(0);
        await chartButton.click();
        await expect(page.locator(".compatibility-card").first()).toBeVisible();
        await page.locator(".friends-back-button").click();
        await waitForMeasuredVisibility(page.getByRole("button", { name: `Open ${fixtureFriendName}` }));

        // Capture the first visible frame, as for direct Synastry links below.
        // A protocol round-trip after rendering should not count as app work.
        await page.evaluate(() => {
          (window as any).__friendsDetailStartedAt = performance.now();
          const observe = () => {
            const card = document.querySelector(".compatibility-card");
            const rect = card?.getBoundingClientRect();
            const visibility = card ? getComputedStyle(card).visibility : "hidden";
            if (rect && rect.width > 0 && rect.height > 0 && visibility !== "hidden" && visibility !== "collapse") {
              (window as any).__friendsDetailElapsed = performance.now() - (window as any).__friendsDetailStartedAt;
              return;
            }
            requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        });
        await page.getByRole("button", { name: `Open ${fixtureFriendName}` }).click();
        await page.waitForFunction(() => Number.isFinite((window as any).__friendsDetailElapsed));
        await expect(page.locator(".compatibility-card").first()).toBeVisible();
        return {
          label: "warm Friends detail",
          elapsedMs: Math.round(await page.evaluate(() => (window as any).__friendsDetailElapsed as number))
        };
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.warmDetailReadyMs);
  });

  test("repeated direct links restore a ready Synastry view within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, {}, async (_context, page) => {
        await preparePage(page);
        // Measure readiness in the page: Playwright's cross-process selector
        // polling can finish hundreds of milliseconds after the row is visible.
        await page.addInitScript((friendName) => {
          const check = () => {
            const row = document.querySelector<HTMLElement>(`section[aria-label="${friendName} chart profile"] .friend-aspect-row`);
            if (row) {
              const rect = row.getBoundingClientRect();
              const visibility = getComputedStyle(row).visibility;
              if (rect.width > 0 && rect.height > 0 && visibility !== "hidden" && visibility !== "collapse") {
                (window as any).__friendsSynastryReadyAt = performance.timeOrigin + performance.now();
                return;
              }
            }
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        }, fixtureFriendName);
        const startedAt = Date.now();
        await page.goto(
          url("/#friends?tab=charts&chart=friend-nikki&view=synastry"),
          { waitUntil: "domcontentloaded" }
        );
        await page.waitForFunction(() => Number.isFinite((window as any).__friendsSynastryReadyAt));
        // Keep the original accessible-region/visible-row release assertion.
        await expect(
          page.getByRole("region", { name: `${fixtureFriendName} chart profile` })
            .locator(".friend-aspect-row").first()
        ).toBeVisible();
        const readyAt = await page.evaluate(() => (window as any).__friendsSynastryReadyAt as number);
        expect(readyAt).toBeGreaterThanOrEqual(startedAt);
        return { label: "direct-link Friends Synastry", elapsedMs: Math.round(readyAt - startedAt) };
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.directLinkSynastryReadyMs);
  });

  test("repeated mobile navigation paints cached chart rows within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, { viewport: { width: 390, height: 844 } }, async (_context, page) => {
        await preparePage(page);
        await page.goto(url("/#sky"), { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
        await page.getByRole("button", { name: "Open menu" }).click();
        const friendsMenuItem = page.getByRole("menuitem", { name: "Friends" });
        await expect(friendsMenuItem).toBeVisible();

        return timed("mobile Friends navigation", async () => {
          await friendsMenuItem.click();
          await waitForMeasuredVisibility(page.getByRole("heading", { name: "friends.", exact: true }));
          await waitForMeasuredVisibility(page.getByRole("button", { name: `Open ${fixtureFriendName}` }));
        });
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.mobileNavigationReadyMs);
  });

  test("repeated incomplete charts paint first and enhance atomically within budget", async ({ browser }) => {
    const listSamples: TimedSample[] = [];
    const repairSamples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      await withContext(browser, {}, async (_context, page) => {
        const prepared = await preparePage(page, { incompleteChart: true, slowCalculation: true });
        // Capture the visible repair in the browser. Selector polling can
        // otherwise add hundreds of milliseconds after the chart is ready.
        await page.addInitScript(() => {
          let sawPending = false;
          const check = () => {
            const button = document.querySelector<HTMLElement>('button[aria-label="Open Casey"]');
            if (button?.textContent?.includes("Moon pending")) sawPending = true;
            if (sawPending && button?.textContent?.trim() && !/pending/i.test(button.textContent)) {
              const rect = button.getBoundingClientRect();
              const visibility = getComputedStyle(button).visibility;
              if (rect.width > 0 && rect.height > 0 && visibility !== "hidden" && visibility !== "collapse") {
                (window as any).__friendsRepairReadyAt = performance.timeOrigin + performance.now();
                return;
              }
            }
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
        const wallStartedAt = Date.now();
        const startedAt = performance.now();
        await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
        const chartButton = page.getByRole("button", { name: "Open Casey" });
        await waitForMeasuredVisibility(chartButton);
        await expect(chartButton).toContainText("Moon pending");
        const listElapsedMs = Math.round(performance.now() - startedAt);
        listSamples.push({ label: "incomplete Friends list", elapsedMs: listElapsedMs });

        await expect.poll(() => hasCompletedChartSignatures(chartButton), {
          intervals: [16],
          timeout: friendsLoadingPerformanceBudgets.incompleteChartRepairReadyMs
        }).toBe(true);
        await page.waitForFunction(() => Number.isFinite((window as any).__friendsRepairReadyAt));
        const repairedAt = await page.evaluate(() => (window as any).__friendsRepairReadyAt as number);
        expect(repairedAt).toBeGreaterThanOrEqual(wallStartedAt);
        repairSamples.push({
          label: "incomplete Friends repair",
          elapsedMs: Math.round(repairedAt - wallStartedAt)
        });
        expect(prepared.delayedCalculationRequests()).toBeGreaterThan(0);
        expect(
          prepared.timezoneResolutionRequests(),
          "A saved chart with a known timezone repairs without a redundant remote lookup."
        ).toBe(0);
      });
    }

    assertSamples(listSamples, friendsLoadingPerformanceBudgets.incompleteChartListReadyMs);
    assertSamples(repairSamples, friendsLoadingPerformanceBudgets.incompleteChartRepairReadyMs);
  });

  test("repeated cold calculations show relationship loading state within budget", async ({ browser }) => {
    test.setTimeout(45_000);
    const loadingSamples: TimedSample[] = [];
    const contentSamples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      await withContext(browser, {}, async (context, page) => {
        await preparePage(page, { slowCalculation: true });
        await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
        await waitForMeasuredVisibility(page.getByRole("button", { name: `Open ${fixtureFriendName}` }));

        const networkSession = await context.newCDPSession(page);
        await networkSession.send("Network.enable");
        await networkSession.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: FRIENDS_SLOW_NETWORK_LATENCY_MS,
          downloadThroughput: FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND,
          uploadThroughput: 100_000,
          connectionType: "cellular3g"
        });
        const startedAt = performance.now();
        const loadingStateReady = page
          .getByRole("status", { name: `${fixtureFriendName} compatibility loading` })
          .waitFor({
            state: "visible",
            timeout: friendsLoadingPerformanceBudgets.slowNetworkRelationshipLoadingReadyMs + 5_000
          })
          .then(() => Math.round(performance.now() - startedAt));

        await page.getByRole("button", { name: `Open ${fixtureFriendName}` }).click();
        loadingSamples.push({
          label: "slow-network relationship loading state",
          elapsedMs: await loadingStateReady
        });
        await expect(page.locator(".compatibility-card").first()).toBeVisible({
          // This is a harness timeout, not a performance threshold. The cold path remains
          // measured but ungated until a threshold is established from its observed
          // 5,224-6,197 ms range (about +/-9%).
          timeout: 15_000
        });
        contentSamples.push({
          label: "slow-network cold relationship content (measured, ungated)",
          elapsedMs: Math.round(performance.now() - startedAt)
        });
      });
    }

    assertSamples(loadingSamples, friendsLoadingPerformanceBudgets.slowNetworkRelationshipLoadingReadyMs);
    logSamples(contentSamples, null);
  });

  test("repeated slow relationship loads never block list or detail shell", async ({ browser }) => {
    test.setTimeout(60_000);
    const listSamples: TimedSample[] = [];
    const shellSamples: TimedSample[] = [];
    const relationshipSamples: TimedSample[] = [];
    const relationshipEnhancedSamples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      await withContext(browser, {}, async (context, page) => {
        const prepared = await preparePage(page, { slowRelationshipContent: true });
        listSamples.push(await timed("slow-network Friends list", async () => {
          await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
          await waitForMeasuredVisibility(page.getByRole("button", { name: `Open ${fixtureFriendName}` }));
        }));
        expect(
          prepared.delayedRelationshipRequests(),
          "The Friends list must not eagerly request relationship payloads."
        ).toBe(0);
        await expect.poll(
          () => page.evaluate(() => (
            Object.keys(window.localStorage).some((key) => (
              key.startsWith("tldrastro:verifiedSky:v2:natal-")
            ))
          )),
          {
            message: "The normal relationship-content timer must start after natal calculation is ready.",
            timeout: 15_000
          }
        ).toBe(true);

        const networkSession = await context.newCDPSession(page);
        await networkSession.send("Network.enable");
        await networkSession.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: FRIENDS_SLOW_NETWORK_LATENCY_MS,
          downloadThroughput: FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND,
          uploadThroughput: 100_000,
          connectionType: "cellular3g"
        });
        const detailStartedAt = performance.now();
        await page.getByRole("button", { name: `Open ${fixtureFriendName}` }).click();
        await expect(page.getByRole("region", { name: `${fixtureFriendName} chart profile` })).toBeVisible();
        shellSamples.push({
          label: "slow-network Friends detail shell",
          elapsedMs: Math.round(performance.now() - detailStartedAt)
        });
        await expect(page.locator(".compatibility-card").first()).toBeVisible({
          timeout: friendsLoadingPerformanceBudgets.slowNetworkRelationshipReadyMs + 5_000
        });
        const relationshipReadyAt = performance.now();
        relationshipSamples.push({
          label: "slow-network relationship content",
          elapsedMs: Math.round(performance.now() - detailStartedAt)
        });
        expect(prepared.delayedRelationshipRequests()).toBeGreaterThan(0);
        expect(
          prepared.delayedDeferredFallbackRequests(),
          "Compatibility must not download the unrelated Natal/Transit fallback package."
        ).toBe(0);
        await expect(page.locator(".compatibility-card")).toHaveCount(7, {
          timeout: friendsLoadingPerformanceBudgets.slowNetworkRelationshipEnhancedMs + 5_000
        });
        await expect(
          page.locator(".compatibility-dynamic-row .aspect-row-copy p").first()
        ).toHaveText(/\S/u, {
          timeout: friendsLoadingPerformanceBudgets.slowNetworkRelationshipEnhancedMs + 5_000
        });
        relationshipEnhancedSamples.push({
          label: "slow-network full relationship enhancement",
          elapsedMs: Math.round(performance.now() - relationshipReadyAt)
        });
      });
    }

    assertSamples(listSamples, friendsLoadingPerformanceBudgets.slowNetworkListReadyMs);
    assertSamples(shellSamples, friendsLoadingPerformanceBudgets.slowNetworkDetailShellReadyMs);
    assertSamples(relationshipSamples, friendsLoadingPerformanceBudgets.slowNetworkRelationshipReadyMs);
    assertSamples(relationshipEnhancedSamples, friendsLoadingPerformanceBudgets.slowNetworkRelationshipEnhancedMs);
  });
});

test("chart repair readiness retains pending state under uppercase styling", async ({ page }) => {
  await page.setContent('<button style="text-transform: uppercase">Casey Moon pending</button>');
  const chart = page.getByRole("button");
  expect(await chart.innerText()).toContain("PENDING");
  expect(await hasCompletedChartSignatures(chart)).toBe(false);
  await chart.evaluate(element => { element.textContent = "Casey Moon in Virgo"; });
  expect(await hasCompletedChartSignatures(chart)).toBe(true);
});


test("direct Friends navigation fetches the list shell while App is still downloading", async ({ page }) => {
  await preparePage(page);
  let releaseApp!: () => void;
  const appGate = new Promise<void>(resolve => { releaseApp = resolve; });
  await page.route("**/assets/App-*.js", async route => {
    await appGate;
    await route.continue();
  });
  const manualRequest = page.waitForRequest(/\/assets\/ManualChartsPanel-[^/]+\.js/u);
  const shellRequest = page.waitForRequest(/\/assets\/FriendsWorkspaceShell-[^/]+\.js/u);
  try {
    await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
    await Promise.all([manualRequest, shellRequest]);
  } finally {
    releaseApp();
  }
  await waitForMeasuredVisibility(page.getByRole("button", { name: `Open ${fixtureFriendName}` }));
});


test("performance readiness sampling does not add a long assertion backoff", async ({ page }) => {
  await page.setContent('<button style="display:none">Ready</button>');
  await page.evaluate(() => {
    setTimeout(() => {
      document.querySelector("button")!.style.display = "block";
      (window as any).__readyAt = performance.now();
    }, 350);
  });
  await waitForMeasuredVisibility(page.getByRole("button", { name: "Ready", exact: true }));
  const observationLag = await page.evaluate(() => performance.now() - (window as any).__readyAt);
  expect(observationLag, "Readiness measurements must observe paint promptly, not wait through a 500 ms backoff.").toBeLessThan(150);
});
