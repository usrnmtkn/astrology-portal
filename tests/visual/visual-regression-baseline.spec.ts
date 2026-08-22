import { expect, test, type Page } from "@playwright/test";
import {
  expectInteractionLoadsWithin,
  expectRouteLoadsWithin,
  routeReadyTimeoutMs,
  watchBrowserErrors
} from "./qaRuntimeGuards";

const fixtureLocation = {
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
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

const adminHomeScreenshotOptions = {
  ...screenshotOptions,
  // Chromium's bundled UI font wraps this dense admin shell differently on macOS and Linux.
  // Keep the redesigned landing-page comparison strict enough to catch structural regressions.
  maxDiffPixelRatio: 0.05
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
      name: "Marie Satori",
      email: "visual-regression@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: fixtureLocation.label,
      currentLocationData: fixtureLocation,
      charts: [{
        id: "profile-birth-chart",
        name: "Marie Satori",
        type: "Birth chart",
        birthDate: "1979-02-18",
        birthTime: "8:24 AM",
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
    });
    await expect(page).toHaveScreenshot("client-sky-desktop-light.png", screenshotOptions);

    await expectRouteLoadsWithin(page, "/#calendar", "client calendar desktop light", async () => {
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect(page).toHaveScreenshot("client-calendar-desktop-light.png", screenshotOptions);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectRouteLoadsWithin(page, "/#friends?tab=charts", "client friends mobile light", async () => {
      await expect(page.getByRole("heading", { name: "friends." })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      await expect(page.getByLabel("Friend charts")).toBeVisible({ timeout: routeReadyTimeoutMs });
      await expect(page.getByText("Nikki")).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect(page).toHaveScreenshot("client-friends-mobile-light.png", screenshotOptions);
    assertNoBrowserErrors();
  });

  test("client-facing dark theme surfaces match baseline", async ({ page }) => {
    const assertNoBrowserErrors = watchBrowserErrors(page);
    await seedClientFixtureSky(page);
    await seedClientState(page, "dark");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await expectRouteLoadsWithin(page, "/#sky", "client sky desktop dark", async () => {
      await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
    });
    await expect(page).toHaveScreenshot("client-sky-desktop-dark.png", screenshotOptions);

    await expectRouteLoadsWithin(page, "/#calendar", "client calendar desktop dark", async () => {
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: routeReadyTimeoutMs });
    });
    await expect(page).toHaveScreenshot("client-calendar-desktop-dark.png", screenshotOptions);
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
    });
    await expect(page).toHaveScreenshot("admin-home-mobile.png", adminHomeScreenshotOptions);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectRouteLoadsWithin(page, "/admin/content", "admin home desktop", async () => {
      await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
    });
    await expect(page).toHaveScreenshot("admin-home-desktop.png", adminHomeScreenshotOptions);

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
    await expect(page).toHaveScreenshot("admin-content-library-desktop.png", screenshotOptions);
    assertNoBrowserErrors();
  });
});

declare global {
  interface Window {
    __visualRegressionFixtureSky?: (offset: number) => ReturnType<typeof fixtureSky>;
  }
}
