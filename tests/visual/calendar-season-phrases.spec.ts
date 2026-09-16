import { expect, test, type Page } from "@playwright/test";
import { skyForecastTemplates } from "../../apps/admin/src/skyForecastTemplates";
import { lunarSigns } from "../../apps/admin/src/lunarCalendarContent";

const weekly = skyForecastTemplates["weekly-sky"];
const pattern = "{{sunSign}} / {{moonSign}} · {{sunDegree}}\n\n{{sunSummary}}\n\n{{moonWriteup}}\n\n{{mondayDate}}\n{{mondayTiming}}\n{{mondayWriteup}}\n\n{{weeklyIntegration}}";
const notes = "Fixture editor-only writing instructions. Preserve this complete guidance.";
const seasonBody = (sign: string) => `Fixture ${sign} season opening.\n\nFixture ${sign} complete season final sentence.`;
const axisBody = (sign: string) => `Fixture ${sign} polar axis opening. Fixture ${sign} polar axis final sentence.`;
const moonBody = (sign: string) => `Fixture ${sign} opening.\n\nFixture ${sign} middle.\n\nFixture ${sign} final sentence.`;
async function fixture(page: Page) {
  const writes: any[] = [];
  const rows: any[] = [
    { id: "weekly", content_key: weekly.contentKey, headline: weekly.headline, body: pattern, summary: notes, status: "DRAFT", lane: "reference", surface: "sky", mode: "card", block_type: "fallback_template", source_snapshot: { contentType: "template", content_role: "template", contentSystem: "fallback" }, updated_at: "2026-09-14T12:00:00Z" },
    ...lunarSigns.flatMap(sign => [
      { id: `season-${sign}`, content_key: `fallback-hook/zodiac-season/${sign}`, body: seasonBody(sign), status: "LIVE", lane: "serving", source_snapshot: { content_role: "fallback_hook", review_status: "approved" } },
      { id: `axis-${sign}`, content_key: `fallback-hook/zodiac-season-polar-axis/${sign}`, body: axisBody(sign), status: "LIVE", lane: "serving", source_snapshot: { content_role: "fallback_hook", review_status: "approved" } },
      { id: `sun-${sign}`, content_key: `cms/sky-daily-summary/sun/${sign}`, body: `shows the ${sign} fixture`, status: "LIVE", lane: "serving" },
      { id: `moon-${sign}`, content_key: `authored/calendar-weekly-moon/${sign}${sign === "cancer" ? "/variant-2" : ""}`, body: moonBody(sign), status: "LIVE", lane: "serving", source_snapshot: { content_role: "full_copy", review_status: "approved_reuse" } }
    ])
  ];
  const state = { fail: false, failKey: "", keyRequests: [] as string[][], writes, rows };
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "calendar-preview-fixture"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith("generated-content")) return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
    if (route.request().method() !== "GET") {
      const input = route.request().postDataJSON(); writes.push(input);
      const original = rows.find(row => row.id === input.id) ?? rows.find(row => row.content_key === input.contentKey);
      const row = { ...original, ...input, id: input.id ?? `saved-${writes.length}`, content_key: input.contentKey, updated_at: new Date().toISOString() };
      rows.splice(0, rows.length, ...rows.filter(value => value.id !== row.id && value !== original), row);
      return route.fulfill({ json: { ok: true, rows: [row] } });
    }
    if (url.searchParams.get("variables") === "true") return route.fulfill({ json: { ok: true, variables: rows.filter(row => row.sections?.variable).map(row => ({ ...row.sections.variable, id: row.id, updatedAt: row.updated_at })) } });
    const keys = url.searchParams.getAll("contentKeys");
    if (keys.length) state.keyRequests.push(keys);
    if (keys.length > 64) return route.fulfill({ status: 400, json: { error: "Invalid exact content keys." } });
    if ((state.fail && keys.length) || keys.includes(state.failKey)) return route.fulfill({ status: 503, json: { error: "Fixture saved-source outage" } });
    expect(keys.every(key => !key.includes(","))).toBe(true);
    const key = url.searchParams.get("contentKey"); const id = url.searchParams.get("id");
    return route.fulfill({ json: { ok: true, rows: rows.filter(row => (!keys.length || keys.includes(row.content_key)) && (!key || row.content_key === key) && (!id || row.id === id)), nextCursor: null } });
  });
  return state;
}
const style = (element: Element) => { const s = getComputedStyle(element); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.marginTop, s.marginBottom, s.textTransform, s.textAlign]; };


