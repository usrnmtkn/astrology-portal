import { readerResponse } from '../helpers/reader-response';
import { expect, test, type Locator, type Page } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { observeArticleTransitions, expectAnimatedArticleNavigation } from "./qaArticleTransitions";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  expectRouteLoadsWithin,
  routeReadyTimeoutMs,
  watchBrowserErrors
} from "./qaRuntimeGuards";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { resolveSkyAspectGeneratedContent } from "../../apps/web/src/services/skyAspectContent";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones";
import {
  natalSkySnapshotCacheKey,
  VERIFIED_SKY_CACHE_SCHEMA
} from "../../apps/web/src/services/verifiedSkyCache";

async function expectHousePillsInArticle(page: Page) {
  const pills = page.locator(".article-id .article-pills");
  await expect(pills.locator(".planet-placement-row__duration")).toHaveText(/^(?:TODAY|\d+D|\d+M|\d+Y(?: \d+M)?)(?:\s+left)?$/);
  await expect(pills.locator(".house-transit-term-tag")).toHaveText(/^(?:Short-term|Long-term)$/);
  await expect(pills.locator(".house-transit-term-tag")).toHaveCSS("border-top-width", "0px");
  const keywords = pills.locator(".ui-pill--muted");
  await expect(keywords.first()).toBeVisible();
  expect(await keywords.count()).toBeGreaterThan(1);
  for (const keyword of await keywords.allTextContents()) expect(keyword).not.toContain(",");
  const date = await page.locator(".article-id .article-duration").first().boundingBox();
  expect((await pills.boundingBox())!.y).toBeGreaterThanOrEqual(date!.y + date!.height);
}

type SeedOptions = {
  pageAnimations?: "on" | "off";
  synastryFixture?: { body: string; aspect: string; inverse: boolean };
  profile?: boolean;
  profileBirthDate?: string;
  profileBirthTime?: string;
  preloadProfileNatalSky?: boolean;
  friends?: boolean;
  theme?: "light" | "dark";
  now?: string;
  aspectPatterns?: Record<string, unknown>;
  generatedInterpretations?: Array<Record<string, unknown>>;
  contentPublications?: Array<Record<string, unknown>>;
  cachedDashboardOverlay?: Record<string, unknown>;
};

const fixtureLocation = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

const fixtureUserId = "qa-flow-user";
const fixedNow = "2026-07-16T16:00:00.000Z";
const themeScreenshotDir = path.join("test-results", "client-facing-theme-flow");
const responsiveScreenshotDir = path.join("test-results", "client-facing-responsive-flow");
const fallbackSourceRowsV3 = JSON.parse(readFileSync(
  path.resolve("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"),
  "utf8"
)) as {
  hookRows: Array<{ contentKey: string; body?: string; body_you?: string; body_they?: string }>;
};
const skyAspectPhrasebook = JSON.parse(readFileSync(
  path.resolve("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json"),
  "utf8"
)) as {
  hookRows: Array<{ contentKey: string; body_you?: string }>;
};
const mercuryAscendantHardSource = fallbackSourceRowsV3.hookRows.find(
  (row) => row.contentKey === "fallback-hook/synastry-pair/mercury/ascendant/hard"
);
const mercuryAscendantHardOpening = String(mercuryAscendantHardSource?.body_you ?? "")
  .split(". ")[0]
  .replaceAll("{{holder1PossCap}}", "Your")
  .replaceAll("{{holder2Poss}}", "Alisa's")
  .replaceAll("{{holder2}}", "Alisa")
  .concat(".");
const ascendantMercuryHardOpening = String(mercuryAscendantHardSource?.body_they ?? "")
  .split(". ")[0]
  .replaceAll("{{holder1PossCap}}", "Alisa's")
  .replaceAll("{{holder1Poss}}", "Alisa's")
  .replaceAll("{{holder1}}", "Alisa")
  .concat(".");
const chironAries12ApprovedSource = fallbackSourceRowsV3.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/aries/12"
);
const chironAries12ApprovedBody = String(chironAries12ApprovedSource?.body ?? "");
const chironAries12ApprovedOpening = chironAries12ApprovedBody.split(". ")[0].concat(".");
const chironAries12ApprovedFinalSentence = chironAries12ApprovedBody
  .trim()
  .split(/(?<=[.!?])\s+/)
  .at(-1) ?? "";

async function selectFriendDetailTab(
  page: Page,
  name: "Compatibility" | "Transits" | "Natal" | "Synastry" | "Composite"
) {
  if (name === "Synastry" || name === "Composite") {
    const option = page.getByRole("menuitemradio", { name: new RegExp(`^${name}`) });
    const moreButton = page.getByRole("button", { name: /More, \d+ sections/ });

    await expect(async () => {
      if (!await option.isVisible().catch(() => false)) {
        await moreButton.click();
      }

      await option.click({ timeout: 2_000 });
    }).toPass({ timeout: 10_000 });
    return;
  }

  await page.getByRole("tab", { name, exact: true }).click();
}

async function selectYouNatalTab(page: Page) {
  const natalTab = page.getByRole("tab", { name: "Natal Chart" });

  await natalTab.click();
  await expect(natalTab).toHaveAttribute("aria-selected", "true");
}

async function seedClientState(page: Page, options: SeedOptions = {}) {
  await bundledPublications(page);
  const requestedNow = options.now ?? fixedNow;
  const profileBirthDate = options.profileBirthDate ?? "1990-01-01";
  const profileBirthDateTime = zonedDateTimeToUtc(
    profileBirthDate,
    options.profileBirthTime ?? "12:00 PM",
    fixtureLocation.timeZone
  );
  const shouldPreloadNatalSky = options.profile && options.preloadProfileNatalSky;
  const preloadedNatalSnapshot = shouldPreloadNatalSky
    ? await getAstrodienstSky(fixtureLocation, profileBirthDateTime)
    : null;
  const preloadedNatalCache = preloadedNatalSnapshot
    ? {
        schema: VERIFIED_SKY_CACHE_SCHEMA,
        cacheKey: natalSkySnapshotCacheKey(fixtureLocation, profileBirthDateTime),
        snapshot: preloadedNatalSnapshot,
        verifiedAt: requestedNow
      }
    : null;

  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "text/plain",
      body: "QA flow tests use local fallback content instead of the deployed API."
    });
  });
  await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: options.contentPublications ?? [] }));
  await page.route('**/api/content-reader', async (route) => {
    if (options.generatedInterpretations) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(readerResponse(options.generatedInterpretations))
      });
      return;
    }

    // A bundled-source fixture means a successful empty remote result. Reserve
    // outages (and the client's retry/backoff) for explicit offline/cache cases.
    if (!options.cachedDashboardOverlay) {
      await route.fulfill({ json: readerResponse([]) });
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "QA flow tests use the deterministic local content snapshot." })
    });
  });

  await page.addInitScript(({ fixtureLocation, fixtureUserId, fixedNow, options, preloadedNatalCache }) => {
    const RealDate = Date;
    const storedQaNow = window.sessionStorage.getItem("tldrastro:qaNow");
    let fixedTime = new RealDate(storedQaNow ?? fixedNow).getTime();

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
    (window as any).__tldrSetQaNow = (nextNow: string) => {
      fixedTime = new RealDate(nextNow).getTime();
      window.sessionStorage.setItem("tldrastro:qaNow", nextNow);
    };

    const shouldSeedClientState = !window.localStorage.getItem("tldrastro:qaFlowSeeded");

    if (shouldSeedClientState) {
      window.localStorage.clear();
      if (options.cachedDashboardOverlay) {
        window.localStorage.setItem("tldrastro:fallbackArchitectureV3:dashboardBundle", JSON.stringify(options.cachedDashboardOverlay));
        window.localStorage.setItem("tldrastro:fallbackArchitectureV3:dashboardBundleVersion", String(options.cachedDashboardOverlay.dashboardVersion));
      }
      window.localStorage.setItem("tldrastro:qaFlowSeeded", "true");
      if (options.contentPublications) window.localStorage.setItem("tldrastro:content-publications:v1", JSON.stringify(options.contentPublications));
      window.localStorage.setItem("tldrastro:theme", options.theme ?? "light");
      window.localStorage.setItem("tldrastro:sunriseOrb", "true");
      window.localStorage.setItem("tldrastro:dyslexiaFont", "false");
      // Layout checks opt out explicitly; the app default can override reduced motion.
      window.localStorage.setItem("tldrastro:pageAnimations", options.pageAnimations ?? "off");
      window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(fixtureLocation));
      if (preloadedNatalCache) {
        window.localStorage.setItem(preloadedNatalCache.cacheKey, JSON.stringify(preloadedNatalCache));
      }
    }

    if (!options.profile || !shouldSeedClientState) {
      return;
    }

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
    const fixtureSky = (signOffset: number) => {
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
        aspectPatterns: options.aspectPatterns,
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
    const now = "2026-06-16T16:00:00.000Z";
    const profile = {
      id: fixtureUserId,
      name: "Project Author",
      email: "qa-flow@example.com",
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
        birthDate: options.profileBirthDate ?? "1990-01-01",
        birthTime: options.profileBirthTime ?? "12:00 PM",
        birthCity: fixtureLocation.label,
        birthLocation: fixtureLocation
      }]
    };

    if (!window.localStorage.getItem("tldrastro:userProfile")) {
      window.localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    }

    if (options.friends && !window.localStorage.getItem(`tldrastro:manualCharts:${fixtureUserId}`)) {
      const authoredSynastrySky = {
        ...fixtureSky(2),
        ascendant: "Gemini",
        ascendantLongitude: 66.833333,
        midheaven: "Aquarius",
        midheavenLongitude: 306.833333
      };

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
        },
        {
          id: "friend-alisa-authored-synastry",
          ownerUserId: fixtureUserId,
          chartType: "person",
          displayName: "Alisa",
          firstName: "Alisa",
          lastName: null,
          relationshipType: "friend",
          birthDate: "1990-02-02",
          birthTime: "6:50 AM",
          birthTimeUnknown: false,
          birthPlace: fixtureLocation.label,
          birthLocation: fixtureLocation,
          natalChart: authoredSynastrySky,
          notes: null,
          createdAt: now,
          updatedAt: now
        }
      ]));
    }
  }, {
    fixtureLocation,
    fixtureUserId,
    fixedNow: requestedNow,
    options,
    preloadedNatalCache
  });

  if (options.synastryFixture && preloadedNatalSnapshot) {
    await page.addInitScript(({ sky, fixture, fixtureLocation, fixtureUserId }) => {
      const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
      const normalize = (v: number) => (v % 360 + 360) % 360;
      const pointLongitude = (name: string) => name === "Ascendant" ? sky.ascendantLongitude!
        : name === "Descendant" ? normalize(sky.ascendantLongitude! + 180)
        : name === "Midheaven" ? sky.midheavenLongitude!
        : name === "Imum Coeli" ? normalize(sky.midheavenLongitude! + 180)
        : sky.positions.find(p => p.planet === name)!.longitude!;
      const degrees = ({ conjunction: 0, square: 90, opposition: 180, trine: 120, sextile: 60 } as Record<string, number>)[fixture.aspect];
      const targetName = fixture.inverse ? "Sun" : fixture.body;
      const longitude = normalize(pointLongitude(fixture.inverse ? fixture.body : "Sun") + degrees);
      const friendSky = structuredClone(sky);
      // Avoid filling the 16-card ranking cap with same-chart conjunctions.
      const fixtureOffset = fixture.body === "Imum Coeli" && fixture.aspect === "sextile" ? 47 : 17;
      for (const position of friendSky.positions) {
        position.longitude = normalize(position.longitude! + fixtureOffset);
        position.degree = position.longitude % 30;
        position.sign = signs[Math.floor(position.longitude / 30)];
      }
      friendSky.ascendantLongitude = normalize(friendSky.ascendantLongitude! + fixtureOffset);
      friendSky.midheavenLongitude = normalize(friendSky.midheavenLongitude! + fixtureOffset);
      if (["Ascendant", "Descendant"].includes(targetName)) {
        friendSky.ascendantLongitude = normalize(longitude - (targetName === "Descendant" ? 180 : 0));
        friendSky.ascendant = signs[Math.floor(friendSky.ascendantLongitude / 30)];
      } else if (["Midheaven", "Imum Coeli"].includes(targetName)) {
        friendSky.midheavenLongitude = normalize(longitude - (targetName === "Imum Coeli" ? 180 : 0));
        friendSky.midheaven = signs[Math.floor(friendSky.midheavenLongitude / 30)];
      } else {
        const position = friendSky.positions.find(p => p.planet === targetName)!;
        position.longitude = longitude;
        position.degree = longitude % 30;
        position.sign = signs[Math.floor(longitude / 30)];
      }
      // Deliberate test-only chart facts exercise the real Friends calculation,
      // selection, card and detail path. They never enter production sources.
      window.localStorage.setItem(`tldrastro:manualCharts:${fixtureUserId}`, JSON.stringify([{
        id: "friend-batch4", ownerUserId: fixtureUserId, chartType: "person", displayName: "Sofia", firstName: "Sofia", lastName: null,
        relationshipType: "partner", birthDate: "1990-01-01", birthTime: "12:00 PM", birthTimeUnknown: false,
        birthPlace: fixtureLocation.label, birthLocation: fixtureLocation, natalChart: friendSky, notes: null,
        createdAt: "2026-07-16T16:00:00.000Z", updatedAt: "2026-07-16T16:00:00.000Z"
      }]));
    }, { sky: preloadedNatalSnapshot, fixture: options.synastryFixture, fixtureLocation, fixtureUserId });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
}

const fixtureAuthUser = {
  id: fixtureUserId,
  email: "qa-flow@example.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { name: "Project Author" }
};

