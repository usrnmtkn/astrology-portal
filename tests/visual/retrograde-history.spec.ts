import { test, expect, type Locator } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { bundledPublications } from "../helpers/bundled-publications";
import { getAstrodienstSky, getRetrogradeHistory, defaultLocation } from "../../apps/web/src/services/ephemeris";
import { skyArticleEditionFactsFromSnapshot } from "../../api/_lib/sky-article-facts";
import { skyIngressEssayFields } from "../../apps/web/src/content/skyIngressEssay.mjs";

async function assertFacts(panel: Locator) {
  await expect(panel).toContainText("Previous retrograde in Scorpio", { timeout: 60_000 });
  await expect(panel).toContainText("Oct 5, 2018");
  await expect(panel).toContainText("Oct 31, 2018");
  await expect(panel).toContainText("Nov 16, 2018");
  await expect(panel).toContainText("America/New_York");
  expect(await panel.locator("dt").allTextContents()).toEqual([
    "Current cycle", "Previous retrograde in Scorpio", "Degree comparison · within 4° of the start station", "Search coverage"
  ]);
  // No heading levels are introduced inside the existing article hierarchy.
  await expect(panel.locator("h1,h2,h3,h4,h5,h6")).toHaveCount(0);
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
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`retrograde receipt saves and reaches Sky and Calendar ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    const date = new Date("2026-10-10T12:00:00Z");
    const snapshot = await getAstrodienstSky(defaultLocation, date, { includeDailyEvents: false, includeTransitWindows: true });
    const history = await getRetrogradeHistory({ planet: "venus", sign: "scorpio", referenceDate: date });
    const facts = { ...skyArticleEditionFactsFromSnapshot(snapshot, "venus", "ingress-essay-v2"), retrogradeHistory: history, templateFields: skyIngressEssayFields };
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
      let generated = false;
      await routeStudioInventoryApi(page, { call: store.call, answer: async (route, url) => {
        if (url.pathname === "/api/admin/sky-article-facts") {
          await route.fulfill({ json: { ok: true, facts: url.searchParams.get("date") === "2026-09-20" ? { ...facts, retrogradeHistory: directHistory } : facts } }); return true;
        }
        if (url.pathname === "/api/admin/sky-article-template-slots") {
          const request = route.request().postDataJSON();
          generated = true;
          if (!request.includeRetrogradeHistory) {
            await route.fulfill({ json: { ok: true, facts, slotValues: { overviewBody: "Synthetic later overview." }, blockedSlots: [],
              generation: { provider: "fixture", model: "isolated", responseId: "synthetic-overview-response", generatedAt: date.toISOString(),
                requestedSlots: ["overviewBody"], retrogradeHistory: null }
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
        await page.getByText("Previous retrograde", { exact: true }).click();
      };
      await page.goto("/admin/content#sky-writeups?q=sky%2Farticle-template%2Fvenus%2Fscorpio");
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
      await expect(editor.getByLabel("Template field overviewBody", { exact: true })).toHaveValue("Synthetic later overview.");
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
      await editor.getByText("Previous retrograde", { exact: true }).click();
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
              setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: false, error: "Synthetic history calculation failure" } })), 250);
              return;
            }
            super.postMessage(message, transfer);
          }
        };
      });
      await page.goto("/?date=2026-10-10#sky/placement/venus/scorpio");
      const skyPanel = page.locator(".sky-detail-article .retrograde-history");
      await skyPanel.locator("summary").click({ timeout: 60_000 });
      await expect(skyPanel.getByRole("status")).toBeVisible();
      await expect(skyPanel.getByRole("alert")).toContainText("could not load");
      await skyPanel.getByRole("button", { name: "Try again" }).click();
      await assertFacts(skyPanel);
      const skyText = await skyPanel.locator("dl").innerText();
      await skyPanel.screenshot({ path: `test-results/retrograde-history-sky-${width}-${theme}.png` });
      await page.reload();
      await skyPanel.locator("summary").click({ timeout: 60_000 });
      await assertFacts(skyPanel);
      await expect(skyPanel.locator("dl")).toHaveText(skyText, { useInnerText: true });
      await page.goto("/?date=2026-10-03#calendar?view=day&date=2026-10-03");
      const event = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: "Venus stations retrograde" });
      await event.click({ timeout: 60_000 });
      const calendarPanel = page.getByRole("dialog", { name: "Event detail" }).locator(".retrograde-history");
      await calendarPanel.locator("summary").click();
      await assertFacts(calendarPanel);
      await expect(calendarPanel.locator("dl")).toHaveText(skyText, { useInnerText: true });
      await calendarPanel.screenshot({ path: `test-results/retrograde-history-calendar-${width}-${theme}.png` });
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: "wait" }); store.close(); }
  });
}
