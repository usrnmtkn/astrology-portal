import { expect, test, type Page } from "@playwright/test";
import { createCalendarPhraseHandler } from "../../api/admin/calendar-phrase-writing";
import { calculateMonthlyWritingFacts, calendarWritingHash } from "../../api/_lib/calendar-writing-facts";
import { monthlyEditionKey, MONTHLY_TEMPLATE_KEY, monthlyCompositionStarter, type MonthlyFacts } from "../../src/content-studio/monthlyComposition";
import type { CalendarMemoryReceipt } from "../../src/content-studio/calendarWritingTypes";

const memory: CalendarMemoryReceipt = { schema: "calendar-writing-memory/v1", revision: "fixture-source-revision", fingerprint: "fixture-source-fingerprint", checkedAt: "2026-09-15T12:00:00Z",
  references: [{ id: "fixture-register", role: "owner-authored-register-only", path: "fixture/owner-writing.md", sha256: "a".repeat(64), title: "Fixture owner writing source" }], privateFeedback: "not-enabled", excludedPrivateCorrections: 0 };
let september: MonthlyFacts;
test.beforeAll(async () => { september = await calculateMonthlyWritingFacts("2026-09", "America/New_York"); });

async function fixture(page: Page) {
  process.env.CONTENT_GENERATION_SECRET = "calendar-phrases-fixture";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-receipt-key";
  const state = { documents: new Map<string, any>(), calls: [] as any[], writes: [] as any[], failedSave: false, memoryOffline: false, generationCount: 0, stamp: 0 };
  const handler = createCalendarPhraseHandler({ authorize: async () => true,
    calculate: async (month, timeZone) => month === "2026-09" && timeZone === "America/New_York" ? september : calculateMonthlyWritingFacts(month, timeZone),
    read: async key => state.documents.get(key) ?? null,
    save: async (key, document, expectedUpdatedAt) => {
      if (state.failedSave) throw new Error("Fixture save failed without applying changes");
      const current = state.documents.get(key);
      if ((current?.updated_at ?? null) !== expectedUpdatedAt) throw new Error("Fixture stale revision");
      const row = { id: key, content_key: key, updated_at: new Date(Date.UTC(2026, 8, 15, 12, 0, ++state.stamp)).toISOString(), lane: "reference", status: "DRAFT", sections: { calendarPhraseDocument: structuredClone(document) } };
      state.documents.set(key, row); state.writes.push(row); return row;
    },
    memory: async () => { if (state.memoryOffline) throw new Error("Fixture source outage"); return { receipt: memory, prompt: "Fixture owner register only" }; },
    generate: async input => {
      if (state.memoryOffline) throw new Error("Fixture memory outage before provider request");
      state.generationCount++;
      return { proposals: Object.fromEntries(input.requested.map(key => [key, "fixture support for the selected month"])), memory,
        generation: { provider: "synthetic", model: "no-paid-model", generatedAt: new Date().toISOString(), inputsHash: calendarWritingHash(input), origin: "ai-draft", ownerApproved: false, servingAuthorized: false,
          sources: input.requested.map(key => ({ key, knowledgeIds: ["fixture/meaning"] })), metadata: {} } } as any;
    }
  });
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "calendar-phrases-fixture"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("calendar-phrase-writing")) {
      const body = route.request().postDataJSON(); state.calls.push(structuredClone(body));
      let payload: any; let status = 200; const headers: Record<string, string> = {};
      const response: any = { get statusCode() { return status; }, set statusCode(value: number) { status = value; }, setHeader(key: string, value: string) { headers[key] = value; }, end(raw: string) { payload = JSON.parse(raw); } };
      await handler({ method: "POST", headers: route.request().headers(), body } as any, response);
      return route.fulfill({ status, headers, json: payload });
    }
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
  });
  return state;
}
async function openComposer(page: Page) {
  await page.goto("/admin/content#calendar-writeups?view=monthly-sky");
  await page.getByRole("button", { name: "Generate monthly draft", exact: true }).click();
  const composer = page.getByRole("region", { name: "Monthly phrase composer", exact: true });
  await composer.getByLabel("Month and year", { exact: true }).fill("2026-09");
  await composer.getByLabel("Editorial timezone", { exact: true }).fill("America/New_York");
  await composer.getByRole("button", { name: "Load selected month", exact: true }).click();
  await expect(composer.getByLabel("Lead planetary event")).toBeVisible();
  return composer;
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`monthly phrase composer ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const state = await fixture(page); const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1050 }); await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    const composer = await openComposer(page);
    await expect(composer).toContainText("Opening season: Virgo"); await expect(composer).toContainText("Closing season: Libra");
    await composer.getByLabel("Number of event-supported monthly themes").selectOption("2");
    await composer.getByRole("tab", { name: "Phrase variables", exact: true }).click();
    await composer.getByRole("button", { name: "Clear selection", exact: true }).click();
    const focus = composer.getByRole("textbox", { name: /^Phrase value openingSeasonFocus / });
    await expect(focus).toHaveValue("");
    await composer.getByRole("checkbox", { name: /^Draft openingSeasonFocus / }).check();
    await composer.getByRole("button", { name: "Generate selected phrases (1)", exact: true }).click();
    await expect(composer).toContainText("AI suggestion, not applied"); await expect(focus).toHaveValue("");
    expect(state.generationCount).toBe(1); expect(state.writes).toHaveLength(0);
    const generate = state.calls.find(call => call.action === "generate");
    expect(generate.template.definitions.monthlyOverview).toEqual(monthlyCompositionStarter().definitions.monthlyOverview);
    await composer.getByRole("button", { name: "Apply suggestion", exact: true }).click();
    await expect(focus).toHaveValue("fixture support for the selected month");
    await composer.getByRole("checkbox", { name: /^Protect openingSeasonFocus / }).check(); await expect(focus).toBeDisabled();
    await composer.getByRole("tab", { name: "Template patterns", exact: true }).click();
    await composer.getByLabel("New variable name").fill("nestedSeasonDetail"); await composer.getByLabel("Variable type", { exact: true }).selectOption("template");
    await composer.getByRole("button", { name: "Add definition", exact: true }).click();
    await composer.getByRole("textbox", { name: /nestedSeasonDetail.*Template definition/ }).fill("{{openingSeasonFocus}}");
    await composer.getByLabel("Monthly article pattern", { exact: true }).fill("{{seasonOverview}}\n\n{{nestedSeasonDetail}}\n\n{{newMoonHighlights}}\n\n{{fullMoonHighlights}}");
    await composer.getByRole("tab", { name: "Assembled preview", exact: true }).click();
    await expect(composer.getByLabel("Monthly composed writing")).toContainText("September begins with the Sun in Virgo, bringing attention to fixture support for the selected month.");
    await expect(composer.getByLabel("Monthly composed writing")).not.toContainText("{{nestedSeasonDetail}}");
    await expect(composer.getByLabel("Monthly composed writing")).toContainText("New Moon in Virgo"); await expect(composer.getByLabel("Monthly composed writing")).toContainText("Full Moon in Aries");
    await expect(composer.getByLabel("Monthly composed writing")).not.toContainText("eclipse");
    await composer.getByRole("button", { name: "Save monthly draft", exact: true }).click(); await expect(composer).toContainText("Monthly draft saved. It is not published.");
    expect(state.writes[0].content_key).toBe(monthlyEditionKey("2026-09", "America/New_York"));
    expect(state.writes[0].status).toBe("DRAFT"); expect(state.writes[0].lane).toBe("reference");
    expect(state.writes[0].sections.calendarPhraseDocument.receipts).toHaveLength(1);
    expect(state.writes[0].sections.calendarPhraseDocument.template.pattern).toContain("{{nestedSeasonDetail}}");
    await composer.getByRole("button", { name: "Load selected month", exact: true }).click(); await expect(composer).toContainText("Saved monthly draft restored");
    await composer.getByRole("tab", { name: "Phrase variables", exact: true }).click(); await expect(focus).toHaveValue("fixture support for the selected month"); await expect(focus).toBeDisabled();
    await composer.getByRole("tab", { name: "Memory support", exact: true }).click(); await expect(composer).toContainText("Fixture owner writing source");
    await expect(composer.getByRole("link", { name: "Open Memory Map" })).toHaveAttribute("href", "/admin/content/memory");
    await composer.locator("details summary").first().click();
    expect(await composer.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await composer.screenshot({ path: `test-results/calendar-phrases-${width}-${theme}.png` });
    expect(errors).toEqual([]);
  });
}

test("monthly phrase composer preserves failed saves, local edits and unrelated templates", async ({ page }) => {
  test.setTimeout(90_000); const state = await fixture(page); const composer = await openComposer(page);
  await composer.getByRole("tab", { name: "Phrase variables", exact: true }).click();
  const focus = composer.getByRole("textbox", { name: /^Phrase value openingSeasonFocus / }); await focus.fill("fixture manual value");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("tablist", { name: "Calendar Write-ups workspaces", exact: true }).getByRole("tab", { name: "Weekly Sky", exact: true }).click();
  await expect(composer).toBeVisible(); await expect(focus).toHaveValue("fixture manual value");
  state.failedSave = true; await composer.getByRole("button", { name: "Save monthly draft", exact: true }).click(); await expect(composer.getByRole("alert")).toContainText("Fixture save failed");
  await expect(focus).toHaveValue("fixture manual value"); expect(state.writes).toHaveLength(0);
  state.failedSave = false; await composer.getByRole("button", { name: "Save monthly draft", exact: true }).click(); await expect(composer).toContainText("Monthly draft saved");
  state.memoryOffline = true; await composer.getByRole("button", { name: "Load selected month", exact: true }).click(); await expect(composer).toContainText("Saved monthly draft restored");
  await composer.getByRole("tab", { name: "Memory support", exact: true }).click(); await expect(composer.getByRole("alert")).toContainText("Memory support is unavailable");
  await composer.getByRole("tab", { name: "Phrase variables", exact: true }).click(); await expect(focus).toHaveValue("fixture manual value");
  expect(state.documents.has(MONTHLY_TEMPLATE_KEY)).toBe(false);
  expect(state.calls.some(call => /publish|approve/.test(call.action))).toBe(false);
});
