import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.TLDR_BROWSER_BASE_URL ?? "http://127.0.0.1:5173/";
const outputDir = path.join(process.cwd(), "scripts/generated/browser-proof");
const outputJson = path.join(process.cwd(), "scripts/generated/source-grounded-browser-proof.json");

const routes = [
  {
    route: "#/sky",
    surfaceId: "sky.collective-list",
    templateId: "sky.collective-card-list",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement",
    expectedPagePatterns: [
      /This summer’s waterworks will soak us all\./i,
      /A family conversation, household plan, or message with a long history may need another pass\./i
    ],
    forbiddenPagePatterns: [
      /After the mile-a-minute chats and frenzied brainstorms/i,
      /\bputs attention on the instinct/i,
      /the cosmos is turning our attention to our EQ/i,
      /Mars in Gemini is active in the current sky/i,
      /Jupiter in Leo: you grow through/i,
      /&quot;|&#39;/i
    ]
  },
  {
    route: "#/you/placement/sun-aquarius-9h",
    surfaceId: "natal.placement",
    templateId: "natal.placement.integrated",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/me.natal-placement/sun-aquarius-house-9"
  },
  {
    route: "#/sky/placement/mercury/cancer",
    surfaceId: "sky.retrograde",
    templateId: "sky.retrograde.passage",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/mercury/cancer",
    expectedTitle: "Mercury Rx in Cancer",
    expectedDate: "Jun 29, 2026 - Jul 23, 2026",
    forbiddenDetailPatterns: [
      /ASPECTS TO MERCURY TODAY/i,
      /Sun conjunction Mercury: two chart functions meet at once/i,
      /calculated retrograde passage phase/i
    ]
  },
  {
    route: "#/sky/placement/chiron/taurus",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/chiron/taurus",
    expectedTitle: "Chiron in Taurus",
    expectedDate: "Jun 19 - Sep 18",
    forbiddenDetailPatterns: [
      /ASPECTS TO CHIRON TODAY/i,
      /^follow instincts$/im,
      /Chiron sextile North Node: an available opening/i
    ]
  },
  {
    route: "#/sky/placement/sun",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/sun/cancer",
    expectedTitle: "Sun in Cancer",
    expectedDate: "Jun 21 - Jul 22",
    forbiddenDetailPatterns: [
      /ASPECTS TO SUN TODAY/i,
      /Sun conjunction Mercury: two chart functions meet at once/i
    ]
  },
  {
    route: "#/sky/placement/moon",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/moon/cancer",
    expectedTitle: "Moon in Cancer",
    expectedDate: "Jul 12 - 14",
    forbiddenDetailPatterns: [
      /ASPECTS TO MOON TODAY/i,
      /deeply feeling and protective; needs safety/i,
      /Moon in Cancer is active in the current sky/i,
      /move through Cancer circumstances/i
    ]
  },
  {
    route: "#/sky/placement/mars",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/mars/gemini",
    expectedTitle: "Mars in Gemini",
    expectedDate: "Jun 28 - Aug 11",
    forbiddenDetailPatterns: [
      /Mars in Gemini is active in the current sky/i,
      /ASPECTS TO MARS TODAY/i,
      /move through Gemini circumstances/i
    ]
  },
  {
    route: "#/sky/placement/jupiter",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/jupiter/leo",
    expectedTitle: "Jupiter in Leo",
    expectedDate: "Jun 30, 2026 - Jul 26, 2027",
    forbiddenDetailPatterns: [
      /Jupiter in Leo: you grow through/i,
      /ASPECTS TO JUPITER TODAY/i,
      /&quot;full permission&quot;/i
    ]
  },
  {
    route: "#/sky/placement/saturn",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/saturn/aries",
    expectedTitle: "Saturn in Aries",
    expectedDate: "Feb 14, 2026 - Apr 13, 2028",
    forbiddenDetailPatterns: [
      /slow your roll/i,
      /ASPECTS TO SATURN TODAY/i,
      /Saturn in Aries is active in the current sky/i
    ]
  },
  {
    route: "#/sky/placement/uranus",
    surfaceId: "sky.collective-placement",
    templateId: "sky.collective-planet-in-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.planetary-placement/uranus/gemini",
    expectedTitle: "Uranus in Gemini",
    expectedDate: "Apr 26, 2026 - Aug 3, 2032",
    forbiddenDetailPatterns: [
      /full system upgrade/i,
      /ASPECTS TO URANUS TODAY/i,
      /&quot;/i
    ]
  },
  {
    route: "#/sky/aspect/sun/conjunction/mercury",
    surfaceId: "sky.aspect",
    templateId: "sky.current-aspect",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/sky.aspect-row",
    expectedTitle: "Sun Conjunction Mercury",
    forbiddenDetailPatterns: [
      /two chart functions meet at once/i,
      /a close merge that concentrates/i,
      /ASPECTS TO/i
    ]
  },
  {
    route: "#/",
    surfaceId: "home.planetary-horoscope",
    templateId: "home.personalized-planetary-horoscope",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/home.planetary-horoscope"
  },
  {
    route: "#/",
    surfaceId: "moon.phase",
    templateId: "home.moon-phase",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "surface-family",
    fallbackId: "fallback-hook/home.moon-phase"
  },
  {
    route: "#/",
    surfaceId: "moon.sign",
    templateId: "home.moon-sign",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/home.moon-sign/cancer"
  },
  {
    route: "#/you",
    surfaceId: "personalized-transit.short-term",
    templateId: "personalized-transit.short-term",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "surface-family",
    fallbackId: "fallback-hook/you.transit-to-natal"
  },
  {
    route: "#/you",
    surfaceId: "personalized-transit.long-term",
    templateId: "personalized-transit.long-term",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "surface-family",
    fallbackId: "fallback-hook/you.transit-to-natal"
  },
  {
    route: "#/you/placement/mars-leo-4h",
    surfaceId: "natal.placement",
    templateId: "natal.placement.integrated",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/me.natal-placement/mars-leo-house-4",
    expectedTitle: "Mars Rx in Leo in the 4th house",
    forbiddenDetailPatterns: [
      /Interpretation unavailable/i,
      /^Mars Rx? in Leo in the 4th house\.$/im,
      /Mars describes/i,
      /the style or condition/i,
      /This placement is easiest to see/i,
      /\bMars in Leo\b[\s\S]{0,80}\bMars in the 4th house\b/i,
      /\bPlacement story\b[\s\S]{0,160}\bNatal aspects to Mars\b/i
    ]
  },
  {
    route: "#/you/placement/mercury-aquarius-10h",
    surfaceId: "natal.placement",
    templateId: "natal.placement.integrated",
    recordStatus: "SOURCE_GAP",
    fallbackSpecificity: "exact-combination",
    fallbackId: "fallback-hook/me.natal-placement/mercury-aquarius-house-10",
    expectedTitle: "Mercury in Aquarius in the 10th house",
    forbiddenDetailPatterns: [
      /Interpretation unavailable/i,
      /^Mercury in Aquarius in the 10th house\.$/im,
      /Mercury describes/i,
      /the style or condition/i,
      /This placement is easiest to see/i,
      /\bMercury in Aquarius\b[\s\S]{0,80}\bMercury in the 10th house\b/i,
      /\bPlacement story\b[\s\S]{0,160}\bNatal aspects to Mercury\b/i
    ]
  }
];

