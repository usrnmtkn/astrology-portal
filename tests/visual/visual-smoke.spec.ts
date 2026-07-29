import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const screenshotDir = path.join("test-results", "visual-smoke");

async function preparePage(page: Page, theme: "light" | "dark" = "light", seedFriends = false) {
  await page.addInitScript(({ selectedTheme, shouldSeedFriends }) => {
    window.localStorage.setItem("tldrastro:theme", selectedTheme);
    window.localStorage.setItem("tldrastro:sunriseOrb", "true");
    window.localStorage.setItem("tldrastro:dyslexiaFont", "false");

    if (shouldSeedFriends) {
      const fixtureLocation = {
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
        ["Sun", "☉", "core self"], ["Moon", "☽", "inner world"], ["Mercury", "☿", "communication"],
        ["Venus", "♀", "values"], ["Mars", "♂", "energy"], ["Jupiter", "♃", "growth"],
        ["Saturn", "♄", "structure"], ["Uranus", "♅", "change"], ["Neptune", "♆", "dreams"], ["Pluto", "♇", "power"]
      ];
      const fixtureSky = (signOffset) => {
        const positions = planets.map(([planet, glyph, theme], index) => {
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
        });

        return {
          location: fixtureLocation,
          generatedAt: "2026-06-16T16:00:00.000Z",
          ascendant: signs[(11 + signOffset) % signs.length][0],
          ascendantLongitude: 351 + signOffset * 30,
          midheaven: signs[(8 + signOffset) % signs.length][0],
          midheavenLongitude: 264 + signOffset * 30,
          moonPhase: "Waxing Crescent",
          dominantElement: signOffset % 2 === 0 ? "Fire" : "Water",
          positions,
          aspects: [
            { from: "Sun", to: "Moon", type: "trine", orb: 1.2, meaning: "Flowing emotional rhythm." },
            { from: "Venus", to: "Mars", type: "square", orb: 2.1, meaning: "Creative friction." }
          ]
        };
      };
      const fixtureUserId = "visual-smoke-user";
      const now = "2026-06-16T16:00:00.000Z";

      window.localStorage.setItem("tldrastro:portalMode", "friends");
      window.localStorage.setItem("tldrastro:friendsTab", "charts");
      window.localStorage.setItem("tldrastro:userProfile", JSON.stringify({
        id: fixtureUserId,
        name: "Marie Satori",
        email: "visual-smoke@example.com",
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
          lastName: null,
          relationshipType: "friend",
          birthDate: "1988-04-03",
          birthTime: "9:15 AM",
          birthTimeUnknown: false,
          birthPlace: fixtureLocation.label,
          birthLocation: fixtureLocation,
          natalChart: fixtureSky(0),
          notes: null,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "friend-river",
          ownerUserId: fixtureUserId,
          chartType: "person",
          displayName: "River",
          firstName: "River",
          lastName: null,
          relationshipType: "friend",
          birthDate: "1986-07-14",
          birthTime: "2:40 PM",
          birthTimeUnknown: false,
          birthPlace: fixtureLocation.label,
          birthLocation: fixtureLocation,
          natalChart: fixtureSky(3),
          notes: null,
          createdAt: now,
          updatedAt: now
        }
      ]));
      window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(fixtureLocation));
    }
  }, { selectedTheme: theme, shouldSeedFriends: seedFriends });

  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((selectedTheme) => {
    window.localStorage.setItem("tldrastro:theme", selectedTheme);
  }, theme);
}

async function capture(page: Page, name: string) {
  await mkdir(screenshotDir, { recursive: true });
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(screenshotDir, `${name}.png`)
  });
}

test.describe("visual smoke screens", () => {
  test("captures sky", async ({ page }) => {
    await preparePage(page);
    await page.goto("/#sky");
    await expect(page.getByText("The sky today.")).toBeVisible();
    await capture(page, "sky-light");
  });

  test("captures you", async ({ page }) => {
    await preparePage(page);
    await page.goto("/#you");
    await capture(page, "you-light");
  });

  test("captures friends list", async ({ page }) => {
    await preparePage(page, "light", true);
    await page.goto("/#friends?tab=charts");
    await expect(page.getByText("friends.")).toBeVisible();
    await expect(page.getByText("Nikki")).toBeVisible();
    await capture(page, "friends-list-light");
  });

  test("captures friends chart detail tabs when a chart exists", async ({ page }) => {
    await preparePage(page, "light", true);
    await page.goto("/#friends?tab=charts");

    const firstChart = page.locator(".manual-chart-select").first();
    await firstChart.waitFor({ state: "visible", timeout: 10_000 });

    await firstChart.click();
    await expect(page.getByRole("tab", { name: "Natal" })).toBeVisible();
    await capture(page, "friends-natal-light");

    await page.getByRole("button", { name: /More, \d+ sections/ }).click();
    const synastryTab = page.getByRole("menuitemradio", { name: /^Synastry/ });
    await synastryTab.click();
    await expect(page.getByText("What synastry shows")).toBeVisible();
    await capture(page, "friends-synastry-light");

    await page.getByRole("button", { name: /More, \d+ sections/ }).click();
    const compositeTab = page.getByRole("menuitemradio", { name: /^Composite/ });
    await compositeTab.click();
    await expect(page.getByText("What a composite chart is")).toBeVisible();
    await capture(page, "friends-composite-light");
  });

  test("captures settings in light and dark", async ({ page }) => {
    await preparePage(page, "light");
    await page.goto("/#settings");
    await expect(page.getByText("settings.")).toBeVisible();
    await capture(page, "settings-light");

    await setTheme(page, "dark");
    await page.goto("/#settings");
    await expect(page.getByText("settings.")).toBeVisible();
    await capture(page, "settings-dark");
  });
});
