import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  expectRouteLoadsWithin,
  routeReadyTimeoutMs,
  watchBrowserErrors
} from "./qaRuntimeGuards";

type SeedOptions = {
  profile?: boolean;
  friends?: boolean;
  theme?: "light" | "dark";
  now?: string;
};

const fixtureLocation = {
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
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
  hookRows: Array<{ contentKey: string; body_you?: string }>;
};
const mercuryAscendantHardSource = fallbackSourceRowsV3.hookRows.find(
  (row) => row.contentKey === "fallback-hook/synastry-pair/mercury/ascendant/hard"
);
const mercuryAscendantHardOpening = String(mercuryAscendantHardSource?.body_you ?? "")
  .split(". ")[0]
  .replaceAll("{{holder1PossCap}}", "Your")
  .replaceAll("{{holder2Poss}}", "Alisa's")
  .concat(".");

async function selectFriendDetailTab(
  page: Page,
  name: "Compatibility" | "Transits" | "Natal" | "Synastry" | "Composite"
) {
  if (name === "Synastry" || name === "Composite") {
    const option = page.getByRole("menuitemradio", { name: new RegExp(`^${name}`) });

    if (!await option.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /More, \d+ sections/ }).click();
    }

    await option.click();
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
  const requestedNow = options.now ?? fixedNow;

  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "text/plain",
      body: "QA flow tests use local fallback content instead of the deployed API."
    });
  });
  await page.route("**/rest/v1/generated_interpretations*", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "QA flow tests use the deterministic local content snapshot." })
    });
  });

  await page.addInitScript(({ fixtureLocation, fixtureUserId, fixedNow, options }) => {
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

    if (!window.localStorage.getItem("tldrastro:qaFlowSeeded")) {
      window.localStorage.clear();
      window.localStorage.setItem("tldrastro:qaFlowSeeded", "true");
      window.localStorage.setItem("tldrastro:theme", options.theme ?? "light");
      window.localStorage.setItem("tldrastro:sunriseOrb", "true");
      window.localStorage.setItem("tldrastro:dyslexiaFont", "false");
      window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(fixtureLocation));
    }

    if (!options.profile) {
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
      name: "Marie Satori",
      email: "qa-flow@example.com",
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
  }, { fixtureLocation, fixtureUserId, fixedNow: requestedNow, options });

  await page.emulateMedia({ reducedMotion: "reduce" });
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
      fontFamily: rootStyle.getPropertyValue("--font-label").trim(),
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

async function expectLunarSelectedCardMinimalFonts(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const card = document.querySelector(".lunar-selected-card");
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
  expect(result.families, `${label} uses one readable font family in the selected lunar card: ${result.samples.join(" | ")}`).toHaveLength(1);
  expect(result.fontSizes.length, `${label} keeps selected lunar card type scale compact: ${result.sizeSamples.join(" | ")}`).toBeLessThanOrEqual(6);
  expect(result.fontWeights.length, `${label} keeps selected lunar card font weights compact: ${result.weightSamples.join(" | ")}`).toBeLessThanOrEqual(3);
}

async function expectLunarSelectedCardEventAlignment(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const reference = document.querySelector(".lunar-selected-card__void, .lunar-selected-card__body, .lunar-selected-card__daily-events");
    const contentTrack = document.querySelector(".lunar-selected-card__copy");
    const body = document.querySelector(".lunar-selected-card__body");
    const after = document.querySelector(".lunar-selected-card__after");
    const events = Array.from(document.querySelectorAll(".lunar-selected-card__daily-event"));

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
      const leftDelta = Math.abs(rect.left - referenceRect.left);
      const rightDelta = Math.abs(rect.right - referenceRect.right);

      if (leftDelta > 1 || rightDelta > 1) {
        failures.push(`event ${index + 1} left ${leftDelta.toFixed(1)}px right ${rightDelta.toFixed(1)}px`);
      }
    });

    return { checked: events.length, failures };
  });

  expect(result.checked, `${label} has lunar event rows to align`).toBeGreaterThan(0);
  expect(result.failures, `${label} aligns lunar event rows with the selected-card content track`).toEqual([]);
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
    const readableFormText = Array.from(root.querySelectorAll("label, legend, button, [role='option'], [role='menuitem'], .city-suggestions strong, .city-suggestions span, .lunar-location-picker strong, .lunar-location-picker span"))
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