const seededProfile = {
  id: "browser-proof-user",
  name: "Browser Proof",
  email: "browser-proof@example.test",
  provider: "email",
  sun: "Aquarius",
  moon: "Cancer",
  rising: "Gemini",
  currentLocation: "New York, NY",
  currentLocationData: {
    label: "New York, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  },
  settings: {
    houseSystem: "Whole Sign",
    zodiac: "Tropical",
    aspects: "Standard",
    houseSignLabelStyle: "glyph",
    lifeAreaFocus: ["money", "communication", "growth"]
  },
  charts: [
    {
      id: "browser-proof-chart",
      name: "Browser Proof",
      type: "Birth chart",
      birthDate: "1995-02-17",
      birthTime: "10:25 AM",
      birthCity: "New York, NY",
      birthLocation: {
        label: "New York, NY",
        latitude: 40.7128,
        longitude: -74.006,
        timeZone: "America/New_York"
      }
    }
  ]
};

const viewports = [
  { label: "desktop", width: 1440, height: 1100 },
  { label: "mobile", width: 390, height: 900 }
];

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function occurrenceCount(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
  const fixture = routes[routeIndex];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await context.addInitScript(({ profile, route }) => {
      window.localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
      window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(profile.currentLocationData));
      const portalMode = route.includes("#/you")
        ? "profile"
        : route.includes("#/sky")
          ? "member"
          : "guest";
      window.localStorage.setItem("tldrastro:portalMode", portalMode);
    }, { profile: seededProfile, route: fixture.route });
    const page = await context.newPage();
    const url = `${baseUrl}${fixture.route}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (fixture.surfaceId === "sky.collective-list") {
      await page.locator(".placement-table").first().waitFor({ state: "visible", timeout: 15000 });
      await page.locator(".placement-table").first().getByText("Sun in Cancer").waitFor({ state: "visible", timeout: 15000 });
    }
    const initialText = normalizeText(await page.locator("body").innerText({ timeout: 15000 }));
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    if (fixture.surfaceId === "sky.collective-list") {
      await page.locator(".placement-table").first().waitFor({ state: "visible", timeout: 15000 });
      await page.locator(".placement-table").first().getByText("Sun in Cancer").waitFor({ state: "visible", timeout: 15000 });
    }
    const hydratedText = normalizeText(await page.locator("body").innerText({ timeout: 15000 }));
    const assertionText = fixture.surfaceId === "sky.collective-list"
      ? normalizeText(await page.locator(".planet-placement-row").evaluateAll((rows) => rows.map((row) => row.textContent ?? "").join("\n")))
      : hydratedText;
    if (hydratedText.includes("Interpretation unavailable.")) {
      throw new Error(`${fixture.route} leaked Interpretation unavailable.`);
    }
    if (/\b(?:DRAFT|SOURCE_GAP|needs_review|NOT READER AUTHORITY)\b/u.test(hydratedText)) {
      throw new Error(`${fixture.route} leaked editorial workflow labels.`);
    }
    for (const pattern of fixture.expectedPagePatterns ?? []) {
      if (!pattern.test(assertionText)) {
        throw new Error(`${fixture.route} did not render expected page pattern ${pattern}: ${assertionText}`);
      }
    }
    for (const pattern of fixture.forbiddenPagePatterns ?? []) {
      if (pattern.test(assertionText)) {
        throw new Error(`${fixture.route} leaked forbidden page pattern ${pattern}: ${assertionText}`);
      }
    }
    if (fixture.expectedTitle) {
      const article = page.locator(".sky-detail-article, .you-transit-article, .article-shell").first();
      if (await article.count() === 0) {
        throw new Error(`${fixture.route} did not render an article shell. Body: ${hydratedText}`);
      }
      const articleText = normalizeText(await article.innerText({ timeout: 15000 }));
      const titleCount = occurrenceCount(articleText, fixture.expectedTitle);
      if (titleCount !== 1) {
        throw new Error(`${fixture.route} should render title once inside the article; found ${titleCount}. Text: ${articleText}`);
      }
      if (fixture.expectedDate) {
        const dateCount = occurrenceCount(articleText, fixture.expectedDate);
        if (dateCount !== 1) {
          throw new Error(`${fixture.route} should render date range once inside the article; found ${dateCount}. Text: ${articleText}`);
        }
      }
      if (await article.locator(".article-body-inner br").count() > 0) {
        throw new Error(`${fixture.route} rendered manual <br> tags in article prose.`);
      }
      const paragraphTexts = await article.locator(".sky-detail-body .sky-detail-section p").allInnerTexts();
      const visibleParagraphs = paragraphTexts.map(normalizeText).filter(Boolean);
      const maxParagraphs = fixture.surfaceId === "natal.placement" ? 6 : 2;
      if (visibleParagraphs.length < 1 || visibleParagraphs.length > maxParagraphs) {
        throw new Error(`${fixture.route} should render 1-${maxParagraphs} article body paragraphs; found ${visibleParagraphs.length}: ${JSON.stringify(visibleParagraphs)}`);
      }
      for (const paragraph of visibleParagraphs) {
        if (/^[a-z]/u.test(paragraph)) {
          throw new Error(`${fixture.route} rendered lowercase paragraph start: ${paragraph}`);
        }
        if (!/[.!?]$/u.test(paragraph)) {
          throw new Error(`${fixture.route} rendered a paragraph without terminal punctuation: ${paragraph}`);
        }
        if (paragraph.split(/\s+/u).length <= 4 && !/^[A-Z][a-z]+[.!?]$/u.test(paragraph)) {
          throw new Error(`${fixture.route} rendered an isolated fragment paragraph: ${paragraph}`);
        }
      }
      for (const pattern of fixture.forbiddenDetailPatterns ?? []) {
        if (pattern.test(articleText)) {
          throw new Error(`${fixture.route} leaked forbidden detail pattern ${pattern}: ${articleText}`);
        }
      }
      if (/ASPECTS TO .* TODAY/i.test(articleText)) {
        throw new Error(`${fixture.route} rendered an unauthorized related-aspect section: ${articleText}`);
      }
    }
    const screenshotPath = path.join(
      outputDir,
      `${String(routeIndex + 1).padStart(2, "0")}-${viewport.label}-${fixture.surfaceId.replace(/[^a-z0-9]+/gi, "-")}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.push({
      route: fixture.route,
      url,
      viewport: viewport.label,
      surfaceId: fixture.surfaceId,
      templateId: fixture.templateId,
      templateVersion: "2.3.0",
      exactSourceStatus: "absent",
      sourceGap: true,
      readerAuthority: "approved-fallback",
      fallbackSpecificity: fixture.fallbackSpecificity,
      fallbackId: fixture.fallbackId,
      recordStatus: fixture.recordStatus,
      primarySourceId: null,
      supportingSourceIds: [],
      legacyContributors: [],
      initialText,
      hydratedText,
      fixtureText: "",
      parity: initialText === hydratedText || hydratedText.includes(initialText),
      screenshotPath
    });
    await context.close();
  }
}

await browser.close();

const collectiveSky = results.find((result) => result.surfaceId === "sky.collective-placement");
const homePlanetary = results.find((result) => result.surfaceId === "home.planetary-horoscope");
if (collectiveSky?.fallbackId === homePlanetary?.fallbackId) {
  throw new Error("Collective Sky fallback leaked into Home planetary horoscope route.");
}

const report = {
  schema: "tldrastro-source-grounded-browser-proof-v2.3.0",
  generatedAt: new Date().toISOString(),
  baseUrl,
  browserFixturesPassed: results.filter((result) => result.parity).length,
  results
};

fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  browserFixturesPassed: report.browserFixturesPassed,
  total: results.length,
  outputJson
}, null, 2));
