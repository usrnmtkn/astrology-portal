import { bundledPublications } from "../helpers/bundled-publications";
import { expect, test, type Page } from "@playwright/test";
import {
  expectInteractionLoadsWithin,
  expectRouteLoadsWithin,
  routeReadyTimeoutMs,
  watchBrowserErrors
} from "./qaRuntimeGuards";

const fixtureLocation = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

const fixtureUserId = "visual-regression-user";
const fixedNow = "2026-07-16T16:00:00.000Z";

const screenshotOptions = {
  animations: "disabled" as const,
  fullPage: false,
  maxDiffPixelRatio: 0.015,
  timeout: 15_000
};

async function freezeTime(page: Page) {
  await page.addInitScript(({ fixedNow }) => {
    const RealDate = Date;
    const fixedTime = new RealDate(fixedNow).getTime();

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
  }, { fixedNow });
}

function fixtureSky(signOffset: number) {
  const signs = [
    ["Aries", "♈"], ["Taurus", "♉"], ["Gemini", "♊"], ["Cancer", "♋"],
    ["Leo", "♌"], ["Virgo", "♍"], ["Libra", "♎"], ["Scorpio", "♏"],
    ["Sagittarius", "♐"], ["Capricorn", "♑"], ["Aquarius", "♒"], ["Pisces", "♓"]
  ];
  const planets = [
    ["Sun", "☉", "core self"], ["Moon", "☽", "inner world"], ["Mercury", "☿", "communication"],
    ["Venus", "♀", "values"], ["Mars", "♂", "energy"], ["Jupiter", "♃", "growth"],
    ["Saturn", "♄", "structure"], ["Uranus", "♅", "change"], ["Neptune", "♆", "dreams"], ["Pluto", "♇", "power"]
  ];

  return {
    location: fixtureLocation,
    generatedAt: fixedNow,
    ascendant: signs[(11 + signOffset) % signs.length][0],
    ascendantLongitude: 351 + signOffset * 30,
    midheaven: signs[(8 + signOffset) % signs.length][0],
    midheavenLongitude: 264 + signOffset * 30,
    moonPhase: "Waxing Crescent",
    dominantElement: signOffset % 2 === 0 ? "Fire" : "Water",
    positions: planets.map(([planet, glyph, theme], index) => {
      const [sign, signGlyph] = signs[(index + signOffset) % signs.length];

      return {
        planet,
        glyph,
        sign,
        signGlyph,
        degree: (index * 27 + 6) % 30,
        house: (index % 12) + 1,
        motion: index === 2 || index === 6 ? "retrograde" : "direct",
        theme
      };
    }),
    aspects: [
      { from: "Sun", to: "Moon", type: "trine", orb: 1.2, meaning: "Flowing emotional rhythm." },
      { from: "Venus", to: "Mars", type: "square", orb: 2.1, meaning: "Creative friction." }
    ]
  };
}

async function seedClientState(page: Page, theme: "light" | "dark" = "light") {
  await bundledPublications(page);
  const friendNatalChart = fixtureSky(0);
  await freezeTime(page);
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "text/plain",
      body: "Visual regression tests use local deterministic fallback content."
    });
  });
  await page.route("**/rest/v1/generated_interpretations*", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Visual regression tests use the deterministic local content snapshot." })
    });
  });

  await page.addInitScript(({ fixtureLocation, fixtureUserId, fixedNow, theme, friendNatalChart }) => {
    window.localStorage.clear();
    window.localStorage.setItem("tldrastro:theme", theme);
    window.localStorage.setItem("tldrastro:sunriseOrb", "true");
    window.localStorage.setItem("tldrastro:dyslexiaFont", "false");
    window.localStorage.setItem("tldrastro:portalMode", "friends");
    window.localStorage.setItem("tldrastro:friendsTab", "charts");
    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(fixtureLocation));
    window.localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: fixtureUserId,
      name: "Project Author",
      email: "visual-regression@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: fixtureLocation.label,
      currentLocationData: fixtureLocation,
      charts: [{
        id: "profile-birth-chart",
        name: "Project Author",
        type: "Birth chart",
        birthDate: "1990-01-01",
        birthTime: "12:00 PM",
        birthCity: fixtureLocation.label,
        birthLocation: fixtureLocation
      }]
    }));
    window.localStorage.setItem(`tldrastro:manualCharts:${fixtureUserId}`, JSON.stringify([
      {
        id: "friend-nikki",
        ownerUserId: fixtureUserId,
        chartType: "person",
        displayName: "Nikki",
        firstName: "Nikki",
        relationshipType: "friend",
        birthDate: "1988-04-03",
        birthTime: "9:15 AM",
        birthTimeUnknown: false,
        birthPlace: fixtureLocation.label,
        birthLocation: fixtureLocation,
        natalChart: friendNatalChart,
        notes: null,
        createdAt: fixedNow,
        updatedAt: fixedNow
      }
    ]));
  }, { fixtureLocation, fixtureUserId, fixedNow, theme, friendNatalChart });

  await page.evaluate(() => undefined);
}