function supabaseAuthStorageKey() {
  return `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
}

async function seedSignedInSession(page: Page, { storeSession = true, expiresIn = 3600 } = {}) {
  const user = fixtureAuthUser;
  const storageKey = supabaseAuthStorageKey();
  // Authenticated app chrome subscribes to social updates. Keep that transport
  // isolated too; WebKit reports an unresolved fixture socket as a page error.
  await page.routeWebSocket("**/realtime/v1/websocket*", socket => {
    socket.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.event === "phx_join" || message.event === "heartbeat") {
        socket.send(JSON.stringify({ topic: message.topic, event: "phx_reply", ref: message.ref,
          payload: { status: "ok", response: {} } }));
      }
    });
  });
  if (storeSession) await page.addInitScript(({ user, storageKey, expiresIn }) => {
    localStorage.setItem(storageKey, JSON.stringify({
      access_token: "fixture-token",
      refresh_token: "fixture-refresh",
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      token_type: "bearer",
      user
    }));
  }, { user, storageKey, expiresIn });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
}

async function routeCalendarCheckInStore(
  page: Page,
  rows: Array<Record<string, unknown>>
) {
  await page.route("**/rest/v1/calendar_check_ins*", async route => {
    const range = rows.length > 0 ? `0-${rows.length - 1}/${rows.length}` : "*/0";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": range },
      body: JSON.stringify(rows)
    });
  });
  await page.route("**/rest/v1/calendar_check_in_library*", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "*/0" },
      body: "[]"
    });
  });
}

async function expectNoClientErrors(page: Page) {
  return watchBrowserErrors(page);
}

async function expectClientRouteLoads(page: Page, route: string) {
  await expectRouteLoadsWithin(page, route, `client route ${route}`, async () => {
    await expect(page.locator("#root")).toBeVisible({ timeout: routeReadyTimeoutMs });
    await expect(page.locator("main.app-shell")).toBeVisible({
      timeout: routeReadyTimeoutMs
    });
  });
}

function headingComparisonVariants(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[’']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
  const withoutMovementVerb = normalized
    .replace(/\b(?:is\s+)?(?:currently\s+)?(?:moving|transiting)\b/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const withoutTrailingHouse = withoutMovementVerb
    .replace(/\s+(?:in\s+)?(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\s+house$/u, "")
    .trim();

  return Array.from(new Set([normalized, withoutMovementVerb, withoutTrailingHouse].filter(Boolean)));
}

async function expectNoDuplicateArticleHeadings(page: Page, label: string) {
  const headings = (await page.locator(".article-page h1, .article-page h2, .article-page h3").allTextContents())
    .map((heading) => heading.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const heading of headings) {
    const variants = headingComparisonVariants(heading);

    if (variants.some((variant) => seen.has(variant))) {
      duplicates.push(heading);
    }

    variants.forEach((variant) => seen.add(variant));
  }

  expect(duplicates, `${label} does not repeat page or section headlines`).toEqual([]);
}

async function expectSemanticArticleHeadingOrder(page: Page, label: string) {
  const article = page.locator(".article-page");
  const headings = await article.locator("h1, h2, h3, h4, h5, h6").evaluateAll((elements) => (
    elements.map((element) => ({
      level: Number(element.tagName.slice(1)),
      text: element.textContent?.replace(/\s+/gu, " ").trim() ?? ""
    })).filter((heading) => heading.text)
  ));
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const skippedLevels = headings.slice(1).flatMap((heading, index) => {
    const previous = headings[index];
    return heading.level > previous.level + 1
      ? [`${previous.text} (h${previous.level}) → ${heading.text} (h${heading.level})`]
      : [];
  });
  const structuralLabelTags = await article.locator(".article-related-aspects__label").evaluateAll((elements) => (
    elements.map((element) => element.tagName)
  ));

  expect(headings[0]?.level, `${label} starts with an h1`).toBe(1);
  expect(h1Count, `${label} has exactly one h1`).toBe(1);
  expect(skippedLevels, `${label} does not skip heading levels`).toEqual([]);
  expect(
    structuralLabelTags.every((tagName) => tagName === "H2" || tagName === "H3"),
    `${label} renders structural article labels as headings`
  ).toBe(true);
}

async function captureThemeSurface(page: Page, theme: "light" | "dark", surface: string) {
  await mkdir(themeScreenshotDir, { recursive: true });
  await expect(page.locator(".app-shell")).toHaveClass(new RegExp(`theme-${theme}`));
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(themeScreenshotDir, `${theme}-${surface}.png`)
  });
}

async function captureResponsiveSurface(page: Page, viewport: "desktop" | "mobile", surface: string) {
  await mkdir(responsiveScreenshotDir, { recursive: true });
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(responsiveScreenshotDir, `${viewport}-${surface}.png`)
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  const maxScrollWidth = Math.max(dimensions.bodyScrollWidth, dimensions.documentScrollWidth);

  expect(maxScrollWidth, `${label} does not create horizontal overflow`).toBeLessThanOrEqual(dimensions.viewportWidth + 2);
}

async function expectBehindForecastGroupedByConcept(page: Page, label: string) {
  const behindForecast = page.getByRole("region", { name: "Behind this forecast" });
  await expect(behindForecast).toBeVisible();
  const forecastGroups = behindForecast.locator(".daily-behind-forecast__group");
  expect(await forecastGroups.count(), `${label} is split into concept groups`).toBeGreaterThan(1);
  const groupLabels = await forecastGroups.getByRole("heading", { level: 3 }).allTextContents();
  expect(new Set(groupLabels.map((groupLabel) => groupLabel.toLocaleLowerCase())).size).toBe(groupLabels.length);

  for (const group of await forecastGroups.all()) {
    const groupLabel = (await group.getByRole("heading", { level: 3 }).innerText()).trim().toLocaleLowerCase();
    const cardLabels = await group.locator(".daily-forecast-label > span").allTextContents();
    expect(cardLabels.length, `${groupLabel} has at least one forecast`).toBeGreaterThan(0);
    for (const cardLabel of cardLabels) {
      expect(
        cardLabel.trim().toLocaleLowerCase().endsWith(groupLabel),
        `${cardLabel} belongs in ${groupLabel}`
      ).toBe(true);
    }
  }

  await expectNoHorizontalOverflow(page, label);
}

async function expectLocatorInsideViewport(locator: Locator, viewportWidth: number, label: string) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => (
    locator.evaluate((element, width) => {
      const rect = element.getBoundingClientRect();

      return rect.width > 0
        && rect.height > 0
        && rect.left >= 0
        && rect.right <= width;
    }, viewportWidth).catch(() => false)
  ), {
    message: `${label} is rendered completely inside the ${viewportWidth}px viewport`
  }).toBe(true);
}

async function expectSharedLabelContract(page: Page, label: string, options: { requireLabels?: boolean } = {}) {
  const result = await page.evaluate(() => {
    const selectors = [
      ".eyebrow",
      ".section-label",
      ".aspect-section-label",
      ".friend-section-label",
      ".placements-heading .eyebrow",
      ".settings-group-label",
      ".article-eyebrow",
      ".article-section__eyebrow"
    ];
    const rootStyle = getComputedStyle(document.documentElement);
    const expected = {
      fontSize: rootStyle.getPropertyValue("--label-eyebrow-font-size").trim(),
      lineHeight: rootStyle.getPropertyValue("--label-eyebrow-line-height").trim(),
      letterSpacing: rootStyle.getPropertyValue("--label-eyebrow-tracking").trim(),
      fontFamily: rootStyle.getPropertyValue("--label-eyebrow-font-family").trim(),
      fontWeight: rootStyle.getPropertyValue("--weight-semibold").trim()
    };
    const expectedProbe = document.createElement("span");
    expectedProbe.style.position = "fixed";
    expectedProbe.style.visibility = "hidden";
    expectedProbe.style.fontSize = expected.fontSize;
    expectedProbe.style.lineHeight = expected.lineHeight;
    expectedProbe.style.letterSpacing = expected.letterSpacing;
    expectedProbe.style.fontFamily = expected.fontFamily;
    expectedProbe.style.fontWeight = expected.fontWeight;
    expectedProbe.textContent = "Label";
    document.body.append(expectedProbe);
    const computedExpected = getComputedStyle(expectedProbe);
    const expectedComputed = {
      fontSize: computedExpected.fontSize,
      lineHeight: computedExpected.lineHeight,
      letterSpacing: computedExpected.letterSpacing,
      fontFamily: computedExpected.fontFamily,
      fontWeight: computedExpected.fontWeight
    };
    expectedProbe.remove();
    const normalizeFamily = (value: string) => value.replaceAll('"', "").split(",")[0].trim();
    const normalizePx = (value: string) => Number.parseFloat(value);
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const elements = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => ({ selector, element })))
      .filter(({ element }) => isVisible(element))
      .slice(0, 80);
    const failures: string[] = [];

    for (const { selector, element } of elements) {
      const style = getComputedStyle(element);
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      const prefix = `${selector} "${text}"`;

      if (Math.abs(normalizePx(style.fontSize) - normalizePx(expectedComputed.fontSize)) > 0.2) {
        failures.push(`${prefix} font-size ${style.fontSize} expected ${expectedComputed.fontSize}`);
      }

      if (Math.abs(normalizePx(style.lineHeight) - normalizePx(expectedComputed.lineHeight)) > 0.5) {
        failures.push(`${prefix} line-height ${style.lineHeight} expected ${expectedComputed.lineHeight}`);
      }

      if (Math.abs(normalizePx(style.letterSpacing) - normalizePx(expectedComputed.letterSpacing)) > 0.2) {
        failures.push(`${prefix} letter-spacing ${style.letterSpacing} expected ${expectedComputed.letterSpacing}`);
      }

      if (normalizeFamily(style.fontFamily) !== normalizeFamily(expectedComputed.fontFamily)) {
        failures.push(`${prefix} font-family ${style.fontFamily} expected ${expectedComputed.fontFamily}`);
      }

      if (style.fontWeight !== expectedComputed.fontWeight) {
        failures.push(`${prefix} font-weight ${style.fontWeight} expected ${expectedComputed.fontWeight}`);
      }

      if (style.textTransform !== "uppercase") {
        failures.push(`${prefix} text-transform ${style.textTransform} expected uppercase`);
      }

      if ([style.marginTop, style.marginRight, style.marginBottom, style.marginLeft].some((value) => normalizePx(value) !== 0)) {
        failures.push(`${prefix} margin ${style.margin}`);
      }

      if ([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].some((value) => normalizePx(value) !== 0)) {
        failures.push(`${prefix} padding ${style.padding}`);
      }
    }

    return { checked: elements.length, failures };
  });

  if (options.requireLabels ?? true) {
    expect(result.checked, `${label} has rendered shared labels to inspect`).toBeGreaterThan(0);
  }

  expect(result.failures, `${label} keeps eyebrow and section label styling consistent`).toEqual([]);
}

async function expectSharedBodyContract(page: Page, label: string, selectors: string[]) {
  const result = await page.evaluate((bodySelectors) => {
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedProbe = document.createElement("p");
    expectedProbe.style.position = "fixed";
    expectedProbe.style.visibility = "hidden";
    expectedProbe.style.fontFamily = rootStyle.getPropertyValue("--font-body").trim();
    expectedProbe.style.fontSize = rootStyle.getPropertyValue("--text-body").trim();
    expectedProbe.style.fontWeight = rootStyle.getPropertyValue("--weight-regular").trim();
    expectedProbe.style.lineHeight = rootStyle.getPropertyValue("--leading-body").trim();
    expectedProbe.style.letterSpacing = rootStyle.getPropertyValue("--tracking-body").trim();
    expectedProbe.textContent = "Body contract probe";
    document.body.append(expectedProbe);

    const expectedStyle = getComputedStyle(expectedProbe);
    const expected = {
      fontFamily: expectedStyle.fontFamily,
      fontSize: expectedStyle.fontSize,
      fontWeight: expectedStyle.fontWeight,
      lineHeight: expectedStyle.lineHeight,
      letterSpacing: expectedStyle.letterSpacing
    };
    expectedProbe.remove();

    const articleProbe = document.createElement("section");
    articleProbe.className = "article-section";
    articleProbe.style.position = "fixed";
    articleProbe.style.visibility = "hidden";
    const articleParagraph = document.createElement("p");
    articleParagraph.textContent = "Article body contract probe";
    articleProbe.append(articleParagraph);
    document.body.append(articleProbe);

    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const sampled = bodySelectors.flatMap((selector) => (
      Array.from(document.querySelectorAll(selector))
        .filter(isVisible)
        .map((element) => ({ selector, element }))
    ));
    sampled.push({ selector: ".article-section p (probe)", element: articleParagraph });

    const normalizeFamily = (value: string) => value.replaceAll('"', "").split(",")[0].trim();
    const normalizePx = (value: string) => Number.parseFloat(value);
    const failures: string[] = [];
    for (const { selector, element } of sampled) {
      const style = getComputedStyle(element);
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      const prefix = `${selector} "${text}"`;

      if (normalizeFamily(style.fontFamily) !== normalizeFamily(expected.fontFamily)) {
        failures.push(`${prefix} font-family ${style.fontFamily} expected ${expected.fontFamily}`);
      }
      if (Math.abs(normalizePx(style.fontSize) - normalizePx(expected.fontSize)) > 0.2) {
        failures.push(`${prefix} font-size ${style.fontSize} expected ${expected.fontSize}`);
      }
      if (style.fontWeight !== expected.fontWeight) {
        failures.push(`${prefix} font-weight ${style.fontWeight} expected ${expected.fontWeight}`);
      }
      if (Math.abs(normalizePx(style.lineHeight) - normalizePx(expected.lineHeight)) > 0.5) {
        failures.push(`${prefix} line-height ${style.lineHeight} expected ${expected.lineHeight}`);
      }
      if (Math.abs(normalizePx(style.letterSpacing) - normalizePx(expected.letterSpacing)) > 0.2) {
        failures.push(`${prefix} letter-spacing ${style.letterSpacing} expected ${expected.letterSpacing}`);
      }
    }

    articleProbe.remove();
    return {
      checked: sampled.length,
      failures,
      selectorsFound: bodySelectors.filter((selector) => sampled.some((sample) => sample.selector === selector))
    };
  }, selectors);

  expect(result.checked, `${label} renders body typography to inspect`).toBeGreaterThan(1);
  expect(result.selectorsFound.length, `${label} exercises multiple narrative surfaces`).toBeGreaterThanOrEqual(3);
  expect(result.failures, `${label} keeps all narrative copy on the shared body contract`).toEqual([]);
}

async function expectLunarSelectedCardMinimalFonts(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const card = document.querySelector(".calendar-day-panel");
    const normalizeFamily = (value: string) => value.replaceAll('"', "").split(",")[0].trim();
    const hasReadableText = (element: Element) => {
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();

      return /[A-Za-z0-9]/.test(text);
    };
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };

    if (!card) {
      return { checked: 0, families: [], samples: [] };
    }

    const elements = Array.from(card.querySelectorAll("*"))
      .filter((element) => isVisible(element) && hasReadableText(element))
      .filter((element) => !/(glyph|moon-disc|stat-dial)/.test((element as HTMLElement).className.toString()));
    const familySamples = new Map<string, string>();
    const fontSizeSamples = new Map<string, string>();
    const fontWeightSamples = new Map<string, string>();

    for (const element of elements) {
      const style = getComputedStyle(element);
      const family = normalizeFamily(style.fontFamily);
      const fontSize = `${Math.round(Number.parseFloat(style.fontSize) * 10) / 10}px`;
      const fontWeight = style.fontWeight;
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48);

      if (!familySamples.has(family)) {
        familySamples.set(family, text);
      }

      if (!fontSizeSamples.has(fontSize)) {
        fontSizeSamples.set(fontSize, text);
      }

      if (!fontWeightSamples.has(fontWeight)) {
        fontWeightSamples.set(fontWeight, text);
      }
    }

    return {
      checked: elements.length,
      families: Array.from(familySamples.keys()),
      fontSizes: Array.from(fontSizeSamples.keys()),
      fontWeights: Array.from(fontWeightSamples.keys()),
      samples: Array.from(familySamples.entries()).map(([family, text]) => `${family}: ${text}`),
      sizeSamples: Array.from(fontSizeSamples.entries()).map(([size, text]) => `${size}: ${text}`),
      weightSamples: Array.from(fontWeightSamples.entries()).map(([weight, text]) => `${weight}: ${text}`)
    };
  });

  expect(result.checked, `${label} has readable lunar selected card text to inspect`).toBeGreaterThan(0);
  expect(result.families.length, `${label} uses only display, body, and label font families in the selected lunar card: ${result.samples.join(" | ")}`).toBeLessThanOrEqual(3);
  expect(result.fontSizes.length, `${label} keeps selected lunar card type scale compact: ${result.sizeSamples.join(" | ")}`).toBeLessThanOrEqual(6);
  expect(result.fontWeights.length, `${label} keeps selected lunar card font weights compact: ${result.weightSamples.join(" | ")}`).toBeLessThanOrEqual(4);
}

async function expectLunarSelectedCardEventAlignment(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const reference = document.querySelector(".calendar-day-events, .calendar-sky-card");
    const contentTrack = document.querySelector(".calendar-day-panel");
    const body = document.querySelector(".calendar-sky-card");
    const after = document.querySelector(".calendar-day-events");
    const events = Array.from(document.querySelectorAll(".calendar-stoic-card"));

    if (!reference || events.length === 0) {
      return { checked: 0, failures: [] };
    }

    const referenceRect = reference.getBoundingClientRect();
    const failures: string[] = [];
    const trackRect = contentTrack?.getBoundingClientRect();

    if (trackRect && body && after) {
      [
        ["body", body.getBoundingClientRect()],
        ["after", after.getBoundingClientRect()]
      ].forEach(([name, rect]) => {
        const leftDelta = Math.abs((rect as DOMRect).left - trackRect.left);
        const rightDelta = Math.abs((rect as DOMRect).right - trackRect.right);

        if (leftDelta > 1 || rightDelta > 1) {
          failures.push(`${name} track left ${leftDelta.toFixed(1)}px right ${rightDelta.toFixed(1)}px`);
        }
      });
    }

    events.slice(0, 8).forEach((event, index) => {
      const rect = event.getBoundingClientRect();
      if (rect.left < referenceRect.left - 1 || rect.right > referenceRect.right + 1) {
        failures.push(`event ${index + 1} extends beyond the event grid`);
      }
    });
    const grid = document.querySelector(".calendar-day-events__grid");
    const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0;
    const firstRow = events.slice(0, columns).map(event => event.getBoundingClientRect());
    if (firstRow.length && (Math.abs(firstRow[0].left - referenceRect.left) > 1
      || Math.abs(firstRow.at(-1)!.right - referenceRect.right) > 1)) {
      failures.push("event columns do not fill the selected-day content track");
    }

    return { checked: events.length, failures };
  });

  expect(result.checked, `${label} has lunar event rows to align`).toBeGreaterThan(0);
  expect(result.failures, `${label} aligns lunar event cards with the selected-day content track`).toEqual([]);
}

async function expectPopoverTextNotBold(page: Page, selector: string, label: string, maxWeight = 500) {
  const result = await page.evaluate(({ selector: targetSelector, maxWeight: allowedWeight }) => {
    const popover = document.querySelector(targetSelector);
    const hasReadableText = (element: Element) => /[A-Za-z0-9]/.test((element.textContent ?? "").trim());
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const numericWeight = (value: string) => {
      if (value === "normal") return 400;
      if (value === "bold") return 700;

      return Number.parseInt(value, 10);
    };

    if (!popover || !isVisible(popover)) {
      return { checked: 0, failures: [`${targetSelector} was not visible`] };
    }

    const elements = [popover, ...Array.from(popover.querySelectorAll("*"))]
      .filter((element) => isVisible(element) && hasReadableText(element))
      .filter((element) => !["svg", "path"].includes(element.tagName.toLowerCase()));
    const failures: string[] = [];

    for (const element of elements) {
      const style = getComputedStyle(element);
      const weight = numericWeight(style.fontWeight);

      if (Number.isFinite(weight) && weight > allowedWeight) {
        const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 72);
        const className = element instanceof HTMLElement ? element.className.toString() : "";
        failures.push(`${element.tagName.toLowerCase()}${className ? `.${className.replace(/\s+/g, ".")}` : ""} weight ${weight}: ${text}`);
      }
    }

    return { checked: elements.length, failures };
  }, { selector, maxWeight });

  expect(result.checked, `${label} has visible popover/dropdown text to inspect`).toBeGreaterThan(0);
  expect(result.failures, `${label} avoids bold text in popover/dropdown surfaces`).toEqual([]);
}

async function expectFormTypography(page: Page, selector: string, label: string) {
  const result = await page.evaluate((targetSelector) => {
    const root = document.querySelector(targetSelector);
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const numericWeight = (value: string) => {
      if (value === "normal") return 400;
      if (value === "bold") return 700;

      return Number.parseInt(value, 10);
    };
    const sample = (element: Element) => (element.textContent ?? element.getAttribute("placeholder") ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 72);

    if (!root || !isVisible(root)) {
      return { checked: 0, failures: [`${targetSelector} was not visible`] };
    }

    const failures: string[] = [];
    const controls = Array.from(root.querySelectorAll("input, select, textarea"))
      .filter(isVisible);
    const readableFormText = Array.from(root.querySelectorAll("label, legend, button, [role='option'], [role='menuitem'], .city-suggestions strong, .city-suggestions span"))
      .filter(isVisible)
      .filter((element) => element.tagName.toLowerCase() !== "svg");

    for (const control of controls) {
      const style = getComputedStyle(control);
      const weight = numericWeight(style.fontWeight);

      if (Number.isFinite(weight) && weight > 400) {
        failures.push(`${control.tagName.toLowerCase()} weight ${weight}: ${sample(control) || control.getAttribute("aria-label") || control.getAttribute("name") || "control"}`);
      }
    }

    for (const element of readableFormText) {
      const style = getComputedStyle(element);
      const weight = numericWeight(style.fontWeight);

      if (Number.isFinite(weight) && weight > 500) {
        failures.push(`${element.tagName.toLowerCase()} weight ${weight}: ${sample(element)}`);
      }
    }

    return { checked: controls.length + readableFormText.length, failures };
  }, selector);

  expect(result.checked, `${label} has visible form typography to inspect`).toBeGreaterThan(0);
  expect(result.failures, `${label} keeps form text regular/medium, not bold`).toEqual([]);
}

const readerCopyLeakPattern = /\b(?:undefined|null|NaN|fallback-hook|slot-template|sourceSnapshot|templateVersion|record id|backend|database|schema|generated content|dashboard|admin|hydrated|Supabase|Missing VITE|Interpretation in review|giving North Node a clear place|This pattern is active now|This transit is active now|is active here|current emphasis (?:is|may be) visible in timing, mood|everyday choices|while this contact is active|one part of the contact|other part of the contact pushes back|They disagree about how you should respond|Recurring friction that asks for an adjustment|Name both sides of the pattern before choosing the next concrete response)\b/i;
const directionalCopyPattern = /\b(?:Notice how|asks for attention|asks for attention in real life|this placement asks you to|this aspect teaches you|the lesson is|pay attention to|watch for|invites you to|gentle reminder|step into your power)\b/i;

async function expectReaderFacingCopy(locator: ReturnType<Page["locator"]>, label: string, minLength = 120) {
  await expect(locator, `${label} is visible`).toBeVisible();
  const text = ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim();

  expect(text.length, `${label} has substantial reader-facing copy`).toBeGreaterThanOrEqual(minLength);
  expect(text, `${label} does not leak scaffolding or placeholder copy`).not.toMatch(readerCopyLeakPattern);
  expect(text, `${label} does not surface directional or moralizing scaffold copy`).not.toMatch(directionalCopyPattern);
}

async function expectReaderFacingCopyExcluding(
  locator: ReturnType<Page["locator"]>,
  excludedSelector: string,
  label: string,
  minLength = 120
) {
  await expect(locator, `${label} is visible`).toBeVisible();
  const text = await locator.evaluate((root, selector) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(selector).forEach((element) => element.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }, excludedSelector);

  expect(text.length, `${label} has substantial reader-facing copy`).toBeGreaterThanOrEqual(minLength);
  expect(text, `${label} does not leak scaffolding or placeholder copy`).not.toMatch(readerCopyLeakPattern);
  expect(text, `${label} does not surface directional or moralizing scaffold copy`).not.toMatch(directionalCopyPattern);
}

async function expectHydrationKeepsReaderCopyStable(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  label: string,
  options: { excludedSelector?: string; minLength?: number; waitMs?: number } = {}
) {
  const minLength = options.minLength ?? 120;
  const waitMs = options.waitMs ?? 3500;
  const contentText = async () => options.excludedSelector
    ? locator.evaluate((root, selector) => {
        const clone = root.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(selector).forEach((element) => element.remove());
        return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
      }, options.excludedSelector)
    : ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim();

  await expect(locator, `${label} is visible before hydration settles`).toBeVisible();
  await expect.poll(async () => {
    return (await contentText()).length;
  }, {
    message: `${label} has enough initial reader-facing copy to compare before hydration`,
    timeout: 5000
  }).toBeGreaterThanOrEqual(minLength);

  const before = await contentText();

  expect(before, `${label} initial copy does not leak scaffolding or stale fallback text`).not.toMatch(readerCopyLeakPattern);
  expect(before, `${label} initial copy does not surface directional scaffold copy`).not.toMatch(directionalCopyPattern);

  await page.waitForTimeout(waitMs);

  const after = await contentText();

  expect(after.length, `${label} keeps substantial reader-facing copy after hydration`).toBeGreaterThanOrEqual(minLength);
  expect(after, `${label} hydrated copy does not leak scaffolding or stale fallback text`).not.toMatch(readerCopyLeakPattern);
  expect(after, `${label} hydrated copy does not surface directional scaffold copy`).not.toMatch(directionalCopyPattern);

  if (before.length >= minLength * 1.5) {
    expect(after.length, `${label} does not downgrade from richer copy to a much thinner fallback after hydration`).toBeGreaterThanOrEqual(
      Math.floor(before.length * 0.85)
    );
  }
}

async function expectRelationshipWheelGeometry(page: Page, label: string) {
  const wheel = page.getByLabel(label);

  await expect(wheel).toBeVisible();
  const geometry = await wheel.evaluate((element) => {
    const center = 300;
    const numberAttr = (node: Element, name: string) => Number(node.getAttribute(name) ?? Number.NaN);
    const distanceToSegment = (
      point: { x: number; y: number },
      start: { x: number; y: number },
      end: { x: number; y: number }
    ) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;

      if (!lengthSquared) {
        return Math.hypot(point.x - start.x, point.y - start.y);
      }

      const progress = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
      const projected = {
        x: start.x + progress * dx,
        y: start.y + progress * dy
      };

      return Math.hypot(point.x - projected.x, point.y - projected.y);
    };
    const radiusStats = (selector: string) => {
      const radii = Array.from(element.querySelectorAll(selector))
        .map((node) => {
          const transform = node.getAttribute("transform") ?? "";
          const match = transform.match(/translate\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)/);

          if (!match) {
            return null;
          }

          const x = Number(match[1]);
          const y = Number(match[2]);

          return Math.hypot(x - center, y - center);
        })
        .filter((radius): radius is number => typeof radius === "number" && Number.isFinite(radius));

      return {
        count: radii.length,
        min: radii.length ? Math.min(...radii) : Number.POSITIVE_INFINITY,
        max: radii.length ? Math.max(...radii) : Number.NEGATIVE_INFINITY,
        spread: radii.length ? Math.max(...radii) - Math.min(...radii) : Number.POSITIVE_INFINITY
      };
    };
    const houseCollisionStats = () => {
      const degreePoints = Array.from(element.querySelectorAll(".planet-label-group"))
        .map((group) => {
          const transform = group.getAttribute("transform") ?? "";
          const match = transform.match(/translate\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)/);
          const degree = group.querySelector(".planet-degree");

          if (!match || !degree) {
            return null;
          }

          return {
            x: Number(match[1]) + numberAttr(degree, "x"),
            y: Number(match[2]) + numberAttr(degree, "y")
          };
        })
        .filter((point): point is { x: number; y: number } => Boolean(point) && Number.isFinite(point.x) && Number.isFinite(point.y));
      const tickSegments = Array.from(element.querySelectorAll(".synastry-planet-tick"))
        .map((tick) => ({
          start: { x: numberAttr(tick, "x1"), y: numberAttr(tick, "y1") },
          end: { x: numberAttr(tick, "x2"), y: numberAttr(tick, "y2") }
        }))
        .filter((segment) => (
          Number.isFinite(segment.start.x) &&
          Number.isFinite(segment.start.y) &&
          Number.isFinite(segment.end.x) &&
          Number.isFinite(segment.end.y)
        ));
      const houses = Array.from(element.querySelectorAll(".synastry-house-number"))
        .map((house) => ({
          adjusted: house.getAttribute("data-collision-adjusted") === "true",
          point: { x: numberAttr(house, "x"), y: numberAttr(house, "y") }
        }))
        .filter((house) => Number.isFinite(house.point.x) && Number.isFinite(house.point.y));
      const nearest = houses.map(({ point }) => {
        const degree = degreePoints.length
          ? Math.min(...degreePoints.map((degreePoint) => Math.hypot(point.x - degreePoint.x, point.y - degreePoint.y)))
          : Number.POSITIVE_INFINITY;
        const tick = tickSegments.length
          ? Math.min(...tickSegments.map((segment) => distanceToSegment(point, segment.start, segment.end)))
          : Number.POSITIVE_INFINITY;

        return { degree, tick };
      });

      return {
        adjusted: houses.filter((house) => house.adjusted).length,
        degreeMin: nearest.length ? Math.min(...nearest.map((item) => item.degree)) : Number.POSITIVE_INFINITY,
        tickMin: nearest.length ? Math.min(...nearest.map((item) => item.tick)) : Number.POSITIVE_INFINITY
      };
    };

    return {
      outerTicks: element.querySelectorAll(".synastry-planet-tick--outer").length,
      innerTicks: element.querySelectorAll(".synastry-planet-tick--inner").length,
      outer: radiusStats(".planet-marker-outer .planet-label-group"),
      inner: radiusStats(".planet-marker-inner .planet-label-group"),
      houses: houseCollisionStats()
    };
  });

  expect(geometry.outerTicks, `${label} renders outer degree tick lines`).toBeGreaterThanOrEqual(10);
  expect(geometry.innerTicks, `${label} renders inner degree tick lines`).toBeGreaterThanOrEqual(10);
  expect(geometry.outer.count, `${label} renders outer glyphs`).toBeGreaterThanOrEqual(10);
  expect(geometry.inner.count, `${label} renders inner glyphs`).toBeGreaterThanOrEqual(10);
  expect(geometry.outer.min, `${label} outer glyphs stay outside the inner ring`).toBeGreaterThanOrEqual(180);
  expect(geometry.outer.max, `${label} outer glyphs stay inside the zodiac band`).toBeLessThanOrEqual(240);
  expect(geometry.inner.min, `${label} inner glyphs stay outside the aspect well`).toBeGreaterThanOrEqual(108);
  expect(geometry.inner.max, `${label} inner glyphs stay inside the inner ring`).toBeLessThanOrEqual(180);
  expect(geometry.outer.spread, `${label} outer glyph cluster lanes stay bounded`).toBeLessThanOrEqual(56);
  expect(geometry.inner.spread, `${label} inner glyph cluster lanes stay bounded`).toBeLessThanOrEqual(72);
  expect(geometry.houses.adjusted, `${label} marks house labels that were moved away from degree collisions`).toBeGreaterThanOrEqual(1);
  expect(geometry.houses.degreeMin, `${label} keeps house labels clear of planet degree text`).toBeGreaterThanOrEqual(9);
  expect(geometry.houses.tickMin, `${label} keeps house labels clear of degree tick lines`).toBeGreaterThanOrEqual(6);
}

async function expectAspectInspector(
  wheel: ReturnType<Page["locator"]>,
  label: string,
  pointId?: string
) {
  await expect(wheel, `${label} is visible`).toBeVisible();

  let resolvedPointId = pointId;

  if (!resolvedPointId) {
    const configuredLine = wheel.locator("[data-from-point-id][data-to-point-id]").first();
    const configuredLineCount = await configuredLine.count();

    if (configuredLineCount > 0) {
      resolvedPointId = await configuredLine.getAttribute("data-from-point-id") ?? undefined;
    } else {
      const configuredPoint = wheel.locator('.aspect-inspector-point[data-inspector-point-id][aria-label*=" orb)"]').first();

      await expect(configuredPoint, `${label} has a configured aspect to inspect`).toBeAttached();
      resolvedPointId = await configuredPoint.getAttribute("data-inspector-point-id") ?? undefined;
    }
  }

  expect(resolvedPointId, `${label} exposes an inspector point id`).toBeTruthy();
  const point = wheel.locator(`[data-inspector-point-id="${resolvedPointId}"]`);

  await expect(point, `${label} exposes the selected aspect point`).toHaveCount(1);
  await point.click();
  await expect(point, `${label} marks the selected point`).toHaveClass(/aspect-inspector-point--selected/);
  await expect(wheel.locator(".aspect-inspector-summary"), `${label} opens an inspector summary`).toBeVisible();
  await expect(wheel.locator(".aspect-inspector-line"), `${label} highlights at least one configured aspect`).not.toHaveCount(0);

  await point.press("Enter");
  await expect(wheel.locator(".aspect-inspector-summary"), `${label} closes from the keyboard`).toHaveCount(0);
}

test.describe("client-facing user flow case studies", () => {
  test("guest can read the current sky and open a detail article", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await expect(page.getByRole("list", { name: "Daily planetary placements" })).toBeVisible();
    await expectAspectInspector(
      page.getByRole("region", { name: "Current sky" }),
      "Current sky wheel"
    );

    const firstPlacement = page.locator(".sky-pl-item button").first();
    await expect(firstPlacement).toBeVisible();
    await firstPlacement.click();

    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close detail" })).toBeVisible();
    await expect(page.locator("article, .sky-detail-article").first()).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Sky placement detail");
    await expectSemanticArticleHeadingOrder(page, "Sky placement detail");

    await page.getByRole("button", { name: "Close detail" }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("Sky detail titles clear the fixed navigation and keep semantic order across breakpoints", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "mobile", width: 390, height: 844 }
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedClientState(page, { now: "2026-07-29T16:00:00.000Z" });
      await expectClientRouteLoads(page, "/#sky/placement/sun/leo");

      const title = page.getByRole("heading", { level: 1, name: "Sun in Leo", exact: true });
      const titleBox = await title.boundingBox();
      const topbarBox = await page.locator(".topbar").boundingBox();

      expect(titleBox, `${viewport.name} article title has a rendered box`).not.toBeNull();
      expect(topbarBox, `${viewport.name} navigation has a rendered box`).not.toBeNull();
      expect(
        titleBox!.y,
        `${viewport.name} article title starts below the fixed navigation`
      ).toBeGreaterThan(topbarBox!.y + topbarBox!.height);
      await expectSemanticArticleHeadingOrder(page, `${viewport.name} Sky detail article`);
      await expectNoHorizontalOverflow(page, `${viewport.name} Sky detail article`);
    }

    await assertNoClientErrors();
  });

  for (const theme of ["light", "dark"] as const) {
    for (const width of [430, 768, 1440]) {
      test(`article sheets share the reference spacing ${theme} ${width}`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 1000 });
        await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "12:00 PM", preloadProfileNatalSky: true, theme, now: "2026-07-29T16:00:00.000Z" });
        for (const [name, route] of [
          ["you", "/#you/placement/sun-aquarius-9h"],
          ["sky", "/#sky/placement/sun/leo"]
        ]) {
          await expectClientRouteLoads(page, route);
          const card = page.locator(".sky-detail-card").first();
          // This checks article geometry after complete calculated-copy
          // hydration, which has a separate deadline from shell readiness.
          // You/Friends loading budgets remain in their performance suites.
          await expect(card.locator("h1")).toBeVisible({ timeout: 60_000 });
          const box = await card.boundingBox();
          expect(box!.x).toBeCloseTo(width * 0.025, 0);
          expect(box!.width).toBeCloseTo(width * 0.95, 0);
          expect(box!.y).toBeCloseTo(width <= 720 ? 50 : 108, 0);
          await expect(card).toHaveCSS("padding-left", width <= 720 ? "20px" : `${Math.min(width / 10, 144)}px`);
          const title = await card.locator("h1").boundingBox();
          await page.locator(".sky-detail-back").click({ trial: true });
          const back = await page.locator(".sky-detail-back").boundingBox();
          const nav = await page.locator(".topbar").boundingBox();
          expect(title!.y).toBeGreaterThan(Math.max(back!.y + back!.height, nav!.y + nav!.height));
          await expectSemanticArticleHeadingOrder(page, `${name} article ${width} ${theme}`);
          await expectNoHorizontalOverflow(page, `${name} article ${width} ${theme}`);
          await mkdir(responsiveScreenshotDir, { recursive: true });
          await page.screenshot({ path: path.join(responsiveScreenshotDir, `article-sheet-${name}-${theme}-${width}.png`) });
          await page.locator(".sky-detail-back").click();
          await expect(page.locator(".sky-detail-page")).toHaveCount(0);
        }
      });
    }
  }

  test("Sky placement aspect cards show one visible hierarchy label per card", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/north-node/aquarius");

    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "mobile", width: 390, height: 844 }
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const theme of ["light", "dark"] as const) {
        await page.evaluate((nextTheme) => {
          window.localStorage.setItem("tldrastro:theme", nextTheme);
        }, theme);
        await page.reload();
        await expect(page.locator("main.app-shell")).toBeVisible({ timeout: routeReadyTimeoutMs });
        await expect(page.locator(".app-shell")).toHaveClass(new RegExp(`theme-${theme}`));

        const aspectDetailsHeading = page.getByRole("heading", { level: 2, name: "Aspect details" });
        await expect(aspectDetailsHeading).toHaveClass("sr-only");
        const labels = await page.locator(".article-related-aspects__label, #sky-detail-related-aspects-title").evaluateAll((elements) => (
          elements.map((element) => {
            const box = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return {
              text: element.textContent?.replace(/\s+/gu, " ").trim() ?? "",
              visible: box.width > 1 && box.height > 1,
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              letterSpacing: style.letterSpacing,
              textTransform: style.textTransform
            };
          })
        ));
        const visibleLabels = labels.filter((label) => label.visible);

        expect(
          visibleLabels.length,
          `${viewport.name} ${theme}: at least one approved aspect hierarchy label remains visible`
        ).toBeGreaterThan(0);
        expect(
          visibleLabels.every((label) => ["Gifts", "Lessons"].includes(label.text)),
          `${viewport.name} ${theme}: visible aspect hierarchy labels remain in the approved Gifts/Lessons vocabulary`
        ).toBe(true);
        expect(
          new Set(visibleLabels.map((label) => label.text)).size,
          `${viewport.name} ${theme}: each rendered hierarchy group has one visible label`
        ).toBe(visibleLabels.length);
        expect(
          visibleLabels.map(({ fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textTransform }) => ({
            fontFamily,
            fontSize,
            fontWeight,
            lineHeight,
            letterSpacing,
            textTransform
          })),
          `${viewport.name} ${theme}: all visible group headings use the same established eyebrow typography`
        ).toEqual(Array.from({ length: visibleLabels.length }, () => ({
          fontFamily: visibleLabels[0].fontFamily,
          fontSize: visibleLabels[0].fontSize,
          fontWeight: visibleLabels[0].fontWeight,
          lineHeight: visibleLabels[0].lineHeight,
          letterSpacing: visibleLabels[0].letterSpacing,
          textTransform: visibleLabels[0].textTransform
        })));
        await expectSemanticArticleHeadingOrder(page, `${viewport.name} ${theme} North Node Sky placement detail`);
        await expectNoHorizontalOverflow(page, `${viewport.name} ${theme} North Node Sky placement detail`);
      }
    }

    await assertNoClientErrors();
  });

  test("restored tabs recover if the React shell is blank", async ({ page }) => {
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();

    await page.evaluate(() => {
      window.sessionStorage.removeItem("tldrastro:blankRestoreReloadAt");
      const root = document.getElementById("root");

      if (root) {
        root.innerHTML = "";
      }

      window.dispatchEvent(new Event("focus"));
    });

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".app-shell")).toBeVisible();
  });

  test("guest can navigate public calendar and settings surfaces", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#calendar");
    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.locator(".lunar-calendar-view")).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: /settings/i }).click();
    await expect(page.getByText("settings.")).toBeVisible();
    await expect(page.getByLabel("Theme", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Sky$/ }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can review their chart on You", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#you");

    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await expect(page.getByLabel("Profile summary")).toBeVisible();
    await expect(page.getByText("Project Author")).toBeVisible();
    await expect(
      page.locator(".daily-horoscope-summary__moon-tags"),
      "Daily Moon context tags stay hidden on reader cards"
    ).toHaveCount(0);
    await expect(
      page.locator(".soul-roadmap-card, .career-archetype-card"),
      "Soul's Path and Career Directions stay hidden from the personal chart"
    ).toHaveCount(0);

    const updatesTab = page.getByRole("tab", { name: /updates|transits/i });
    if (await updatesTab.isVisible()) {
      await updatesTab.click();
      await expect(updatesTab).toHaveAttribute("aria-selected", "true");
      const chartCalculation = page.locator(".chart-layout__visual");
      await expect(chartCalculation).toHaveAttribute(
        "data-chart-calculation-status",
        /^(?:ready|error)$/,
        { timeout: 30_000 }
      );
      const chartCalculationStatus = await chartCalculation.getAttribute("data-chart-calculation-status");
      if (chartCalculationStatus === "error") {
        const errorMessage = (await page.getByRole("alert", { name: "Chart calculation error" }).innerText()).trim();
        throw new Error(`Chart calculation entered its visible error state: ${errorMessage}`);
      }
      const transitWheel = page.getByLabel("Transit chart wheel");
      await expect(transitWheel).toBeVisible();
      await expect(
        transitWheel.locator(".sky-wheel--aspect-inspector"),
        "Personal transit wheel omits the aspect inspector"
      ).toHaveCount(0);

      await expectBehindForecastGroupedByConcept(page, "Behind this forecast");

      const houseTransitCard = page
        .getByLabel("House transits")
        .locator(".updates-aspect-row--house")
        .first();
      await expect(houseTransitCard.locator(".ui-pill")).toHaveCount(0);
      const houseTransitRange = (
        await houseTransitCard.locator(".updates-aspect-row__meta-line > span").last().innerText()
      ).trim();
      const houseTransitDescription = (
        await houseTransitCard.locator(".updates-aspect-row__description").innerText()
      ).trim();
      expect(
        houseTransitDescription.startsWith(`${houseTransitRange},`),
        "House transit body does not repeat its visible date range"
      ).toBe(false);
      await houseTransitCard.click();
      await expect(page.getByRole("heading", { name: /through your \d+(?:st|nd|rd|th) house/i })).toBeVisible();
      await expectNoDuplicateArticleHeadings(page, "You house-transit detail");
      await expectHousePillsInArticle(page);
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    }

    const chartTab = page.getByRole("tab", { name: /chart/i });
    if (await chartTab.isVisible()) {
      await chartTab.click();
      await expect(chartTab).toHaveAttribute("aria-selected", "true");
      await expect(page.getByLabel(/Natal placements|Bodies in signs and houses/).first()).toBeVisible();
    }

    await assertNoClientErrors();
  });

  test("You restores the selected subtab after refresh and browser navigation", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.addInitScript(() => {
      const BaseWorker = window.Worker;
      (window as any).__completedNatalTiming = 0;
      window.Worker = class extends BaseWorker {
        private timingRequests = new Set<number>();
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener("message", event => {
            if (this.timingRequests.delete(event.data.id) && event.data.ok) {
              (window as any).__completedNatalTiming++;
            }
          });
        }
        postMessage(message: any, options?: any) {
          if (message.kind === "natal-transit-timing") this.timingRequests.add(message.id);
          super.postMessage(message, options);
        }
      };
    });

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#you");

    const transitsTab = page.getByRole("tab", { name: "Transits", exact: true });
    const natalTab = page.getByRole("tab", { name: "Natal Chart", exact: true });

    await natalTab.click();
    await expect(natalTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#you\?tab=chart$/u);

    // Timing enrichment must reuse the ready worker, not start a second engine
    // in the document just as navigation begins.
    await expect(page.locator(".chart-layout__visual")).toHaveAttribute("data-chart-calculation-status", "ready", { timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => (window as any).__completedNatalTiming), { timeout: routeReadyTimeoutMs }).toBeGreaterThan(0);
    expect(await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => /\/wasm\/(?:[a-f0-9]{16}\/)?swisseph\.(wasm|data)/u.test(entry.name)).length)).toBe(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await expect(natalTab).toHaveAttribute("aria-selected", "true");

    await expect(page.locator(".chart-layout__visual")).toHaveAttribute("data-chart-calculation-status", "ready", { timeout: 15_000 });
    await transitsTab.click();
    await expect(transitsTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#you$/u);

    await page.goBack();
    await expect(natalTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#you\?tab=chart$/u);

    await page.goForward();
    await expect(transitsTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#you$/u);
    await assertNoClientErrors();
  });

  test("Behind this forecast groups cards by concept across desktop and mobile", async ({ browser }) => {
    for (const viewport of [
      { label: "desktop", width: 1440, height: 1000 },
      { label: "mobile", width: 390, height: 844 }
    ] as const) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const assertNoClientErrors = await expectNoClientErrors(page);

      await seedClientState(page, { profile: true });
      await expectClientRouteLoads(page, "/#you");
      const updatesTab = page.getByRole("tab", { name: /updates|transits/i });
      await updatesTab.click();
      await expect(updatesTab).toHaveAttribute("aria-selected", "true");
      await expectBehindForecastGroupedByConcept(page, `${viewport.label} Behind this forecast`);
      await assertNoClientErrors();
      await context.close();
    }
  });

  test("You preserves the saved Virgo New Moon rewrite in the bundled fallback", async ({ page }) => {
    await seedClientState(page, { profile: true, preloadProfileNatalSky: true, now: "2026-09-10T12:00:00.000Z" });
    await expectClientRouteLoads(page, "/#you");
    const macro = page.locator(".weekly-horoscope__macro");
    await expect(macro).toBeVisible({ timeout: 30_000 });
    await expect(macro).toContainText("You do not need another plan for becoming a better version of yourself.");
    await macro.getByRole("button", { name: "Read more", exact: true }).click();
    await expect(macro).toContainText("They need a life that does not require you to keep treating yourself as the problem.");
    await expect(macro).not.toContainText("A Virgo New Moon begins with the checklist");
  });

  test("You restores the complete Virgo macro when its publication overlay finishes loading", async ({ page }) => {
    const snapshot = JSON.parse(readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
    const contentKey = "authored/sky-lunation-macro/new-moon/virgo";
    const source = snapshot.rows.find((row: { content_key: string }) => row.content_key === contentKey);
    expect(source).toBeTruthy();
    // Reuse the complete approved body. Only the test publication identity changes.
    const row = { ...source, id: "qa-delayed-virgo-publication", updated_at: "2026-09-10T12:00:00.000Z" };
    const publication = { content_key: contentKey, state: "live", revision: 100_000,
      row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at };
    await seedClientState(page, { profile: true, preloadProfileNatalSky: true, now: "2026-09-10T12:00:00.000Z" });
    await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: [publication] }));
    await page.route("**/rest/v1/rpc/content_runtime_revision", route => route.fulfill({ json: row.updated_at }));
    await page.route("**/content-studio-last-known-good.json", route => route.fulfill({
      json: { schema: "content-studio-last-known-good-v2", rowCount: 0, rows: [] }
    }));
    let releaseCopy!: () => void;
    const contentReady = new Promise<void>(resolve => { releaseCopy = resolve; });
    await page.route('**/api/content-reader', async route => {
      if (route.request().postDataJSON().provider === "tldrastro-fallback-architecture-v3") {
        await contentReady;
        await route.fulfill({ json: readerResponse([row]) });
      } else {
        await route.fulfill({ status: 503, json: { message: "Explicit offline reader fixture" } });
      }
    });
    try {
      await expectClientRouteLoads(page, "/#you");
      await expect(page.getByRole("button", { name: /^Virgo New Moon for Aries Rising/u })).toBeVisible({ timeout: routeReadyTimeoutMs });
      const macro = page.locator(".weekly-horoscope__macro");
      await expect(macro).toHaveCount(0);
      await expect(page.getByRole("region", { name: "This week's transits", exact: true })).toBeVisible({ timeout: routeReadyTimeoutMs });
      await expect(macro).toHaveCount(0);
      releaseCopy();
      await expect(macro).toContainText("You do not need another plan for becoming a better version of yourself.", { timeout: 15_000 });
      await macro.getByRole("button", { name: "Read more", exact: true }).click();
      await expect(macro).toContainText("They need a life that does not require you to keep treating yourself as the problem.");
      await expect(macro).not.toContainText("A Virgo New Moon begins with the checklist");
    } finally {
      releaseCopy();
    }
  });

  test("You serves the protected book card on an exact lunation day", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, {
      profile: true,
      preloadProfileNatalSky: true,
      now: "2026-07-29T12:00:00.000Z"
    });
    await expectClientRouteLoads(page, "/#you");

    const bookCard = page.getByRole("button", {
      name: /^Aquarius Full Moon for Aries Rising/u
    });
    await expect(bookCard).toBeVisible({ timeout: 30_000 });
    await bookCard.click();

    const article = page.locator(".article-page");
    await expect(article).toBeVisible();
    await expect(article).toContainText(
      "The Aquarius full moon illuminates your 11th house of friendship."
    );
    await expect(article).toContainText(
      "You deserve to be surrounded by people who genuinely believe in you and want to see you happy and successful."
    );
    await assertNoClientErrors();
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ] as const) {
    test(`You serves the shared lunar-eclipse layer from the sign-neutral namespace on ${viewport.name}`, async ({ page }) => {
      const assertNoClientErrors = await expectNoClientErrors(page);

      await seedClientState(page, {
        profile: true,
        preloadProfileNatalSky: true,
        now: "2026-08-28T16:00:00.000Z"
      });
      await expectClientRouteLoads(page, "/#you");

      const titleTypography = new Map<string, Array<Record<string, string>>>();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const theme of ["light", "dark"] as const) {
        await page.evaluate((nextTheme) => {
          window.localStorage.setItem("tldrastro:theme", nextTheme);
        }, theme);
        await page.reload();
        await expect(page.locator("main.app-shell")).toBeVisible({ timeout: routeReadyTimeoutMs });
        await expect(page.locator(".app-shell")).toHaveClass(new RegExp(`theme-${theme}`));

        const eclipseCard = page.getByRole("button", {
          name: /^Pisces Lunar Eclipse Horoscope/u
        });
        const eclipseTitle = eclipseCard.locator(".updates-aspect-row__title");
        await expect(eclipseCard).toBeVisible({ timeout: 30_000 });
        await expect(
          eclipseCard,
          "The exact-day horoscope uses the established interactive card layout"
        ).toHaveClass(/\bweekly-transit-row\b/u);
        await expect(
          page.locator(".daily-special-section").filter({ hasText: "Pisces Lunar Eclipse Horoscope" }),
          "The full inline horoscope does not duplicate the interactive card"
        ).toHaveCount(0);
        const eclipseCardStyle = await eclipseCard.evaluate((element) => {
          const style = window.getComputedStyle(element);

          return {
            backgroundColor: style.backgroundColor,
            borderRadius: Number.parseFloat(style.borderRadius),
            borderStyle: style.borderTopStyle,
            boxShadow: style.boxShadow,
            paddingTop: Number.parseFloat(style.paddingTop)
          };
        });
        expect(eclipseCardStyle.backgroundColor, "Horoscope card has a visible surface").not.toBe("rgba(0, 0, 0, 0)");
        expect(eclipseCardStyle.borderRadius, "Horoscope card has rounded corners").toBeGreaterThan(0);
        expect(eclipseCardStyle.borderStyle, "Horoscope card has an outlined edge").toBe("solid");
        expect(eclipseCardStyle.boxShadow, "Horoscope card has the established raised treatment").not.toBe("none");
        expect(eclipseCardStyle.paddingTop, "Horoscope card uses inset card spacing").toBeGreaterThan(0);
        await expect(
          page.locator(".updates-aspect-row__title").filter({ hasText: /^Pisces Lunar Eclipse Horoscope$/u }),
          "The exact-day eclipse appears in one card"
        ).toHaveCount(1);
        await expect(eclipseTitle).toBeVisible();
        await expect(eclipseTitle).not.toContainText("Rising");
        await eclipseCard.click();
        const eclipseArticle = page.locator(".article-page");
        await expect(eclipseArticle).toBeVisible();
        await expect(eclipseArticle).toContainText(
          "The Pisces lunar eclipse shines upon your 12th house of karma, subconscious, and endings."
        );
        await expect(eclipseArticle).toContainText(
          "Lunar eclipses are portals into your soul."
        );
        await expect(eclipseArticle).toContainText(
          "Release your need to be in control, allow for endings, mourn if needed, and allow yourself to flow with the current of whatever is unfolding, even if the destination is still unknown."
        );
        await page.getByRole("button", { name: "Back" }).click();
        await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
        await expectSharedBodyContract(page, `${viewport.name} ${theme} You page`, [
          ".daily-horoscope-summary > p",
          ".daily-dodont li",
          ".daily-special-section > p",
          ".weekly-horoscope__macro > p",
          ".updates-aspect-row__description"
        ]);

        const viewportTypography = titleTypography.get(viewport.name) ?? [];
        viewportTypography.push(await eclipseTitle.evaluate((element) => {
          const style = window.getComputedStyle(element);
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
            lineHeight: style.lineHeight,
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            textAlign: style.textAlign,
            textTransform: style.textTransform
          };
        }));
        titleTypography.set(viewport.name, viewportTypography);
        await expectNoHorizontalOverflow(page, `${viewport.name} ${theme} eclipse horoscope title`);
      }

      for (const [viewport, typography] of titleTypography) {
        expect(
          typography,
          `${viewport}: the established eclipse-card title typography remains identical in light and dark themes.`
        ).toEqual(Array.from({ length: typography.length }, () => typography[0]));
      }
      await assertNoClientErrors();
    });
  }

  test("You and Friends share a date picker for past and future transits", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#you");

    const dateTrigger = page.locator(".sky-header-date-button");
    await expect(dateTrigger).toBeVisible();
    await expect(dateTrigger).toContainText("Today");
    await dateTrigger.click();
    await expect(page.getByRole("region", { name: "Pick Date" })).toBeVisible();
    await page.getByRole("gridcell", { name: "Monday, July 20, 2026" }).click();

    await expect(page).toHaveURL(/[?&]date=2026-07-20(?:&|#|$)/u);
    await expect(dateTrigger).toContainText("Jul 20");

    await page.getByRole("button", { name: "Friends", exact: true }).click();
    // The loading illustration is labelled "Loading Friends…", so wait for it to leave before
    // reading the surface itself.
    await expect(page.getByRole("status", { name: /^Loading Friends/u })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Friends", exact: true })).toBeVisible();
    await expect(dateTrigger).toContainText("Jul 20");
    await dateTrigger.click();
    await expect(page.getByRole("region", { name: "Pick Date" })).toBeVisible();
    await page.getByRole("gridcell", { name: "Sunday, July 12, 2026" }).click();

    await expect(page).toHaveURL(/[?&]date=2026-07-12(?:&|#|$)/u);
    await expect(dateTrigger).toContainText("Jul 12");
    await assertNoClientErrors();
  });

  test("Today mode survives midnight and refresh while chosen dates stay fixed", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, {
      profile: true,
      now: "2026-08-20T23:59:50"
    });
    await expectClientRouteLoads(page, "/?date=2026-08-20#you");

    const dateTrigger = page.locator(".sky-header-date-button");
    await expect(dateTrigger).toContainText("Today");
    await expect(page).not.toHaveURL(/[?&]date=/u);

    await page.evaluate(() => {
      (window as any).__tldrSetQaNow("2026-08-21T00:00:05");
      window.dispatchEvent(new Event("focus"));
    });

    await expect(page).not.toHaveURL(/[?&]date=/u);
    await expect(dateTrigger).toContainText("Today");
    await page.reload();
    await expect(dateTrigger).toContainText("Today");
    await expect(page).not.toHaveURL(/[?&]date=/u);

    await dateTrigger.click();
    await page.getByRole("gridcell", { name: "Thursday, August 20, 2026" }).click();
    await expect(page).toHaveURL(/[?&]date=2026-08-20(?:&|#|$)/u);
    await expect(dateTrigger).toContainText("Aug 20");

    await page.evaluate(() => {
      (window as any).__tldrSetQaNow("2026-08-22T00:00:05");
      window.dispatchEvent(new Event("focus"));
    });

    await expect(page).toHaveURL(/[?&]date=2026-08-20(?:&|#|$)/u);
    await expect(dateTrigger).toContainText("Aug 20");
    await page.reload();
    await expect(page).toHaveURL(/[?&]date=2026-08-20(?:&|#|$)/u);
    await expect(dateTrigger).toContainText("Aug 20");
    await assertNoClientErrors();
  });

  test("chart calculation failure terminates in a visible error state", async ({ page }) => {
    await page.route(/\/wasm\/(?:[a-f0-9]{16}\/)?swisseph\.data$/u, async (route) => {
      await route.fulfill({ status: 503, body: "Ephemeris unavailable for visual-smoke coverage." });
    });
    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#you");

    const chartCalculation = page.locator(".chart-layout__visual");
    await expect(chartCalculation).toHaveAttribute("data-chart-calculation-status", "error", { timeout: 30_000 });
    const errorState = page.getByRole("alert", { name: "Chart calculation error" });
    await expect(errorState).toBeVisible();
    await expect(errorState).toContainText(/Swiss|Ephemeris|503|failed/i);
    await expect(page.getByRole("heading", { name: "Reading your chart." })).toHaveCount(0);
  });

  test("aspect inspector works across eligible saved-chart wheels and stays off transit wheels", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");
    await page.getByRole("button", { name: "Open Nikki" }).click();

    await page.getByRole("tab", { name: "Compatibility" }).click();
    await expectAspectInspector(
      page.getByLabel("Nikki compatibility chart wheel"),
      "Nikki compatibility wheel"
    );

    await page.getByRole("tab", { name: "Natal" }).click();
    await expectAspectInspector(
      page.getByLabel("Nikki natal chart wheel"),
      "Nikki natal wheel"
    );

    await page.getByRole("tab", { name: "Transits" }).click();
    const transitWheel = page.getByLabel("Nikki transit chart wheel");
    await expect(transitWheel).toBeVisible();
    await expect(
      transitWheel.locator(".sky-wheel--aspect-inspector"),
      "Friend transit wheel omits the aspect inspector"
    ).toHaveCount(0);
    const transitOuterBand = transitWheel.locator(".transit-planet-band");
    const transitOuterBandBackground = await transitOuterBand.evaluate((element) => ({
      opacity: getComputedStyle(element).opacity,
      stroke: getComputedStyle(element).stroke
    }));

    await selectFriendDetailTab(page, "Synastry");
    const synastryWheel = page.getByLabel("Nikki synastry chart wheel");
    await expectAspectInspector(
      synastryWheel,
      "Nikki synastry wheel"
    );
    const synastryInnerBand = synastryWheel.locator(".synastry-inner-planet-band");
    await expect(synastryInnerBand, "Synastry inner wheel has a distinct background band").toBeVisible();
    const synastryInnerBandBackground = await synastryInnerBand.evaluate((element) => ({
      opacity: getComputedStyle(element).opacity,
      stroke: getComputedStyle(element).stroke
    }));
    await expect(
      synastryInnerBandBackground,
      "Synastry inner wheel matches the transit outer-wheel background"
    ).toEqual(transitOuterBandBackground);

    await selectFriendDetailTab(page, "Composite");
    await expectAspectInspector(
      page.getByLabel(/Nikki and you composite chart wheel/i),
      "Nikki composite wheel"
    );

    await assertNoClientErrors();
  });

  for (const theme of ["light", "dark"] as const) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      test(`Compatibility Pair Daily appears above planets on a cold visit (${theme}, ${viewport.width}px)`, async ({ page }, testInfo) => {
        const assertNoClientErrors = await expectNoClientErrors(page);
        await page.setViewportSize(viewport);
        await seedClientState(page, { profile: true, friends: true, preloadProfileNatalSky: true, theme });

        // Exercise both entry paths without visiting Sky or Transits first.
        if (viewport.width === 1440) {
          await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-nikki&view=compatibility");
        } else {
          await expectClientRouteLoads(page, "/#friends?tab=charts");
          await page.getByRole("button", { name: "Open Nikki" }).click();
          await page.getByRole("tab", { name: "Compatibility" }).click();
        }

        const daily = page.locator(".friend-compatibility-stage .friend-daily-forecast");
        const comparisons = page.getByLabel("Planet comparisons");
        await expect(daily).toBeVisible();
        await expect(daily.locator(".friend-section-label")).toHaveText(/^Today - /);
        await expect(daily.locator("p")).toContainText("Nikki");
        const body = await daily.locator("p").innerText();
        expect(body.length).toBeGreaterThan(40);
        expect(body).not.toMatch(/SOURCE_GAP|\{[^}]+\}|undefined/);
        await expect(comparisons.locator(".compatibility-card").first()).toBeVisible();
        const dailyBounds = (await daily.boundingBox())!;
        const comparisonsBounds = (await comparisons.boundingBox())!;
        expect(dailyBounds.y + dailyBounds.height).toBeLessThanOrEqual(comparisonsBounds.y);
        expect(dailyBounds.x).toBeGreaterThanOrEqual(0);
        expect(dailyBounds.x + dailyBounds.width).toBeLessThanOrEqual(viewport.width);
        await daily.screenshot({ path: testInfo.outputPath("pair-daily.png") });

        // A reload and a tab round-trip must retain the complete approved reading.
        await page.reload();
        await expect(daily.locator("p")).toHaveText(body);
        await page.getByRole("tab", { name: "Natal" }).click();
        await page.getByRole("tab", { name: "Compatibility" }).click();
        await expect(daily.locator("p")).toHaveText(body);
        await assertNoClientErrors();
      });
    }
  }

  test("signed-in user can inspect friend chart relationship tabs and actions", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await expect(page.getByText("friends.")).toBeVisible();
    await expect(page.getByText("Nikki")).toBeVisible();

    await page.getByRole("button", { name: "Open Nikki" }).click();
    await expect(page.getByRole("tab", { name: "Natal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More, 2 sections" })).toBeVisible();
    await expect(page.getByRole("menuitemradio", { name: /^Synastry/ })).toHaveCount(0);
    await page.getByRole("button", { name: "More, 2 sections" }).click();
    await expect(page.getByRole("menuitemradio", { name: /^Synastry/ })).toContainText("Chart-to-chart connections between you.");
    await expect(page.getByRole("menuitemradio", { name: /^Composite/ })).toContainText("How the relationship acts when you're together.");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitemradio", { name: /^Synastry/ })).toHaveCount(0);

    await page.getByRole("tab", { name: "Compatibility" }).click();
    await expectRelationshipWheelGeometry(page, "Nikki compatibility chart wheel");
    const compatibilityCards = page.getByLabel("Planet comparisons").locator(".compatibility-card");
    await expect(compatibilityCards.first()).toBeVisible();
    await expect(page.getByText("Planet comparisons", { exact: true }), "Compatibility cards omit the redundant section eyebrow").toHaveCount(0);
    await expect(compatibilityCards.first().locator(".compatibility-card__header p"), "Compatibility cards omit the redundant sign-pair subtitle").toHaveCount(0);
    await expect(compatibilityCards.first().locator(".compatibility-card__signs"), "Compatibility cards retain the labeled person and friend signs").toBeVisible();

    await page.getByRole("tab", { name: "Natal" }).click();
    await expect(page.getByRole("tab", { name: "Natal" })).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator('.friend-tab-pane[aria-label="Natal"]').locator(".soul-roadmap-card, .career-archetype-card"),
      "Soul's Path and Career Directions stay hidden from friend charts"
    ).toHaveCount(0);

    await page.getByRole("tab", { name: "Transits" }).click();
    await expect(page.getByRole("tab", { name: "Transits" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Nikki transit chart wheel")).toBeVisible();
    const transitDailyForecast = page.locator(".friend-daily-forecast").first();
    await expect(transitDailyForecast, "Transit daily forecast keeps its card inset").toBeVisible();
    await expect(transitDailyForecast).toHaveCSS("border-top-style", "solid");
    expect(
      await transitDailyForecast.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop)),
      "Transit daily forecast has visible internal padding"
    ).toBeGreaterThan(0);

    const transitCard = page.locator(".friend-transit-row:has(.updates-aspect-row__orb)").first();
    await expect(transitCard).toBeVisible();
    await expect(transitCard, "Friend transit cards open their full entries").toHaveJSProperty("tagName", "BUTTON");
    await expect(transitCard).toHaveCSS("cursor", "pointer");
    const transitDescription = transitCard.locator(".updates-aspect-row__description");
    await expect(transitDescription).toBeVisible();
    await expect(transitDescription).not.toContainText(/Duration:|\borb\b/i);

    const friendHouseTransitCard = page
      .getByLabel("House transits")
      .locator(".updates-aspect-row--house")
      .first();
    await expect(friendHouseTransitCard).toHaveCSS("cursor", "pointer");
    await expect(friendHouseTransitCard).toHaveJSProperty("tagName", "BUTTON");
    await expect(friendHouseTransitCard.locator(".ui-pill")).toHaveCount(0);
    const friendHouseTransitRange = (
      await friendHouseTransitCard.locator(".updates-aspect-row__meta-line > span").last().innerText()
    ).trim();
    const friendHouseTransitDescription = (
      await friendHouseTransitCard.locator(".updates-aspect-row__description.transit-card-preview").innerText()
    ).trim();
    expect(
      friendHouseTransitDescription.startsWith(`${friendHouseTransitRange},`),
      "Friend house transit body does not repeat its visible date range"
    ).toBe(false);
    await expect(
      page.getByText("Full interpretation unavailable pending source verification."),
      "Internal source-verification status stays out of the reader UI"
    ).toHaveCount(0);
    await expect(
      friendHouseTransitCard,
      "Every visible Friend house transit has an eligible full entry"
    ).toBeEnabled();

    await friendHouseTransitCard.click();
    await expectHousePillsInArticle(page);
    await page.getByRole("button", { name: "Close detail" }).click();

    const transitCardText = ((await transitCard.innerText()) ?? "").replace(/\s+/g, " ").trim();
    const rangeLabel = ((await transitCard.locator(".updates-aspect-row__meta-line > span").last().innerText()) ?? "").trim();
    const orbLabel = ((await transitCard.locator(".updates-aspect-row__orb").innerText()) ?? "").trim();
    expect(transitCardText.split(rangeLabel).length - 1, "Transit date range appears once").toBe(1);
    expect(transitCardText.split(orbLabel).length - 1, "Transit orb appears once").toBe(1);
    await transitCard.click();
    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expect(page.getByLabel("Transit details", { exact: true })).toBeVisible();
    await expect(
      page.locator(".sky-detail-section:not(.sky-aspect-mechanics)"),
      "Owner-signoff-untraced personal-transit explanation remains eligible under the owner ruling"
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Close detail" }).click();
    await expect(page.getByRole("tab", { name: "Transits" })).toHaveAttribute("aria-selected", "true");

    await selectFriendDetailTab(page, "Synastry");
    await expectRelationshipWheelGeometry(page, "Nikki synastry chart wheel");
    await expect(page.getByText("What synastry shows")).toBeVisible();
    await expect(
      page.getByLabel("synastry relationship summary"),
      "Synastry omits the relationship-patterns summary card"
    ).toHaveCount(0);
    await expect(page.locator(".synastry-placement-row").first()).toBeVisible();
    await expect(page.locator(".synastry-placement-planet"), "Synastry placement cards use glyph-only rows without planet-name columns").toHaveCount(0);
    await expect(page.locator(".synastry-placement-sign-svg").first(), "Synastry placement cards keep zodiac glyphs visible").toBeVisible();
    const synastryPlacementHeaders = page.locator(".synastry-placement-column-header");
    await expect(synastryPlacementHeaders, "Synastry shows both placement-column headings").toHaveCount(2);
    await expect(
      synastryPlacementHeaders.first(),
      "Synastry placement headings omit the horizontal rule"
    ).toHaveCSS("border-bottom-width", "0px");
    const synastryContactCard = page
      .locator(".friend-aspect-row:has(.synastry-contact-description)")
      .first();
    const synastryContactDescription = synastryContactCard.locator(".synastry-contact-description");
    await expect(synastryContactDescription).toBeVisible();
    await expect(synastryContactCard.locator(".ui-pill")).toHaveCount(0);
    await synastryContactCard.click();
    await expect(page.locator(".article-id .article-pills .ui-pill--muted")).toBeVisible();
    await page.getByRole("button", { name: "Close detail" }).click();

    await selectFriendDetailTab(page, "Composite");
    await expect(page.getByText("What a composite chart is")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Nikki" })).toBeVisible();

    await page.getByRole("button", { name: "Charts" }).click();
    await expect(page.getByRole("button", { name: "More actions for Nikki" })).toBeVisible();
    await page.getByRole("button", { name: "More actions for Nikki" }).click();
    await expect(page.getByRole("menu", { name: "Nikki actions" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await assertNoClientErrors();
  });

  test("Friends Circle stays selectable and offers sign-in when only a cached profile remains", async ({ page }) => {
    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#friends?tab=circle");

    const circleTab = page.getByRole("tab", { name: "Circle · 0" });
    const chartsTab = page.getByRole("tab", { name: "Charts · 0" });
    await expect(circleTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("alert")).toContainText(
      "Sign in to see your friends"
    );
    await expect(page.getByRole("alert").getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    await chartsTab.click();
    await expect(chartsTab).toHaveAttribute("aria-selected", "true");
    await circleTab.click();
    await expect(circleTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#friends\?tab=circle$/u);
  });

  for (const theme of ["light", "dark"] as const) {
    for (const width of [1440, 390]) {
      test(`composite write-ups open complete details ${theme} ${width}`, async ({ page }) => {
        const assertNoClientErrors = await expectNoClientErrors(page);
        await page.setViewportSize({ width, height: 1000 });
        await seedClientState(page, { profile: true, friends: true, theme });
        await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-nikki&view=composite");
        const pane = page.locator('.friend-tab-pane[aria-label="Composite"]');
        const card = pane.locator('.friend-aspect-row:not(:disabled)').first();
        await expect(card).toBeVisible();
        const title = await card.locator("h3").innerText();
        const paragraphs = await card.locator(".aspect-row-copy p").allTextContents();
        expect(paragraphs.join("").trim().length).toBeGreaterThan(0);
        await card.focus();
        await page.keyboard.press("Enter");
        const article = page.locator(".sky-detail-article");
        await expect(article).toBeVisible();
        await expect(article).toContainText(title);
        for (const paragraph of paragraphs) await expect(article).toContainText(paragraph);
        await page.screenshot({ path: `test-results/composite-detail-${theme}-${width}.png`, fullPage: true });
        await page.reload();
        await expect(article).toContainText(paragraphs[0].split(/\{\{[^}]+\}\}/u).at(-1), { timeout: 60_000 });
        await page.getByRole("button", { name: "Close detail", exact: true }).click();
        const placement = pane.locator("button.placement-table-row").first();
        await expect(placement).toBeVisible();
        const description = await placement.locator(".placement-table-row__description").innerText();
        await placement.click();
        await expect(article).toContainText(description);
        await assertNoClientErrors();
      });
    }
  }

  test("friend chart section pills and overflow menu fit a narrow viewport", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");
    await page.getByRole("button", { name: "Open Nikki" }).click();

    const tablist = page.getByRole("tablist", { name: "Chart profile sections" });
    await expectLocatorInsideViewport(tablist, 390, "Friend chart section tabs");

    await page.getByRole("button", { name: "More, 2 sections" }).click();
    const menu = page.getByRole("menu", { name: "More chart profile sections" });
    await expectLocatorInsideViewport(menu, 390, "Friend chart section overflow menu");

    await selectFriendDetailTab(page, "Composite");
    await expect(page.getByText("What a composite chart is")).toBeVisible();
    await assertNoClientErrors();
  });

  for (const width of [390, 1440]) {
    for (const theme of ["light", "dark"] as const) {
      test(`Settings and Account share the row typography pattern ${width} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await seedClientState(page, { profile: true, theme, pageAnimations: "off" });
        // Account requires a real-shaped session; all auth and profile traffic stays local to this fixture.
        const user = { id: fixtureUserId, email: "qa-flow@example.com", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: { name: "Project Author" } };
        const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
        await page.addInitScript(({ user, storageKey }) => {
          localStorage.setItem(storageKey, JSON.stringify({ access_token: "fixture-token", refresh_token: "fixture-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
        }, { user, storageKey });
        await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
        await page.route("**/rest/v1/user_profiles*", async route => {
          const profile = await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!));
          await route.fulfill({ json: { data: { version: 1, profile } } });
        });
        for (const route of ["settings", "account"]) {
          if (route === "account") {
            await page.getByRole("button", { name: "Open menu" }).click();
            await page.getByRole("menuitem", { name: "Account", exact: true }).click();
          } else {
            await expectClientRouteLoads(page, "/#settings");
          }
          const surface = page.locator(`.${route}-page`);
          await expect(surface.locator("h1")).toBeVisible();
          await expect(surface.locator("h1")).toHaveCount(1);
          const typography = await surface.evaluate(element => {
            const probe = document.createElement("span");
            probe.style.cssText = "font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)";
            element.append(probe);
            const properties = ["fontFamily", "fontSize", "lineHeight", "letterSpacing"] as const;
            const read = (node: Element) => {
              const style = getComputedStyle(node);
              return Object.fromEntries(properties.map(key => [key, style[key]]));
            };
            const expectedBody = read(probe);
            const rows = Array.from(element.querySelectorAll(".settings-row-title, .settings-row__label, .settings-row-description, .settings-row__value, .account-row-input")).map(node => ({ text: node.textContent, actual: read(node), casing: getComputedStyle(node).textTransform }));
            probe.style.fontFamily = "var(--font-ui)";
            const uiFamily = getComputedStyle(probe).fontFamily;
            const controls = Array.from(element.querySelectorAll(".settings-theme-control button")).map(node => getComputedStyle(node).fontFamily);
            const labels = Array.from(element.querySelectorAll(".settings-group-label")).map(node => ({ family: getComputedStyle(node).fontFamily, casing: getComputedStyle(node).textTransform }));
            probe.remove();
            return { expectedBody, rows, uiFamily, controls, labels };
          });
          expect(typography.rows.length).toBeGreaterThan(0);
          for (const row of typography.rows) {
            expect(row.actual, `${route}: ${row.text}`).toEqual(typography.expectedBody);
            expect(row.casing, `${route}: row titles retain sentence case`).toBe("none");
          }
          for (const family of typography.controls) expect(family).toBe(typography.uiFamily);
          for (const label of typography.labels) expect(label).toEqual({ family: typography.uiFamily, casing: "uppercase" });
          for (const control of await surface.locator(".settings-row-control:has(.settings-switch)").all()) {
            const copy = await control.locator(".settings-row-copy").boundingBox();
            const toggle = await control.locator(".settings-switch").boundingBox();
            expect(toggle!.x).toBeGreaterThanOrEqual(copy!.x + copy!.width);
          }

          await expectNoHorizontalOverflow(page, `${route} ${width} ${theme}`);
          await page.screenshot({ path: test.info().outputPath(`${route}-${width}-${theme}.png`), fullPage: true });
        }
      });
    }
  }

  test("settings preferences persist across reload", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#settings");

    await expect(page.getByText("settings.")).toBeVisible();
    await page.getByLabel("Theme", { exact: true }).getByRole("button", { name: "dark" }).click();

    const dyslexiaSwitch = page.getByRole("button", { name: /dyslexia/i });
    if (await dyslexiaSwitch.isVisible()) {
      await dyslexiaSwitch.click();
    }

    await expect(page.locator(".app-shell")).toHaveClass(/theme-dark/);
    await page.reload();
    await expect(page.locator(".app-shell")).toHaveClass(/theme-dark/);

    if (await dyslexiaSwitch.isVisible()) {
      await expect(page.locator(".app-shell")).toHaveClass(/dyslexia-font-enabled/);
    }

    await page.getByRole("button", { name: /^Sky$/ }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("calendar day selection and view controls are interactive", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("region", { name: "Moon guidance" })).toBeVisible();
    await captureResponsiveSurface(page, "desktop", "calendar-day");

    const monthTab = page.getByRole("tab", { name: "Month" });
    if (await monthTab.isVisible()) {
      await monthTab.click();
      await expect(monthTab).toHaveAttribute("aria-selected", "true");
      await expect(page).toHaveURL(/#calendar\?view=month&date=\d{4}-\d{2}-\d{2}$/);
    }

    const firstCalendarDay = page.locator(".lunar-calendar-day:not(.is-outside)").first();
    if (await firstCalendarDay.isVisible()) {
      const selectedDate = await firstCalendarDay.getAttribute("data-calendar-date");
      await firstCalendarDay.click();
      await expect(page.getByLabel("Selected lunar day")).toBeVisible();
      await expect(firstCalendarDay).toHaveAttribute("aria-pressed", "true");
      await expect(firstCalendarDay).toHaveAttribute("aria-label", /^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}\./);
      await expect(firstCalendarDay.locator('[tabindex="0"]')).toHaveCount(0);

      await captureResponsiveSurface(page, "desktop", "calendar-month");
      await page.setViewportSize({ width: 896, height: 900 });
      const dayDialog = page.getByRole("dialog", { name: "Day slideout", exact: true });
      await expect(dayDialog.getByLabel("Selected lunar day")).toBeVisible();
      const bounds = await dayDialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(896);
      await expectNoHorizontalOverflow(page, "Laptop Month day slideout");
      await dayDialog.getByRole("button", { name: "Close", exact: true }).click();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.reload();
      await expect(page.getByRole("tab", { name: "Month" })).toHaveAttribute("aria-selected", "true");
      if (selectedDate) {
        await expect(page.locator(`[data-calendar-date="${selectedDate}"]`)).toHaveAttribute("aria-pressed", "true");
      }
    }

    await firstCalendarDay.click();
    const dayDialog = page.getByRole("dialog", { name: "Day slideout", exact: true });
    await expect(dayDialog).toBeVisible();
    await dayDialog.getByRole("button", { name: "Close", exact: true }).click();

    await assertNoClientErrors();
  });

  test("calendar ingress, station, and aspect details always open with approved prose", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);
    const cases = [
      { date: "2026-07-09", title: "Venus enters Virgo" },
      { date: "2026-07-23", title: "Mercury stations direct" },
      { date: "2026-07-13", title: "Venus squares Uranus" }
    ];

    await seedClientState(page, { now: "2026-07-31T12:00:00.000Z" });

    for (const eventCase of cases) {
      await expectClientRouteLoads(page, `/#calendar?view=week&date=${eventCase.date}`);
      const selectedDay = page.getByLabel("Selected lunar day");
      const eventButton = selectedDay.getByRole("button", {
        name: new RegExp(`^${eventCase.title}(?: in [A-Za-z]+)?$`, "u")
      });

      await expect(eventButton, `${eventCase.title} has one Calendar detail trigger`).toHaveCount(1);
      await expect(eventButton.locator(".calendar-stoic-card__excerpt")).toBeVisible();
      await eventButton.click();
      await page.getByRole("dialog", { name: "Event detail" }).getByRole("button", { name: "Read article" }).click();
      await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
      const detailParagraphs = page.locator(".app-shell.mode-detail article p");

      await expect(detailParagraphs.first(), `${eventCase.title} detail includes reader-facing prose`).toBeVisible();
      expect(
        (await detailParagraphs.allTextContents()).some((paragraph) => paragraph.trim().length > 20),
        `${eventCase.title} includes a substantive reader-facing paragraph`
      ).toBe(true);
    }

    await assertNoClientErrors();
  });

  test("calendar Week presents seven calculated days and complete writing without mobile overflow", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);
    await seedClientState(page, { now: "2026-07-31T12:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar");
    const weeklyTab = page.getByRole("tab", { name: "Week", exact: true });
    await weeklyTab.click();
    await expect(weeklyTab).toHaveAttribute("aria-selected", "true");
    const weeklyView = page.locator(".lunar-weekly-view");
    const days = weeklyView.locator(".calendar-day-group");
    await expect(days).toHaveCount(7);
    await expect(days.locator(".calendar-day-group__header")).toHaveText([
      "26Sunday", "27Monday", "28Tuesday", "29Wednesday", "30Thursday", "31Friday · Today", "1Saturday"
    ]);
    await expect(weeklyView.getByLabel("Selected week").getByRole("button")).toHaveCount(7);
    await expect(days.filter({ has: page.getByRole("button", { name: "31 Friday · Today", exact: true }) })).toHaveClass(/is-today/);
    const guidance = days.locator(".calendar-day-group__blurb");
    await expect(guidance).toHaveCount(7);
    const bodies = await guidance.allTextContents();
    expect(bodies.every(body => body.trim().length > 40)).toBe(true);
    expect(new Set(bodies).size, "Weekly Moon passages do not repeat").toBe(7);
    for (const key of await guidance.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-guidance-key")))) {
      expect(key).not.toContain("sky-placement-lived");
    }
    await expect(days.getByRole("button", { name: /^Moon in Capricorn / })).toHaveCount(3);
    await expect(days.getByRole("button", { name: /^Full Moon in Aquarius / })).toHaveCount(1);
    await expect(weeklyView.locator(".lunar-weekly-hero")).toHaveCount(0);
    await expect(weeklyView.getByText(/Weekly Moon:|Day theme/i)).toHaveCount(0);
    expect(await days.evaluateAll(nodes => nodes.every(day => {
      const rows = day.querySelector(".calendar-day-group__rows")!.getBoundingClientRect();
      const copy = day.querySelector(".calendar-day-group__blurb")!.getBoundingClientRect();
      return rows.bottom <= copy.top;
    })), "Event rows and Moon writing must not overlap").toBe(true);
    await captureResponsiveSurface(page, "desktop", "calendar-week");
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, "Mobile Week");
    await expect(days).toHaveCount(7);
    // Week events open the selected day, then its Event detail with complete copy.
    await days.getByRole("button", { name: /^Venus squares Mars / }).click();
    const dayDialog = page.getByRole("dialog", { name: "Day slideout", exact: true });
    await dayDialog.getByRole("button", { name: "Venus squares Mars", exact: true }).click();
    const exactBody = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/venus-square-mars.json", "utf8")).readerCopy.body;
    await expect(page.getByRole("dialog", { name: "Event detail", exact: true })).toContainText(exactBody);
    await assertNoClientErrors();
  });

  test("calendar Week keeps calculated events after the duplicate overview is removed", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-03T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=weekly&date=2026-08-03");

    const weeklyView = page.locator(".lunar-weekly-view");
    await expect(weeklyView.locator(".lunar-weekly-hero")).toHaveCount(0);
    const weeklyEvents = weeklyView.locator(".calendar-day-group__block");
    const lastQuarterTaurus = weeklyEvents.filter({
      has: page.getByRole("button", { name: /^Last Quarter Moon in Taurus / })
    });
    await expect(lastQuarterTaurus).toHaveCount(1);
    await expect(lastQuarterTaurus.locator(".calendar-day-group__excerpt")).toHaveCount(0);
    await expect(page.locator("#calendar-day-group-2026-08-05 .calendar-day-group__blurb")).toBeVisible();
    await expect(lastQuarterTaurus).not.toContainText("The waning Moon carries things out");
    await expect(weeklyEvents.getByRole("button", { name: /^Venus enters Libra / })).toBeVisible();
    await expect(weeklyEvents.getByRole("button", { name: /^Sun trines Saturn Rx / })).toBeVisible();

    await expect(weeklyView.getByLabel("Selected week").getByRole("button", { name: /^Tuesday, August 4\. / })).toHaveAccessibleName(/Waning Gibbous/);
    await expect(weeklyView.getByLabel("Selected week").getByRole("button", { name: /^Wednesday, August 5\. / })).toHaveAccessibleName(/Waning Gibbous/);
    await expect(weeklyView.getByLabel("Selected week").getByRole("button", { name: /^Thursday, August 6\. / })).toHaveAccessibleName(/Waning Crescent/);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(weeklyView).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      "Weekly overview must not introduce mobile horizontal overflow."
    ).toBe(true);
    await captureResponsiveSurface(page, "mobile", "calendar-weekly-overview");

    await expectClientRouteLoads(page, "/#calendar?view=weekly&date=2026-08-09");
    await expect(weeklyEvents.getByRole("button", { name: /^Mercury enters Leo / })).toBeVisible();
    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.locator(".lunar-calendar-body.is-month .calendar-month-chip__voc").first()).toBeAttached();
    const monthVoidLabels = await page.locator(".lunar-calendar-body.is-month .calendar-month-chip__voc").allTextContents();
    expect(monthVoidLabels.length).toBeGreaterThan(0);
    expect(monthVoidLabels.every((label) => label === "VOC")).toBe(true);

    await page.getByRole("tab", { name: "Day" }).click();
    await expect.poll(() => new URL(page.url()).hash).toContain("view=day");

    await assertNoClientErrors();
  });

  test("calendar preserves consecutive Week passages and complete Day Moon writing", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-03T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=weekly&date=2026-08-03");

    const expectedByDate = new Map<string, { body: string; contentKey: string }>();
    // Reader Calendar weeks run Sunday through Saturday.
    for (const dateKey of ["2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"]) {
      const guidance = page.locator(`#calendar-day-group-${dateKey} .calendar-day-group__blurb`);
      await expect(guidance).toHaveCount(1);
      const contentKey = await guidance.getAttribute("data-guidance-key") ?? "";
      expect(contentKey.includes("sky-placement-lived"), `${dateKey} must not serve Sky Placement Moon articles`).toBe(false);
      expectedByDate.set(dateKey, {
        body: (await guidance.innerText()).trim(),
        contentKey
      });
    }

    for (const [firstDate, secondDate] of [
      ["2026-08-03", "2026-08-04"],
      ["2026-08-05", "2026-08-06"],
      ["2026-08-07", "2026-08-08"]
    ]) {
      expect(expectedByDate.get(firstDate)?.body).not.toBe(expectedByDate.get(secondDate)?.body);
      expect(expectedByDate.get(firstDate)?.contentKey).not.toBe(expectedByDate.get(secondDate)?.contentKey);
    }

    for (const dateKey of expectedByDate.keys()) {
      await expectClientRouteLoads(page, `/#calendar?view=day&date=${dateKey}`);
      const dayMoon = page.locator("[data-calendar-date] [data-guidance-key]").first();
      await expect(dayMoon).toBeVisible();
      const key = await dayMoon.getAttribute("data-guidance-key") ?? "";
      expect(key.includes("sky-placement-lived")).toBe(false);
      expect(key).toBe(expectedByDate.get(dateKey)!.contentKey);
    }

    await assertNoClientErrors();
  });

  test("calendar First Quarter events use the calculated Moon sign instead of generic planning copy", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-20T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=weekly&date=2026-08-20");

    const firstQuarterEvent = page.locator(".calendar-day-group__block").filter({
      has: page.getByRole("button", { name: /First Quarter Moon in Scorpio/ })
    });
    await expect(firstQuarterEvent).toHaveCount(1);
    await expect(firstQuarterEvent.locator(".calendar-day-group__excerpt")).toHaveCount(0);
    const firstQuarterDay = page.locator(".calendar-day-group").filter({ has: firstQuarterEvent });
    await expect(firstQuarterDay.locator(".calendar-day-group__blurb")).toBeVisible();
    await expect(firstQuarterEvent).not.toContainText(
      "Adjust the plan, not the intention"
    );

    await assertNoClientErrors();
  });

  test("Sky and Calendar share one reviewed aspect-content selector", () => {
    const reviewedRow = {
      id: "aspect-row",
      contentKey: "sky.aspect.venus.square.mars.virgo.gemini",
      surface: "sky",
      mode: "article" as const,
      status: "LIVE",
      eventType: "sky_aspect",
      targetDate: null,
      headline: "Venus square Mars",
      summary: null,
      body: "One reviewed aspect body is shared by the Sky and Calendar surfaces.",
      sections: {},
      blockType: "sky_aspect" as const,
      provider: "test",
      sourceSnapshot: {
        skyAspectVoiceLint: { score: 3, fails: 0 },
        pairSource: "data/pairs/venus-mars.json",
        pairKey: "venus-mars",
        cardFacts: {
          a: "venus",
          b: "mars",
          aspect: "square",
          signA: "virgo",
          signB: "gemini"
        }
      },
      judgeScore: 3,
      judgeGate: "human-review",
      model: null,
      updatedAt: "2026-07-30T12:00:00.000Z"
    };
    const broadRow = {
      ...reviewedRow,
      id: "broad-row",
      contentKey: "sky.aspect.venus.square.mars",
      body: "This broad row must not replace the sign-specific reviewed Sky card."
    };
    const resolved = resolveSkyAspectGeneratedContent({
      generatedContent: new Map([
        [broadRow.contentKey, broadRow],
        [reviewedRow.contentKey, reviewedRow]
      ]),
      first: "Venus",
      second: "Mars",
      aspect: "square",
      firstSign: "Virgo",
      secondSign: "Gemini",
      targetDate: "2026-07-28"
    });

    expect(resolved?.content.contentKey).toBe(reviewedRow.contentKey);
    expect(resolved?.body).toBe(reviewedRow.body);

    const rejected = resolveSkyAspectGeneratedContent({
      generatedContent: new Map([[
        reviewedRow.contentKey,
        { ...reviewedRow, judgeScore: 2, judgeGate: "hold" }
      ]]),
      first: "Venus",
      second: "Mars",
      aspect: "square",
      firstSign: "Virgo",
      secondSign: "Gemini"
    });

    expect(rejected, "The shared selector rejects a row that fails the Sky judge boundary").toBeNull();
  });

  test("Calendar Day and Month keep canonical exact Sky aspect copy authoritative", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);
    const generatedAspectContentKey = "sky.aspect.venus.square.mars.virgo.gemini";
    const signSpecificContentKey = "fallback-hook/sky-aspect-sign/venus/virgo/square/mars/gemini";
    const exactBody = (JSON.parse(readFileSync(
      path.resolve("packages/astro-knowledge/data/transits/venus-square-mars.json"),
      "utf8"
    )) as { readerCopy?: { body?: string } }).readerCopy?.body;
    const signSpecificBody = skyAspectPhrasebook.hookRows.find(
      ({ contentKey }) => contentKey === signSpecificContentKey
    )?.body_you;

    expect(exactBody).toBeTruthy();
    expect(signSpecificBody).toBeTruthy();
    expect(exactBody).not.toBe(signSpecificBody);
    if (!exactBody || !signSpecificBody) {
      throw new Error("Expected both canonical exact and legacy sign-specific Venus square Mars fixtures.");
    }

    await seedClientState(page, {
      now: "2026-07-30T12:00:00.000Z",
      generatedInterpretations: [{
        id: "calendar-sky-aspect-row",
        content_key: generatedAspectContentKey,
        surface: "sky",
        mode: "article",
        status: "LIVE",
        lane: "serving",
        review_state: null,
        event_type: "sky_aspect",
        target_date: null,
        facts: {},
        source_snapshot: {
          skyAspectVoiceLint: { score: 3, fails: 0 },
          pairSource: "data/pairs/venus-mars.json",
          pairKey: "venus-mars",
          cardFacts: {
            a: "venus",
            b: "mars",
            aspect: "square",
            signA: "virgo",
            signB: "gemini"
          }
        },
        headline: "Venus square Mars",
        summary: null,
        body: "This generated row must remain behind the canonical exact Sky passage.",
        sections: {},
        block_type: "sky_aspect",
        flags: [],
        provider: "qa",
        judge_score: 3,
        judge_gate: "auto-publish",
        model: null,
        updated_at: "2026-07-30T12:00:00.000Z"
      }]
    });
    await expectClientRouteLoads(page, "/#calendar");

    const selectedDay = page.getByLabel("Selected lunar day");
    const aspectDay = page.getByLabel("Selected week").getByRole("button", {
      name: /^Wednesday, July 29\./
    });
    await aspectDay.click();
    await expect(selectedDay.getByRole("button", { name: "Venus squares Mars" })).toBeVisible({ timeout: 15_000 });
    await selectedDay.getByRole("button", { name: "Venus squares Mars" }).click();
    const reading = page.getByRole("dialog", { name: "Event detail" });
    await expect(reading.getByText(exactBody, { exact: true })).toBeVisible();
    await expect(reading).not.toContainText(signSpecificBody);
    await reading.getByRole("button", { name: "Close", exact: true }).click();

    const monthTab = page.getByRole("tab", { name: "Month", exact: true });
    await monthTab.click();
    await expect(monthTab).toHaveAttribute("aria-selected", "true");
    await page.locator('.lunar-calendar-day[data-calendar-date="2026-07-29"]').click();
    const monthDay = page.getByLabel("Selected lunar day");
    await expect(monthDay).toBeVisible({ timeout: 15_000 });
    await monthDay.getByRole("button", { name: "Venus squares Mars" }).click();
    await expect(page.getByRole("dialog", { name: "Event detail" }).getByText(exactBody, { exact: true })).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByRole("dialog", { name: "Event detail" })).not.toContainText(signSpecificBody);
    await expect(page.getByRole("dialog", { name: "Event detail" })).not.toContainText("and for the collective");
    await assertNoClientErrors();
  });

  test.describe("New York lunation boundary", () => {
    test.use({ timezoneId: "America/New_York" });
    test("calendar reserves the Full Moon title for the exact lunation day", async ({ page }) => {
      const assertNoClientErrors = await expectNoClientErrors(page);

      await seedClientState(page, { now: "2026-07-29T03:30:00.000Z" });
      await expectClientRouteLoads(page, "/#calendar");

      const selectedDay = page.getByLabel("Selected lunar day");
      await expect(selectedDay).toBeVisible({ timeout: 15_000 });
      await expect(selectedDay.getByRole("heading", { level: 2 })).toHaveText("Waxing Gibbous Moon in Aquarius");

      await page.getByLabel("Selected week").getByRole("button", { name: /Full Moon\. Moon in Aquarius/ }).click();
      await expect(selectedDay.getByRole("heading", { level: 2 })).toHaveText("Full Moon in Aquarius");
      await selectedDay.getByRole("button", { name: "Full Moon in Aquarius", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Event detail" }).locator(".calendar-reading__meta")).toContainText("Jul 29 · 10:35 AM");
      await assertNoClientErrors();
    });

  });

  test("calendar Full Moon opens the canonical SKY V4 lunation article on the real detail surface", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-29T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=week&date=2026-07-29");
    const selectedDay = page.getByLabel("Selected lunar day");
    const eventButton = selectedDay.getByRole("button", { name: "Full Moon in Aquarius", exact: true });

    await expect(eventButton).toBeVisible({ timeout: 15_000 });
    await eventButton.click();
    await page.getByRole("dialog", { name: "Event detail" }).getByRole("button", { name: "Read article" }).click();
    const article = page.locator(".app-shell.mode-detail .sky-detail-article");
    await expect(article).toBeVisible();
    await expect(article).toContainText("A Full Moon in Aquarius reveals what has grown around community, belonging, future vision");
    await expect(article).toContainText("Aquarius reminds us that truth is not always comfortable, but it is necessary.");
    await expect(article).not.toContainText("Aspects shaping this transit");
    await expect(article).toContainText("Key aspects");
    await assertNoClientErrors();
  });

  test("calendar New Moon opens the canonical SKY V4 lunation article on the real detail surface", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-14T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=week&date=2026-07-14");
    const selectedDay = page.getByLabel("Selected lunar day");
    const eventButton = selectedDay.getByRole("button", { name: /New Moon in Cancer/u });

    await expect(eventButton).toBeVisible({ timeout: 15_000 });
    await eventButton.click();
    await page.getByRole("dialog", { name: "Event detail" }).getByRole("button", { name: "Read article" }).click();
    const article = page.locator(".app-shell.mode-detail .sky-detail-article");
    await expect(article).toBeVisible();
    await expect(article).toContainText("The New Moon in Cancer invites a new beginning rooted in care");
    await expect(article).toContainText("Let this New Moon be an agreement between you and your nervous system.");
    await expect(article).not.toContainText("Aspects shaping this transit");
    await expect(article).toContainText("Key aspects");
    await assertNoClientErrors();
  });

  test("calendar exact eclipse opens the exact canonical SKY V4 event article", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2025-09-21T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=week&date=2025-09-21");
    const selectedDay = page.getByLabel("Selected lunar day");
    const eventButton = selectedDay.getByRole("button", { name: /Eclipse in Virgo/u });

    await expect(eventButton).toBeVisible({ timeout: 15_000 });
    await eventButton.click();
    await page.getByRole("dialog", { name: "Event detail" }).getByRole("button", { name: "Read article" }).click();
    const article = page.locator(".app-shell.mode-detail .sky-detail-article");
    await expect(article).toBeVisible();
    await expect(article).toContainText("The Partial Solar Eclipse in Virgo is a closing ceremony and a question of new foundations.");
    await expect(article).toContainText("The magick is not in wishing. It is in the doing.");
    await assertNoClientErrors();
  });

  test("calendar eclipse without an exact event record uses the governed sign-aware fallback", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-12T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=week&date=2026-08-12");
    const selectedDay = page.getByLabel("Selected lunar day");
    const eventButton = selectedDay.getByRole("button", { name: /Eclipse in Leo/u });

    await expect(eventButton).toBeVisible({ timeout: 15_000 });
    await eventButton.click();
    await page.getByRole("dialog", { name: "Event detail" }).getByRole("button", { name: "Read article" }).click();
    const article = page.locator(".app-shell.mode-detail .sky-detail-article");
    await expect(article).toBeVisible();
    await expect(article).toContainText("The role that kept you visible may no longer feel like the person you want to keep performing.");
    await expect(article).not.toContainText("The Partial Solar Eclipse in Virgo");
    await assertNoClientErrors();
  });

  test("calendar remains mounted during a direct-station week", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-25T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(page.locator("#root")).not.toBeEmpty();

    await page.reload();

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app-shell")).toBeVisible();
    await assertNoClientErrors();
  });

  test("guest can move between login and account creation screens", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Login" }).click();

    await expect(page.getByRole("region", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Return to your sky." })).toBeVisible();
    await expect(page.getByPlaceholder("you@somewhere.com")).toBeVisible();
    await expect(page.getByPlaceholder("at least 8 characters")).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByPlaceholder("at least 8 characters")).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Create an account" }).click();
    await expect(page.getByRole("region", { name: "Create account" })).toBeVisible();
    await expect(page.getByText("Create profile")).toBeVisible();
    await expect(page.getByPlaceholder("Jules Okafor")).toBeVisible();
    await expect(page.getByLabel("Birth month")).toBeVisible();
    await expect(page.getByLabel("Birth hour")).toBeVisible();
    await expectFormTypography(page, ".auth-page", "Auth create-account form");

    await page.getByLabel("Birth month").fill("02");
    await page.getByLabel("Birth day").fill("18");
    await page.getByLabel("Birth year").fill("1979");
    await page.getByLabel("Birth hour").fill("08");
    await page.getByLabel("Birth minute").fill("24");
    await page.getByLabel("I don't know my birth time.").check();
    await expect(page.getByLabel("Birth hour")).toBeDisabled();

    await page.getByRole("button", { name: /Create Account/ }).click();
    await expect(page.getByText(/Add Supabase environment variables|Add an email and password/)).toBeVisible();
    await assertNoClientErrors();
  });

  test("Calendar dates remain usable during a reading timeout and recover without losing a draft", async ({ page }) => {
    test.setTimeout(90_000);
    await seedClientState(page, { now: "2026-09-20T16:00:00.000Z" });
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    let releaseContent!: () => void;
    const gate = new Promise<void>(resolve => { releaseContent = resolve; });
    await page.route("**/assets/fallback-content-deferred-core-*.js", async route => {
      await gate;
      await route.continue();
    });
    await page.goto("/#calendar?view=day&date=2026-09-20", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: "Selected week", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Month", exact: true })).toBeEnabled();
    await page.locator("button.calendar-checkin-card").click();
    const editor = page.getByRole("dialog", { name: "Check-in", exact: true });
    for (let step = 0; step < 3; step++) await editor.getByRole("button", { name: "Next", exact: true }).click();
    await editor.locator("textarea").fill("Keep this private draft during recovery.");
    await expect(page.locator(".calendar-sky-card").getByRole("alert")).toContainText("reading could not load", { timeout: 10_000 });
    await expect(editor.locator("textarea")).toHaveValue("Keep this private draft during recovery.");
    releaseContent();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.locator(".calendar-sky-card").getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.locator('.calendar-sky-card [aria-label="Moon guidance"]').first()).toBeVisible();
    await expect(page.locator(".calendar-sky-card").getByRole("alert")).toHaveCount(0);
  });

  test("Calendar selected check-in ignores slow library and history; retry preserves the draft", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { profile: true, now: "2026-09-20T16:00:00.000Z" });
    await seedSignedInSession(page);
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    const queries: URL[] = [];
    await page.route("**/rest/v1/calendar_check_ins?**", async route => {
      const url = new URL(route.request().url());
      queries.push(url);
      expect(url.searchParams.get("user_id")).toBe(`eq.${fixtureUserId}`);
      expect(url.searchParams.getAll("date_key")).toHaveLength(2);
      await route.fulfill({ json: [] });
    });
    let refuseLibrary = true;
    await page.route("**/rest/v1/calendar_check_in_library?**", route => refuseLibrary
      ? route.fulfill({ status: 503, json: { message: "Fixture unavailable" } })
      : route.fulfill({ json: [{ user_id: fixtureUserId, kind: "tag", label: "My saved tag" }] }));
    await page.goto("/#calendar?view=day&date=2026-09-20");
    await page.locator("button.calendar-checkin-card").click();
    const editor = page.getByRole("dialog", { name: "Check-in", exact: true });
    await expect(editor.getByRole("button", { name: "Next", exact: true })).toBeVisible({ timeout: 2_000 });
    for (let step = 0; step < 3; step++) await editor.getByRole("button", { name: "Next", exact: true }).click();
    await editor.locator("textarea").fill("Draft survives the tags retry.");
    await editor.getByRole("button", { name: /^Tags/ }).click();
    await expect(editor.getByRole("alert")).toContainText("saved tags could not load");
    refuseLibrary = false;
    await editor.getByRole("button", { name: "Retry tags" }).click();
    await expect(editor.getByRole("button", { name: "Delete tag My saved tag" })).toBeVisible();
    await editor.getByRole("button", { name: "Done", exact: true }).click();
    await expect(editor.locator("textarea")).toHaveValue("Draft survives the tags retry.");
    expect(queries.filter(url => url.searchParams.get("select")?.includes("note")).every(url =>
      url.searchParams.getAll("date_key").join(",") === "gte.2026-09-20,lte.2026-09-20")).toBe(true);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: "Month", exact: true }).click();
    await expect.poll(() => queries.some(url => url.searchParams.get("select") === "user_id,date_key,mood")).toBe(true);
  });

  test("Calendar stalled selected check-in times out and retries without an empty editable form", async ({ page }) => {
    test.setTimeout(90_000);
    await seedClientState(page, { profile: true, now: "2026-09-20T16:00:00.000Z" });
    await seedSignedInSession(page);
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    let release!: () => void;
    const stalled = new Promise<void>(resolve => { release = resolve; });
    let block = true;
    await page.route("**/rest/v1/calendar_check_ins?**", async route => {
      if (block) await stalled;
      await route.fulfill({ json: [] });
    });
    await page.goto("/#calendar?view=day&date=2026-09-20");
    await page.locator("button.calendar-checkin-card").click();
    const editor = page.getByRole("dialog", { name: "Check-in", exact: true });
    await expect(editor.getByRole("alert")).toContainText("saved check-in could not load", { timeout: 10_000 });
    await expect(editor.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
    block = false;
    release();
    await editor.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Next", exact: true })).toBeVisible({ timeout: 2_000 });
  });

  for (const { width, theme } of [{ width: 1440, theme: "light" }, { width: 390, theme: "dark" }] as const) {
    test(`Calendar interaction controls and private people search ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
      await seedClientState(page, { profile: true, friends: true, theme, now: "2026-09-20T16:00:00.000Z" });
      await seedSignedInSession(page);
      const entries: Array<Record<string, unknown>> = [];
      let labels: Array<{ user_id: string; kind: string; label: string }> = [];
      let refuseDelete = false;
      let friendRequests = 0;
      let checkInsGate = Promise.resolve();
      let refuseCheckInLoad = false;
      await page.route("**/rest/v1/rpc/list_social_friends", route => route.fulfill({ json: [{
        friendship_id: "qa-calendar-friend", user_id: "qa-avery", handle: "avery_qa", display_name: "Avery",
        avatar_url: null, natal_chart: null, viewer_shares_chart: false, friend_shares_chart: false, accepted_at: fixedNow
      }] }));
      await page.route("**/rest/v1/rpc/send_social_friend_request", route => { friendRequests++; return route.fulfill({ json: [] }); });
      await page.route("**/rest/v1/calendar_check_ins?**", async route => {
        if (route.request().method() === "POST") {
          const row = route.request().postDataJSON();
          expect(row.user_id).toBe(fixtureUserId);
          entries.splice(0, entries.length, row);
          await route.fulfill({ json: row });
        } else {
          await checkInsGate;
          if (refuseCheckInLoad) return route.fulfill({ status: 500, json: { message: "Fixture refused load" } });
          await route.fulfill({ json: entries, headers: { "content-range": entries.length ? "0-0/1" : "*/0" } });
        }
      });
      await page.route("**/rest/v1/calendar_check_in_library?**", async route => {
        const url = new URL(route.request().url());
        if (route.request().method() === "POST") {
          const row = route.request().postDataJSON();
          expect(row.user_id).toBe(fixtureUserId);
          if (!labels.some(label => label.kind === row.kind && label.label === row.label)) labels.push(row);
          await route.fulfill({ status: 201, json: row });
        } else if (route.request().method() === "DELETE") {
          expect(url.searchParams.get("user_id")).toBe(`eq.${fixtureUserId}`);
          expect(url.searchParams.get("kind")).toBe("eq.tag");
          if (refuseDelete) return route.fulfill({ status: 500, json: { message: "Fixture refused delete" } });
          labels = labels.filter(label => label.label !== url.searchParams.get("label")?.slice(3));
          await route.fulfill({ status: 204, body: "" });
        } else await route.fulfill({ json: labels });
      });
      await page.goto("/#calendar?view=day&date=2026-09-20");
      const strip = page.getByRole("region", { name: "Selected week", exact: true });
      await expect(strip).toBeVisible();
      await expect(page.getByLabel("Upcoming lunar milestones")).toHaveCount(0);
      const initialTop = (await strip.boundingBox())!.y;
      await strip.hover();
      await page.mouse.wheel(0, 600);
      await expect.poll(async () => (await strip.boundingBox())!.y).toBeLessThan(initialTop - 100);
      expect(page.url()).toContain("date=2026-09-20");
      await page.getByRole("tab", { name: "Week", exact: true }).click();
      await expect(page.locator(".lunar-milestones")).toHaveCount(0);
      await page.getByRole("tab", { name: "Day", exact: true }).click();
      const checkIn = page.getByRole("dialog", { name: "Check-in", exact: true });
      async function openNotes(open = true) {
        if (open) await page.locator("button.calendar-checkin-card").click();
        await expect(checkIn).toBeVisible();
        for (let step = 0; step < 3; step++) await checkIn.getByRole("button", { name: "Next", exact: true }).click();
      }
      await openNotes();
      await checkIn.getByRole("button", { name: /^Tags/ }).click();
      const tagSheet = checkIn.locator('[data-screen-label="Tags"]');
      await expect(tagSheet.getByText(/Got promoted|Got laid off|Rest Day|Beginnings|Little Wins/)).toHaveCount(0);
      for (const tag of ["Train ride", "Weekend"]) {
        await tagSheet.getByRole("button", { name: "New tag", exact: true }).click();
        await tagSheet.getByRole("textbox", { name: "Tag name" }).fill(tag);
        await tagSheet.getByRole("button", { name: "Add tag", exact: true }).click();
        await expect(tagSheet.getByRole("button", { name: `Delete tag ${tag}`, exact: true })).toBeVisible();
      }
      const remove = tagSheet.getByRole("button", { name: "Delete tag Weekend", exact: true });
      const bounds = await remove.evaluate(button => ({ button: button.getBoundingClientRect().toJSON(), pill: button.parentElement!.getBoundingClientRect().toJSON() }));
      expect(bounds.button.left).toBeGreaterThanOrEqual(bounds.pill.left);
      expect(bounds.button.right).toBeLessThanOrEqual(bounds.pill.right);
      refuseDelete = true;
      await remove.click();
      await expect(tagSheet.getByRole("alert")).toContainText("could not be deleted");
      await expect(remove).toBeVisible();
      refuseDelete = false;
      await remove.click();
      await expect(remove).toHaveCount(0);
      await page.screenshot({ path: `test-results/calendar-interactions-tags-${theme}-${width}.png` });
      await tagSheet.getByRole("button", { name: "Done", exact: true }).click();
      await checkIn.getByRole("button", { name: /^People/ }).click();
      const peopleSheet = checkIn.locator('[data-screen-label="Friends"]');
      const search = peopleSheet.getByRole("searchbox", { name: "Search charts, friends, or names" });
      await search.fill("nik");
      const chart = peopleSheet.getByRole("button", { name: /Nikki.*Chart/ });
      await expect(chart).toBeVisible();
      await expect(peopleSheet.getByRole("button", { name: /River.*Chart/ })).toHaveCount(0);
      await chart.click();
      await expect(chart).toHaveAttribute("aria-pressed", "true");
      await search.fill("AVERY_QA");
      const friend = peopleSheet.getByRole("button", { name: /Avery.*Friend.*@avery_qa/ });
      await friend.click();
      await expect(friend).toHaveAttribute("aria-pressed", "true");
      await page.screenshot({ path: `test-results/calendar-interactions-people-${theme}-${width}.png` });
      await peopleSheet.getByRole("button", { name: "Done", exact: true }).click();
      await checkIn.getByRole("button", { name: "Next", exact: true }).click();
      await checkIn.getByRole("button", { name: "Save", exact: true }).click();
      await expect(checkIn).toHaveCount(0);
      expect(entries[0].tags).toEqual(["Train ride"]);
      expect(entries[0].people).toEqual(["Nikki", "Avery"]);
      expect(friendRequests).toBe(0);
      let releaseCheckIns!: () => void;
      checkInsGate = new Promise<void>(resolve => { releaseCheckIns = resolve; });
      await page.reload();
      await page.locator("button.calendar-checkin-card").click();
      try {
        await expect(checkIn.getByRole("status")).toContainText("Loading your check-in");
        await expect(checkIn.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
      } finally {
        releaseCheckIns();
      }
      await openNotes(false);
      await expect(checkIn.locator(".calendar-checkin__people")).toContainText("Avery");
      await checkIn.getByRole("button", { name: /^Tags/ }).click();
      await expect(tagSheet.getByRole("button", { name: "Delete tag Train ride", exact: true })).toBeVisible();
      await expect(tagSheet.getByRole("button", { name: "Delete tag Weekend", exact: true })).toHaveCount(0);
      refuseCheckInLoad = true;
      await page.reload();
      await page.locator("button.calendar-checkin-card").click();
      await expect(checkIn.getByRole("alert")).toContainText("Your saved check-in could not load");
      await expect(checkIn.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
      refuseCheckInLoad = false;
      await checkIn.getByRole("button", { name: "Retry", exact: true }).click();
      await openNotes(false);
      await expect(checkIn.locator(".calendar-checkin__people")).toContainText("Avery");
    });
  }

  test("guest calendar check-in opens login to save a journal entry", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { now: "2026-09-20T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar?view=day&date=2026-09-20");
    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByRole("button", { name: /Check in/ })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Check in/ }).click();
    const checkIn = page.getByRole("dialog", { name: "Check-in" });
    await expect(checkIn.getByRole("heading", { name: "How are you feeling?" })).toBeVisible();
    await expect(checkIn.getByText("Sign in to save this check-in with your account.")).toHaveCount(0);
    await checkIn.getByRole("button", { name: "Good" }).click();
    for (let step = 0; step < 4; step += 1) {
      await checkIn.getByRole("button", { name: "Next" }).click();
    }
    await expect(checkIn.getByRole("heading", { name: "Anything else?" })).toBeVisible();
    await expect(checkIn.getByText("Sign in to save this check-in with your account.")).toHaveCount(0);
    await checkIn.getByRole("button", { name: "Sign in to save" }).click();

    await expect(page.getByRole("region", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to save your journal entry..." })).toBeVisible();
    await expect(page.getByText("Return to your sky.")).toHaveCount(0);
    await expect(page.getByPlaceholder("you@somewhere.com")).toBeVisible();
    await assertNoClientErrors();
  });

  test("mobile sky controls and menu navigation work", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();

    const dateControl = page.getByRole("button", { name: /Today, New York/ });
    await expect(dateControl).toBeVisible();
    await dateControl.click();
    const skyControls = page.getByRole("dialog", { name: "Sky controls" });
    await expect(skyControls).toBeVisible();
    await expect(skyControls.getByRole("button", { name: "Today", exact: true })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: "Tomorrow" })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: "Date" })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: /New York/ })).toBeVisible();

    await skyControls.getByRole("button", { name: /New York/ }).click();
    await expect(skyControls).toBeVisible();
    await expect(skyControls.getByRole("form", { name: "Change location" })).toBeVisible();
    await expect(skyControls.getByLabel("City")).toBeVisible();
    await expect(page.locator(".hero-city-picker--mobile")).toHaveCount(0);

    await skyControls.getByRole("button", { name: "Back to Sky controls" }).click();
    await expect(skyControls.getByRole("button", { name: "Today", exact: true })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: /New York/ })).toBeFocused();

    await skyControls.getByRole("button", { name: /New York/ }).click();
    await skyControls.getByLabel("City").fill("Boston, MA");
    await skyControls.getByRole("button", { name: "Update" }).click();
    await expect(skyControls.getByRole("button", { name: /Boston/ })).toBeVisible();

    await skyControls.getByRole("button", { name: "Tomorrow" }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: /settings/i }).click();
    await expect(page.getByText("settings.")).toBeVisible();
    await assertNoClientErrors();
  });

  test("constrained Sky header shows one brand mark", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 1000, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    const header = page.locator(".topbar");
    const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });

    await expect(header.getByRole("button", { name: "Home", exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "TLDR Astro home" })).toBeVisible();
    await expect(primaryNavigation, "Constrained header moves primary navigation into the menu").toBeHidden();
    await expect(primaryNavigation.getByRole("button", { name: "Sky", exact: true })).toBeHidden();
    await expect(header.getByRole("button", { name: "Open menu" })).toBeVisible();
    await assertNoClientErrors();
  });

  for (const theme of ["light", "dark"] as const) {
    for (const width of [390, 768, 1440]) {
      test(`logo keeps its surface while scrolling ${theme} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await seedClientState(page, { profile: true, theme });
        await expectClientRouteLoads(page, "/#you");
        const logo = page.locator(".nav-pill");
        const surface = () => logo.evaluate(node => {
          const style = getComputedStyle(node);
          return { background: style.backgroundColor, border: style.border, shadow: style.boxShadow };
        });
        await expect(logo).toBeVisible();
        const atTop = await surface();
        expect(atTop.background).not.toBe("rgba(0, 0, 0, 0)");
        expect(atTop.shadow).not.toBe("none");
        const expectSharedElevation = async () => {
          for (const selector of [".sky-header-date-button", ".menu-toggle", ".theme-toggle"]) {
            const control = page.locator(selector);
            if (await control.isVisible()) await expect(control).toHaveCSS("box-shadow", atTop.shadow);
          }
        };
        await expectSharedElevation();
        // The desktop loading shell can fit in the viewport. Exercise real
        // scrolling once reader content has given the document room to scroll.
        await expect.poll(() => page.evaluate(() => {
          window.scrollTo(0, 600);
          return window.scrollY;
        }), { timeout: 15_000 }).toBeGreaterThan(8);
        await expect(page.locator("html")).toHaveAttribute("data-scrolled", "");
        await expect.poll(surface).toEqual(atTop);
        await expectSharedElevation();
        await expect(logo.getByRole("button", { name: "TLDR Astro home" })).toBeVisible();
        await mkdir(responsiveScreenshotDir, { recursive: true });
        await page.screenshot({ path: path.join(responsiveScreenshotDir, `logo-scrolled-${theme}-${width}.png`) });
        await page.getByRole("button", { name: "Open menu" }).click();
        await expect(page.locator(".site-menu")).toBeVisible();
        await expect(page.locator(".site-menu")).toHaveCSS("box-shadow", atTop.shadow);
        await page.screenshot({ path: path.join(responsiveScreenshotDir, `navigation-menu-${theme}-${width}.png`) });
        await page.keyboard.press("Escape");
        await expect(page.locator(".site-menu")).toBeHidden();
        await page.locator(".sky-header-date-button").click();
        await expect(page.locator(".date-picker")).toBeVisible();
        await expect(page.locator(".date-picker")).toHaveCSS("box-shadow", atTop.shadow);
        await page.keyboard.press("Escape");
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.locator("html")).not.toHaveAttribute("data-scrolled", "");
        await expect.poll(surface).toEqual(atTop);
      });
    }
  }

  test("narrow mobile sky cards and header stay inside their rails", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 320, height: 568 });
    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await expect(page.getByRole("list", { name: "Daily planetary placements" })).toBeVisible({ timeout: 15_000 });

    const layout = await page.evaluate(() => {
      const tolerance = 1;
      const nav = document.querySelector(".nav-pill")?.getBoundingClientRect();
      const actions = document.querySelector(".topbar-actions")?.getBoundingClientRect();
      const overflowingCardChildren = Array.from(
        document.querySelectorAll(".retrograde-section .planet-placement-row__body > *")
      ).flatMap((element) => {
        const child = element.getBoundingClientRect();
        const card = element.closest(".planet-placement-row")?.getBoundingClientRect();

        if (!card || (child.left >= card.left - tolerance && child.right <= card.right + tolerance)) {
          return [];
        }

        return [{
          className: element.className,
          childLeft: child.left,
          childRight: child.right,
          cardLeft: card.left,
          cardRight: card.right
        }];
      });
      const location = document.querySelector(".sky-today-ledger__head p span:last-child");
      const locationStyle = location ? getComputedStyle(location) : null;
      const locationRect = location?.getBoundingClientRect();
      const locationLineHeight = locationStyle ? Number.parseFloat(locationStyle.lineHeight) : 0;

      return {
        headerControlsOverlap: Boolean(nav && actions && nav.right > actions.left + tolerance),
        overflowingCardChildren,
        locationWraps: Boolean(locationRect && locationLineHeight && locationRect.height > locationLineHeight * 1.5)
      };
    });

    expect(layout.headerControlsOverlap, "Narrow Sky header controls do not overlap").toBe(false);
    expect(layout.overflowingCardChildren, "Narrow Sky card contents stay inside their cards").toEqual([]);
    expect(layout.locationWraps, "Narrow Sky location stays on one line").toBe(false);

    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const mobileRail = await page.locator(".detail-panel").boundingBox();
      expect(mobileRail, `Sky content rail is rendered at ${width}px`).not.toBeNull();

      if (mobileRail) {
        const expectedRailLeft = (width - mobileRail.width) / 2;
        expect(Math.abs(mobileRail.x - expectedRailLeft), `Sky content rail is centered at ${width}px`).toBeLessThanOrEqual(1);
        expect(mobileRail.x, `Sky content rail starts inside ${width}px viewport`).toBeGreaterThanOrEqual(-1);
        expect(mobileRail.x + mobileRail.width, `Sky content rail ends inside ${width}px viewport`).toBeLessThanOrEqual(width + 1);
      }
    }

    await expectNoHorizontalOverflow(page, "Narrow mobile Sky");
    await assertNoClientErrors();
  });

  test("narrow mobile calendar surfaces stay inside the page container", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 320, height: 568 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.locator(".calendar-day-panel")).toBeVisible();
    await captureResponsiveSurface(page, "mobile", "calendar-day");

    const layout = await page.evaluate(() => {
      const tolerance = 1;
      const container = document.querySelector(".lunar-calendar-view")?.getBoundingClientRect();
      const selectors = [
        ".lunar-calendar-body",
        ".lunar-calendar-week-view",
        ".lunar-week-strip",
        ".calendar-day-panel",
        ".lunar-week-transits"
      ];
      const overflowingSurfaces = selectors.flatMap((selector) => {
        const surface = document.querySelector(selector)?.getBoundingClientRect();

        if (
          !container
          || !surface
          || (surface.left >= container.left - tolerance && surface.right <= container.right + tolerance)
        ) {
          return [];
        }

        return [{
          selector,
          surfaceLeft: surface.left,
          surfaceRight: surface.right,
          containerLeft: container.left,
          containerRight: container.right
        }];
      });

      return { overflowingSurfaces };
    });

    expect(layout.overflowingSurfaces, "Calendar surfaces honor the narrow page gutter").toEqual([]);
    await expectNoHorizontalOverflow(page, "Narrow mobile Calendar");

    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.locator(".lunar-calendar-day")).toHaveCount(42);
    await expect(page.locator(".calendar-month-chip").first()).toBeVisible({ timeout: 60_000 });
    const mobileMonthMetrics = await page.evaluate(() => {
      const day = document.querySelector(".lunar-calendar-day")?.getBoundingClientRect();
      const tab = document.querySelector('[role="tab"][aria-selected="true"]')?.getBoundingClientRect();
      return {
        dayHeight: day?.height ?? 0,
        tabHeight: tab?.height ?? 0,
        nestedMonthFocusStops: document.querySelectorAll(".lunar-calendar-day [tabindex='0']").length
      };
    });
    expect(mobileMonthMetrics.dayHeight, "Month cells stay scannable on a narrow phone").toBeLessThanOrEqual(100);
    expect(mobileMonthMetrics.tabHeight, "Calendar view tabs meet the mobile touch target").toBeGreaterThanOrEqual(44);
    expect(mobileMonthMetrics.nestedMonthFocusStops, "Each date is a single keyboard stop").toBe(0);
    await captureResponsiveSurface(page, "mobile", "calendar-month");
    await assertNoClientErrors();
  });

  test("direct links restore sky and friend detail state", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#sky/placement/sun");

    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close detail" })).toBeVisible();
    await expect(page.locator("#sky-detail-title")).toContainText(/Sun/i);

    await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-nikki&view=synastry");
    await expect(page.getByRole("region", { name: "Nikki chart profile" })).toBeVisible();
    await page.getByRole("button", { name: /More, \d+ sections/ }).click();
    await expect(page.getByRole("menuitemradio", { name: /^Synastry/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("What synastry shows")).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can sign out from the site menu", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    const user = { id: fixtureUserId, email: "qa-flow@example.com", aud: "authenticated", role: "authenticated",
      app_metadata: { provider: "email" }, user_metadata: { name: "Project Author" } };
    const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
    await page.addInitScript(({ user, storageKey }) => localStorage.setItem(storageKey, JSON.stringify({
      access_token: "synthetic-signout-token", refresh_token: "synthetic-refresh", user,
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer"
    })), { user, storageKey });
    let signedOut = false;
    await page.route("**/auth/v1/**", route => {
      if (new URL(route.request().url()).pathname.endsWith("/logout")) {
        signedOut = true;
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: user });
    });
    await expectClientRouteLoads(page, "/#you");

    await expect(page.getByText("Project Author")).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect.poll(() => signedOut).toBe(true);

    await expect(page.getByRole("region", { name: "Create account" })).toBeVisible();
    await expect(page.getByText("Create profile")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You" })).toHaveCount(0);
    await assertNoClientErrors();
  });

  test("captures light and dark visual flow across client-facing surfaces", async ({ page }) => {
    test.setTimeout(60_000);
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true, theme: "light" });

    for (const theme of ["light", "dark"] as const) {
      await expectClientRouteLoads(page, "/#sky");
      await page.evaluate((nextTheme) => {
        window.localStorage.setItem("tldrastro:theme", nextTheme);
      }, theme);
      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: /The sky today|Today, simple/i })).toBeVisible();
      await captureThemeSurface(page, theme, "sky");

      await expectClientRouteLoads(page, "/#you");
      await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible({
        timeout: routeReadyTimeoutMs
      });
      await captureThemeSurface(page, theme, "you");

      await expectClientRouteLoads(page, "/#friends?tab=charts");
      await expect(page.getByText("Nikki")).toBeVisible();
      await captureThemeSurface(page, theme, "friends");

      await expectClientRouteLoads(page, "/#calendar");
      await expect(page.getByLabel("Lunar calendar")).toBeVisible();
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
      await captureThemeSurface(page, theme, "calendar");

      await expectClientRouteLoads(page, "/#settings");
      await expect(page.getByText("settings.")).toBeVisible();
      await captureThemeSurface(page, theme, "settings");
    }

    await assertNoClientErrors();
  });

  test("desktop web viewport supports core client-facing flows", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await seedClientState(page, { profile: true, friends: true });

    await expectClientRouteLoads(page, "/#sky");
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await captureResponsiveSurface(page, "desktop", "sky");
    await expectNoHorizontalOverflow(page, "Desktop Sky");

    await page.getByRole("button", { name: "You" }).click();
    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await captureResponsiveSurface(page, "desktop", "you");
    await expectNoHorizontalOverflow(page, "Desktop You");

    await page.getByRole("button", { name: "Friends", exact: true }).click();
    await page.getByRole("tab", { name: "Charts" }).click();
    await page.getByRole("button", { name: "Open Nikki" }).click();
    await expect(page.getByRole("region", { name: "Nikki chart profile" })).toBeVisible();
    await selectFriendDetailTab(page, "Synastry");
    await expect(page.getByText("What synastry shows")).toBeVisible();
    await captureResponsiveSurface(page, "desktop", "friends-synastry");
    await expectNoHorizontalOverflow(page, "Desktop Friends Synastry");

    await expectClientRouteLoads(page, "/#calendar");
    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
    await captureResponsiveSurface(page, "desktop", "calendar");
    await expectNoHorizontalOverflow(page, "Desktop Calendar");

    await expectClientRouteLoads(page, "/#settings");
    await expect(page.getByText("settings.")).toBeVisible();
    await captureResponsiveSurface(page, "desktop", "settings");
    await expectNoHorizontalOverflow(page, "Desktop Settings");
    await assertNoClientErrors();
  });

  test("mobile viewport supports core client-facing flows", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { profile: true, friends: true });

    await expectClientRouteLoads(page, "/#sky");
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await captureResponsiveSurface(page, "mobile", "sky");
    await expectNoHorizontalOverflow(page, "Mobile Sky");

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "You" }).click();
    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await captureResponsiveSurface(page, "mobile", "you");
    await expectNoHorizontalOverflow(page, "Mobile You");

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Friends" }).click();
    await page.getByRole("tab", { name: "Charts" }).click();
    await page.getByRole("button", { name: "Open Nikki" }).click();
    await expect(page.getByRole("region", { name: "Nikki chart profile" })).toBeVisible();
    await selectFriendDetailTab(page, "Synastry");
    await expect(page.getByText("What synastry shows")).toBeVisible();
    await captureResponsiveSurface(page, "mobile", "friends-synastry");
    await expectNoHorizontalOverflow(page, "Mobile Friends Synastry");

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Calendar" }).click();
    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
    await captureResponsiveSurface(page, "mobile", "calendar");
    await expectNoHorizontalOverflow(page, "Mobile Calendar");

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page.getByText("settings.")).toBeVisible();
    await captureResponsiveSurface(page, "mobile", "settings");
    await expectNoHorizontalOverflow(page, "Mobile Settings");
    await assertNoClientErrors();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`empty Friends directory keeps its heading rail in ${theme} theme`, async ({ page }) => {
      await seedClientState(page, { profile: true, theme });
      await expectClientRouteLoads(page, "/#friends?tab=charts");
      await expect(page.getByRole("region", { name: "No charts" })).toBeVisible();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const title = page.getByRole("heading", { name: "friends.", level: 1, exact: true });
        const heading = await title.boundingBox();
        const panel = await page.locator(".friends-unified-panel").boundingBox();
        expect(Math.abs(heading!.x - panel!.x)).toBeLessThan(1);
        expect(heading!.y + heading!.height).toBeLessThan(panel!.y);
        const navigation = await page.getByRole("button", { name: "Open menu" }).boundingBox();
        const clearance = heading!.y - navigation!.y - navigation!.height;
        expect(clearance, "Heading clears the fixed navigation").toBeGreaterThan(0);
        expect(clearance, "Mobile and desktop clearance is applied only once").toBeLessThan(96);
        await mkdir(responsiveScreenshotDir, { recursive: true });
        await page.screenshot({ path: path.join(responsiveScreenshotDir, `friends-empty-${theme}-${width}.png`) });
      }
    });

    test(`friends relationship layouts align and fit in ${theme} theme`, async ({ page }) => {
      test.setTimeout(120_000);
      const assertNoClientErrors = await expectNoClientErrors(page);
      await seedClientState(page, { profile: true, friends: true, theme });
      await expectClientRouteLoads(page, "/#friends?tab=charts");
      await expect(page.locator(".app-shell")).toHaveClass(new RegExp(`theme-${theme}`));
      await mkdir(responsiveScreenshotDir, { recursive: true });
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const heading = page.locator(".friends-page-heading");
        const panel = page.locator(".friends-unified-panel");
        const headingBox = await heading.boundingBox();
        const panelBox = await panel.boundingBox();
        expect(Math.abs(headingBox!.x - panelBox!.x), "Friends title shares the directory rail").toBeLessThan(1);
        await expect(heading.locator("h1")).toHaveText("friends.");
        expect(headingBox!.y + headingBox!.height).toBeLessThan(panelBox!.y);
        await page.screenshot({ path: path.join(responsiveScreenshotDir, `friends-list-${theme}-${width}.png`) });
      }
      await page.getByRole("button", { name: "Open Nikki" }).click();
      for (const view of ["Synastry", "Composite"] as const) {
        await selectFriendDetailTab(page, view);
        const rows = page.locator(view === "Synastry" ? ".synastry-placement-row" : ".composite-placements-section .placement-table-row");
        await expect(rows.first()).toBeVisible();
        for (const width of [1440, 1280, 1080, 1024, 820, 768, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          // Force offscreen placement cards to render before measuring them.
          for (const row of await rows.all()) await row.scrollIntoViewIfNeeded();
          const defects = await rows.evaluateAll(rows => rows.flatMap(row => {
            const box = row.getBoundingClientRect();
            const rail = row.closest(".friend-detail-content-column")!.getBoundingClientRect();
            const issues: string[] = [];
            if (box.left < rail.left - 1 || box.right > rail.right + 1) issues.push("card exceeds content rail");
            for (const child of row.querySelectorAll(".synastry-placement-lead, .synastry-placement-sign, .synastry-placement-degree, .synastry-placement-house, .placement-table-row__body, .placement-table-row__glyph")) {
              const bounds = child.getBoundingClientRect();
              if (bounds.left < box.left - 1 || bounds.right > box.right + 1) issues.push(`clipped ${child.className}`);
            }
            return issues;
          }));
          expect(defects, `${view} ${theme} ${width}px`).toEqual([]);
          if (view === "Synastry") {
            const geometry = await rows.evaluateAll(rows => rows.map(row => ({height:row.getBoundingClientRect().height,padding:getComputedStyle(row).padding})));
            expect(new Set(geometry.map(row => row.height)).size, "Both people's rows have equal height").toBe(1);
            expect(new Set(geometry.map(row => row.padding)).size, "Both people's rows have equal padding").toBe(1);
          }
          await expectNoHorizontalOverflow(page, `${view} ${theme} ${width}px`);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: path.join(responsiveScreenshotDir, `friends-${view}-${theme}-${width}.png`) });
          await rows.first().scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(responsiveScreenshotDir, `friends-${view}-placements-${theme}-${width}.png`) });
        }
      }
      await assertNoClientErrors();
    });
  }

  for (const theme of ["light", "dark"] as const) {
    test(`synastry write-ups appear on first visit and open in full in ${theme} theme`, async ({ page }) => {
      const assertNoClientErrors = await expectNoClientErrors(page);
      await seedClientState(page, { profile: true, profileBirthDate: "1990-02-25", friends: true, theme });
      await expectClientRouteLoads(page, "/#friends?tab=charts");
      await page.getByRole("button", { name: "Open Nikki" }).click();
      await selectFriendDetailTab(page, "Synastry");
      const card = page.getByRole("button", { name: "Open full entry for Your Moon sextile Nikki's Neptune", exact: true });
      const copy = card.locator(".synastry-contact-description");
      const source = fallbackSourceRowsV3.hookRows.find(row => row.contentKey === "fallback-hook/synastry-pair/moon/neptune/soft");
      expect(source?.body_you).toBeTruthy();
      const expectedCopy = source!.body_you!.replaceAll("{{holder2}}", "Nikki");
      await expect(copy).toHaveText(expectedCopy, { timeout: 15_000 });
      await mkdir(responsiveScreenshotDir, { recursive: true });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await card.scrollIntoViewIfNeeded();
        const cardBox = await card.boundingBox();
        const copyBox = await copy.boundingBox();
        expect(copyBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
        expect(copyBox!.x + copyBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
        await card.screenshot({ path: path.join(responsiveScreenshotDir, `synastry-write-up-${theme}-${width}.png`) });
      }
      await card.click();
      await expect(page.locator(".app-shell.mode-detail")).toContainText(expectedCopy);
      await assertNoClientErrors();
    });
  }

  test("synastry placement data stays inside each card after lazy styles load", async ({ page }) => {
    test.setTimeout(60_000);
    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");
    await page.getByRole("button", { name: "Open Nikki" }).click();
    await selectFriendDetailTab(page, "Synastry");
    const rows = page.locator(".synastry-placement-row:not(.synastry-placement-row-empty)");
    await expect(rows.first()).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        localStorage.setItem("tldrastro:theme", theme);
      }, theme);
      await page.reload();
      await expect(rows.first()).toBeVisible();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const overflow = await rows.evaluateAll((rows) => rows.flatMap((row) => {
          const bounds = row.getBoundingClientRect();
          return Array.from(row.querySelectorAll(".synastry-placement-lead, .synastry-placement-sign, .synastry-placement-degree, .synastry-placement-house"))
            .filter((child) => {
              const box = child.getBoundingClientRect();
              return box.left < bounds.left - 1 || box.right > bounds.right + 1;
            }).map((child) => child.textContent);
        }));
        expect(overflow, `${theme} synastry at ${width}px`).toEqual([]);
        await mkdir(responsiveScreenshotDir, { recursive: true });
        await page.locator(".synastry-placements-comparison").screenshot({
          path: path.join(responsiveScreenshotDir, `synastry-${theme}-${width}.png`)
        });
      }
    }
  });

  test("main app pages keep shared label styling across desktop and mobile", async ({ page }) => {
    test.setTimeout(60_000);
    const assertNoClientErrors = await expectNoClientErrors(page);

    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "mobile", width: 390, height: 844 }
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedClientState(page, { profile: true, friends: true });

      await expectClientRouteLoads(page, "/#sky");
      const responsiveSkyHeading = viewport.name === "mobile"
        ? page.getByRole("region", { name: "The sky today" }).getByRole("heading", { level: 3, name: "The sky today" })
        : page.getByRole("heading", { level: 1, name: /The sky today|Today, simple/i });
      await expect(responsiveSkyHeading).toBeVisible();
      await expect(page.getByRole("list", { name: "Daily planetary placements" })).toBeVisible({ timeout: 15_000 });
      await expectSharedLabelContract(page, `${viewport.name} Sky`, { requireLabels: false });
      await expectNoHorizontalOverflow(page, `${viewport.name} Sky label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-sky");

      await expectClientRouteLoads(page, "/#you");
      await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: /updates|transits/i }).click();
      await expect(page.getByRole("tab", { name: /updates|transits/i })).toHaveAttribute("aria-selected", "true");
      await expectSharedLabelContract(page, `${viewport.name} You updates`);
      await expectNoHorizontalOverflow(page, `${viewport.name} You updates label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-you-updates");

      await page.getByRole("tab", { name: /natal chart/i }).click();
      await expect(page.getByRole("tab", { name: /natal chart/i })).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("[aria-label='Natal placements'], [aria-label='Bodies in signs and houses']").first()).toBeVisible();
      await expectSharedLabelContract(page, `${viewport.name} You natal chart`);
      await expectNoHorizontalOverflow(page, `${viewport.name} You natal chart label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-you-natal-chart");

      await expectClientRouteLoads(page, "/#friends?tab=charts");
      await expect(page.getByText("friends.")).toBeVisible();
      await page.getByRole("button", { name: "Open Nikki" }).click();
      await expect(page.getByRole("region", { name: "Nikki chart profile" })).toBeVisible();
      await page.getByRole("tab", { name: "Natal", exact: true }).click();
      await expect(page.getByRole("tab", { name: "Natal", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("region", { name: /Nikki's natal placements/ })).toBeVisible();
      await expectSharedLabelContract(page, `${viewport.name} Friends natal`);
      await expectNoHorizontalOverflow(page, `${viewport.name} Friends natal label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-friends-natal");

      await expectClientRouteLoads(page, "/#calendar");
      await expect(page.getByLabel("Lunar calendar")).toBeVisible();
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(".lunar-location-picker")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /New York.*Eastern/i })).toHaveCount(0);
      await expect(page.locator(".calendar-stoic-card").first()).toBeVisible({ timeout: 15_000 });
      await expectSharedLabelContract(page, `${viewport.name} Calendar`, { requireLabels: false });
      await expectLunarSelectedCardMinimalFonts(page, `${viewport.name} Calendar`);
      await expectLunarSelectedCardEventAlignment(page, `${viewport.name} Calendar`);
      await expectNoHorizontalOverflow(page, `${viewport.name} Calendar label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-calendar");

      await expectClientRouteLoads(page, "/#settings");
      await expect(page.getByText("settings.")).toBeVisible();
      await expectSharedLabelContract(page, `${viewport.name} Settings`);
      await expectNoHorizontalOverflow(page, `${viewport.name} Settings label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-settings");
    }

    await assertNoClientErrors();
  });

  test("guest can open and close the full current sky chart modal", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await page.getByRole("button", { name: "Open full current sky chart" }).click();
    await expect(page.getByRole("heading", { name: "Full sky chart" })).toBeVisible();
    await expect(page.getByLabel(/Full sky chart for/)).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can edit prefilled profile chart details", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#you");

    await expect(page.getByLabel("Profile summary")).toBeVisible();
    await page.getByRole("button", { name: "Profile options" }).click();
    await page.getByRole("menuitem", { name: "Edit details" }).click();

    await expect(page.getByRole("heading", { name: "Your birth information" })).toBeVisible();
    await expect(page.getByLabel("Birth month")).toBeVisible();
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expectFormTypography(page, ".chart-modal", "Create chart birth form");

    await page.getByLabel("I don't know my birth time.").check();
    await expect(page.getByLabel("Birth hour")).toBeDisabled();
    await page.getByRole("button", { name: "Close create chart" }).click();
    await expect(page.getByLabel("Profile summary")).toBeVisible();
    await assertNoClientErrors();
  });

  for (const restoredMode of ["profile", "friends"]) {
    test(`auth callback establishes one session before restoring ${restoredMode}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
      await seedClientState(page, { profile: true, preloadProfileNatalSky: true });
      // Exercise the real SDK callback, without a session preinstalled in storage.
      await seedSignedInSession(page, { storeSession: false });
      await page.addInitScript(mode => localStorage.setItem("tldrastro:portalMode", mode), restoredMode);
      let journalReads = 0;
      await page.route("**/rest/v1/calendar_check_ins?**", route => {
        expect(route.request().headers().authorization).toBe("Bearer fixture-callback-token");
        expect(new URL(route.request().url()).searchParams.get("user_id")).toBe(`eq.${fixtureUserId}`);
        journalReads++;
        return route.fulfill({ json: [] });
      });
      await page.goto("/#access_token=fixture-callback-token&refresh_token=fixture-callback-refresh&expires_in=3600&token_type=bearer");
      await expect.poll(() => page.evaluate(key => Boolean(localStorage.getItem(key)), supabaseAuthStorageKey())).toBe(true);
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.getByRole("menuitem", { name: "Account", exact: true }).click();
      await expect(page.getByText("Signed in with", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: /Open journal/ }).click();
      await expect(page.getByText("No check-ins yet", { exact: true })).toBeVisible();
      expect(journalReads).toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeHidden();
      // A second protected feature must use that same callback session.
      let reportRequests = 0;
      await page.route("**/api/you-report-request", route => {
        expect(route.request().headers().authorization).toBe("Bearer fixture-callback-token");
        reportRequests++;
        return route.fulfill({ status: 202, json: { status: "queued" } });
      });
      await page.goto("/#you");
      await expect(page.getByRole("button", { name: "Create day report", exact: true })).toBeEnabled({ timeout: 30_000 });
      await page.getByRole("button", { name: "Create day report", exact: true }).click();
      await expect(page.getByText("Your day report is being prepared.", { exact: false })).toBeVisible();
      expect(reportRequests).toBe(1);
    });
  }

  test("auth callback keeps navigation pending until verification succeeds and restarts a rejected sign-in", async ({ page }) => {
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    await seedClientState(page, { profile: true });
    await seedSignedInSession(page, { storeSession: false });
    await page.addInitScript(() => localStorage.setItem("tldrastro:portalMode", "friends"));
    let finishVerification!: () => void;
    const verification = new Promise<void>(resolve => { finishVerification = resolve; });
    let rejectVerification = true;
    await page.route("**/auth/v1/user", async route => {
      await verification;
      await route.fulfill(rejectVerification
        ? { status: 400, json: { message: "Synthetic verification failure" } }
        : { json: fixtureAuthUser });
    });
    await page.goto("/#access_token=fixture-callback-token&refresh_token=fixture-callback-refresh&expires_in=3600&token_type=bearer", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#app-startup")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeHidden();
    finishVerification();
    await expect(page).toHaveURL(/auth=login/);
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    expect(await page.evaluate(key => Boolean(localStorage.getItem(key)), supabaseAuthStorageKey())).toBe(false);
    rejectVerification = false;
    await page.goto("/#access_token=fixture-callback-token&refresh_token=fixture-callback-refresh&expires_in=3600&token_type=bearer");
    await expect.poll(() => page.evaluate(key => Boolean(localStorage.getItem(key)), supabaseAuthStorageKey())).toBe(true);
    await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeVisible();
  });

  test("account session refresh restores journal access without another sign-in", async ({ page }) => {
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    await seedClientState(page, { profile: true });
    await seedSignedInSession(page, { expiresIn: -60 });
    let refreshes = 0;
    let journalReads = 0;
    await page.route("**/auth/v1/token?grant_type=refresh_token", route => {
      expect(route.request().postDataJSON().refresh_token).toBe("fixture-refresh");
      refreshes++;
      return route.fulfill({ json: {
        access_token: "fixture-refreshed-token", refresh_token: "fixture-rotated-refresh",
        expires_in: 3600, token_type: "bearer", user: fixtureAuthUser
      } });
    });
    await page.route("**/rest/v1/calendar_check_ins?**", route => {
      expect(route.request().headers().authorization).toBe("Bearer fixture-refreshed-token");
      journalReads++;
      return route.fulfill({ json: [] });
    });
    await page.goto("/#account");
    await expect(page.getByText("Signed in with", { exact: true })).toBeVisible();
    await expect(page.getByText("Sign in to load your saved connections.", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: /Open journal/ }).click();
    await expect(page.getByText("No check-ins yet", { exact: true })).toBeVisible();
    expect(refreshes).toBe(1);
    expect(journalReads).toBeGreaterThan(0);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`account session recovery keeps identity hidden until verified in ${theme}`, async ({ page }) => {
      await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
      await seedClientState(page, { profile: true, theme });
      await seedSignedInSession(page);
      let rejectVerification = true;
      let userReads = 0;
      let releaseVerification: (() => void) | undefined;
      let verificationPending: Promise<void> | undefined;
      await page.route("**/auth/v1/user", async route => {
        userReads++;
        await verificationPending;
        return route.fulfill(rejectVerification
          ? { status: 400, json: { message: "Synthetic verification failure" } }
          : { json: fixtureAuthUser });
      });
      await page.route("**/rest/v1/social_profiles?**", route => route.fulfill({ json: {
        user_id: fixtureUserId, handle: "fixture_owner", display_name: "Project Author", discoverable: true
      } }));
      await page.goto("/#account");
      await expect(page.getByText("Your account could not be checked. Please try again.", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeHidden();
      await expect(page.getByText("Signed in with", { exact: true })).toBeHidden();
      await expect(page.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
      // SDK events can restore a cached session without verifying the user.
      // A cross-tab SIGNED_IN must not override the failed account check.
      const previousReads = userReads;
      await page.evaluate(key => {
        const channel = new BroadcastChannel(key);
        channel.postMessage({ event: "SIGNED_IN", session: JSON.parse(localStorage.getItem(key)!) });
        channel.close();
      }, supabaseAuthStorageKey());
      await expect.poll(() => userReads).toBeGreaterThan(previousReads);
      await expect(page.getByText("Your account could not be checked. Please try again.", { exact: true })).toBeVisible();
      await expect(page.getByText("Signed in with", { exact: true })).toBeHidden();
      await expect(page.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
      rejectVerification = false;
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(page.getByText("Signed in with", { exact: true })).toBeVisible();
      await expect(page.getByText("@fixture_owner", { exact: true })).toBeVisible();
      await expect(page.getByText("Sign in to load your saved connections.", { exact: true })).toBeHidden();
      await expect(page.locator(".settings-profile-row")).toContainText("Project Author");
      const headingStyle = () => page.locator(".account-page-heading h1").evaluate(heading => {
        const style = getComputedStyle(heading);
        return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "margin", "textTransform", "textAlign"].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
      });
      const verifiedHeadingStyle = await headingStyle();
      // Resume after the shared 30-second verification cache has expired.
      rejectVerification = true;
      await page.evaluate(() => {
        (window as any).__tldrSetQaNow(new Date(Date.now() + 31_000).toISOString());
        window.dispatchEvent(new Event("focus"));
      });
      await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
      await expect(page.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toHaveCount(0);
      expect(await headingStyle()).toEqual(verifiedHeadingStyle);
      await page.screenshot({ path: test.info().outputPath(`account-recovery-${theme}.png`), fullPage: true });
      rejectVerification = false;
      verificationPending = new Promise<void>(resolve => { releaseVerification = resolve; });
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(page.getByText("Checking your account…", { exact: true })).toBeVisible();
      await expect(page.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Sign in|Sign out|Retry)$/ })).toHaveCount(0);
      expect(await headingStyle()).toEqual(verifiedHeadingStyle);
      await page.screenshot({ path: test.info().outputPath(`account-checking-${theme}.png`), fullPage: true });
      releaseVerification!();
      await expect(page.getByText("Signed in with", { exact: true })).toBeVisible();
      await expect(page.locator(".settings-profile-row")).toContainText("Project Author");
      await page.screenshot({ path: test.info().outputPath(`account-verified-${theme}.png`), fullPage: true });
      // A sign-out from another tab invalidates account access but retains local chart data.
      await page.evaluate(key => {
        localStorage.removeItem(key);
        const channel = new BroadcastChannel(key);
        channel.postMessage({ event: "SIGNED_OUT", session: null });
        channel.close();
      }, supabaseAuthStorageKey());
      await expect(page.getByText(/You are signed out\./)).toBeVisible();
      await expect(page.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
      expect(await page.evaluate(() => Boolean(localStorage.getItem("tldrastro:userProfile")))).toBe(true);
      expect(await headingStyle()).toEqual(verifiedHeadingStyle);
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await expect(page.getByRole("menuitem", { name: "Login", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Sign out", exact: true })).toHaveCount(0);
    });
  }

  test("journal sync preserves an open draft during same-account verification recovery", async ({ page }) => {
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    await seedClientState(page, { profile: true });
    await seedSignedInSession(page);
    let rejectVerification = false;
    await page.route("**/auth/v1/user", route => route.fulfill(rejectVerification
      ? { status: 400, json: { message: "Synthetic temporary verification failure" } }
      : { json: fixtureAuthUser }));
    await page.goto("/#account");
    await page.getByRole("button", { name: /Open journal/ }).click();
    await page.getByRole("button", { name: /Add check-in/ }).click();
    const editor = page.getByRole("dialog", { name: "Check-in", exact: true });
    await editor.getByRole("button", { name: "Good", exact: true }).click();
    for (let step = 0; step < 3; step++) await editor.getByRole("button", { name: "Next", exact: true }).click();
    await editor.locator("textarea").fill("Synthetic unsaved draft stays with this account.");
    rejectVerification = true;
    await page.evaluate(key => {
      const session = JSON.parse(localStorage.getItem(key)!);
      session.access_token = "synthetic-refreshed-token";
      localStorage.setItem(key, JSON.stringify(session));
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    }, supabaseAuthStorageKey());
    await expect(page.getByText("Your account could not be checked. Please try again.", { exact: true })).toBeVisible();
    await expect(editor.locator("textarea")).toHaveValue("Synthetic unsaved draft stays with this account.");
    rejectVerification = false;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByText("Your account could not be checked. Please try again.", { exact: true })).toHaveCount(0);
    await expect(editor.locator("textarea")).toHaveValue("Synthetic unsaved draft stays with this account.");
  });

  test("journal sync shares saved entries between independent desktop and mobile sessions", async ({ page, browser, baseURL }) => {
    test.setTimeout(90_000);
    const mobileContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await mobileContext.newPage();
    const assertDesktopErrors = await expectNoClientErrors(page);
    const assertPhoneErrors = await expectNoClientErrors(phone);
    const rows: Array<Record<string, unknown>> = [];
    let logoutScope: string | null = null;
    let phoneReads = 0;
    try {
      for (const device of [page, phone]) {
        await device.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
        await seedClientState(device, { profile: true, now: "2026-09-21T16:00:00.000Z", theme: device === phone ? "dark" : "light" });
        await seedSignedInSession(device);
        await routeCalendarCheckInStore(device, rows);
        await device.route("**/rest/v1/calendar_check_ins?**", async route => {
          const request = route.request();
          if (request.method() === "POST") {
            const entry = request.postDataJSON();
            expect(entry.user_id).toBe(fixtureUserId);
            const existing = rows.findIndex(row => row.date_key === entry.date_key);
            if (existing >= 0) rows[existing] = entry;
            else rows.push(entry);
            await route.fulfill({ json: entry });
          } else {
            expect(new URL(request.url()).searchParams.get("user_id")).toBe(`eq.${fixtureUserId}`);
            if (device === phone) phoneReads++;
            await route.fulfill({ json: rows });
          }
        });
        await device.goto("/#account");
        await device.getByRole("button", { name: /Open journal/ }).click();
        await expect(device.getByText("No check-ins yet", { exact: true })).toBeVisible();
      }
      await page.getByRole("button", { name: /Add check-in/ }).click();
      const editor = page.getByRole("dialog", { name: "Check-in", exact: true });
      await editor.getByRole("button", { name: "Good", exact: true }).click();
      for (let step = 0; step < 3; step++) await editor.getByRole("button", { name: "Next", exact: true }).click();
      await editor.locator("textarea").fill("Synthetic journal saved on desktop.");
      await editor.getByRole("button", { name: "Next", exact: true }).click();
      await editor.getByRole("button", { name: "Save", exact: true }).click();
      await expect(editor).toHaveCount(0);
      await expect(page.locator(".account-journal-entry")).toContainText("Synthetic journal saved on desktop.");
      expect(rows).toHaveLength(1);
      // A resumed phone page must re-read the server, without reloading or logging in again.
      await phone.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      await expect(phone.locator(".account-journal-entry")).toContainText("Synthetic journal saved on desktop.");
      // Do not let a remote refresh discard a draft in the active editor.
      await phone.locator(".account-journal-entry").click();
      const phoneEditor = phone.getByRole("dialog", { name: "Check-in", exact: true });
      for (let step = 0; step < 3; step++) await phoneEditor.getByRole("button", { name: "Next", exact: true }).click();
      await phoneEditor.locator("textarea").fill("Synthetic update saved on phone.");
      const readsBeforeDraft = phoneReads;
      await phone.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await expect(phoneEditor.locator("textarea")).toHaveValue("Synthetic update saved on phone.");
      expect(phoneReads).toBe(readsBeforeDraft);
      await phoneEditor.getByRole("button", { name: "Next", exact: true }).click();
      await phoneEditor.getByRole("button", { name: "Save", exact: true }).click();
      await expect(phoneEditor).toHaveCount(0);
      await page.getByRole("button", { name: "Refresh journal", exact: true }).click();
      await expect(page.locator(".account-journal-entry")).toContainText("Synthetic update saved on phone.");
      await phone.reload();
      await expect(phone.locator(".account-journal-entry")).toContainText("Synthetic update saved on phone.");
      await page.route("**/auth/v1/logout?**", route => {
        logoutScope = new URL(route.request().url()).searchParams.get("scope");
        return route.fulfill({ status: 204 });
      });
      await page.getByRole("button", { name: "Account", exact: true }).click();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await expect.poll(() => logoutScope).toBe("local");
      expect(await phone.evaluate(key => Boolean(localStorage.getItem(key)), supabaseAuthStorageKey())).toBe(true);
      await phone.getByRole("button", { name: "Refresh journal", exact: true }).click();
      await expect(phone.locator(".account-journal-entry")).toContainText("Synthetic update saved on phone.");
      await assertDesktopErrors();
      await assertPhoneErrors();
    } finally {
      await mobileContext.close();
    }
  });

  test("journal sync shows a retry for failed reads and refreshes an already-open empty journal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    await seedClientState(page, { profile: true });
    await seedSignedInSession(page);
    let failing = true;
    const rows: Array<Record<string, unknown>> = [];
    await routeCalendarCheckInStore(page, rows);
    await page.route("**/rest/v1/calendar_check_ins?**", route => failing
      ? route.fulfill({ status: 403, json: { message: "Synthetic read failure" } })
      : route.fulfill({ json: rows }));
    await page.goto("/#account");
    await page.getByRole("button", { name: /Open journal/ }).click();
    await expect(page.getByText("Your check-ins could not load.")).toBeVisible();
    await expect(page.getByText("No check-ins yet", { exact: true })).toHaveCount(0);
    failing = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByText("No check-ins yet", { exact: true })).toBeVisible();
    rows.push({ user_id: fixtureUserId, date_key: "2026-09-21", mood: 3, sleep: 50, social: 50, mood_note: "Entry from another device", note: "", tags: [], people: [] });
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.locator(".account-journal-entry")).toContainText("Entry from another device");
  });

  for (const theme of ["light", "dark"] as const) {
    test(`journal sync never presents a cached profile as signed in for ${theme}`, async ({ page }) => {
      await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
      await seedClientState(page, { profile: true, theme });
      await page.goto("/#account");
      await expect(page.getByText("Sign in to sync your account and journal across devices.")).toBeVisible();
      await expect(page.getByText("Signed in with", { exact: true })).toHaveCount(0);
      await expect(page.getByText(/You are signed out\./)).toBeVisible();
      await expect(page.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
      const account = page.getByRole("region", { name: "Account", exact: true });
      await expect(account.getByRole("heading")).toHaveText(["account."]);
      await expect(account).not.toContainText("Project Author");
      await expect(account).not.toContainText("qa-flow@example.com");
      await expect(account.getByRole("button", { name: "Handle", exact: false })).toHaveCount(0);
      await expectNoHorizontalOverflow(page, `Signed-out Account ${theme}`);
      const status = account.getByRole("status");
      const statusBox = (await status.boundingBox())!;
      const copyBox = (await status.locator(".settings-row-description").boundingBox())!;
      expect(copyBox.x).toBeGreaterThan(statusBox.x);
      expect(copyBox.x + copyBox.width).toBeLessThan(statusBox.x + statusBox.width);
      await page.screenshot({ path: test.info().outputPath(`account-signed-out-${theme}.png`), fullPage: true });
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await expect(page.getByRole("menuitem", { name: "Login", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Sign out", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Close menu", exact: true }).click();
      await page.getByRole("button", { name: /Open journal/ }).click();
      await expect(page.getByText("Sign in to see your saved journal on this device.")).toBeVisible();
      await expect(page.getByText("No check-ins yet", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Add check-in/ })).toBeDisabled();
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByRole("region", { name: "Log in", exact: true })).toBeVisible();
    });
  }

  test("signed-in user can open Account journal weeks that start on Monday", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, now: "2026-09-20T16:00:00.000Z" });
    await seedSignedInSession(page);
    await routeCalendarCheckInStore(page, [
      {
        user_id: fixtureUserId,
        date_key: "2026-09-20",
        mood: 3,
        sleep: 60,
        social: 40,
        mood_note: "Sunday note",
        note: "",
        tags: ["Rest Day"],
        people: []
      },
      {
        user_id: fixtureUserId,
        date_key: "2026-09-14",
        mood: 2,
        sleep: 50,
        social: 50,
        mood_note: "",
        note: "Monday note",
        tags: [],
        people: ["Sam"]
      }
    ]);
    await expectClientRouteLoads(page, "/#account");

    await expect(page.getByRole("heading", { name: "account." })).toBeVisible();
    await page.getByRole("button", { name: /Open journal/ }).click();

    const journal = page.getByRole("region", { name: "Journal" });
    await expect(journal.getByRole("heading", { name: "journal." })).toBeVisible();
    await expect(journal.getByText("Sign in to save this check-in with your account.")).toHaveCount(0);
    await expect(journal.getByRole("button", { name: /Good · well rested/ })).toBeVisible();
    await expect(journal.getByRole("button", { name: /Okay · moderately rested/ })).toBeVisible();

    await journal.getByRole("button", { name: "Weeks", exact: true }).click();
    await expect(journal.getByText("Week 38")).toBeVisible();
    await expect(journal.getByText("September 14 – 20 · 2 check-ins")).toBeVisible();
    await expect(journal.getByRole("button", { name: /Monday, Sep 14/ })).toBeVisible();
    await expect(journal.getByRole("button", { name: /Sunday, Sep 20/ })).toBeVisible();

    await journal.getByRole("button", { name: /Sunday, Sep 20/ }).click();
    const checkIn = page.getByRole("dialog", { name: "Check-in" });
    await expect(checkIn).toBeVisible();
    await expect(checkIn.getByText("Sunday, September 20, 2026")).toBeVisible();
    await expect(checkIn.getByRole("heading", { name: "How are you feeling?" })).toBeVisible();
    await checkIn.getByRole("button", { name: "Close" }).click();
    await expect(checkIn).toHaveCount(0);
    await expect(journal.getByText("September 14 – 20 · 2 check-ins")).toBeVisible();

    await page.screenshot({ path: test.info().outputPath("account-journal-weeks-monday.png"), fullPage: true });
    await assertNoClientErrors();
  });

  test("signed-in user can open friend add chart modal and see validation", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await expect(page.getByText("friends.")).toBeVisible();
    await page.getByRole("button", { name: /Add (?:a )?chart/ }).click();
    await expect(page.getByRole("heading", { name: "Add chart" })).toBeVisible();
    const addChartDialog = page.getByRole("dialog", { name: "Add chart" });
    await expect(page.getByLabel("Chart type")).toBeVisible();
    await expect(page.getByLabel("Relationship type")).toBeVisible();
    await expect(page.getByText("Pronouns")).toBeVisible();
    await expect(addChartDialog.getByRole("button", { name: "Add chart" })).toBeVisible();

    await addChartDialog.getByRole("button", { name: "Add chart" }).click();
    await expect(page.getByText("Add a name, birth date, and birth place.")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Nikki")).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can cancel friend chart deletion", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await expect(page.getByText("Nikki")).toBeVisible();
    await page.getByRole("button", { name: "More actions for Nikki" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { name: "Delete Nikki?" })).toBeVisible();
    await expect(page.getByText("This removes the saved chart and cannot be undone.")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Nikki")).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can open friend edit chart modal and cancel", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await expect(page.getByText("Nikki")).toBeVisible();
    await page.getByRole("button", { name: "More actions for Nikki" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    const editChartDialog = page.getByRole("dialog", { name: "Edit chart" });
    await expect(editChartDialog).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Nikki");
    await expect(page.getByLabel("Chart type")).toHaveValue("person");
    await expect(page.getByLabel("Relationship type")).toBeVisible();
    await expect(editChartDialog.getByRole("button", { name: "Save chart" })).toBeVisible();

    await editChartDialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Nikki")).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can switch add chart form to event chart mode", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await page.getByRole("button", { name: /Add (?:a )?chart/ }).click();
    await page.getByLabel("Chart type").selectOption("event");

    const eventDialog = page.getByRole("dialog", { name: "Add event chart" });
    await expect(eventDialog).toBeVisible();
    await expect(page.getByLabel("Chart type")).toHaveValue("event");
    await expect(page.getByLabel("Relationship type")).toHaveCount(0);
    await expect(page.getByText("Pronouns")).toHaveCount(0);
    await expect(page.getByLabel("Event name")).toBeVisible();
    await expect(page.getByLabel("Event date")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Event time" })).toBeVisible();
    await expect(eventDialog.getByRole("button", { name: "Add event chart" })).toBeVisible();

    await eventDialog.getByRole("button", { name: "Add event chart" }).click();
    await expect(page.getByText("Add an event name, event date, and event place.")).toBeVisible();
    await eventDialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Nikki")).toBeVisible();
    await assertNoClientErrors();
  });

  test("guest can close account screen and return to sky", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Login" }).click();
    await expect(page.getByRole("region", { name: "Log in" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("mobile sky date picker can open, navigate months, and close", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await page.getByRole("button", { name: /Today, New York/ }).click();
    const skyControls = page.getByRole("dialog", { name: "Sky controls" });
    await expect(skyControls).toBeVisible();
    await skyControls.getByRole("button", { name: "Date" }).click();

    const datePicker = page.getByLabel("Pick Date");
    await expect(datePicker).toBeVisible();
    await datePicker.getByRole("button", { name: "Next month" }).click();
    await datePicker.getByRole("button", { name: "Previous month" }).click();
    await datePicker.getByRole("button", { name: "Close date picker" }).click();

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("keyboard Escape closes menu and full sky chart modal", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("menuitem", { name: /settings/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: /settings/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Open full current sky chart" }).click();
    await expect(page.getByRole("heading", { name: "Full sky chart" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Full sky chart" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can edit current location from settings", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#settings");

    await expect(page.getByText("settings.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Toggle journal prompts" })).toHaveCount(0);
    await expect(page.getByLabel("Astrology settings").locator(".settings-row")).toHaveCount(1);
    await page.getByRole("button", { name: /Current location/i }).click();
    await expect(page.getByLabel("Current location")).toBeVisible();
    await expectFormTypography(page, ".settings-location-editor", "Settings location form");
    await page.getByLabel("Current location").fill("Austin, TX");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save location" }).click();

    await expect(page.getByText("Austin")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Austin")).toBeVisible();
    await assertNoClientErrors();
  });

  test("guest settings expose display and astrology controls", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#settings");

    await expect(page.getByRole("region", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByText("New York")).toBeVisible();

    await page.getByLabel("Theme", { exact: true }).getByRole("button", { name: "dark" }).click();
    await expect(page.locator(".app-shell")).toHaveClass(/theme-dark/);

    const gradientSwitch = page.getByRole("button", { name: "Toggle gradient background" });
    const dyslexiaSwitch = page.getByRole("button", { name: "Toggle dyslexia-friendly font" });
    await expect(
      gradientSwitch.locator("span"),
      "Active dark-mode switch handles use a contrasting gray"
    ).toHaveCSS("background-color", "rgb(136, 141, 153)");
    await expect(
      dyslexiaSwitch.locator("span"),
      "Inactive dark-mode switch handles stay white"
    ).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await gradientSwitch.click();
    await expect(
      gradientSwitch.locator("span"),
      "Switch handles become white when toggled off"
    ).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator(".app-shell")).toHaveClass(/sunrise-orb-disabled/);

    await expect(page.getByRole("button", { name: "Toggle journal prompts" })).toHaveCount(0);

    await page.getByLabel("House sign labels").getByRole("button", { name: "glyph" }).click();
    await expect(page.getByLabel("House sign labels").getByRole("button", { name: "glyph" })).toHaveAttribute("aria-pressed", "true");
    await assertNoClientErrors();
  });

  test("calendar uses the settings location and has no location picker", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.locator(".lunar-location-picker")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /New York.*Eastern/i })).toHaveCount(0);
    await expect(page.getByPlaceholder("Search for a city")).toHaveCount(0);

    await expectClientRouteLoads(page, "/#settings");
    await expect(page.getByText("Current location")).toBeVisible();
    await assertNoClientErrors();
  });

  test("mobile signed-in user can navigate to friends and open a chart", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#sky");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expectPopoverTextNotBold(page, ".site-menu", "Mobile site menu");
    await page.getByRole("menuitem", { name: "Friends" }).click();
    await expect(page.getByRole("heading", { name: "friends.", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Charts" }).click();
    await expect(page.getByRole("button", { name: "Open River" })).toBeVisible();

    await page.getByRole("button", { name: "Open River" }).click();
    await expect(page.getByRole("region", { name: "River chart profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Natal" })).toBeVisible();
    await page.getByRole("tab", { name: "Transits" }).click();
    const mobileDailyForecast = page.locator(".friend-daily-forecast").first();
    await expect(mobileDailyForecast, "Mobile friend forecast keeps its card inset").toBeVisible();
    await expect(mobileDailyForecast).toHaveCSS("border-top-style", "solid");
    expect(
      await mobileDailyForecast.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop)),
      "Mobile friend forecast has visible internal padding"
    ).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page, "Mobile friend transit forecast");
    await assertNoClientErrors();
  });

  test("mobile guest can navigate calendar and switch views", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Calendar" }).click();
    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });

    const monthTab = page.getByRole("tab", { name: "Month" });
    if (await monthTab.isVisible()) {
      await monthTab.click();
      await expect(monthTab).toHaveAttribute("aria-selected", "true");
    }

    await page.getByRole("button", { name: /Next month|Next week/ }).click();
    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user can open and close You natal placement detail", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "10:00 AM" });
    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);

    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await expect(page.locator("#sub-chart .natal-aspects-list")).toHaveCount(0);
    await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
    await expect(page.getByRole("region", { name: "Sun in Aquarius in the 11th house" })).toBeVisible();
    await expect(page.locator("#you-transit-article-title")).toContainText("Sun in Aquarius in the 11th house");
    await expectNoDuplicateArticleHeadings(page, "You natal placement detail");

    await page.getByRole("button", { name: "Back to updates" }).click();
    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await assertNoClientErrors();
  });

  test("nested natal aspect returns to its placement one level at a time", async ({ page }) => {
    await observeArticleTransitions(page);
    await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "10:00 AM", pageAnimations: "on" });
    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);
    const rootUrl = page.url();
    await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
    await expect(page).toHaveURL(/#you\/placement\//);
    await expect(page.locator("#you-transit-article-title")).toBeVisible();
    const parentUrl = page.url();
    const parentTitle = await page.locator("#you-transit-article-title").innerText();
    const aspect = page.getByRole("button", { name: /Read more about Sun/ }).first();
    const aspectName = (await aspect.getAttribute("aria-label"))!.replace("Read more about ", "");
    await aspect.click();
    await expect(page.locator("#you-transit-article-title")).toHaveText(aspectName);
    await expect(page).toHaveURL(/\/aspect\//);
    await expectAnimatedArticleNavigation(page, () => page.getByRole("button", { name: "Back to updates" }).click(), aspectName);
    await expect(page).toHaveURL(parentUrl);
    await expect(page.locator("#you-transit-article-title")).toHaveText(parentTitle);
    await expectAnimatedArticleNavigation(page, () => page.goForward(), parentTitle);
    await expect(page.locator("#you-transit-article-title")).toHaveText(aspectName);
    await page.reload();
    await expect(page.locator("#you-transit-article-title")).toHaveText(aspectName);
    await page.getByRole("button", { name: "Back to updates" }).click();
    await expect(page.locator("#you-transit-article-title")).toHaveText(parentTitle);
    await page.getByRole("button", { name: "Back to updates" }).click();
    await expect(page).toHaveURL(rootUrl);
    await expect(page.locator("#you-transit-article-title")).toHaveCount(0);
  });

  test("You natal placement detail preserves the complete approved house passage", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "12:00 PM" });
    await expectClientRouteLoads(page, "/#you/placement/sun-aquarius-9h");

    const article = page.getByRole("region", { name: "Sun in Aquarius in the 9th house" });
    await expect(article).toBeVisible();
    await expect(article).toContainText(
      "Your Sun is in your 9th house, meaning this side of you comes out through travel, study, belief, and the big questions."
    );
    await expect(article).toContainText(
      "A philosophy has more value after it has survived contact with a larger world."
    );
    await expect(article.getByText("Natal aspects", { exact: true })).toHaveCount(0);
    await expect(article.getByRole("heading", { level: 3, name: "Planetary aspects", exact: true })).toHaveCount(1);
    await assertNoClientErrors();
  });

  test("You Chiron placement preserves the exact owner-approved complete passage", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, {
      profile: true,
      profileBirthDate: "1970-03-20",
      profileBirthTime: "8:00 AM",
      preloadProfileNatalSky: true
    });
    await expectClientRouteLoads(page, "/#you/placement/chiron-aries-12h");

    const article = page.getByRole("region", { name: "Chiron in Aries in the 12th house" });
    await expect(article).toBeVisible();
    await expect(article).toContainText(chironAries12ApprovedOpening);
    await expect(article).toContainText(chironAries12ApprovedFinalSentence);
    await assertNoClientErrors();
  });

  test("signed-in user can open friend natal placement detail", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await page.getByRole("button", { name: "Open Nikki" }).click();
    await expect(page.getByRole("region", { name: "Nikki chart profile" })).toBeVisible();
    await page.getByRole("tab", { name: "Natal" }).click();
    await expect(page.getByRole("tab", { name: "Natal" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".friend-natal-stage .friend-natal-aspects-list")).toHaveCount(0);

    const bigThree = page.getByLabel("Nikki big three");
    await expect(bigThree).toBeVisible();
    await bigThree.getByRole("button").first().click();
    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close detail" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Planetary aspects", exact: true })).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Friend natal placement detail");

    const bodyType = await page.evaluate(() => {
      const aspectCopy = document.querySelector<HTMLElement>(".aspect-row-copy");
      if (!aspectCopy) return null;

      const articleSection = document.createElement("section");
      articleSection.className = "article-section";
      articleSection.hidden = true;

      const articleBody = document.createElement("p");
      const aspectBody = document.createElement("p");
      articleSection.append(articleBody);
      aspectCopy.append(aspectBody);
      document.body.append(articleSection);

      const articleStyle = getComputedStyle(articleBody);
      const aspectStyle = getComputedStyle(aspectBody);

      const result = {
        article: {
          fontFamily: articleStyle.fontFamily,
          fontSize: articleStyle.fontSize,
          fontWeight: articleStyle.fontWeight,
          lineHeight: articleStyle.lineHeight
        },
        aspect: {
          fontFamily: aspectStyle.fontFamily,
          fontSize: aspectStyle.fontSize,
          fontWeight: aspectStyle.fontWeight,
          lineHeight: aspectStyle.lineHeight
        }
      };

      articleSection.remove();
      aspectBody.remove();
      return result;
    });

    expect(bodyType, "Friend aspect typography must resolve in the placement detail").not.toBeNull();
    expect(bodyType?.aspect).toEqual(bodyType?.article);

    await page.getByRole("button", { name: "Close detail" }).click();
    await expect(page.getByRole("region", { name: "Nikki chart profile" })).toBeVisible();
    await assertNoClientErrors();
  });

  test("signed-in user without saved friends sees empty chart list", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await expect(page.getByText("friends.")).toBeVisible();
    await expect(page.getByLabel("Friend charts")).toBeVisible();
    await expect(page.getByRole("region", { name: "No charts" })).toBeVisible();
    await expect(page.getByText("No charts yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Add (?:a )?chart/ }).first()).toBeVisible();
    await assertNoClientErrors();
  });

  test("content fallback copy is reader-facing in sky placement detail", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-29T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await page.locator(".sky-pl-item button").first().click();

    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Sky fallback placement detail");
    await expectReaderFacingCopyExcluding(
      page.locator("article, .sky-detail-article").first(),
      "#sky-rising-horoscopes",
      "Sky placement fallback detail"
    );
    await assertNoClientErrors();
  });

  test("Sun in Virgo detail serves the exact canonical V4 owner-approved article", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-27T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/sun");

    const article = page.locator(".sky-detail-article");
    await expect(article).toBeVisible();
    await expect(article).toContainText("Virgo season makes the invisible work of keeping things running harder to overlook.");
    await expect(article).toContainText("The system that works is the one that makes your life easier to live.");
    await expect(article).not.toContainText("Aspects shaping this transit");
    await expect(article.getByRole("heading", { name: "Gifts" })).toBeVisible();
    await expect(article.getByRole("heading", { name: "Lessons" })).toBeVisible();
    await expect(article).toContainText("Sun Trine Chiron");
    const mercuryCopy = JSON.parse(readFileSync(path.resolve("packages/astro-knowledge/data/transits/sun-conjunction-mercury.json"), "utf8"));
    expect(mercuryCopy.status).toBe("LIVE");
    await expect(article).toContainText(mercuryCopy.readerCopy.body);
    await expect(article).not.toContainText("The Sun in Virgo ties confidence to usefulness, accuracy");
    await expectNoDuplicateArticleHeadings(page, "Sun in Virgo placement detail");
    await assertNoClientErrors();
  });

  test("Sky placement cards preserve full approved aspect write-ups", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-09-02T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/sun/virgo");

    const article = page.locator(".sky-detail-article");
    await expect(article).toBeVisible();
    // In-sign aspects are shown in Gifts and Lessons rather than a separate aspect list; the
    // approved write-up must still arrive complete, not shortened to fit the section.
    const gifts = article.getByRole("region", { name: "Gifts" });
    await expect(gifts.getByRole("heading", { name: "Sun Trine Lilith", level: 4 })).toBeVisible();
    const lilithCopy = JSON.parse(readFileSync(path.resolve("packages/astro-knowledge/data/transits/sun-trine-lilith.json"), "utf8"));
    expect(lilithCopy.status).toBe("LIVE");
    await expect(gifts).toContainText(lilithCopy.readerCopy.body);
    await expect(gifts).toContainText("Exact · September 2 and September 10, 2026");
    await assertNoClientErrors();
  });

  test("SKY V4 placement detail composes canonical copy with governed conditions and aspects", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    // Both bodies are retrograde in Aries on March 20. By March 29 Venus
    // has left Aries; the old route relabeling incorrectly kept this overlay.
    await seedClientState(page, { now: "2025-03-20T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/venus/aries");

    const article = page.locator(".sky-detail-article");
    await expect(article).toBeVisible();
    await expect(article).toContainText("Venus retrograde rewrites desire; Mercury retrograde scrambles the signal.");
    await expect(article).toContainText("Venus retrograde is a course correction of the heart.");
    await expect(article).not.toContainText(/generated unapproved|natal placement/iu);
    await expectNoDuplicateArticleHeadings(page, "SKY V4 contextual placement detail");
    await assertNoClientErrors();
  });

  test("SKY placement navigation keeps article and fallback identity on the requested sign", async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoClientErrors = await expectNoClientErrors(page);
    await seedClientState(page, { now: "2026-11-27T16:00:00.000Z" });
    const corpus = JSON.parse(readFileSync(path.resolve("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json"), "utf8"));
    await expectClientRouteLoads(page, "/?date=2026-11-27#sky/placement/sun/sagittarius");
    for (const sign of ["sagittarius", "gemini", "sagittarius"]) {
      await page.evaluate((nextSign) => { window.location.hash = `sky/placement/sun/${nextSign}`; }, sign);
      const article = page.locator(".sky-detail-article");
      const row = corpus.content.continuous.find((candidate: { contentKey: string }) => candidate.contentKey === `sky-placement/article/sun/${sign}`);
      const paragraphs = row.placementArticle.split("\n\n");
      await expect(article).toContainText(paragraphs[0].split(/\{\{[^}]+\}\}/u).at(-1), { timeout: 60_000 });
      await expect(article).toContainText(paragraphs.at(-1));
      const otherSign = sign === "sagittarius" ? "gemini" : "sagittarius";
      const other = corpus.content.continuous.find((candidate: { contentKey: string }) => candidate.contentKey === `sky-placement/article/sun/${otherSign}`);
      await expect(article).not.toContainText(other.placementArticle.split("\n\n")[0].split(/\{\{[^}]+\}\}/u).at(-1));
      if (sign === "gemini") {
        await expect(article).not.toContainText("November 22 to December 21, 2026");
        await expect(article).toContainText(/May \d{1,2} to June \d{1,2}, 2027/u);
      }
    }
    await page.screenshot({ path: "test-results/fallback-placement-sagittarius.png", fullPage: true });
    await assertNoClientErrors();
  });

  test("SKY V4 node and Lilith routes compose their canonical product-surface records", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/north-node");
    await expect(page.locator(".sky-detail-article")).toContainText("The North Node moves into Aquarius, making a less familiar response more important than the one that comes automatically.");
    await expect(page.locator(".sky-detail-article")).toContainText("During this Aquarius–Leo node cycle, recognition and personal visibility stop being the only measure");
    await expect(page.locator(".sky-detail-article")).toContainText("The lunar nodes are not planets.");
    await expect(page.locator(".sky-detail-article")).toContainText("where the old reflex and the next direction are no longer producing the same result.");
    await expect(page.locator(".sky-detail-article")).not.toContainText(/Marie|Satori|owner-approved|longer-form writing/iu);
    await expectNoDuplicateArticleHeadings(page, "SKY V4 North Node detail");
    await page.screenshot({ path: "test-results/reader-source-reference-north-node.png", fullPage: true });

    await expectClientRouteLoads(page, "/#sky/placement/south-node");
    await expect(page.locator(".sky-detail-article")).toContainText("The South Node moves into Leo, making an old reflex easier to repeat and easier to see.");
    await expect(page.locator(".sky-detail-article")).not.toContainText(/Marie|Satori|owner-approved|longer-form writing/iu);
    await expectNoDuplicateArticleHeadings(page, "SKY V4 South Node detail");

    await expectClientRouteLoads(page, "/#sky/placement/lilith/sagittarius");
    await expect(page.locator(".sky-detail-article")).toContainText("While Black Moon Lilith moves through Sagittarius, certainty gets tested against evidence.");
    await expectNoDuplicateArticleHeadings(page, "SKY V4 Lilith detail");
    await assertNoClientErrors();
  });

  test("SKY V4 seasonal context uses the product location hemisphere", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-06-25T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/sun/cancer");
    const article = page.locator(".sky-detail-article");

    await expect(article).toContainText("The June solstice marks the longest day of the year in the Northern Hemisphere");
    await expect(article).not.toContainText("longest night of the year in the Southern Hemisphere");
    await assertNoClientErrors();
  });

  test("SKY V4 Lilith station copy appears only on its calculated station day", async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-27T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/lilith/sagittarius");
    const article = page.locator(".sky-detail-article");

    // Station context arrives with the calculated residency data after the article shell.
    await expect(article).toContainText("Black Moon Lilith stations, and a preference, refusal, or old point of anger becomes much harder to keep buried.", { timeout: 60_000 });
    await assertNoClientErrors();
  });

  test("content hydration does not downgrade reader-facing surfaces to stale fallback copy", async ({ page }) => {
    test.setTimeout(60_000);
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, {
      profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "10:00 AM",
      friends: true,
      now: "2026-07-29T16:00:00.000Z"
    });

    await expectClientRouteLoads(page, "/#sky/placement/sun");
    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Sky placement detail");
    await expect(page.locator(".sky-detail-article")).toContainText(/The Sun in Leo/i);
    await expect(page.locator(".sky-detail-article")).toContainText(/Leo brings a bold invitation to take center stage in your own life/u);
    await expect(page.locator(".sky-detail-article")).not.toContainText(/active here|current emphasis|timing, mood/i);
    await expectHydrationKeepsReaderCopyStable(
      page,
      page.locator(".sky-detail-article"),
      "Sky placement detail copy",
      {
        excludedSelector: "#sky-rising-horoscopes, #sky-personalized-placement, .article-related-aspects",
        minLength: 180
      }
    );

    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);
    await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
    await expect(page.getByRole("region", { name: "Sun in Aquarius in the 11th house" }).getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-page-transition", "active");
    await expectNoDuplicateArticleHeadings(page, "Hydrated You placement detail");
    await expectSemanticArticleHeadingOrder(page, "Hydrated You placement detail");
    await expectHydrationKeepsReaderCopyStable(
      page,
      page.getByRole("region", { name: "Sun in Aquarius in the 11th house" }),
      "You natal placement detail copy",
      { minLength: 180 }
    );

    await expectClientRouteLoads(page, "/#calendar");
    await expectHydrationKeepsReaderCopyStable(
      page,
      page.getByLabel("Selected lunar day"),
      "Calendar selected lunar day copy",
      { minLength: 80 }
    );

    await expectClientRouteLoads(page, "/#friends?tab=charts");
    await page.getByRole("button", { name: "Open Alisa" }).click();
    await selectFriendDetailTab(page, "Synastry");
    await expectHydrationKeepsReaderCopyStable(
      page,
      page.getByLabel("Synastry", { exact: true }),
      "Friends synastry surface copy",
      { minLength: 180 }
    );

    await assertNoClientErrors();
  });

  test("Sky placement shows all approved rising horoscopes when the reader has no Rising sign", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-29T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/sun/leo");

    const horoscopeSection = page.getByRole("region", { name: "Horoscopes by rising sign" });
    await expect(horoscopeSection).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { level: 3 })).toHaveCount(12);
    await expect(horoscopeSection.getByRole("heading", { name: "Aries & Aries Rising" })).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { name: "Gemini & Gemini Rising" })).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { name: "Pisces & Pisces Rising" })).toBeVisible();
    await expect.poll(async () => horoscopeSection.locator(".article-related-aspects__copy-list").evaluate((element) => (
      Number.parseFloat(window.getComputedStyle(element).rowGap)
    ))).toBeGreaterThan(0);
    await expectSemanticArticleHeadingOrder(page, "Sky placement rising-sign article");
    await expect(page.locator(".sky-detail-rising-horoscopes-card #sky-rising-horoscopes")).toHaveCount(1);
    await expect(page.locator(".sky-detail-card #sky-rising-horoscopes")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Jump to horoscopes" })).toHaveCount(0);
    await expect(page.locator(".sky-detail-id .article-duration")).toHaveText("July 22 to August 22, 2026");
    await expect(page.getByText("July 22 to August 22, 2026", { exact: true })).toHaveCount(1);
    await assertNoClientErrors();
  });

  test("Sky placement keeps all twelve rising-sign horoscopes alongside the reader's passage", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, {
      profile: true,
      preloadProfileNatalSky: true,
      now: "2026-07-29T16:00:00.000Z"
    });
    await expectClientRouteLoads(page, "/#sky/placement/sun/leo");

    const personalizedSection = page.getByRole("region", { name: "Where it lands for you" });
    await expect(personalizedSection).toBeVisible();
    await expect(personalizedSection).toContainText("5th house");
    await expect(page.getByRole("heading", { level: 2, name: "Where it lands for you" })).toBeVisible();
    const horoscopeSection = page.getByRole("region", { name: "Horoscopes by rising sign" });
    await expect(horoscopeSection).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { level: 3 })).toHaveCount(12);
    await expect(horoscopeSection.getByRole("heading", { name: "Aries & Aries Rising" })).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { name: "Taurus & Taurus Rising" })).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { name: "Pisces & Pisces Rising" })).toBeVisible();
    await expectSemanticArticleHeadingOrder(page, "Personalized Sky placement article");
    await expect(page.locator(".sky-detail-rising-horoscopes-card #sky-rising-horoscopes")).toHaveCount(1);
    await expect(page.locator("#sky-rising-horoscopes")).toHaveCount(1);
    await expect(page.locator("#sky-personalized-placement")).toHaveCount(1);
    await expect.poll(async () => page.locator("#sky-personalized-placement, #sky-rising-horoscopes").evaluateAll((elements) => (
      elements.map((element) => element.id)
    ))).toEqual(["sky-personalized-placement", "sky-rising-horoscopes"]);
    await expect(page.getByRole("link", { name: "Jump to horoscopes" })).toHaveCount(0);
    await expect(page.locator(".sky-detail-id .article-duration")).toHaveText("July 22 to August 22, 2026");
    await assertNoClientErrors();
  });

  test("Jupiter in Leo shows the owner's complete 5th-house horoscope", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/jupiter/leo");

    const horoscopeSection = page.getByRole("region", { name: "Horoscopes by rising sign" });
    await expect(horoscopeSection).toBeVisible();
    const ariesHeading = horoscopeSection.getByRole("heading", { name: "Aries & Aries Rising" });
    await expect(ariesHeading).toBeVisible();
    await expect(horoscopeSection).toContainText(
      "Jupiter moves through Leo in your 5th house, bringing more attention to creativity, romance, pleasure, children"
    );
    await expect(horoscopeSection).toContainText(
      "The best thing you build this year may be the part of your schedule that finally belongs to you."
    );
    await expect(horoscopeSection).not.toContainText(
      "If everybody loves the version you are already bored with, you are still bored."
    );
    await assertNoClientErrors();
  });

  test("Venus in Libra uses a different approved passage after the owner rejection", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/venus/libra");

    await expect(page.getByRole("heading", { name: "Venus in Libra" })).toBeVisible();
    const horoscopeSection = page.getByRole("region", { name: "Horoscopes by rising sign" });
    await expect(horoscopeSection).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { level: 3 })).toHaveCount(12);
    await expect(horoscopeSection.getByRole("heading", { name: "Libra & Libra Rising" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Where it lands for you" })).toHaveCount(0);
    await expect(page.getByText("You may want more of what is actually fun.", { exact: true })).toHaveCount(0);
    await expect(page.locator(".sky-detail-id .article-duration")).toHaveText([
      "August 6 to September 10, 2026",
      "Full residency in Libra: August 6 to December 4, 2026"
    ]);
    await expect(page.getByRole("link", { name: "Jump to horoscopes" })).toHaveCount(0);
    await assertNoClientErrors();
  });

  test("Pluto retrograde in Aquarius serves canonical V4 copy without invented recurrence facts", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/pluto/aquarius");

    await expect(page.getByRole("heading", { name: /Pluto(?: Rx)? in Aquarius/u })).toBeVisible();
    await expect(page.getByText(/Pluto moves into Aquarius, putting more pressure on power, control, and consequences/u)).toBeVisible();
    await expect(page.getByText(/Pluto in Aquarius magnifies the shadows of group dynamics/u)).toBeVisible();
    await expect(page.getByText(/who gains leverage after it changes/u)).toBeVisible();
    await expect(page.getByText(/Pluto previously moved through Aquarius/u)).toHaveCount(0);
    await assertNoClientErrors();
  });

  test("Moon in Sagittarius shows all approved house-template compositions", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/moon/sagittarius");

    await expect(page.getByRole("heading", { name: "The Moon in Sagittarius" })).toBeVisible();
    const horoscopeSection = page.getByRole("region", { name: "Horoscopes by rising sign" });
    await expect(horoscopeSection).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { level: 3 })).toHaveCount(12);
    await expect(horoscopeSection.getByRole("heading", { name: "Sagittarius & Sagittarius Rising" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Where it lands for you" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Jump to horoscopes" })).toHaveCount(0);
    await expect(page.locator(".sky-detail-id .article-duration")).not.toBeEmpty();
    await assertNoClientErrors();
  });

  test("Uranus in Gemini shows all rising-sign horoscopes", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-08-22T16:00:00.000Z" });
    await expectClientRouteLoads(page, "/#sky/placement/uranus/gemini");

    const horoscopeSection = page.getByRole("region", { name: "Horoscopes by rising sign" });
    await expect(horoscopeSection).toBeVisible();
    await expect(horoscopeSection.getByRole("heading", { level: 3 })).toHaveCount(12);
    await expect(horoscopeSection.getByRole("heading", { name: "Aries & Aries Rising" })).toBeVisible();
    await expect(horoscopeSection).toContainText("Uranus in Gemini moves through your 5th house");
    await assertNoClientErrors();
  });

  test("personalized Sky placement keeps applicable natal aspect facts and approved writing visible", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, {
      profile: true,
      // Matching the calendar day makes the fixture's natal and transiting
      // Suns a deterministic conjunction after the natal chart hydrates.
      profileBirthDate: "1979-08-22",
      preloadProfileNatalSky: true,
      now: "2026-08-22T16:00:00.000Z"
    });
    await expectClientRouteLoads(page, "/#sky/placement/sun/leo");

    const personalizedSection = page.getByRole("region", { name: "Where it lands for you" });
    await expect(personalizedSection).toBeVisible();
    await expect(
      personalizedSection.getByRole("heading", { level: 3, name: "Aspects to the natal chart" })
    ).toBeVisible({ timeout: 20_000 });
    await expect(personalizedSection.getByRole("heading", { level: 4 }).first()).toBeVisible();
    await expectReaderFacingCopy(
      personalizedSection.locator(".sky-detail-personalized-aspect p").first(),
      "Personalized Sky aspect interpretation",
      100
    );
    await assertNoClientErrors();
  });

  test("content fallback copy is reader-facing in You natal placement detail", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "10:00 AM" });
    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);

    await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
    await expectReaderFacingCopy(page.getByRole("region", { name: "Sun in Aquarius in the 11th house" }), "You natal placement fallback detail");
    await assertNoClientErrors();
  });

  test("content QA flags directional copy in You ascendant placement detail", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);

    await page.getByRole("button", { name: /Ascendant in/ }).click();
    await expect(page.getByRole("button", { name: "Back to updates" })).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "You ascendant placement detail");
    await expectReaderFacingCopy(page.getByRole("region", { name: /Ascendant in/ }), "You ascendant placement fallback detail", 80);
    await assertNoClientErrors();
  });

  test("content fallback copy is reader-facing in friend relationship tabs", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await page.getByRole("button", { name: "Open Nikki" }).click();
    await selectFriendDetailTab(page, "Synastry");
    await expectReaderFacingCopy(page.getByLabel("Synastry", { exact: true }), "Friend synastry fallback copy");

    await selectFriendDetailTab(page, "Composite");
    await expectReaderFacingCopy(page.getByLabel("Composite", { exact: true }), "Friend composite fallback copy");
    await assertNoClientErrors();
  });

  test("content fallback copy resolves authored synastry detail before emergency fallback", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");

    await page.getByRole("button", { name: "Open Alisa" }).click();
    await selectFriendDetailTab(page, "Synastry");

    const authoredContact = page.getByRole("button", { name: /Ascendant square .*Mercury|Mercury square .*Ascendant/i }).first();
    await expect(authoredContact, "seeded synastry fixture exposes Ascendant square Mercury").toBeVisible();
    await authoredContact.click();

    const authoredHeading = page.locator(".app-shell.mode-detail article").getByRole("heading", { level: 1, name: /Ascendant square .*Mercury|Mercury square .*Ascendant/i });
    await expect(authoredHeading).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Authored synastry detail");
    const detail = page.locator(".app-shell.mode-detail");
    await expect(page.locator("html")).not.toHaveAttribute("data-page-transition", "active");

    expect(mercuryAscendantHardSource, "V3 contains the approved Mercury-Ascendant hard-aspect source row").toBeTruthy();
    const headingText = (await authoredHeading.innerText()).trim();
    const expectedOpening = /^Your Ascendant square Alisa's Mercury$/i.test(headingText)
      ? ascendantMercuryHardOpening
      : mercuryAscendantHardOpening;
    await expect(detail, "synastry detail uses the approved V3 package wording in the selected direction").toContainText(expectedOpening);
    const text = ((await detail.textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(text, "synastry detail does not show emergency stitched boilerplate").not.toMatch(/puts first impressions|Recurring friction that asks for an adjustment|how information gets processed/i);
    await assertNoClientErrors();
  });

  test("content fallback copy is reader-facing in the calendar surface", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expectReaderFacingCopy(page.getByLabel("Selected lunar day"), "Calendar selected day fallback copy", 80);
    await assertNoClientErrors();
  });
});

test("published Uranus Scorpio reader retains the complete owner passage after hydration", async ({ page }) => {
  await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", profileBirthTime: "12:00 PM", preloadProfileNatalSky: true });
  await expectClientRouteLoads(page, "/#you/placement/uranus-scorpio-6h");
  const article = page.getByRole("region", { name: "Uranus in Scorpio in the 6th house" });
  const ownerCopy = readFileSync(path.join(process.cwd(), "docs/content-management/owner-copy/uranus-in-scorpio-2026-09-07.txt"), "utf8").trim().replace(/\s+/g, " ");
  await expect(article).toBeVisible();
  await expect(article).toContainText(ownerCopy);
  await expect(article).toContainText("Your freedom comes from knowing what has power over you well enough to choose differently.");
});

test("Chiron Jupiter owner revision renders its complete opening and ending", async ({ page }) => {
  const copy = JSON.parse(readFileSync("docs/content-management/owner-copy/chiron-jupiter-hard-2026-09-07.json", "utf8"));
  const row = { id: "qa-chiron-owner-copy", content_key: copy.contentKey, surface: "you", mode: "feed", status: "LIVE", lane: "serving", review_state: null,
    provider: "tldrastro-fallback-architecture-v3", updated_at: "2026-09-07T15:26:32.577389+00:00", body: copy.body_you,
    facts: { content_role: "full_copy", review_status: "approved" },
    source_snapshot: { content_role: "full_copy", review_status: "approved", sourcePackage: "tldrastro-fallback-architecture-v3" },
    sections: { packageRecord: { contentKey: copy.contentKey, content_role: "full_copy", review_status: "approved", body_you: copy.body_you, body_they: copy.body_they } } };
  await seedClientState(page, { profile: true, profileBirthDate: "1978-09-01", preloadProfileNatalSky: true, now: "2026-09-07T14:27:30.000Z", generatedInterpretations: [row] });
  await page.route("**/rest/v1/rpc/content_runtime_revision", route => route.fulfill({ json: row.updated_at }));
  let releaseCopy!: () => void;
  const contentReady = new Promise<void>(resolve => { releaseCopy = resolve; });
  await page.route('**/api/content-reader', async route => {
    await contentReady;
    await route.fulfill({ json: readerResponse([row]) });
  });
  await page.route("**/content-studio-last-known-good.json", async route => {
    await contentReady;
    await route.fulfill({ json: { schema: "content-studio-last-known-good-v2", rowCount: 1, rows: [row] } });
  });
  await expectClientRouteLoads(page, "/#you");
  await page.getByRole("tab", { name: /updates|transits/i }).click();
  const card = page.getByRole("button", { name: /^Chiron challenging growth/ }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  const detail = page.getByRole("region", { name: "Chiron square your Jupiter", exact: true });
  await expect(detail).toBeVisible();
  releaseCopy();
  await expect(detail).toContainText("A moment of real growth can unexpectedly pull an old insecurity straight to the surface.");
  await expect(detail).toContainText("You do not have to make an opportunity harder on yourself to feel like you earned it.");
  await expect(detail).toContainText("you can step fully into this expansion without letting insecurity push you into a massive obligation you will just have to back out of later.");
  await expect(detail).not.toContainText(/\{\{(?:Name|aspectWord|untilDate)\}\}/);
});


test("Sky detail hydrates published aspects for its displayed snapshot and dated links", async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = JSON.parse(readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
  const publications = snapshot.publications.filter((row: any) => row.content_key.startsWith("sky.aspect."));
  await seedClientState(page, { now: "2026-09-08T14:03:00.000Z", contentPublications: publications });
  const requested = new Set<string>();
  await page.route('**/api/content-reader', async route => {
    const keys: string[] = route.request().postDataJSON().keys ?? [];
    keys.forEach(key => requested.add(key));
    // A broad fixture response would conceal the missing-key bug.
    await route.fulfill({ json: readerResponse(snapshot.rows.filter((row: any) => keys.includes(row.content_key))) });
  });
  await expectClientRouteLoads(page, "/?date=2026-09-08#sky/placement/lilith/sagittarius");
  // Placement cards now follow the displayed motion chapter, not the full residency.
  const ids = ["mercury-sextile-lilith", "jupiter-trine-lilith", "sun-square-lilith"];
  for (const id of ids) {
    const row = JSON.parse(readFileSync(`packages/astro-knowledge/data/transits/${id}.json`, "utf8"));
    const article = page.locator(".sky-detail-article");
    await expect(article).toContainText(row.readerCopy.body, { timeout: 60_000 });
    expect(requested.has(`sky.aspect.${row.transiting}.${row.aspect}.${row.other}`)).toBe(true);
  }
  const datedLink = page.getByRole("link", { name: "Read more about Lilith Square Sun", exact: true });
  const datedHref = await datedLink.getAttribute("href");
  expect(datedHref).toContain("/at/");
  // Preserve complete-copy coverage for sampled links outside that shorter chapter.
  // Direct Swiss calculations put both Chiron trine Lilith and Neptune square
  // Lilith in this snapshot; neither is active on the original September 8 date.
  const sampleInstant = encodeURIComponent("2026-08-01T12:00:00.000Z");
  await page.evaluate(hash => { window.location.hash = hash; }, `sky/aspect/chiron/trine/lilith/on/${sampleInstant}`);
  const chiron = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/chiron-trine-lilith.json", "utf8"));
  await expect(page.locator('.sky-detail-article')).toContainText(chiron.readerCopy.body, { timeout: 60_000 });
  expect(requested.has("sky.aspect.chiron.trine.lilith")).toBe(true);
  await page.evaluate(hash => { window.location.hash = hash; }, `sky/aspect/lilith/square/neptune/on/${sampleInstant}`);
  const neptune = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/neptune-square-lilith.json", "utf8"));
  await expect(page.locator('.sky-detail-article')).toContainText(neptune.readerCopy.body, { timeout: 60_000 });
  await page.reload();
  await expect(page.locator('.sky-detail-article')).toContainText(neptune.readerCopy.body, { timeout: 60_000 });
  await page.evaluate(href => { window.location.hash = href!; }, datedHref);
  const sun = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/sun-square-lilith.json", "utf8"));
  await expect(page.locator('.sky-detail-article')).toContainText(sun.readerCopy.body);
  await page.reload();
  await expect(page.locator('.sky-detail-article')).toContainText(sun.readerCopy.body, { timeout: 60_000 });
  // Returning to the original date must not leave the alternate snapshot's copy behind.
  await page.evaluate(() => { window.location.hash = "sky/placement/lilith/capricorn"; });
  const mars = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/mars-opposition-lilith.json", "utf8"));
  await expect(page.locator('.sky-detail-article')).toContainText(mars.readerCopy.body, { timeout: 60_000 });
  await expect(page.locator('.sky-detail-article')).not.toContainText(sun.readerCopy.body);
  await page.screenshot({ path: "test-results/calendar-aspect-hydration-fixed.png", fullPage: true });
  await page.evaluate(() => { window.location.hash = "calendar"; });
  await page.getByRole("button", { name: /^Thursday, September 10\./ }).click();
  await page.getByRole("button", { name: "Venus enters Scorpio", exact: true }).click();
  await page.getByRole("dialog", { name: "Event detail" }).getByRole("button", { name: "Read article" }).click();
  const venus = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/venus-square-pluto.json", "utf8"));
  await expect(page.locator('.sky-detail-article')).toContainText(venus.readerCopy.body, { timeout: 60_000 });
  await expect(page.locator('.sky-detail-article h1')).toContainText("Venus in Scorpio");
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`shared reading cards use one visual contract ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width, height: 1000 });
      // Hydrate the real pattern component through the cached chart fixture.
      const aspectPatterns = {
        patterns: [], relationships: [],
        interpretationContexts: [{ patternId: "qa-yod", patternType: "yod", display: {
          rank: 1, isContained: false, parentPatternIds: [], childPatternIds: []
        } }],
        resolvedCopy: [{ patternId: "qa-yod", content: {
          eyebrow: "Yod", headline: "A shared plan needs room to change",
          overview: "A longer reading tests the same comfortable measure and spacing as the placement and transit cards, including wrapping on a narrow screen.",
          sections: [], tags: []
        } }]
      };
      await seedClientState(page, { profile: true, friends: true, theme, aspectPatterns });
      await page.route("**/api/astrology-facts?*", route => {
        if (!new URL(route.request().url()).searchParams.has("includeAspectPatternCopy")) return route.fallback();
        return route.fulfill({ json: { ok: true, sky: { aspectPatterns } } });
      });
      const check = async (selector: string, role: "title" | "body" | "pill" | "label" | "action") => {
        const elements = page.locator(selector);
        await expect(elements.first()).toBeVisible();
        const mismatches = await elements.evaluateAll((nodes, role) => {
          const probe = document.createElement("span");
          const roles = {
            action: ["--font-ui", "--type-ui-size", "--weight-semibold", "--leading-label", "--tracking-normal"],
            title: ["--font-display", "--text-card-title", "--weight-medium", "--leading-title", "--tracking-title"],
            body: ["--font-body", "--text-body", "--weight-regular", "--leading-body", "--tracking-body"],
            pill: ["--pill-font-family", "--pill-font-size", "--pill-font-weight", "--pill-line-height", "--pill-tracking"],
            label: ["--label-eyebrow-font-family", "--label-eyebrow-font-size", "--label-eyebrow-font-weight", "--label-eyebrow-line-height", "--label-eyebrow-tracking"]
          };
          const properties = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
          properties.forEach((property, i) => { probe.style[property] = `var(${roles[role][i]})`; });
          document.body.append(probe);
          const expected = getComputedStyle(probe);
          const errors = nodes.filter(node => node.getBoundingClientRect().width).flatMap(node => {
            const actual = getComputedStyle(node);
            return properties.filter(key => actual[key] !== expected[key]).map(key => ({
              text: node.textContent?.slice(0, 40), key, actual: actual[key], expected: expected[key]
            }));
          });
          probe.remove();
          return errors;
        }, role);
        expect(mismatches, selector).toEqual([]);
      };
      await expectClientRouteLoads(page, "/#friends?tab=charts");
      await page.getByRole("button", { name: "Open Nikki" }).click();
      await selectFriendDetailTab(page, "Natal");
      await check(".natal-pattern-card__header h3", "title");
      await check(".natal-pattern-card__header p", "body");
      await check(".natal-pattern-card__header > span", "label");
      await check(".placement-table-row__title", "title");
      await check(".placement-table-row__description", "body");
      await expect(page.locator(".placement-table-row .ui-pill")).toHaveCount(0);
      const surface = async (selector: string) => page.locator(selector).first().evaluate(node => {
        const style = getComputedStyle(node);
        return { border: style.border, radius: style.borderRadius, background: style.backgroundColor, shadow: style.boxShadow };
      });
      const padding = async (selector: string) => page.locator(selector).first().evaluate(node => getComputedStyle(node).padding);
      const pattern = page.locator(".natal-pattern-card").first();
      const expectedSurface = await surface(".natal-pattern-card");
      const expectedPadding = await padding(".natal-pattern-card__header");
      expect(await surface(".placement-table-row")).toEqual(expectedSurface);
      expect(await padding(".placement-table-row")).toEqual(expectedPadding);
      expect(await pattern.locator("header > *").evaluateAll(nodes => nodes.map(node => node.tagName))).toEqual(["SPAN", "H3", "P"]);
      await expect(pattern.getByRole("button", { name: "Read More" })).toBeVisible();
      await mkdir(responsiveScreenshotDir, { recursive: true });
      await pattern.screenshot({ path: path.join(responsiveScreenshotDir, `card-pattern-${theme}-${width}.png`) });
      await page.locator(".placement-table-row").first().screenshot({ path: path.join(responsiveScreenshotDir, `card-placement-${theme}-${width}.png`) });
      await expectNoHorizontalOverflow(page, "shared natal cards");
      await check(".card-read-more", "action");
      const placementCard = page.locator(".placement-table-row").first();
      const previewBox = await placementCard.locator(".placement-table-row__description").boundingBox();
      const actionBox = await placementCard.locator(".card-read-more").boundingBox();
      expect(actionBox!.y).toBeGreaterThanOrEqual(previewBox!.y + previewBox!.height);
      const natalRoute = page.url();
      await page.locator(".placement-table-row .card-read-more").first().click();
      await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
      await page.goto(natalRoute);
      await selectFriendDetailTab(page, "Transits");
      await check(".updates-aspect-row__title", "title");
      await check(".updates-aspect-row__description", "body");
      expect(await surface(".updates-aspect-row")).toEqual(expectedSurface);
      expect(await padding(".updates-aspect-row")).toEqual(expectedPadding);
      await page.locator(".updates-aspect-row").first().screenshot({ path: path.join(responsiveScreenshotDir, `card-transit-${theme}-${width}.png`) });
      await expectNoHorizontalOverflow(page, "shared transit cards");
      await check(".card-read-more", "action");
      await page.locator(".updates-aspect-row .card-read-more").first().click();
      await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
      await expectClientRouteLoads(page, "/#sky");
      const skyCard = page.locator(".planet-placement-row:has(.card-read-more)").first();
      await expect(skyCard.locator(".card-read-more")).toBeVisible();
      await skyCard.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
      await check(".article-pills .ui-pill", "pill");
    });
  }
}