function addSeasonPhraseFixture(state: Awaited<ReturnType<typeof fixture>>) {
  const source = { id: "season-phrase-fixture", content_key: "studio-variable/fixtureseasonfocus", mode: "article", status: "DRAFT", lane: "reference", surface: "sky", body: "", updated_at: "2026-09-16T00:00:00Z",
    sections: { variable: { schema: "studio-variable/v1", name: "fixtureSeasonFocus", label: "Fixture season focus", description: "Synthetic phrase source", value: "Shared fixture focus", tags: [], overrides: lunarSigns.map(sign => ({ scope: "sign", planet: "", sign, value: `Exact ${sign} fixture phrase. Final marker.` })) } } };
  const monthly = skyForecastTemplates["monthly-sky"];
  const row = { ...state.rows[0], id: "monthly-phrases-fixture", content_key: monthly.contentKey, headline: monthly.headline,
    body: "{{monthlyOverview}}\n\n{{seasonOverview}}\n\n{{monthlyIntegration}}",
    sections: { preservedMetadata: "Keep this metadata", calendarOverview: { monthlyOverview: "Exact owner opening. Exact opening final sentence.", seasonOverview: "{{openingSeasonSign}}: {{openingSeasonFocus}}{{#closingSeasonSign}} / {{closingSeasonSign}}: {{closingSeasonFocus}}{{/closingSeasonSign}}", monthlyIntegration: "Exact owner closing. Exact closing final sentence." },
      calendarSeasonPhraseBindings: { openingSeasonFocus: { variableName: "{{fixtureSeasonFocus}}" }, closingSeasonFocus: { variableName: "fixtureSeasonFocus" } } } };
  state.rows.push(row, source);
  return { row, source };
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Monthly seasonal phrase sources preserve templates ${width} ${theme}`, async ({ page }) => {
    const state = await fixture(page);
    const { row, source } = addSeasonPhraseFixture(state);
    const originalWriting = structuredClone(row.sections.calendarOverview);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    await page.goto("/admin/content#calendar-writeups?view=monthly-sky");
    const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
    await preview.getByLabel("Preview source").selectOption("signs");
    await preview.getByLabel("Preview Sun sign").selectOption("Virgo");
    const rendered = preview.getByLabel("Rendered Calendar template", { exact: true });
    await expect(rendered).toContainText("Virgo: Exact virgo fixture phrase. Final marker.");
    await expect(rendered).toContainText(originalWriting.monthlyOverview);
    await expect(rendered).toContainText(originalWriting.monthlyIntegration);
    await expect(rendered).not.toContainText("Exact libra fixture phrase");
    expect(state.keyRequests.some(keys => keys.length === 1 && keys[0] === source.content_key)).toBe(true);
    await preview.getByLabel("Preview Sun sign").selectOption("Libra");
    await expect(rendered).toContainText("Libra: Exact libra fixture phrase. Final marker.");
    await expect(rendered).not.toContainText("Exact virgo fixture phrase");
    const headings = await page.locator(".admin-main h1,.admin-main h2,.admin-main h3,.admin-main h4").allTextContents();
    await preview.getByRole("tab", { name: "Variables", exact: true }).click();
    const phraseRow = preview.getByRole("row").filter({ has: page.getByRole("rowheader", { name: /\{\{openingSeasonFocus\}\}/ }) });
    await expect(phraseRow).toContainText("My variables");
    await expect(phraseRow).toContainText("libra · sign value");
    expect(await phraseRow.locator("td p").evaluate(style)).toEqual(await preview.locator("p").first().evaluate(style));
    await preview.getByRole("button", { name: "Edit openingSeasonFocus", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    const binding = editor.getByLabel("Source for openingSeasonFocus", { exact: true });
    await expect(binding).toBeFocused();
    await expect(binding).toHaveValue("{{fixtureSeasonFocus}}");
    await expect(editor.getByLabel("Monthly overview", { exact: true })).toHaveValue(originalWriting.monthlyOverview);
    await expect(editor.getByLabel("Season transition", { exact: true })).toHaveValue(originalWriting.seasonOverview);
    expect(await binding.evaluate(el => el.getAttribute("data-studio-component"))).toBe("input");
    await binding.fill("fixtureSeasonFocus");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0].sections.calendarOverview).toEqual(originalWriting);
    expect(state.writes[0].sections.calendarSeasonPhraseBindings.openingSeasonFocus).toEqual({ variableName: "fixtureSeasonFocus" });
    expect(state.writes[0].body).toBe(row.body);
    expect(state.writes[0].sections.preservedMetadata).toBe("Keep this metadata");
    expect(state.writes[0].status).toBe("DRAFT");
    await editor.screenshot({ path: `test-results/calendar-season-phrases-${width}-${theme}.png` });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    expect(await page.locator(".admin-main h1,.admin-main h2,.admin-main h3,.admin-main h4").allTextContents()).toEqual(headings);
    await page.getByRole("button", { name: "Open monthly template", exact: true }).click();
    await expect(binding).toHaveValue("fixtureSeasonFocus");
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await preview.getByRole("tab", { name: "Preview", exact: true }).click();
    state.failKey = source.content_key;
    await preview.getByRole("button", { name: "Refresh preview", exact: true }).click();
    await expect(preview.getByRole("alert")).toContainText("Seasonal phrases are unavailable");
    await expect(rendered).not.toContainText("Exact libra fixture phrase");
    await expect(rendered).toContainText(originalWriting.monthlyOverview);
    state.failKey = "";
    await preview.getByRole("button", { name: "Refresh preview", exact: true }).click();
    await expect(rendered).toContainText("Exact libra fixture phrase. Final marker.");
    expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("Monthly seasonal sources follow both calculated seasons across years", async ({ page }) => {
  const state = await fixture(page);
  addSeasonPhraseFixture(state);
  await page.goto("/admin/content#calendar-writeups?view=monthly-sky");
  const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
  const rendered = preview.getByLabel("Rendered Calendar template", { exact: true });
  await preview.getByLabel("Preview date and time").fill("2026-09-15T12:00");
  await expect(rendered).toContainText("Virgo: Exact virgo fixture phrase. Final marker.", { timeout: 30000 });
  await expect(rendered).toContainText("Libra: Exact libra fixture phrase. Final marker.");
  await preview.getByLabel("Preview date and time").fill("2027-01-15T12:00");
  await expect(rendered).toContainText("Capricorn: Exact capricorn fixture phrase. Final marker.", { timeout: 30000 });
  await expect(rendered).toContainText("Aquarius: Exact aquarius fixture phrase. Final marker.");
  await expect(rendered).not.toContainText("Exact virgo fixture phrase");
  await expect(rendered).not.toContainText("Exact libra fixture phrase");
  expect(state.writes).toEqual([]);
});
