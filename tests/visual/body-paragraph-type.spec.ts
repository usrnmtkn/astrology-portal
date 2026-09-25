import { expect, test, type Page } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { readerResponse } from "../helpers/reader-response";
import { lessonRows } from "../helpers/astro101-reader-fixture";
import { fixturePublications } from "../helpers/content-reader-route.mjs";

const DATE = "2026-09-12";
const location = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};
const profile = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Report Fixture",
  email: "you-report@example.test",
  provider: "email",
  currentLocation: location.label,
  currentLocationData: location,
  charts: [{
    id: "fixture-chart",
    name: "Report Fixture",
    type: "Birth chart",
    birthDate: "1990-01-01",
    birthTime: "12:00 PM",
    birthCity: location.label,
    birthLocation: location
  }]
};

const routes = [
  { name: "sky", path: `/?date=${DATE}#sky/placement/sun/virgo` },
  { name: "calendar-day", path: `/?date=${DATE}#calendar?view=day&date=${DATE}` },
  { name: "calendar-week", path: `/?date=${DATE}#calendar?view=weekly&date=${DATE}` },
  { name: "calendar-month", path: `/?date=${DATE}#calendar?view=month&date=${DATE}` },
  { name: "horoscopes", path: "/#horoscopes" },
  { name: "learn", path: "/learn/astro-101/qa-chapter-1" },
  { name: "you", path: "/#you" },
  { name: "friends", path: "/#friends" },
  { name: "settings", path: "/#settings" },
  { name: "report", path: "/reports/" }
];

const widths = [390, 768, 1280];

const modes = [
  { name: "light", theme: "light", dyslexia: false },
  { name: "dark", theme: "dark", dyslexia: false },
  { name: "dyslexia", theme: "light", dyslexia: true }
] as const;

test.describe("body paragraph type", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-12T16:00:00Z"));
    await page.addInitScript(({ savedLocation, savedProfile }) => {
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(savedLocation));
      localStorage.setItem("tldrastro:userProfile", JSON.stringify(savedProfile));
    }, { savedLocation: location, savedProfile: profile });
    await bundledPublications(page);
    await page.route("**/api/content-reader", async (route) => {
      let prefix = "";
      try {
        prefix = String(route.request().postDataJSON()?.prefix ?? "");
      } catch {
        prefix = "";
      }
      const reading = "A birth chart is a map of the sky for one moment, written so the paragraph is long enough to read as body copy.";
      const rows = prefix.startsWith("education/astro-101")
        ? lessonRows.map((row, index) => index === 0 ? {
          ...row,
          sections: {
            ...row.sections,
            intro: reading,
            blocks: [{ heading: "QA section", level: 2, body: reading }]
          }
        } : row)
        : [];
      await route.fulfill({ json: readerResponse(rows, fixturePublications(rows)) });
    });
  });

  for (const mode of modes) {
    test(`${mode.name}: every reading paragraph shares one family and 16px`, async ({ page }) => {
      test.setTimeout(180_000);
      const samples: string[] = [];

      for (const route of routes) {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(route.path);
        await page.locator("body").waitFor({ state: "visible" });
        await waitForRoute(page, route.name);
        await applyMode(page, mode.theme, mode.dyslexia);
        await expect.poll(async () => (await collectBodyParagraphs(page)).length, {
          message: `${route.name} rendered no reading paragraph`,
          timeout: 20_000
        }).toBeGreaterThan(0);
        const found = await collectBodyParagraphs(page);
        samples.push(...found.map((item) => `${item.family} @ ${item.size} | ${route.name} | ${item.selector} | ${item.text}`));
      }

      const pairs = [...new Set(samples.map((sample) => sample.split(" | ")[0]))];
      expect(pairs, samples.join("\n")).toHaveLength(1);
      expect(pairs[0]).toContain("16px");
      if (mode.dyslexia) {
        expect(pairs[0].toLowerCase()).toContain("atkinson");
      } else {
        expect(pairs[0].toLowerCase()).not.toContain("geist mono");
        expect(pairs[0].toLowerCase()).not.toContain("courier");
      }
    });
  }

  for (const width of widths) {
    test(`reading paragraphs do not clip at ${width}px`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      const clipped: string[] = [];

      for (const route of routes) {
        await page.goto(route.path);
        await page.locator("body").waitFor({ state: "visible" });
        await waitForRoute(page, route.name);
        await applyMode(page, "light", false);
        const overflows = await page.evaluate(() => {
          const nodes = [...document.querySelectorAll("p, .calendar-stoic-card__excerpt, .sky-intro__copy, .retro-copy")];
          return nodes.flatMap((node) => {
            if (!(node instanceof HTMLElement)) return [];
            const text = (node.innerText || "").replace(/\s+/g, " ").trim();
            if (text.length < 40) return [];
            const style = getComputedStyle(node);
            if (style.display === "none" || style.visibility === "hidden") return [];
            const box = node.getBoundingClientRect();
            if (box.width < 8 || box.height < 8) return [];
            if (node.scrollWidth <= node.clientWidth + 2) return [];
            return [`${node.className || node.tagName}: ${text.slice(0, 48)}`];
          });
        });
        clipped.push(...overflows.map((item) => `${route.name}: ${item}`));
      }

      expect(clipped, clipped.join("\n")).toEqual([]);
    });
  }
});

