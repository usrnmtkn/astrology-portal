import { test, expect, type Locator } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { bundledPublications } from "../helpers/bundled-publications";
import { getAstrodienstSky, getRetrogradeHistory, defaultLocation } from "../../apps/web/src/services/ephemeris";
import { skyArticleEditionFactsFromSnapshot } from "../../api/_lib/sky-article-facts";
import { skyIngressArticleFields } from "../../apps/web/src/content/skyIngressEssay.mjs";

async function assertFacts(panel: Locator) {
  await expect(panel).toContainText("Previous retrograde in Scorpio", { timeout: 60_000 });
  await expect(panel).toContainText("Oct 5, 2018");
  await expect(panel).toContainText("Oct 31, 2018");
  await expect(panel).toContainText("Nov 16, 2018");
  await expect(panel).toContainText("America/New_York");
  expect(await panel.locator("dt").allTextContents()).toEqual([
    "Current cycle", "Previous retrograde in Scorpio", "Next retrograde in Scorpio", "Degree comparison · within 4° of the start station", "Search coverage"
  ]);
  // No heading levels are introduced inside the existing article hierarchy.
  await expect(panel.locator("h1,h2,h3,h4,h5,h6")).toHaveCount(0);
  const cards = panel.locator(".retrograde-history-facts > div:not(.retrograde-history-coverage)");
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) {
    const layout = await card.evaluate(element => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        border: parseFloat(style.borderTopWidth), radius: parseFloat(style.borderRadius),
        padding: parseFloat(style.paddingLeft), background: style.backgroundColor,
        fits: element.scrollWidth <= element.clientWidth && bounds.left >= 0 && bounds.right <= innerWidth
      };
    });
    expect(layout.border).toBeGreaterThan(0);
    expect(layout.radius).toBeGreaterThan(0);
    expect(layout.padding).toBeGreaterThan(0);
    expect(layout.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(layout.fits).toBe(true);
  }
  const styles = await panel.locator("summary").evaluate(element => {
    const style = getComputedStyle(element);
    const probe = document.createElement("span");
    probe.style.cssText = element.closest(".admin-dashboard")
      ? "font-family:var(--font-label);font-size:var(--type-label-size);font-weight:var(--weight-regular);line-height:var(--leading-label);letter-spacing:var(--tracking-body)"
      : "font-family:var(--font-display);font-size:var(--type-h2-size);font-weight:var(--weight-medium);line-height:var(--leading-h2);letter-spacing:var(--tracking-tight)";
    element.append(probe);
    const expected = getComputedStyle(probe);
    const keys = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
    const matches = keys.map(key => [key, style[key], expected[key]]);
    probe.remove(); return matches;
  });
  for (const [property, actual, expected] of styles) expect(actual, property).toBe(expected);
  const labelStyles = await panel.locator(".retrograde-history-label").first().evaluate(element => {
    const probe = document.createElement("span");
    probe.style.cssText = "font-family:var(--font-body);font-size:var(--text-meta-size);font-weight:var(--weight-regular);line-height:var(--leading-meta);letter-spacing:var(--tracking-body)";
    element.append(probe);
    const actual = getComputedStyle(element), expected = getComputedStyle(probe);
    const keys = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
    const matches = keys.map(key => [key, actual[key], expected[key]]);
    probe.remove(); return matches;
  });
  for (const [property, actual, expected] of labelStyles) expect(actual, property).toBe(expected);
}