async function expectHydrationKeepsReaderCopyStable(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  label: string,
  options: { minLength?: number; waitMs?: number } = {}
) {
  const minLength = options.minLength ?? 120;
  const waitMs = options.waitMs ?? 3500;

  await expect(locator, `${label} is visible before hydration settles`).toBeVisible();
  await expect.poll(async () => {
    return ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim().length;
  }, {
    message: `${label} has enough initial reader-facing copy to compare before hydration`,
    timeout: 5000
  }).toBeGreaterThanOrEqual(minLength);

  const before = ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim();

  expect(before, `${label} initial copy does not leak scaffolding or stale fallback text`).not.toMatch(readerCopyLeakPattern);
  expect(before, `${label} initial copy does not surface directional scaffold copy`).not.toMatch(directionalCopyPattern);

  await page.waitForTimeout(waitMs);

  const after = ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim();

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

    await page.getByRole("button", { name: "Close detail" }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
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
    await expect(page.getByText("Marie Satori")).toBeVisible();
    await expect(
      page.locator(".soul-roadmap-card, .career-archetype-card"),
      "Soul's Path and Career Directions stay hidden from the personal chart"
    ).toHaveCount(0);

    const updatesTab = page.getByRole("tab", { name: /updates|transits/i });
    if (await updatesTab.isVisible()) {
      await updatesTab.click();
      await expect(updatesTab).toHaveAttribute("aria-selected", "true");
      const transitWheel = page.getByLabel("Transit chart wheel");
      await expect(transitWheel).toBeVisible();
      await expect(
        transitWheel.locator(".sky-wheel--aspect-inspector"),
        "Personal transit wheel omits the aspect inspector"
      ).toHaveCount(0);

      const houseTransitCard = page
        .getByLabel("House transits")
        .locator(".updates-aspect-row--house")
        .first();
      const houseTransitKeywords = houseTransitCard
        .getByLabel("House keywords")
        .locator(".house-transit-keyword");
      await expect(
        houseTransitCard.locator(".planet-placement-row__duration"),
        "House transit timing uses the compact duration format"
      ).toHaveText(/^(?:TODAY|\d+D|\d+M|\d+Y(?: \d+M)?)$/);
      await expect(
        houseTransitCard.locator(".house-transit-term-tag"),
        "The term classification moves into the footer tags"
      ).toHaveText(/^(?:Short-term|Long-term)$/);
      await expect(
        houseTransitCard.locator(".house-transit-term-tag"),
        "The term classification tag has no outline"
      ).toHaveCSS("border-top-width", "0px");
      await expect(houseTransitKeywords.first()).toBeVisible();
      await expect(
        houseTransitCard.locator(".updates-aspect-row__description + .house-transit-keywords"),
        "House transit keyword tags follow the card description"
      ).toBeVisible();
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
      expect(await houseTransitKeywords.count(), "House transit keywords render as separate tags").toBeGreaterThan(1);
      for (const keyword of await houseTransitKeywords.allTextContents()) {
        expect(keyword, "House transit keyword tags do not include comma separators").not.toContain(",");
      }

      await houseTransitCard.click();
      await expect(page.getByRole("heading", { name: /through your \d+(?:st|nd|rd|th) house/i })).toBeVisible();
      await expectNoDuplicateArticleHeadings(page, "You house-transit detail");
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
    await expect(
      friendHouseTransitCard.locator(".planet-placement-row__duration"),
      "Friend house transit timing uses the compact duration format"
    ).toHaveText(/^(?:TODAY|\d+D|\d+M|\d+Y(?: \d+M)?)$/);
    await expect(
      friendHouseTransitCard.locator(".house-transit-term-tag"),
      "Friend term classification moves into the footer tags"
    ).toHaveText(/^(?:Short-term|Long-term)$/);
    await expect(
      friendHouseTransitCard.locator(".house-transit-term-tag"),
      "Friend term classification tag has no outline"
    ).toHaveCSS("border-top-width", "0px");
    await expect(
      friendHouseTransitCard.locator(".updates-aspect-row__description + .house-transit-keywords"),
      "Friend house transit keyword tags follow the card description"
    ).toBeVisible();
    const friendHouseTransitRange = (
      await friendHouseTransitCard.locator(".updates-aspect-row__meta-line > span").last().innerText()
    ).trim();
    const friendHouseTransitDescription = (
      await friendHouseTransitCard.locator(".updates-aspect-row__description").innerText()
    ).trim();
    expect(
      friendHouseTransitDescription.startsWith(`${friendHouseTransitRange},`),
      "Friend house transit body does not repeat its visible date range"
    ).toBe(false);
    await friendHouseTransitCard.click();
    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Friend house-transit detail");
    await page.getByRole("button", { name: "Close detail" }).click();
    await expect(page.getByRole("tab", { name: "Transits" })).toHaveAttribute("aria-selected", "true");

    const transitCardText = ((await transitCard.innerText()) ?? "").replace(/\s+/g, " ").trim();
    const rangeLabel = ((await transitCard.locator(".updates-aspect-row__meta-line > span").last().innerText()) ?? "").trim();
    const orbLabel = ((await transitCard.locator(".updates-aspect-row__orb").innerText()) ?? "").trim();
    expect(transitCardText.split(rangeLabel).length - 1, "Transit date range appears once").toBe(1);
    expect(transitCardText.split(orbLabel).length - 1, "Transit orb appears once").toBe(1);

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
    const synastryContactCard = page.locator(".friend-aspect-row").first();
    const synastryContactDescription = synastryContactCard.locator(".synastry-contact-description");
    const synastryContactTag = synastryContactCard.locator(".aspect-row-subtitle");
    await expect(synastryContactDescription).toBeVisible();
    await expect(synastryContactTag).toBeVisible();
    const descriptionBox = await synastryContactDescription.boundingBox();
    const tagBox = await synastryContactTag.boundingBox();
    expect(descriptionBox, "Synastry contact description has layout geometry").not.toBeNull();
    expect(tagBox, "Synastry contact tag has layout geometry").not.toBeNull();
    expect(
      tagBox!.y,
      "Synastry contact tags render underneath the description"
    ).toBeGreaterThanOrEqual(descriptionBox!.y + descriptionBox!.height);

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

  test("friend chart section pills and overflow menu fit a narrow viewport", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { profile: true, friends: true });
    await expectClientRouteLoads(page, "/#friends?tab=charts");
    await page.getByRole("button", { name: "Open Nikki" }).click();

    const tablist = page.getByRole("tablist", { name: "Chart profile sections" });
    await expect(tablist).toBeVisible();
    const tablistBox = await tablist.boundingBox();
    expect(tablistBox).not.toBeNull();
    expect(tablistBox!.x).toBeGreaterThanOrEqual(0);
    expect(tablistBox!.x + tablistBox!.width).toBeLessThanOrEqual(390);

    await page.getByRole("button", { name: "More, 2 sections" }).click();
    const menu = page.getByRole("menu", { name: "More chart profile sections" });
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(390);

    await selectFriendDetailTab(page, "Composite");
    await expect(page.getByText("What a composite chart is")).toBeVisible();
    await assertNoClientErrors();
  });

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

    const monthTab = page.getByRole("tab", { name: "Month" });
    if (await monthTab.isVisible()) {
      await monthTab.click();
      await expect(monthTab).toHaveAttribute("aria-selected", "true");
    }

    const firstCalendarDay = page.locator(".lunar-calendar-day").first();
    if (await firstCalendarDay.isVisible()) {
      await firstCalendarDay.click();
      await expect(page.getByLabel("Selected lunar day")).toBeVisible();
    }

    const transitCard = page.locator(".lunar-month-transit-card--button").first();
    if (await transitCard.isVisible()) {
      await transitCard.click();
      await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    }

    await assertNoClientErrors();
  });

  test("calendar Week view presents seven API-backed day write-ups without mobile overflow", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-30T12:00:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar");

    const weeklyTab = page.getByRole("tab", { name: "Week", exact: true });
    await expect(weeklyTab).toBeVisible();
    await weeklyTab.click();
    await expect(weeklyTab).toHaveAttribute("aria-selected", "true");

    const weeklyView = page.locator(".lunar-weekly-view");
    await expect(weeklyView).toBeVisible();
    await expect(weeklyView.locator(".lunar-weekly-day")).toHaveCount(7);
    await expect(weeklyView.locator(".lunar-weekly-event__body").first()).toBeVisible({ timeout: 15_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth
    }));

    expect(widths.page, "The Weekly does not introduce horizontal page overflow").toBe(widths.viewport);
    await expect(weeklyView.locator(".lunar-weekly-day")).toHaveCount(7);
    await assertNoClientErrors();
  });

  test("calendar reserves the Full Moon title for the exact lunation day", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { now: "2026-07-29T03:30:00.000Z" });
    await expectClientRouteLoads(page, "/#calendar");

    const selectedDay = page.getByLabel("Selected lunar day");
    await expect(selectedDay).toBeVisible({ timeout: 15_000 });
    await expect(selectedDay.getByRole("heading", { level: 2 })).toHaveText("Waxing Gibbous Moon in Capricorn");
    await expect(page.getByRole("button", { name: /Full Moon in Aquarius Jul 29 tomorrow/ })).toBeVisible();

    await page.getByLabel("Selected week").getByRole("button", { name: /^Full Moon\. Moon in Aquarius/ }).click();
    await expect(selectedDay.getByRole("heading", { level: 2 })).toHaveText("Full Moon in Aquarius");
    await expect(selectedDay.getByText("Exact at 10:35 AM")).toBeVisible();
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
    await expect(page.getByText("Return to your sky.")).toBeVisible();
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

  test("mobile sky controls and menu navigation work", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();

    const dateControl = page.getByRole("button", { name: /Today, Portsmouth/ });
    await expect(dateControl).toBeVisible();
    await dateControl.click();
    const skyControls = page.getByRole("dialog", { name: "Sky controls" });
    await expect(skyControls).toBeVisible();
    await expect(skyControls.getByRole("button", { name: "Today", exact: true })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: "Tomorrow" })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: "Date" })).toBeVisible();
    await expect(skyControls.getByRole("button", { name: /Portsmouth/ })).toBeVisible();

    await skyControls.getByRole("button", { name: "Tomorrow" }).click();
    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: /settings/i }).click();
    await expect(page.getByText("settings.")).toBeVisible();
    await assertNoClientErrors();
  });

  test("narrow mobile sky cards and header stay inside their rails", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 320, height: 568 });
    await seedClientState(page);
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
    await expectNoHorizontalOverflow(page, "Narrow mobile Sky");
    await assertNoClientErrors();
  });

  test("narrow mobile calendar surfaces stay inside the page container", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await page.setViewportSize({ width: 320, height: 568 });
    await seedClientState(page);
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await expect(page.locator(".lunar-selected-card")).toBeVisible();

    const layout = await page.evaluate(() => {
      const tolerance = 1;
      const container = document.querySelector(".lunar-calendar-view")?.getBoundingClientRect();
      const selectors = [
        ".lunar-calendar-body",
        ".lunar-calendar-week-view",
        ".lunar-week-strip",
        ".lunar-selected-card",
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
    await expectClientRouteLoads(page, "/#you");

    await expect(page.getByText("Marie Satori")).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();

    await expect(page.getByRole("region", { name: "Create account" })).toBeVisible();
    await expect(page.getByText("Create profile")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You" })).toHaveCount(0);
    await assertNoClientErrors();
  });

  test("captures light and dark visual flow across client-facing surfaces", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true, theme: "light" });

    for (const theme of ["light", "dark"] as const) {
      await expectClientRouteLoads(page, "/#sky");
      await page.evaluate((nextTheme) => {
        window.localStorage.setItem("tldrastro:theme", nextTheme);
      }, theme);
      await page.reload();
      await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
      await captureThemeSurface(page, theme, "sky");

      await expectClientRouteLoads(page, "/#you");
      await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
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

    await page.getByRole("button", { name: "Friends" }).click();
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

  test("main app pages keep shared label styling across desktop and mobile", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "mobile", width: 390, height: 844 }
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedClientState(page, { profile: true, friends: true });

      await expectClientRouteLoads(page, "/#sky");
      await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
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
      await expectSharedLabelContract(page, `${viewport.name} Friends natal`);
      await expectNoHorizontalOverflow(page, `${viewport.name} Friends natal label audit`);
      await captureResponsiveSurface(page, viewport.name, "label-audit-friends-natal");

      await expectClientRouteLoads(page, "/#calendar");
      await expect(page.getByLabel("Lunar calendar")).toBeVisible();
      await expect(page.getByLabel("Selected lunar day")).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: /Portsmouth.*Eastern/i }).click();
      await expect(page.getByPlaceholder("Search for a city")).toBeVisible();
      await expectPopoverTextNotBold(page, ".lunar-location-picker", `${viewport.name} Calendar location picker`);
      await page.getByRole("button", { name: /Portsmouth.*Eastern/i }).click();
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

    await page.getByRole("button", { name: /Today, Portsmouth/ }).click();
    const skyControls = page.getByRole("dialog", { name: "Sky controls" });
    await expect(skyControls).toBeVisible();
    await skyControls.getByRole("button", { name: "Date" }).click();

    const datePicker = page.getByLabel("Select sky date");
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
    await expect(page.getByText("Portsmouth")).toBeVisible();

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

  test("calendar location picker can update and cancel location", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#calendar");

    await expect(page.getByLabel("Lunar calendar")).toBeVisible();
    await page.getByRole("button", { name: /Portsmouth.*Eastern/i }).click();
    await expect(page.getByPlaceholder("Search for a city")).toBeVisible();
    await expectPopoverTextNotBold(page, ".lunar-location-picker", "Calendar location picker");
    await expectFormTypography(page, ".lunar-location-picker", "Calendar location picker form");
    await page.getByPlaceholder("Search for a city").fill("Seattle, WA");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByRole("button", { name: /Seattle/i })).toBeVisible();

    await page.getByRole("button", { name: /Seattle/i }).click();
    await page.getByPlaceholder("Search for a city").fill("Boston, MA");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: /Seattle/i })).toBeVisible();
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

    await seedClientState(page, { profile: true });
    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);

    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
    await expect(page.getByRole("region", { name: "Sun in Aquarius in the 11th house" })).toBeVisible();
    await expect(page.locator("#you-transit-article-title")).toContainText("Sun in Aquarius in the 11th house");
    await expectNoDuplicateArticleHeadings(page, "You natal placement detail");

    await page.getByRole("button", { name: "Back to updates" }).click();
    await expect(page.getByRole("region", { name: "You", exact: true })).toBeVisible();
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

    const bigThree = page.getByLabel("Nikki big three");
    await expect(bigThree).toBeVisible();
    await bigThree.getByRole("button").first().click();
    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close detail" })).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Friend natal placement detail");

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

    await seedClientState(page);
    await expectClientRouteLoads(page, "/#sky");

    await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
    await page.locator(".sky-pl-item button").first().click();

    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Sky fallback placement detail");
    await expectReaderFacingCopy(page.locator("article, .sky-detail-article").first(), "Sky placement fallback detail");
    await assertNoClientErrors();
  });

  test("content hydration does not downgrade reader-facing surfaces to stale fallback copy", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true, friends: true });

    await expectClientRouteLoads(page, "/#sky/retrograde/mercury");
    await expect(page.locator(".app-shell.mode-detail")).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Sky retrograde detail");
    await expect(page.locator(".sky-detail-article")).toContainText(/Mercury (Rx|Retrograde|in Cancer is retrograde)/i);
    await expect(page.locator(".sky-detail-article")).not.toContainText(/active here|current emphasis|timing, mood/i);
    await expectHydrationKeepsReaderCopyStable(
      page,
      page.locator(".sky-detail-article"),
      "Sky retrograde detail copy",
      { minLength: 180 }
    );

    await expectClientRouteLoads(page, "/#you");
    await selectYouNatalTab(page);
    await page.getByRole("button", { name: "Sun in Aquarius", exact: true }).click();
    await expectNoDuplicateArticleHeadings(page, "Hydrated You placement detail");
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

  test("content fallback copy is reader-facing in You natal placement detail", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);

    await seedClientState(page, { profile: true });
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

    await expect(page.getByRole("heading", { name: /Ascendant square .*Mercury|Mercury square .*Ascendant/i })).toBeVisible();
    await expectNoDuplicateArticleHeadings(page, "Authored synastry detail");
    const detail = page.locator(".app-shell.mode-detail");
    const text = ((await detail.textContent()) ?? "").replace(/\s+/g, " ").trim();

    expect(mercuryAscendantHardSource, "V3 contains the approved Mercury-Ascendant hard-aspect source row").toBeTruthy();
    expect(text, "synastry detail uses the approved V3 package wording").toContain(mercuryAscendantHardOpening);
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