async function waitForRoute(page: Page, name: string) {
  if (name === "sky") {
    await expect(page.locator("#sky-detail-title")).toBeVisible({ timeout: 60_000 });
  } else if (name === "calendar-day") {
    await expect(page.locator(".calendar-sky-card__body p").first()).toBeVisible({ timeout: 60_000 });
  } else if (name.startsWith("calendar")) {
    await expect(page.locator(".lunar-calendar-view p").first()).toBeVisible({ timeout: 60_000 });
  } else if (name === "learn") {
    await expect(page.locator(".learn-article-body")).toBeVisible({ timeout: 60_000 });
  } else if (name === "horoscopes") {
    await expect(page.locator(".horoscope-prose, .horoscope-reading")).toBeVisible({ timeout: 60_000 });
  } else if (name === "you") {
    await expect(page.getByRole("region", { name: "In-depth transit reports" })).toBeVisible({ timeout: 60_000 });
  } else if (name === "friends") {
    await expect(page.locator(".friends-unified-empty p").first()).toBeVisible({ timeout: 60_000 });
  } else if (name === "settings") {
    await expect(page.locator(".settings-row-description").first()).toBeVisible({ timeout: 60_000 });
  } else if (name === "report") {
    await expect(page.getByRole("status").getByText("Sign in to view your reports.")).toBeVisible({ timeout: 60_000 });
  }
}

async function applyMode(page: Page, theme: "light" | "dark", dyslexia: boolean) {
  await page.evaluate(({ theme, dyslexia }) => {
    document.documentElement.dataset.dyslexiaFont = dyslexia ? "true" : "false";
    const shell = document.querySelector(".app-shell");
    shell?.classList.toggle("theme-dark", theme === "dark");
    shell?.classList.toggle("theme-light", theme === "light");
  }, { theme, dyslexia });
}

async function collectBodyParagraphs(page: Page) {
  return page.evaluate(() => {
    const excluded = [
      ".sky-intro__lead",
      ".learn-index-card__lead",
      ".learn-lede",
      ".learn-affirmation p",
      ".sky-placement-hook-quote p",
      ".calendar-sky-card__prompt",
      ".calendar-sky-card__date",
      ".calendar-sky-card__meta",
      ".article-duration",
      ".article-related-aspects__date",
      ".sky-today-ledger__head p",
      ".lunar-weekly-day__header p",
      ".lunar-weekly-event__heading p",
      ".lunar-selected-card__void-meta",
      ".calendar-checkin-picker__people p",
      ".horoscope-date",
      ".learn-kicker",
      ".report-label",
      ".report-attribution",
      ".friend-hero-copy p",
      ".retrograde-detail-line",
      "nav p",
      "button p",
      "label p"
    ].join(", ");

    const nodes = [
      ...document.querySelectorAll(
        "p, .settings-row-description, .calendar-stoic-card__excerpt, .calendar-day-group__excerpt, .calendar-checkin__summary, .sky-intro__copy, .retro-copy, .article-sub, .article-tldr__copy, .learn-chapter__blurb"
      )
    ];

    return nodes.flatMap((node) => {
      if (!(node instanceof HTMLElement)) return [];
      if (node.matches(excluded) || node.closest(excluded)) return [];
      if (node.closest("h1, h2, h3, h4, h5, h6, button, nav, label, th, td")) return [];
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length < 24) return [];
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return [];
      const box = node.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) return [];
      return [{
        family: style.fontFamily,
        size: style.fontSize,
        selector: node.className || node.tagName,
        text: text.slice(0, 80)
      }];
    });
  });
}