async function assertCycleCards(panel: Locator) {
  await expect(panel.locator('.retrograde-cycles')).toBeVisible({ timeout: 60_000 });
  for (const section of await panel.locator('.retrograde-cycles--article .retrograde-cycles__section').all()) {
    if (await section.getAttribute('open') === null) await section.locator(':scope > summary').click();
  }
  await expect(panel.locator('.retrograde-cycles__section[open]')).toHaveCount(2);
  await expect(panel.locator('.retrograde-cycles__section > summary')).toHaveText(['Previous retrograde', 'Next retrograde']);
  await expect(panel).toContainText('Tuesday, Oct 16, 2018 · 8 years ago');
  await expect(panel).toContainText('Saturday, Sep 30, 2034 · in 8 years');
  await expect(panel.locator('.retrograde-history-facts')).toHaveCount(0);
  await expect(panel.locator('.retrograde-cycles').locator('h1,h2,h3,h4,h5,h6')).toHaveCount(0);
  await expect(panel.getByRole('link', { name: 'Open Oct 16, 2018 →' })).toHaveAttribute('href', '/?date=2018-10-16#calendar?view=day&date=2018-10-16');
  await expect(panel.getByRole('link', { name: 'Open Sep 30, 2034 →' })).toHaveAttribute('href', '/?date=2034-09-30#calendar?view=day&date=2034-09-30');
}

