import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
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
  delayedCalculationRequests: () => number;
  delayedRelationshipRequests: () => number;
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
  let delayedRelationshipRequests = 0;

  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "text/plain",
      body: "Friends performance QA uses deterministic local calculations."
    });
  });
  await page.route("**/rest/v1/generated_interpretations*", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Friends performance QA uses deterministic fallback content." })
    });
  });

  if (options.slowRelationshipContent) {
    page.on("request", (request) => {
      if (/\/assets\/(?:fallback-content-relationships|astro-knowledge-relationships)[^/]*\.js$/.test(request.url())) {
        delayedRelationshipRequests += 1;
      }
    });
  }

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
      label: "Portsmouth, NH",
      latitude: 43.0718,
      longitude: -70.7626,
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
      ["Neptune", "♆", "dreams"], ["Pluto", "♇", "power"]
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
      name: "Marie Satori",
      email: "qa-friends-performance@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: location.label,
      currentLocationData: location,
      charts: [{
        id: "profile-birth-chart",
        name: "Marie Satori",
        type: "Birth chart",
        birthDate: "1979-02-18",
        birthTime: "8:24 AM",
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
    delayedCalculationRequests: () => delayedCalculationRequests,
    delayedRelationshipRequests: () => delayedRelationshipRequests
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

async function timed(label: string, action: () => Promise<void>): Promise<TimedSample> {
  const startedAt = performance.now();
  await action();
  return { label, elapsedMs: Math.round(performance.now() - startedAt) };
}

function assertSamples(samples: TimedSample[], budgetMs: number) {
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
  expect(maximum, `${samples[0]?.label} maximum should remain within ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
}

test.describe("Friends loading performance matrix", () => {
  test.describe.configure({ mode: "serial" });

  test("repeated cold loads paint cached chart rows within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, {}, async (_context, page) => {
        await preparePage(page);
        return timed("cold Friends list", async () => {
          await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}` })).toBeVisible();
        });
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.coldListReadyMs);
  });

  test("repeated warm-cache opens render chart detail within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, {}, async (_context, page) => {
        await preparePage(page);
        await page.goto(url("/#friends?tab=charts"));
        await page.getByRole("button", { name: `Open ${fixtureFriendName}` }).click();
        await expect(page.locator(".compatibility-card").first()).toBeVisible();
        await page.locator(".friends-back-button").click();
        await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}` })).toBeVisible();

        return timed("warm Friends detail", async () => {
          await page.getByRole("button", { name: `Open ${fixtureFriendName}` }).click();
          await expect(page.locator(".compatibility-card").first()).toBeVisible();
        });
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.warmDetailReadyMs);
  });

  test("repeated direct links restore a ready Synastry view within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, {}, async (_context, page) => {
        await preparePage(page);
        return timed("direct-link Friends Synastry", async () => {
          await page.goto(
            url("/#friends?tab=charts&chart=friend-nikki&view=synastry"),
            { waitUntil: "domcontentloaded" }
          );
          await expect(page.getByRole("region", { name: `${fixtureFriendName} chart profile` })).toBeVisible();
          await expect(page.locator(".friend-aspect-row").first()).toBeVisible();
        });
      }));
    }

    assertSamples(samples, friendsLoadingPerformanceBudgets.directLinkSynastryReadyMs);
  });

  test("repeated mobile navigation paints cached chart rows within budget", async ({ browser }) => {
    const samples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      samples.push(await withContext(browser, { viewport: { width: 390, height: 844 } }, async (_context, page) => {
        await preparePage(page);
        await page.goto(url("/#sky"));
        await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
        await page.getByRole("button", { name: "Open menu" }).click();
        const friendsMenuItem = page.getByRole("menuitem", { name: "Friends" });
        await expect(friendsMenuItem).toBeVisible();

        return timed("mobile Friends navigation", async () => {
          await friendsMenuItem.click();
          await expect(page.getByRole("heading", { name: "friends.", exact: true })).toBeVisible();
          await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}` })).toBeVisible();
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
        const startedAt = performance.now();
        await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
        const chartButton = page.getByRole("button", { name: "Open Casey" });
        await expect(chartButton).toBeVisible();
        await expect(chartButton).toContainText("Moon pending");
        const listElapsedMs = Math.round(performance.now() - startedAt);
        listSamples.push({ label: "incomplete Friends list", elapsedMs: listElapsedMs });

        await expect(chartButton).not.toContainText("pending", {
          timeout: friendsLoadingPerformanceBudgets.incompleteChartRepairReadyMs
        });
        repairSamples.push({
          label: "incomplete Friends repair",
          elapsedMs: Math.round(performance.now() - startedAt)
        });
        expect(prepared.delayedCalculationRequests()).toBeGreaterThan(0);
      });
    }

    assertSamples(listSamples, friendsLoadingPerformanceBudgets.incompleteChartListReadyMs);
    assertSamples(repairSamples, friendsLoadingPerformanceBudgets.incompleteChartRepairReadyMs);
  });

  test("repeated slow relationship loads never block list or detail shell", async ({ browser }) => {
    test.setTimeout(60_000);
    const listSamples: TimedSample[] = [];
    const shellSamples: TimedSample[] = [];
    const relationshipSamples: TimedSample[] = [];

    for (let sample = 0; sample < FRIENDS_LOADING_SAMPLE_COUNT; sample += 1) {
      await withContext(browser, {}, async (context, page) => {
        const prepared = await preparePage(page, { slowRelationshipContent: true });
        listSamples.push(await timed("slow-network Friends list", async () => {
          await page.goto(url("/#friends?tab=charts"), { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}` })).toBeVisible();
        }));
        expect(
          prepared.delayedRelationshipRequests(),
          "The Friends list must not eagerly request relationship payloads."
        ).toBe(0);

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
        relationshipSamples.push({
          label: "slow-network relationship content",
          elapsedMs: Math.round(performance.now() - detailStartedAt)
        });
        expect(prepared.delayedRelationshipRequests()).toBeGreaterThan(0);
      });
    }

    assertSamples(listSamples, friendsLoadingPerformanceBudgets.slowNetworkListReadyMs);
    assertSamples(shellSamples, friendsLoadingPerformanceBudgets.slowNetworkDetailShellReadyMs);
    assertSamples(relationshipSamples, friendsLoadingPerformanceBudgets.slowNetworkRelationshipReadyMs);
  });
});
