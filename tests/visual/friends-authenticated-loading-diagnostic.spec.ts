import { expect, test, type Page } from "@playwright/test";
import {
  FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS,
  FRIENDS_SLOW_NETWORK_LATENCY_MS
} from "./friendsLoadingPerformanceBudgets";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const fixtureUserId = "qa-friends-performance-user";
const fixtureFriendName = "Nikki";

test.skip(process.env.VITE_SUPABASE_URL !== "https://friends-qa.supabase.co", "Requires the isolated fake-auth build documented in the QA report.");

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

// Diagnostic evidence: all auth/database traffic is mocked; no live user data is used.
async function prepareAuthenticatedPage(page: Page, options: { migrationDelayMs?: number; circleDelayMs?: number }) {
  await preparePage(page);
  let manualRequests = 0;
  let savedChart: Record<string, any> | undefined;
  let circleRequests = 0;
  const user = { id: fixtureUserId, email: "qa-friends-performance@example.com", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: { name: "Project Author" }, created_at: "2026-08-08T16:00:00Z" };
  await page.addInitScript(({ user }) => {
    localStorage.setItem("sb-friends-qa-auth-token", JSON.stringify({ access_token: "qa-access-token", refresh_token: "qa-refresh-token", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
  }, { user });
  await page.route("https://friends-qa.supabase.co/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/auth/v1/user") return route.fulfill({ json: user });
    if (path === "/rest/v1/user_profiles") {
      const profile = await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!));
      return route.fulfill({ json: { data: { version: 1, profile } } });
    }
    if (path === "/rest/v1/manual_charts") {
      manualRequests++;
      savedChart ??= await page.evaluate(id => JSON.parse(localStorage.getItem(`tldrastro:manualCharts:${id}`) || "[]")[0], fixtureUserId);
      const chart = savedChart;
      await delay(options.migrationDelayMs ?? 0);
      return route.fulfill({ json: chart ? [{ id: chart.id, owner_user_id: fixtureUserId, chart_type: chart.chartType, display_name: chart.displayName, first_name: chart.firstName, relationship_type: chart.relationshipType, birth_date: chart.birthDate, birth_time: chart.birthTime, birth_time_unknown: false, birth_place: chart.birthPlace, birth_location: chart.birthLocation, natal_chart: chart.natalChart, created_at: chart.createdAt, updated_at: chart.updatedAt }] : [] });
    }
    if (path === "/rest/v1/social_profiles") return route.fulfill({ json: { user_id: fixtureUserId, display_name: "Project Author", handle: "qa-marie", discoverable: true } });
    if (path === "/rest/v1/rpc/list_social_friends") {
      circleRequests++;
      await delay(options.circleDelayMs ?? 0);
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ json: [] });
  });
  return { manualRequests: () => manualRequests, circleRequests: () => circleRequests };
}

test("authenticated cached charts render while migration is pending", async ({ page }) => {
  const prepared = await prepareAuthenticatedPage(page, { migrationDelayMs: 4000 });
  const started = performance.now();
  await page.goto(url("/#friends?tab=charts"));
  await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}`, exact: true })).toBeVisible({ timeout: 1500 });
  const readyMs = Math.round(performance.now() - started);
  expect(readyMs).toBeLessThan(1500);
  await expect.poll(prepared.manualRequests).toBeGreaterThan(0);
  expect(prepared.manualRequests()).toBe(1);
  await page.screenshot({ path: "outputs/friends-performance-qa/authenticated-charts-fixed.png" });
  await page.waitForTimeout(4500);
  await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}`, exact: true })).toBeVisible();
  console.log(JSON.stringify({ scenario: "authenticated cached chart, 4000ms manual-chart reads", readyMs, manualRequests: prepared.manualRequests() }));
});

test("pending Circle request permits Charts navigation", async ({ page }) => {
  const prepared = await prepareAuthenticatedPage(page, { circleDelayMs: 5000 });
  await page.goto(url("/#friends?tab=circle"));
  await expect.poll(prepared.circleRequests).toBeGreaterThan(0);
  const started = performance.now();
  await page.getByRole("tab", { name: /^Charts/ }).click();
  await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}`, exact: true })).toBeVisible({ timeout: 1500 });
  expect(performance.now() - started).toBeLessThan(1500);
  await page.screenshot({ path: "outputs/friends-performance-qa/circle-navigation-fixed.png" });
});

test("stalled Circle request reaches retry and recovers", async ({ page }) => {
  const options = { circleDelayMs: 14000 };
  await prepareAuthenticatedPage(page, options);
  await page.goto(url("/#friends?tab=circle"));
  await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible({ timeout: 12000 });
  options.circleDelayMs = 0;
  await page.getByRole("button", { name: /Try again/i }).click();
  await expect(page.getByRole("button", { name: /Try again/i })).not.toBeVisible();
  await expect(page.getByRole("tab", { name: /^Charts/ })).toBeEnabled();
});


test("sign out during migration cannot restore Friends", async ({ page }) => {
  await prepareAuthenticatedPage(page, { migrationDelayMs: 3000 });
  await page.goto(url("/#friends?tab=charts"));
  await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}`, exact: true })).not.toBeVisible();
  await page.waitForTimeout(3500);
  await expect(page.getByRole("button", { name: `Open ${fixtureFriendName}`, exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Friends", exact: true })).not.toBeVisible();
});