async function cyclePresentation(panel: Locator) {
  return panel.locator('.retrograde-cycles').evaluate(element => {
    const selectors = ['.retrograde-cycles__section > summary', '.retrograde-cycles__date', '.retrograde-cycles__meta', '.retrograde-cycles__compare > summary', '.retrograde-cycles__open', '.retrograde-cycles__card p'];
    const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'borderRadius', 'padding'] as const;
    return selectors.map(selector => {
      const style = getComputedStyle(element.querySelector(selector)!);
      return Object.fromEntries(properties.map(property => [property, style[property]]));
    });
  });
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`retrograde receipt saves and reaches Sky and Calendar ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    const date = new Date("2026-10-10T12:00:00Z");
    const snapshot = await getAstrodienstSky(defaultLocation, date, { includeDailyEvents: false, includeTransitWindows: true });
    const history = await getRetrogradeHistory({ planet: "venus", sign: "scorpio", referenceDate: date });
    const facts = { ...skyArticleEditionFactsFromSnapshot(snapshot, "venus", "ingress-essay-v3"), retrogradeHistory: history, templateFields: skyIngressArticleFields };
    const directHistory = await getRetrogradeHistory({ planet: "venus", sign: "scorpio", referenceDate: new Date("2026-09-20T12:00:00Z") });
    const store = await studioApiStore([{ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", content_key: "sky/article-template/venus/scorpio",
      surface: "sky", mode: "article", status: "REVIEWED", lane: "reference", review_state: null, event_type: "sky-article-template",
      block_type: "sky_article", headline: "Venus in Scorpio", summary: "", body: "# Synthetic template\n\n{{entryDate}}",
      sections: {}, source_snapshot: { review_status: "approved", contentType: "sky-article-template" }, updated_at: "2026-10-09T00:00:00Z" }]);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(date);
      await page.addInitScript(theme => {
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem("tldrastro:studio-theme", theme);
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" }));
      }, theme);
      await bundledPublications(page);
      let generated = false;
      await routeStudioInventoryApi(page, { call: store.call, answer: async (route, url) => {
        if (url.pathname === "/api/admin/sky-article-facts") {
          await route.fulfill({ json: { ok: true, facts: url.searchParams.get("date") === "2026-09-20" ? { ...facts, retrogradeHistory: directHistory } : facts } }); return true;
        }
        if (url.pathname === "/api/admin/sky-article-template-slots") {
          const request = route.request().postDataJSON();
          expect(request.format).toBe("ingress-essay-v3");
          generated = true;
          if (!request.includeRetrogradeHistory) {
            await route.fulfill({ json: { ok: true, facts, slotValues: { articleBody: "Synthetic later article." }, blockedSlots: [],
              generation: { provider: "fixture", model: "isolated", responseId: "synthetic-article-response", generatedAt: date.toISOString(),
                requestedSlots: ["articleBody"], retrogradeHistory: null }
            } }); return true;
          }
          const alreadyWritten = request.existingSlotValues.priorOccurrenceSection !== undefined;
          await route.fulfill({ json: { ok: true, facts,
            slotValues: alreadyWritten ? {} : { priorOccurrenceSection: "Synthetic historical comparison draft." }, blockedSlots: [],
            generation: alreadyWritten ? null : { provider: "fixture", model: "isolated", responseId: "synthetic-history-response", generatedAt: date.toISOString(),
              requestedSlots: ["priorOccurrenceSection"], retrogradeHistory: history }
          } }); return true;
        }
        return false;
      } });
      const openEditor = async () => {
        await page.getByRole("row").filter({ hasText: "sky/article-template/venus/scorpio" }).getByRole("button", { name: "Edit", exact: true }).click();
        await page.getByRole("button", { name: "Load calculated facts", exact: true }).click();
        await page.getByText("Retrograde cycles", { exact: true }).click();
      };
      await page.goto(`/admin/content#${width === 390 ? "sky-writeups" : "articles-guides"}?q=sky%2Farticle-template%2Fvenus%2Fscorpio`);
      await openEditor();
      const editor = page.getByRole("dialog");
      await assertFacts(editor.locator(".retrograde-history"));
      const include = editor.getByLabel("Include retrograde history in generation");
      await include.check();
      await expect(editor.getByText("Draft saved automatically", { exact: true })).toBeVisible();
      const workspace = (await store.call({ method: "rows" })).find((row: any) => row.event_type === "sky-article-edition-workspace");
      expect(workspace.sections.skyArticleWorkspace.facts.retrogradeHistory).toEqual(history);
      expect(workspace.sections.skyArticleWorkspace.includeRetrogradeHistory).toBe(true);
      await page.reload();
      await openEditor();
      await expect(include).toBeChecked();
      await editor.getByRole("button", { name: "Generate unfinished fields", exact: true }).click();
      await expect(editor.getByLabel("Template field priorOccurrenceSection", { exact: true })).toHaveValue("Synthetic historical comparison draft.");
      expect(generated).toBe(true);
      await expect(editor.getByText("Draft saved automatically", { exact: true })).toBeVisible();
      await page.reload();
      await openEditor();
      await expect(editor.getByLabel("Template field priorOccurrenceSection", { exact: true })).toHaveValue("Synthetic historical comparison draft.");
      await editor.getByRole("button", { name: "Generate unfinished fields", exact: true }).click();
      await expect(editor.getByText("Draft saved automatically", { exact: true })).toBeVisible();
      const savedReceipt = (await store.call({ method: "rows" })).find((row: any) => row.event_type === "sky-article-edition-workspace");
      expect(savedReceipt.sections.skyArticleWorkspace.slotGeneration.retrogradeHistory).toEqual(history);
      expect(savedReceipt.sections.skyArticleWorkspace.retrogradeGenerations).toHaveLength(1);
      await include.uncheck();
      await editor.getByRole("button", { name: "Generate unfinished fields", exact: true }).click();
      await expect(editor.getByLabel("Template field articleBody", { exact: true })).toHaveValue("Synthetic later article.");
      await expect(editor.getByText("Draft saved automatically", { exact: true })).toBeVisible();
      await page.reload();
      await openEditor();
      await expect(include).not.toBeChecked();
      await expect(editor.getByLabel("Template field priorOccurrenceSection", { exact: true })).toHaveValue("Synthetic historical comparison draft.");
      const laterWorkspace = (await store.call({ method: "rows" })).find((row: any) => row.event_type === "sky-article-edition-workspace").sections.skyArticleWorkspace;
      expect(laterWorkspace.slotGeneration.retrogradeHistory).toBeNull();
      expect(laterWorkspace.retrogradeGenerations).toHaveLength(1);
      expect(laterWorkspace.retrogradeGenerations[0].retrogradeHistory).toEqual(history);
      expect(laterWorkspace.retrogradeGenerations[0].requestedSlots).toEqual(["priorOccurrenceSection"]);
      await editor.locator(".retrograde-history").screenshot({ path: `test-results/retrograde-history-studio-${width}-${theme}.png` });
      await expect(editor.getByText("Draft saved automatically", { exact: true })).toBeVisible();
      await editor.getByLabel("Sky article reference date").fill("2026-09-20");
      await expect(editor.getByLabel("Sky article reference date")).toHaveValue("2026-09-20");
      await editor.getByRole("button", { name: "Load calculated facts", exact: true }).click();
      await editor.getByText("Retrograde cycles", { exact: true }).click();
      await expect(editor.locator(".retrograde-history")).toContainText("No active retrograde on this reference date");
      await expect(include).toBeDisabled();
      await expect(include).not.toBeChecked();
      await editor.locator(".retrograde-history").screenshot({ path: `test-results/retrograde-history-empty-${width}-${theme}.png` });
      await page.unrouteAll({ behavior: "wait" });
      await bundledPublications(page);
      await page.addInitScript(() => {
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
          postMessage(message: any, transfer?: any) {
            if (message.kind === "retrograde-history" && !sessionStorage.getItem("history-failure-tested")) {
              sessionStorage.setItem("history-failure-tested", "true");
              setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: false, error: "Synthetic history calculation failure" } })), 3000);
              return;
            }
            super.postMessage(message, transfer);
          }
        };
      });
      await page.goto("/?date=2026-10-10#sky/placement/venus/scorpio");
      const skyPanel = page.locator(".sky-placement-article__sections");
      await expect(skyPanel.getByRole("status").filter({ hasText: "Calculating retrograde cycles…" })).toBeVisible();
      await expect(skyPanel.getByRole("alert")).toContainText("could not load");
      await skyPanel.getByRole("button", { name: "Try again" }).click();
      await expect(skyPanel.locator('.retrograde-cycles__section')).toHaveCount(2);
      await expect(skyPanel.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
      await assertCycleCards(skyPanel);
      const skyPresentation = await cyclePresentation(skyPanel);
      const skyText = await skyPanel.locator('.retrograde-cycles').innerText();
      const skyPrevious = skyPanel.locator('.retrograde-cycles__section').first();
      await skyPrevious.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      await expect(skyPrevious).not.toHaveAttribute('open');
      await page.keyboard.press('Enter');
      await expect(skyPrevious).toHaveAttribute('open');
      const skyComparison = skyPanel.locator('.retrograde-cycles__compare');
      await skyComparison.locator('summary').click();
      await expect(skyComparison.getByRole('table')).toBeVisible();
      await expect(skyComparison.getByRole('row').filter({ hasText: /^2026Current/ })).toContainText('41 days');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await skyComparison.locator('summary').click();
      await skyPanel.screenshot({ path: `test-results/retrograde-history-sky-${width}-${theme}.png` });
      await page.reload();
      await expect(skyPanel.locator('.retrograde-cycles__section')).toHaveCount(2);
      await expect(skyPanel.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
      await assertCycleCards(skyPanel);
      await expect(skyPanel.locator('.retrograde-cycles')).toHaveText(skyText, { useInnerText: true });
      await skyPanel.getByRole('link', { name: 'Open Oct 16, 2018 →' }).click();
      await expect(page).toHaveURL(/date=2018-10-16/);
      await expect(page.locator('.calendar-day-events')).toBeVisible({ timeout: 60_000 });
      await page.goBack();
      await assertCycleCards(skyPanel);
      await skyPanel.getByRole('link', { name: 'Open Sep 30, 2034 →' }).click();
      await expect(page).toHaveURL(/date=2034-09-30/);
      await expect(page.locator('.calendar-day-events')).toBeVisible({ timeout: 60_000 });
      await page.goto("/?date=2026-10-03#calendar?view=day&date=2026-10-03");
      const event = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: "Venus stations retrograde" });
      await page.evaluate(() => sessionStorage.removeItem("history-failure-tested"));
      await expect(event).toBeVisible({timeout:60_000});
      await expect(event.locator('strong').first()).toHaveCSS('font-family',/Newsreader/);await expect(event.locator('strong').first()).toHaveCSS('font-size','26px');await expect(event.locator('strong').first()).toHaveCSS('font-weight','400');
      await expect(event.locator('.calendar-stoic-card__excerpt').first()).toHaveCSS('font-size','20px');await expect(event.locator('.calendar-stoic-card__excerpt').first()).toHaveCSS('line-height','30px');
      await event.screenshot({path:`test-results/card-calendar-${width}-${theme}.png`});
      await event.click({ timeout: 60_000 });
      const calendarPanel = page.getByRole("dialog", { name: "Event detail" });
      await expect(calendarPanel.getByRole("alert")).toContainText("could not load");
      await calendarPanel.getByRole("button", { name: "Try again" }).click();
      await assertCycleCards(calendarPanel);
      const calendarPresentation = await cyclePresentation(calendarPanel);
      expect(calendarPresentation).not.toEqual(skyPresentation); // Article cards have their own updated UI roles.
      await expect(calendarPanel.locator('.retrograde-cycles__section > summary').first()).toHaveCSS('font-size', '22px');
      await expect(calendarPanel.locator('.retrograde-cycles__date').first()).toHaveCSS('font-size', '17px');
      await expect(calendarPanel.locator(".retrograde-cycles__section[open]")).toHaveCount(2);
      await expect(calendarPanel).toContainText("Tuesday, Oct 16, 2018 · 8 years ago");
      await expect(calendarPanel).toContainText("Saturday, Sep 30, 2034 · in 8 years");
      await expect(calendarPanel.getByRole("heading", { level: 2 })).toHaveText("Venus stations retrograde in Scorpio");
      await expect(calendarPanel.locator("h1")).toHaveCount(0);
      const comparison = calendarPanel.locator(".retrograde-cycles__compare");
      await expect(comparison).not.toHaveAttribute("open");
      await comparison.locator("summary").click();
      await expect(comparison).toContainText("6°07′");
      await expect(comparison).toContainText("20°27′");
      await expect(comparison.getByRole("row").filter({ hasText: /^2026Current/ })).toContainText("41 days");
      await expect(comparison.getByRole("row").filter({ hasText: /^2034Next/ })).toContainText("42 days");
      await expect(comparison.getByRole("row").filter({ hasText: /^2034Next/ })).toContainText("18 in Scorpio");
      await expect(comparison.getByRole("columnheader")).toHaveCount(5);
      await expect(comparison.locator(".retrograde-cycles__bar")).toHaveCount(3);
      expect(await comparison.locator(".retrograde-cycles__table-scroll").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await comparison.screenshot({ path: `test-results/retrograde-comparison-${width}-${theme}.png` });
      await comparison.locator("summary").click();
      const metrics = await calendarPanel.evaluate(el => {
        const style = getComputedStyle(el), h2 = getComputedStyle(el.querySelector("h2")!);
        return { width: el.getBoundingClientRect().width, padding: style.paddingLeft, gap: style.gap,
          titleSize: h2.fontSize, titleWeight: h2.fontWeight, titleLeading: h2.lineHeight, titleFont: h2.fontFamily,
          overflow: el.scrollWidth > el.clientWidth };
      });
      expect(metrics).toMatchObject({ width: Math.min(width, 440), padding: "28px", gap: "28px", titleSize: "28px", titleWeight: "400", titleLeading: "32.2px", overflow: false });
      expect(metrics.titleFont).toContain("Newsreader");
      const typography = await calendarPanel.evaluate(el => {
        const selectors = ["h2", ".retrograde-station-label", ".retrograde-station-date", ".retrograde-station-copy p", ".retrograde-cycles__section > summary", ".retrograde-cycles__date", ".retrograde-cycles__meta", ".retrograde-cycles__card p"];
        return selectors.map(selector => {
          const style = getComputedStyle(el.querySelector(selector)!);
          return [style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.fontFamily];
        });
      });
      expect(typography.map(style => style[0])).toEqual(["28px", "12px", "14px", "17px", "22px", "17px", "14px", "15px"]);
      expect(typography[0].slice(1, 4)).toEqual(["400", "32.2px", "-0.42px"]);
      expect(typography[1][3]).toBe("0.72px");
      expect(typography[1][4]).toContain("Geist Mono");
      expect(typography[3][2]).toBe("25.5px");
      expect(typography[5][1]).toBe("500");
      expect(typography[7][2]).toBe("22.5px");
      const previousCard = calendarPanel.locator(".retrograde-cycles__section").first().locator(".retrograde-cycles__card").first();
      // Calendar retains its event structure and uses the handoff's shared
      // 32px raised-card radius and 17px narrative role.
      expect(await previousCard.evaluate(el => { const s = getComputedStyle(el); return [s.padding, s.borderRadius, s.borderTopWidth, s.gap]; })).toEqual(["22px", "32px", "1px", "12px"]);
      await expect(previousCard.locator("p")).toHaveText("Venus retrogrades in nearly the same place every eight years. This is the last day it stood where it stations today. Reflect back to that time: what you valued, who you were close to, and what felt unresolved may be worth revisiting now.");
      await calendarPanel.screenshot({ path: `test-results/retrograde-history-calendar-${width}-${theme}.png` });
      await calendarPanel.getByRole("link", { name: "Open Oct 16, 2018 →" }).click();
      await expect(page).toHaveURL(/date=2018-10-16/);
      await expect(page.locator(".calendar-day-events")).toBeVisible({ timeout: 60_000 });
      await page.goBack();
      await event.click({ timeout: 60_000 });
      await calendarPanel.getByRole("link", { name: "Open Sep 30, 2034 →" }).click();
      await expect(page).toHaveURL(/date=2034-09-30/);
      await expect(page.locator(".calendar-day-events")).toBeVisible({ timeout: 60_000 });
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: "wait" }); store.close(); }
  });
}

