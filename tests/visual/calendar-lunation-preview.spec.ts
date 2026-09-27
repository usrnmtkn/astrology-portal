import { expect, test } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { readerResponse } from "../helpers/reader-response";
import { watchBrowserErrors } from "./qaRuntimeGuards";

// Owner-supplied Calendar preview; the remainder is synthetic test-only copy.
const opening = "The Full Moon in Aries shines a sharp light on the cost of keeping the peace. We may begin to recognize how much quiet frustration has accumulated beneath our instinct to be accommodating. When you are the one who always rearranges your schedule or swallows an objection, being easy to get along with becomes an expensive habit. Something you agreed to do as a one-time favor has become an expectation, and you are tired of being the default compromise.";
const sunSummary = "The {sunPlacement} shifts the spotlight entirely to the spaces between us. There is a sudden, collective sensitivity to friction in the air and a shared pull to bring things back to center. This season asks us all to discover what genuine symmetry actually feels like. The collective focus highlights exactly where things have grown lopsided across our schedules, our environments, and our connections, making it easier to smooth out the edges together. We are invited to prioritize beauty, collaboration, and fairness, remembering that true harmony requires everyone’s needs to carry the same weight.";
const remainder = ["The second fixture paragraph remains part of this saved article.", "The final fixture sentence must remain complete after expansion."];
const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };

const scenarios = [
  ...["light", "dark"].flatMap(theme => [390,1440].map(width=>({theme,width,date:"2026-09-26",kind:"full-moon",sign:"aries",opening:"Synthetic dated article opening, preserved exactly.",remainder,dated:true}))),
  ...["light", "dark"].flatMap(theme => [390, 1440].map(width => ({ theme, width, date: "2026-09-26", kind: "full-moon", sign: "aries", opening, remainder }))),
  { theme: "light", width: 390, date: "2026-07-14", kind: "new-moon", sign: "cancer", opening: "The complete opening of the New Moon fixture.", remainder },
  { theme: "light", width: 1440, date: "2026-09-26", kind: "full-moon", sign: "aries", opening, remainder: [] }
];

for (const scenario of scenarios) {
  test(`Calendar lunation preview ${scenario.kind} ${scenario.theme} ${scenario.width} ${scenario.remainder.length} extra paragraphs ${"dated" in scenario ? "dated" : "reusable"}`, async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width: scenario.width, height: 1000 });
    await page.clock.setFixedTime(new Date(`${scenario.date}T22:00:00Z`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(({ location, theme }) => {
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
      localStorage.setItem("tldrastro:theme", theme);
    }, { location, theme: scenario.theme });
    const key = "dated" in scenario ? `cms/lunation-article/${scenario.date}/${scenario.kind}/${scenario.sign}` : `authored/sky-lunation-macro/${scenario.kind}/${scenario.sign}`;
    const row = {
      id: "lunation-preview-fixture", content_key: key, updated_at: `${scenario.date}T12:00:00.000Z`,
      status: "LIVE", lane: "serving", review_state: "reviewed", surface: "sky", mode: "article",
      headline: "Lunation fixture", body: [scenario.opening, ...scenario.remainder].join("\n\n"),
      sections: { packageRecord: { contentKey: key, content_role: "authored", review_status: "approved" } }
    };
    const rows = [row, {
      id: "sun-preview-fixture", content_key: "cms/sky-daily-summary/sun/libra", updated_at: row.updated_at,
      status: "LIVE", lane: "serving", review_state: null, surface: "sky", mode: "card",
      headline: "Sun fixture", body: sunSummary,
      source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", allowedSlots: [] }
    }];
    await bundledPublications(page);
    await page.route("**/api/content-reader", route => route.fulfill({ json: readerResponse(rows) }));
    await page.goto(`/?date=${scenario.date}#calendar?view=day&date=${scenario.date}`);
    const card = page.getByLabel("Selected lunar day", { exact: true });
    const moon = card.locator(`[data-guidance-key="${key}"]`);
    await expect(moon.locator("p")).toHaveText([scenario.opening], { timeout: 60_000 });
    const sun = card.getByRole("region", { name: "Sun in season", exact: true });
    const sunBefore = await sun.innerText();
    if (scenario.sign === "aries") {
      await expect(sun).toContainText("remembering that true harmony requires everyone’s needs to carry the same weight.");
      await expect(sun.getByRole("link")).toHaveAttribute("href", /#sky\/placement\/sun\/libra$/);
    }
    const more = moon.getByRole("button", { name: "Read more", exact: true });
    if (scenario.remainder.length) {
      await expect(more).toHaveAttribute("aria-expanded", "false");
      await more.click();
      await expect(moon.locator("p")).toHaveText([scenario.opening, ...scenario.remainder]);
      const less = moon.getByRole("button", { name: "Read less", exact: true });
      await expect(less).toHaveAttribute("aria-expanded", "true");
      expect(await less.getAttribute("aria-controls")).toBe(await moon.locator(".calendar-sky-card__moon-passage").getAttribute("id"));
      await expect(sun).toHaveText(sunBefore);
      await less.click();
      await expect(moon.locator("p")).toHaveText([scenario.opening]);
      await more.click();
      // Moving between days resets the disclosure and leaves ordinary Moon writing whole.
      await page.getByRole("button", { name: "Next day", exact: true }).click();
      await expect(card).not.toHaveAttribute("data-calendar-date", scenario.date);
      await expect(card.getByRole("button", { name: "Read less", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Previous day", exact: true }).click();
      await expect(moon.locator("p")).toHaveText([scenario.opening], { timeout: 30_000 });
    } else {
      await expect(more).toHaveCount(0);
    }
    await expect(sun).toHaveText(sunBefore);
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await card.locator(".calendar-sky-card").screenshot({ path: `test-results/lunation-preview-${scenario.kind}-${scenario.theme}-${scenario.width}-${scenario.remainder.length}.png` });
    if('dated' in scenario){
      await page.goto(`/?date=${scenario.date}#sky/lunation/${scenario.date}/${scenario.sign}`);
      await expect(page.getByText(scenario.opening,{exact:true})).toBeVisible({timeout:60000});
      await expect(page.getByText(remainder.at(-1)!,{exact:true})).toBeVisible();
    }
    assertNoErrors();
  });
}