async function seedClientFixtureSky(page: Page) {
  await page.addInitScript(({ fixture }) => {
    window.__visualRegressionFixtureSky = () => fixture;
  }, { fixture: fixtureSky(0) });
}

async function holdInitialSkyCalculation(page: Page) {
  // This baseline is intentionally the loading screen. Control its lifecycle
  // instead of racing a real worker against the screenshot's stability window.
  await page.addInitScript(() => {
    const RealWorker = window.Worker;
    const pending: Array<() => void> = [];
    let released = false;
    window.Worker = class extends RealWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (options?.name !== "tldrastro-sky-calculation") return;
        const send = this.postMessage.bind(this);
        this.postMessage = ((message: any, transfer: any) => {
          if (!released && message?.kind === "sky") pending.push(() => send(message, transfer));
          else send(message, transfer);
        }) as Worker["postMessage"];
      }
    };
    (window as any).__releaseVisualSkyLoading = () => {
      released = true;
      pending.splice(0).forEach(send => send());
    };
  });
}

async function seedAdminApi(page: Page) {
  await freezeTime(page);
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        timestamp: fixedNow,
        dependencies: { ephemeris: { ok: true, detail: { version: "visual-regression" } } }
      })
    });
  });
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, timestamp: fixedNow })
    });
  });
  await page.route("**/api/admin/generated-content", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        rows: [
          {
            id: "visual-admin-row",
            content_key: "synastry-ascendant-square-mercury",
            surface: "friends",
            mode: "synastry_aspect",
            status: "REVIEWED",
            event_type: "synastry_aspect",
            headline: "Ascendant square Mercury",
            summary: "Authored relationship copy should resolve before emergency fallback.",
            body: "Their presence and the way they carry themselves press against your thinking and how you talk and decide.",
            block_type: "synastry_aspect",
            lane: "serving",
            review_state: "reviewed",
            updated_at: fixedNow,
            created_at: fixedNow
          }
        ],
        reviewRecords: [],
        total: 1
      })
    });
  });
}