// Run this same release regression against local preview and PLAYWRIGHT_BASE_URL.
// Empty CMS fixtures prove the shipped canonical package.
test("an open Friends article survives an empty initial dashboard overlay", async ({ page }) => {
  await seedClientState(page, { profile: true, friends: true, preloadProfileNatalSky: true,
    synastryFixture: { body: "Midheaven", aspect: "sextile", inverse: true } });
  let releaseOverlay!: () => void;
  const overlayReady = new Promise<void>(resolve => { releaseOverlay = resolve; });
  let overlayReads = 0;
  await page.route('**/api/content-reader', async route => {
    if (route.request().postDataJSON().provider === "tldrastro-fallback-architecture-v3") {
      overlayReads += 1;
      await overlayReady;
    }
    await route.fulfill({ json: readerResponse([]) });
  });
  await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-batch4&view=synastry");
  const card = page.getByRole("button", { name: "Open full entry for Your Midheaven sextile Sofia's Sun", exact: true });
  await expect(card.locator(".synastry-contact-description")).not.toBeEmpty();
  const copy = await card.locator(".synastry-contact-description").innerText();
  await expect.poll(() => overlayReads).toBeGreaterThan(0);
  await card.click();
  const detail = page.locator(".app-shell.mode-detail");
  await expect(detail).toContainText(copy);
  releaseOverlay();
  // Observe the asynchronous installation after the deliberately late response.
  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(250);
    await expect(detail).toContainText(copy);
  }
});