test("retrograde cycles respect the selected zone and bounded missing matches", async ({ page }) => {
  test.setTimeout(90_000);
  const history = await getRetrogradeHistory({ planet: "venus", sign: "scorpio", referenceDate: new Date("2026-10-10") });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.addInitScript(receipt => {
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "Auckland", latitude: -36.85, longitude: 174.76, timeZone: "Pacific/Auckland" }));
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: any, transfer?: any) {
        if (message.kind === "retrograde-history" && sessionStorage.getItem("bounded-history")) {
          const value = { ...receipt, sameSign: null, nextSameSign: null, previousCrossing: null };
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: true, value } })), 50);
          return;
        }
        super.postMessage(message, transfer);
      }
    };
  }, history);
  await bundledPublications(page);
  await page.goto("/?date=2026-10-03#calendar?view=day&date=2026-10-03");
  const event = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: "Venus stations retrograde" });
  await event.click({ timeout: 60_000 });
  const panel = page.getByRole("dialog", { name: "Event detail" });
  await expect(panel).toContainText("Wednesday, Oct 17, 2018");
  await expect(panel).toContainText("Sunday, Oct 1, 2034");
  await expect(panel).toContainText("moving back into Libra on Oct 19.");
  await expect(panel.getByRole("link", { name: "Open Oct 17, 2018 →" })).toHaveAttribute("href", "/?date=2018-10-17#calendar?view=day&date=2018-10-17");
  await panel.locator(".retrograde-cycles__compare summary").click();
  await expect(panel.locator(".retrograde-cycles__compare")).toContainText("Oct 19");
  await page.evaluate(() => sessionStorage.setItem("bounded-history", "true"));
  await page.reload();
  await event.click({ timeout: 60_000 });
  await expect(panel).toContainText("No previous complete retrograde in Scorpio within the available dates.");
  await expect(panel).toContainText("No next complete retrograde in Scorpio within the available dates.");
  await expect(panel.locator(".retrograde-cycles__open")).toHaveCount(0);
  await expect(panel.locator(".retrograde-cycles__section[open]")).toHaveCount(2);
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await expect(panel).not.toBeVisible();
});