test.describe("visual regression baseline", () => {
  test("client-facing desktop and mobile surfaces match baseline", async ({ page }) => {
    const assertNoBrowserErrors = watchBrowserErrors(page);
    await seedClientFixtureSky(page);
    await seedClientState(page, "light");
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectRouteLoadsWithin(page, "/#sky", "client sky desktop light", async () => {
      await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      await expect(page.getByText("Houses: Whole Sign", { exact: true })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      // The faster first paint contains core positions before the worker adds
      // timing. This baseline includes those details; wait for their rendered
      // values within the existing route budget instead of capturing a stable
      // intermediate frame. Keep the expected image and pixel tolerance intact.
      await expect(page.getByRole("button", { name: "Read more about Sun in Cancer", exact: true }))
        .toContainText("Jun 21 - Jul 22", { timeout: routeReadyTimeoutMs });
      await expect(page.getByRole("link", { name: "Moon trines Lilith", exact: true }))
        .toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect.soft(page).toHaveScreenshot("client-sky-desktop-light.png", screenshotOptions);

    await expectRouteLoadsWithin(page, "/#calendar", "client calendar desktop light", async () => {
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: routeReadyTimeoutMs });
      await expect(page.locator(".calendar-stoic-card").first()).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
    });
    await expect.soft(page).toHaveScreenshot("client-calendar-desktop-light.png", screenshotOptions);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectRouteLoadsWithin(page, "/#friends?tab=charts", "client friends mobile light", async () => {
      await expect(page.getByRole("heading", { name: "friends." })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      await expect(page.getByLabel("Friend charts")).toBeVisible({ timeout: routeReadyTimeoutMs });
      await expect(page.getByText("Nikki")).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect.soft(page).toHaveScreenshot("client-friends-mobile-light.png", screenshotOptions);
    assertNoBrowserErrors();
  });

  test("client-facing dark theme surfaces match baseline", async ({ page }) => {
    const assertNoBrowserErrors = watchBrowserErrors(page);
    await seedClientFixtureSky(page);
    await seedClientState(page, "dark");
    await holdInitialSkyCalculation(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await expectRouteLoadsWithin(page, "/#sky", "client sky desktop dark", async () => {
      await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
    });
    const initialLoading = page.locator(".sky-reading-layout__loading").getByRole("status");
    await expect(initialLoading).toBeVisible();
    await expect(initialLoading).toHaveText("Loading the sky…");
    await expect(page.getByLabel("Daily sky summary")).not.toBeVisible();
    await page.screenshot({ path: test.info().outputPath("sky-single-loading-desktop-dark.png"), animations: "disabled" });
    await expect.soft(page).toHaveScreenshot("client-sky-desktop-dark.png", screenshotOptions);
    await page.evaluate(() => (window as any).__releaseVisualSkyLoading());
    await expect(page.getByRole("button", { name: "Read more about Sun in Cancer", exact: true })).toBeVisible({ timeout: routeReadyTimeoutMs });
    await expect(initialLoading).toHaveCount(0);

    await expectRouteLoadsWithin(page, "/#calendar", "client calendar desktop dark", async () => {
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    for (const selector of [".segmented-control__item--active", ".calendar-sky-card__today", ".lunar-week-day__date.is-new-disc"]) {
      const contrast = await page.locator(selector).first().evaluate(element => {
        const style = getComputedStyle(element);
        const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
          .map(value => value / 255).reduce((sum, value, index) => sum +
            (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index], 0);
        const [low, high] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => a - b);
        return (high + .05) / (low + .05);
      });
      expect(contrast, `${selector} must remain readable in dark mode`).toBeGreaterThanOrEqual(4.5);
    }
    await expect.soft(page).toHaveScreenshot("client-calendar-desktop-dark.png", screenshotOptions);
    assertNoBrowserErrors();
  });

  test("admin dashboard surfaces match baseline", async ({ page }) => {
    const assertNoBrowserErrors = watchBrowserErrors(page);
    await seedAdminApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectRouteLoadsWithin(page, "/admin/content", "admin home mobile", async () => {
      await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      await expect(page.getByRole("link", { name: "Sign in as owner" })).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect.soft(page).toHaveScreenshot("admin-home-mobile.png", screenshotOptions);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectRouteLoadsWithin(page, "/admin/content", "admin home desktop", async () => {
      await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      await expect(page.getByRole("link", { name: "Sign in as owner" })).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect.soft(page).toHaveScreenshot("admin-home-desktop.png", screenshotOptions);

    await expectInteractionLoadsWithin(
      "admin content library desktop",
      async () => {
        await page
          .getByRole("navigation", { name: "Content operations" })
          .getByRole("button", { name: "Content Library" })
          .click();
      },
      async () => {
        await expect(page.locator("h1", { hasText: "Content Library" })).toBeVisible({
          timeout: routeReadyTimeoutMs
        });
      }
    );
    await expect.soft(page).toHaveScreenshot("admin-content-library-desktop.png", screenshotOptions);
    assertNoBrowserErrors();
  });
});

declare global {
  interface Window {
    __visualRegressionFixtureSky?: (offset: number) => ReturnType<typeof fixtureSky>;
  }
}