for (const body of ["Ascendant", "Midheaven", "Descendant", "Imum Coeli", "Chiron", "North Node", "South Node", "Lilith"]) {
  for (const aspect of ["conjunction", "square", "opposition", "trine", "sextile"]) {
    for (const inverse of [false, true]) {
      test(`Batch 4 canonical Friends ${body} ${aspect} ${inverse ? "opposite" : "new"}`, async ({ page }) => {
        test.setTimeout(60_000);
        await seedClientState(page, { profile: true, friends: true, preloadProfileNatalSky: true, synastryFixture: { body, aspect, inverse } });
        await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-batch4&view=synastry");
        const readerBody = inverse ? body : "Sun";
        const friendBody = inverse ? "Sun" : body;
        const aspectWord = aspect === "conjunction" ? "conjunct" : aspect === "opposition" ? "opposite" : aspect;
        const card = page.getByRole("button", { name: `Open full entry for Your ${readerBody} ${aspectWord} Sofia's ${friendBody}`, exact: true });
        const family = ["square", "opposition"].includes(aspect) ? "hard" : ["trine", "sextile"].includes(aspect) ? "soft" : aspect;
        const row = fallbackSourceRowsV3.hookRows.find(r => r.contentKey === `fallback-hook/synastry-pair/sun/${body.toLowerCase().replaceAll(" ", "-")}/${family}`)!;
        const copy = String(inverse ? row.body_they : row.body_you)
          .replaceAll("{{holder1PossCap}}", inverse ? "Sofia's" : "Your")
          .replaceAll("{{holder2PossCap}}", inverse ? "Your" : "Sofia's")
          .replaceAll("{{holder1Poss}}", inverse ? "Sofia's" : "your")
          .replaceAll("{{holder2Poss}}", inverse ? "your" : "Sofia's")
          .replaceAll("{{holder1}}", inverse ? "Sofia" : "you")
          .replaceAll("{{holder2}}", inverse ? "you" : "Sofia");
        await expect(card.locator(".synastry-contact-description")).toHaveText(copy, { timeout: 20_000 });
        await card.click();
        const detail = page.locator(".app-shell.mode-detail");
        await expect(detail).toContainText(copy);
        await expect(detail).not.toContainText(/\{\{(?:holder[12]|Name)/);
      });
    }
  }
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`card pills move to article headers ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 1000 });
      await seedClientState(page, { profile: true, profileBirthDate: "1980-02-01", friends: true, preloadProfileNatalSky: true, theme, now: "2026-09-10T16:00:00.000Z" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await expectClientRouteLoads(page, "/#sky");
      const moon = page.getByRole("button", { name: "Read more about Moon in Virgo", exact: true });
      await expect(moon).toBeVisible();
      await expect(page.locator(".planet-placement-row .ui-pill")).toHaveCount(0);
      await moon.click();
      const header = page.locator(".article-id");
      const pills = header.locator(".article-pills");
      await expect(pills).toContainText(/COMBUST/i);
      await expect(pills).toContainText(/left/);
      const date = await header.locator(".article-duration").first().boundingBox();
      const pillBox = await pills.boundingBox();
      expect(pillBox!.y).toBeGreaterThanOrEqual(date!.y + date!.height);
      await expectNoHorizontalOverflow(page, `article pills ${theme} ${width}`);
      await page.screenshot({ path: `test-results/article-pills-sky-${theme}-${width}.png` });
      const labels = await pills.innerText();
      await page.reload();
      await expect.poll(() => pills.innerText()).toEqual(labels);
      await expectClientRouteLoads(page, "/#you");
      const houseCard = page.locator("button.updates-aspect-row--house").first();
      await expect(houseCard).toBeVisible();
      await expect(page.locator("button.updates-aspect-row .ui-pill")).toHaveCount(0);
      await houseCard.click();
      await expect(pills).toContainText(/Long-term|Short-term/);
      await expect(header.locator(".article-duration")).toBeVisible();
      expect(await pills.locator(".ui-pill").count()).toBeGreaterThan(2);
      await page.locator(".sky-detail-back").click();
      await selectYouNatalTab(page);
      await expect(page.locator(".placement-table-row .ui-pill")).toHaveCount(0);
      await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
      await expect(pills).toContainText("Constrained");
      await expect(pills).toContainText("Detriment");
      await page.screenshot({ path: `test-results/article-pills-natal-${theme}-${width}.png` });
      await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-nikki&view=natal");
      const friendCard = page.locator("button.placement-table-row").first();
      await expect(friendCard).toBeVisible();
      await expect(page.locator(".placement-table-row .ui-pill")).toHaveCount(0);
      await friendCard.click();
      await expect(page.locator(".article-id h1")).toBeVisible();
      await expectNoHorizontalOverflow(page, `friend article pills ${theme} ${width}`);
      await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-nikki&view=synastry");
      const contact = page.locator("button.friend-aspect-row").filter({ has: page.locator(".synastry-contact-description") }).first();
      await expect(contact).toBeVisible();
      await expect(contact.locator(".ui-pill")).toHaveCount(0);
      await contact.click();
      await expect(pills.locator(".ui-pill--muted")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

// Synthetic publications exercise keys absent from the shipped catalog. Run
// these same tests against production; every content request remains isolated.
async function seedCrossSurfacePublications(page: Page, records: Array<Record<string, any>>, options: SeedOptions) {
  const updatedAt = "2026-09-10T20:00:00.000Z";
  const manifest = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-manifest-summary-v3.json", "utf8"));
  const rows = records.map((record, index) => ({
    id: `qa-cross-surface-${index}`, content_key: record.contentKey,
    surface: record.contentKey.includes("synastry-pair") ? "synastry" : "you",
    mode: "in_depth", status: "LIVE", lane: "serving", review_state: null,
    provider: "tldrastro-fallback-architecture-v3", updated_at: updatedAt,
    body: record.body_you, facts: { content_role: "full_copy", review_status: "approved" },
    source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", content_role: "full_copy", review_status: "approved" },
    sections: { packageRecord: record }
  }));
  await seedClientState(page, { ...options, cachedDashboardOverlay: {
    // The old reader already cached this unchanged database revision while
    // dropping the new keys. Upgrading must fetch them without another edit.
    schema: "fallback-architecture-v3-dashboard-overlay-cache-v6",
    runtimeCapability: manifest.runtimeCapability, bundledPackageVersion: manifest.packageVersion,
    dashboardVersion: Date.parse(updatedAt),
    bundle: { transitLib: { authoredCards: [{ contentKey: "authored/transit-house-intro/sun/1", content_role: "full_copy", review_status: "approved", body: "QA previously cached source." }] }, rowsFile: { hookRows: [], vocabularyRows: [] }, templatesFile: { templates: [] } }
  }, contentPublications: rows.map(row => ({
    content_key: row.content_key, state: "live", revision: 100_000,
    row_id: row.id, row_updated_at: updatedAt, updated_at: updatedAt
  })) });
  await page.route("**/rest/v1/rpc/content_runtime_revision", route => route.fulfill({ json: updatedAt }));
  await page.route("**/content-studio-last-known-good.json", route => route.fulfill({
    json: { schema: "content-studio-last-known-good-v2", rowCount: 0, rows: [] }
  }));
  await page.route('**/api/content-reader', route => {
    const params = route.request().postDataJSON();
    const keys: string[] = params.keys ?? [];
    const selected = params.provider === "tldrastro-fallback-architecture-v3"
      ? rows : rows.filter(row => keys?.includes(row.content_key));
    return route.fulfill({ json: readerResponse(selected) });
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`new Studio exact synastry publication reaches reader and retires ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 1000 });
      const inverse = width === 390;
      const contentKey = "fallback-hook/synastry-pair/sun/chiron/square";
      expect(fallbackSourceRowsV3.hookRows.some(row => row.contentKey === contentKey)).toBe(false);
      const record = {
        contentKey, content_role: "full_copy", review_status: "approved",
        body_you: "QA new exact synastry opening.\n\nQA new exact synastry final sentence.",
        body_they: "QA opposite chart holder opening.\n\nQA opposite chart holder final sentence.",
        approval: { approvalLevel: "exact_owner_approved", recordPath: "qa://isolated-publication", payloadSha256: "a".repeat(64) }
      };
      await seedCrossSurfacePublications(page, [record], { profile: true, friends: true, theme,
        preloadProfileNatalSky: true, synastryFixture: { body: "Chiron", aspect: "square", inverse } });
      const errors = watchBrowserErrors(page);
      await expectClientRouteLoads(page, "/#friends?tab=charts&chart=friend-batch4&view=synastry");
      const card = page.getByRole("button", { name: `Open full entry for Your ${inverse ? "Chiron" : "Sun"} square Sofia's ${inverse ? "Sun" : "Chiron"}`, exact: true });
      const copy = inverse ? record.body_they : record.body_you;
      await expect(card.locator(".synastry-contact-description")).toHaveText(copy, { timeout: 30_000 });
      await card.click();
      await expect(page.locator(".app-shell.mode-detail")).toContainText(copy);
      await expectNoHorizontalOverflow(page, "new synastry publication");
      await page.screenshot({ path: `test-results/studio-synastry-admission-${theme}-${width}.png`, fullPage: true });
      const retiredAt = "2026-09-10T21:00:00.000Z";
      await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: [{
        content_key: contentKey, state: "retired", revision: 100_001,
        row_id: "qa-cross-surface-0", row_updated_at: "2026-09-10T20:00:00.000Z", updated_at: retiredAt
      }] }));
      await page.route("**/rest/v1/rpc/content_runtime_revision", route => route.fulfill({ json: retiredAt }));
      await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([]) }));
      await page.evaluate(contentKey => window.dispatchEvent(new CustomEvent("tldrastro:content-update", {
        detail: { contentKey, published: false }
      })), contentKey);
      await expect(page.locator(".app-shell.mode-detail")).toHaveCount(0);
      await expect(page.locator("main.app-shell")).not.toContainText(copy);
      errors();
    });

    test(`new Studio House Transit publications reach reader ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 1000 });
      const records = Array.from({ length: 12 }, (_, index) => index + 1).flatMap(house => [
        { contentKey: `authored/transit-house-intro/uranus/${house}`, content_role: "full_copy", review_status: "approved",
          body_you: `QA house ${house} introduction opening.\n\nQA house ${house} introduction final sentence.`,
          body_they: `QA friend house ${house} introduction opening. QA friend introduction final sentence.` },
        { contentKey: `authored/transit-house-sign/uranus/${house}/gemini`, content_role: "full_copy", review_status: "approved",
          body_you: `QA house ${house} sign passage opening.\n\nQA house ${house} sign passage final sentence.`,
          body_they: `QA friend house ${house} sign passage opening. QA friend sign passage final sentence.` }
      ]);
      await seedCrossSurfacePublications(page, records, { profile: true, preloadProfileNatalSky: true, theme, now: "2026-09-10T16:00:00.000Z" });
      const errors = watchBrowserErrors(page);
      await expectClientRouteLoads(page, "/#you");
      const card = page.locator("button.updates-aspect-row--house").filter({ hasText: "Uranus" }).first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.click();
      const detail = page.getByRole("region", { name: /^Uranus through your \d+(?:st|nd|rd|th) house$/ });
      await expect(detail).toContainText(/QA house \d+ introduction opening\./, { timeout: 30_000 });
      const text = await detail.innerText();
      const house = text.match(/QA house (\d+) introduction opening\./)![1];
      for (const record of records.filter(record => record.contentKey === `authored/transit-house-intro/uranus/${house}` || record.contentKey === `authored/transit-house-sign/uranus/${house}/gemini`)) {
        for (const paragraph of record.body_you.split("\n\n")) {
          await expect(detail.getByText(paragraph, { exact: true })).toBeVisible();
        }
      }
      await expectNoHorizontalOverflow(page, "new House Transit publication");
      await page.screenshot({ path: `test-results/studio-house-admission-${theme}-${width}.png`, fullPage: true });
      errors();
    });
  }
}
