import { expect, test, type Page } from "@playwright/test";
import { skyForecastTemplates } from "../../apps/admin/src/skyForecastTemplates";
import { calendarMonthlyCompatibilityPattern, calendarMonthlyEditorialPattern } from "../../apps/admin/src/calendarOverviewTemplate";
import { lunarSigns } from "../../apps/admin/src/lunarCalendarContent";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";

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
    if (!url.pathname.endsWith("generated-content") && !url.pathname.endsWith("generated-content-inventory")) return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
    if (route.request().method() !== "GET") {
      const input = route.request().postDataJSON(); writes.push(input);
      const original = rows.find(row => row.id === input.id) ?? rows.find(row => row.content_key === input.contentKey);
      const row = { ...original, ...input, id: input.id ?? `saved-${writes.length}`, content_key: input.contentKey, updated_at: new Date().toISOString() };
      rows.splice(0, rows.length, ...rows.filter(value => value.id !== row.id && value !== original), row);
      return route.fulfill({ json: { ok: true, rows: [row] } });
    }
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
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Calendar interactive template preview ${width} ${theme}`, async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const state = await fixture(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    await page.goto("/admin/content#sky-writeups?view=daily-summary");
    const reference = await page.getByRole("heading", { name: "Sun and Moon together", exact: true }).evaluate(style);
    await page.goto("/admin/content#calendar-writeups?view=weekly-sky");
    const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
    await preview.getByLabel("Preview source").selectOption("signs");
    await preview.getByLabel("Preview Sun sign").selectOption("Virgo");
    await preview.getByLabel("Preview Moon sign").selectOption("Cancer");
    const rendered = preview.getByLabel("Rendered Calendar template", { exact: true });
    await expect(rendered).toContainText(moonBody("cancer"));
    await expect(rendered).toContainText("The Sun in Virgo shows the virgo fixture.");
    await expect(rendered).toContainText("{{sunDegree}}");
    await expect(rendered).toContainText("{{weeklyIntegration}}");
    const colorStyle = (element: Element) => { const s = getComputedStyle(element); return [s.color, s.backgroundColor]; };
    const sunColor = await rendered.locator('[data-variable-name="sunSign"]').evaluate(colorStyle);
    expect(sunColor[1]).not.toBe("rgba(0, 0, 0, 0)");
    expect(await preview.getByRole("heading", { name: "Template preview" }).evaluate(style)).toEqual(reference);
    expect(await page.locator(".admin-main h1,.admin-main h2,.admin-main h3,.admin-main h4").allTextContents()).toEqual(["Calendar Write-ups", "Calendar writing workspaces", "Weekly overview template", "Template preview"]);
    await preview.getByLabel("Preview Sun sign").selectOption("Leo");
    await preview.getByLabel("Preview Moon sign").selectOption("Taurus");
    await expect(rendered).toContainText("The Sun in Leo shows the leo fixture.");
    await expect(rendered).toContainText(moonBody("taurus"));
    await expect(rendered).not.toContainText(moonBody("cancer"));
    await preview.getByRole("tab", { name: "Template pattern", exact: true }).click();
    await expect(preview.getByLabel("Calendar template pattern")).toHaveText(pattern);
    expect(await preview.getByLabel("Calendar template pattern").locator('[data-variable-name="sunSign"]').evaluate(colorStyle)).toEqual(sunColor);
    await preview.getByRole("tab", { name: "Variables", exact: true }).click();
    await expect(preview.getByLabel("Calendar preview variables")).toContainText("Example sign");
    await expect(preview.getByLabel("Calendar preview variables").getByRole("textbox")).toHaveCount(0);
    expect(await preview.getByLabel("Calendar preview variables").locator('[data-variable-name="sunSign"]').evaluate(colorStyle)).toEqual(sunColor);
    const seasonColor = await preview.getByLabel("Calendar preview variables").locator('[data-variable-name="zodiacSeason"]').evaluate(colorStyle);
    expect(new Set(await preview.getByLabel("Calendar preview variables").locator('[data-variable-color]').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor))).size).toBeGreaterThanOrEqual(4);
    const variableRow = preview.getByRole("row").filter({ has: page.getByRole("rowheader", { name: /\{\{zodiacSeason\}\}/ }) });
    await expect(variableRow).toContainText(seasonBody("leo"));
    expect(await variableRow.locator("td p").evaluate(style)).toEqual(await preview.locator('p').first().evaluate(style));
    expect(await variableRow.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await preview.getByLabel("Calendar preview variables").screenshot({ path: `test-results/calendar-variables-${width}-${theme}.png` });
    await preview.getByRole("button", { name: "Edit weeklyOverview", exact: true }).click();
    const overviewDialog = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(overviewDialog.getByLabel("Weekly overview", { exact: true })).toBeFocused();
    await overviewDialog.getByRole("button", { name: "Use Sun summary", exact: true }).click();
    await expect(overviewDialog.getByLabel("Weekly overview", { exact: true })).toHaveValue("{{sunSummary}}");
    // Exercise discard only for this synthetic, unsaved editor fixture.
    page.once("dialog", dialog => dialog.accept());
    await overviewDialog.getByRole("button", { name: "Close", exact: true }).click();
    await preview.getByRole("tab", { name: "Preview", exact: true }).click();
    expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const toast = page.getByRole("button", { name: "Dismiss notification", exact: true });
    if (await toast.isVisible()) await toast.click();
    await preview.screenshot({ path: `test-results/calendar-live-preview-${width}-${theme}.png` });
    await page.getByRole("button", { name: "Open weekly template", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Template purpose (optional)", { exact: true })).toHaveValue(notes);
    expect(await editor.getByRole("button", { name: "Insert {{zodiacSeason}} into Calendar template", exact: true }).evaluate(colorStyle)).toEqual(seasonColor);
    await editor.getByLabel("Template pattern", { exact: true }).fill(`${pattern}\n\nFixture added {{moonSign}}.`);
    await expect(rendered).toContainText("Fixture added Taurus.");
    const closing = editor.getByLabel("Closing passage", { exact: true });
    await closing.fill("Fixture complete closing. ");
    await closing.focus();
    await closing.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(element.value.length, element.value.length));
    await editor.getByRole("button", { name: "Insert {{zodiacSeason}} into Calendar template", exact: true }).click();
    await expect(closing).toHaveValue("Fixture complete closing. {{zodiacSeason}}");
    await expect(rendered).toContainText(seasonBody("leo"));
    const overviewEditor = editor.getByRole("region", { name: "Calendar overview writing", exact: true });
    expect(await overviewEditor.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await overviewEditor.locator("label > span").first().evaluate(style)).toEqual(await editor.locator('label:has(textarea[data-sky-field="body"]) > span').evaluate(style));
    await overviewEditor.screenshot({ path: `test-results/calendar-overview-editor-${width}-${theme}.png` });
    expect(state.writes).toEqual([]);
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0].summary).toBe(notes);
    expect(state.writes[0].body).toBe(`${pattern}\n\nFixture added {{moonSign}}.`);
    expect(state.writes[0].facts).toEqual({});
    expect(state.writes[0].sections.calendarOverview.weeklyIntegration).toBe("Fixture complete closing. {{zodiacSeason}}");
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Open weekly template", exact: true }).click();
    await expect(editor.getByLabel("Closing passage", { exact: true })).toHaveValue("Fixture complete closing. {{zodiacSeason}}");
    await expect(editor.getByLabel("Template purpose (optional)", { exact: true })).toHaveValue(notes);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tablist", { name: "Calendar Write-ups workspaces" }).getByRole("tab", { name: "Monthly Sky" }).click();
    await expect(preview.getByLabel("Rendered Calendar template")).toContainText("Zodiac Seasons");
    await expect(preview.getByLabel("Rendered Calendar template")).toContainText("Lunar Cycle");
    await expect(preview.getByLabel("Rendered Calendar template")).toContainText("Planetary Changes");
    await expect(preview.getByLabel("Rendered Calendar template")).toContainText("{{monthlyOverview}}");
    await expect(preview.getByLabel("Rendered Calendar template")).toContainText("{{monthlyIntegration}}");
    expect(await preview.getByRole("heading", { name: "Template preview" }).evaluate(style)).toEqual(reference);
    await preview.getByRole("tab", { name: "Variables", exact: true }).click();
    expect(await preview.getByLabel("Calendar preview variables").locator('[data-variable-name="zodiacSeason"]').evaluate(colorStyle)).toEqual(seasonColor);
    await preview.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(preview.getByRole("region", { name: "Selected Sun and Moon writing" })).toHaveCount(0);
    expect(await preview.getByRole("heading", { name: "Template preview" }).evaluate(style)).toEqual(reference);
    await preview.screenshot({ path: `test-results/calendar-monthly-preview-${width}-${theme}.png` });
    expect(errors).toEqual([]);
  });
}

test("Calendar preview calculates two real skies and clears unavailable facts", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/admin/content#calendar-writeups?view=daily-sky");
  const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
  for (const date of ["2026-09-14T12:00", "2027-01-12T12:00"]) {
    const instant = await page.evaluate(value => new Date(value).toISOString(), date);
    const timeZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const expected = await getAstrodienstSky({ label: "Geocentric reference", latitude: 0, longitude: 0, timeZone }, new Date(instant), { includeTransitWindows: false });
    await preview.getByLabel("Preview date and time").fill(date);
    for (const body of ["Sun", "Moon"]) {
      await expect(preview.getByLabel(`Preview ${body} sign`)).toHaveValue(expected.positions.find(position => position.planet === body)!.sign, { timeout: 45_000 });
      await expect(preview.getByLabel(`Preview ${body} sign`)).toBeDisabled();
    }
    await preview.getByRole("tab", { name: "Variables", exact: true }).click();
    await expect(preview.getByLabel("Calendar preview variables")).toContainText(`${expected.positions.find(position => position.planet === "Moon")!.degree.toFixed(2)}°`);
    await expect(preview.getByText(/Swiss Ephemeris/)).toBeVisible();
  }
  await preview.getByLabel("Preview source").selectOption("signs");
  await expect(preview.getByLabel("Calendar preview variables")).not.toContainText("Read-only ephemeris");
  state.fail = true;
  await preview.getByRole("button", { name: "Refresh preview" }).click();
  await expect(preview.getByRole("alert")).toBeVisible();
  await preview.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(preview.getByLabel("Rendered Calendar template")).toHaveCount(0);
  state.fail = false;
  await preview.getByRole("button", { name: "Refresh preview" }).click();
  await expect(preview.getByLabel("Rendered Calendar template")).toBeVisible();
  await preview.getByLabel("Preview source").selectOption("ephemeris");
  await preview.getByLabel("Preview date and time").fill("");
  await expect(preview.getByRole("alert")).toBeVisible();
  await expect(preview.getByLabel("Rendered Calendar template")).toHaveCount(0);
  await preview.getByLabel("Preview date and time").fill("2027-01-12T12:00");
  await expect(preview.getByLabel("Preview Sun sign")).toHaveValue("Capricorn");
  await page.getByRole("tablist", { name: "Calendar Write-ups workspaces" }).getByRole("tab", { name: "Weekly Sky" }).click();
  const rendered = preview.getByLabel("Rendered Calendar template");
  await expect(rendered).toContainText("Monday, January 11, 2027", { timeout: 45_000 });
  await expect(rendered).not.toContainText("{{mondayTiming}}");
  await expect(rendered).not.toContainText("{{mondayWriteup}}");
  await expect(rendered).not.toContainText(/12:00 AM[^\n]*retrograde/);
  state.keyRequests.length = 0;
  await page.getByRole("tablist", { name: "Calendar Write-ups workspaces" }).getByRole("tab", { name: "Monthly Sky" }).click();
  await expect(rendered).toContainText("Friday, January 1, 2027", { timeout: 45_000 });
  await expect(rendered).toContainText("Sunday, January 31, 2027");
  await expect(rendered).not.toContainText("{{lunationDates}}");
  await expect(rendered).toContainText(seasonBody("capricorn"));
  await expect(rendered).toContainText(seasonBody("aquarius"));
  expect(new Set(state.keyRequests.flat()).size).toBeGreaterThan(64);
  expect(Math.max(...state.keyRequests.map(keys => keys.length))).toBeLessThanOrEqual(64);
  const tail = state.keyRequests.at(-1);
  expect(state.keyRequests.some(keys => keys.length === 64)).toBe(true);
  expect(tail?.length).toBeGreaterThan(0);
  expect(tail!.length).toBeLessThan(64);
  state.failKey = tail![0];
  await preview.getByRole("button", { name: "Refresh preview" }).click();
  await expect(preview.getByRole("alert")).toBeVisible();
  await expect(rendered).toHaveCount(0);
  state.failKey = "";
  await preview.getByRole("button", { name: "Refresh preview" }).click();
  await expect(rendered).toContainText(seasonBody("aquarius"));
  await expect(rendered).toContainText(seasonBody("capricorn"));
  await expect(rendered).not.toContainText("Moon square");
  await expect(rendered).not.toContainText(/12:00 AM[^\n]*retrograde/);
  expect(state.writes).toEqual([]);
});

test("Calendar source editing opens a complete existing draft and stays in the workspace", async ({ page }) => {
  const state = await fixture(page);
  const key = "fallback-hook/zodiac-season/virgo";
  const source = state.rows.find(row => row.content_key === key);
  Object.assign(source, { id: `package:${key}`, status: "DRAFT", surface: "you", lane: "reference", review_state: "needs-review",
    sections: { packageRecord: { contentKey: key, content_role: "fallback_hook", body: source.body, review_status: "needs_review", sign: "virgo", grammar_frame: "complete_sentence", calendarWritingSource: { title: "Sign season content", originalBody: source.body } } } });
  await page.goto("/admin/content#calendar-writeups?view=weekly-sky");
  const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
  await preview.getByLabel("Preview source").selectOption("signs");
  await preview.getByLabel("Preview Sun sign").selectOption("Virgo");
  await preview.getByRole("tab", { name: "Variables", exact: true }).click();
  await expect(preview.getByLabel("Calendar preview variables")).toContainText("Existing writing · Sign season content");
  await preview.getByRole("button", { name: "Edit zodiacSeason", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  const body = editor.locator('textarea[data-sky-field="body"]');
  await expect(body).toHaveValue(seasonBody("virgo"));
  await expect(editor.locator('.admin-editor-details-summary')).toContainText("Shared zodiac season source");
  await expect(editor.locator('.admin-editor-details-summary')).not.toContainText("you");
  await editor.locator('.admin-editor-details > summary').click();
  await expect(editor.getByLabel("Row metadata")).toContainText("Calendar, Sky and other supported templates");
  await expect(editor.getByLabel("Surface", { exact: true })).toHaveCount(0);
  await body.fill("Fixture revised season opening.\n\nFixture complete final sentence.");
  await expect(preview.getByLabel("Calendar preview variables")).toContainText("Fixture complete final sentence.");
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].sections.packageDraft.body).toBe("Fixture revised season opening.\n\nFixture complete final sentence.");
  expect(state.writes[0].status).toBe("DRAFT");
  expect(state.writes[0].surface).toBe("you");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/#calendar-writeups\?view=weekly-sky$/);
  await preview.getByRole("button", { name: "Edit zodiacSeason", exact: true }).click();
  await expect(body).toHaveValue("Fixture revised season opening.\n\nFixture complete final sentence.");
});

test("Monthly overview structure is an explicit draft change and preserves saved writing", async ({ page }) => {
  const state = await fixture(page);
  const monthly = skyForecastTemplates["monthly-sky"];
  const previous = "{{monthRange}}\n\n{{monthlyOverview}}\n\n{{keyDates}}\n\n{{monthlyIntegration}}";
  state.rows.push({ ...state.rows[0], id: "monthly", content_key: monthly.contentKey, headline: monthly.headline, body: previous,
    sections: { contentStudioReview: { decision: "approved-exact-copy", copySha256: "fixture-prior-review" }, preservedMetadata: "Fixture existing metadata", calendarOverview: { monthlyIntegration: "Fixture complete saved ending." } } });
  await page.goto("/admin/content#calendar-writeups?view=monthly-sky");
  const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
  await preview.getByLabel("Preview source").selectOption("signs");
  await preview.getByLabel("Preview Sun sign").selectOption("Virgo");
  await preview.getByLabel("Preview Moon sign").selectOption("Cancer");
  await preview.getByRole("tab", { name: "Template pattern", exact: true }).click();
  await expect(preview.getByLabel("Calendar template pattern")).toHaveText(previous);
  await page.getByRole("button", { name: "Open monthly template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  page.once("dialog", dialog => dialog.accept());
  await editor.getByRole("button", { name: "Use overview structure", exact: true }).click();
  await expect(editor.getByLabel("Template pattern", { exact: true })).toHaveValue(calendarMonthlyCompatibilityPattern());
  await editor.getByLabel("Monthly overview", { exact: true }).fill("Fixture monthly opening.\n\nFixture monthly final sentence.");
  await editor.getByLabel("Season transition", { exact: true }).fill("Fixture season transition. ");
  await editor.getByRole("button", { name: "Insert {{zodiacSeasonPolarAxis}} into Calendar template", exact: true }).click();
  await expect(editor.getByLabel("Season transition", { exact: true })).toHaveValue("Fixture season transition. {{zodiacSeasonPolarAxis}}");
  await expect(editor.getByLabel("Closing passage", { exact: true })).toHaveValue("Fixture complete saved ending.");
  await expect(editor.getByLabel("Seasonal opening", { exact: true })).toHaveValue("");
  await expect(editor.getByLabel("New Moon overview", { exact: true })).toHaveValue("");
  await expect(editor.getByRole("button", { name: "Use monthly editorial structure", exact: true })).toBeVisible();
  await expect(editor.getByLabel("Template purpose (optional)", { exact: true })).toHaveValue(notes);
  expect(state.writes).toEqual([]);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].status).toBe("DRAFT");
  expect(state.writes[0].lane).toBe("reference");
  expect(state.writes[0].sections.preservedMetadata).toBe("Fixture existing metadata");
  expect(state.writes[0].sections.contentStudioReview).toBeNull();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await preview.getByRole("tab", { name: "Preview", exact: true }).click();
  const rendered = preview.getByLabel("Rendered Calendar template");
  await expect(rendered).toContainText("Fixture monthly opening.");
  await expect(rendered).toContainText("Fixture monthly final sentence.");
  await expect(rendered).toContainText("Fixture complete saved ending.");
  await expect(rendered).toContainText(axisBody("virgo"));
  await expect(rendered).not.toContainText("{{monthlyOverview}}");
  await page.getByRole("button", { name: "Open monthly template", exact: true }).click();
  await expect(editor.getByLabel("Monthly overview", { exact: true })).toHaveValue("Fixture monthly opening.\n\nFixture monthly final sentence.");
  await expect(editor.getByLabel("Season transition", { exact: true })).toHaveValue("Fixture season transition. {{zodiacSeasonPolarAxis}}");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
});

test("Monthly editorial structure is opt-in and keeps saved overview passages", async ({ page }) => {
  const state = await fixture(page);
  const monthly = skyForecastTemplates["monthly-sky"];
  const previous = "{{monthRange}}\n\n{{monthlyOverview}}\n\n{{keyDates}}\n\n{{monthlyIntegration}}";
  state.rows.push({ ...state.rows[0], id: "monthly-editorial", content_key: monthly.contentKey, headline: monthly.headline, body: previous,
    sections: { preservedMetadata: "Fixture existing metadata", calendarOverview: { monthlyOverview: "Fixture saved monthly overview.", monthlyIntegration: "Fixture complete saved ending." } } });
  await page.goto("/admin/content#calendar-writeups?view=monthly-sky");
  const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
  await preview.getByLabel("Preview source").selectOption("signs");
  await preview.getByLabel("Preview Sun sign").selectOption("Virgo");
  await preview.getByLabel("Preview Moon sign").selectOption("Cancer");
  await page.getByRole("button", { name: "Open monthly template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  page.once("dialog", dialog => dialog.accept());
  await editor.getByRole("button", { name: "Use monthly editorial structure", exact: true }).click();
  await expect(editor.getByLabel("Template pattern", { exact: true })).toHaveValue(calendarMonthlyEditorialPattern());
  await expect(editor.getByLabel("Monthly overview", { exact: true })).toHaveValue("Fixture saved monthly overview.");
  await expect(editor.getByLabel("Closing passage", { exact: true })).toHaveValue("Fixture complete saved ending.");
  await expect(editor.getByLabel("Seasonal opening", { exact: true })).toHaveValue("");
  const overviewEditor = editor.getByRole("region", { name: "Calendar overview writing", exact: true });
  const labelStyle = (element: Element) => {
    const s = getComputedStyle(element);
    return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.marginTop, s.marginBottom, s.textTransform, s.textAlign];
  };
  expect(await overviewEditor.locator('label:has(textarea[data-calendar-field="seasonOpening"]) > span').evaluate(labelStyle))
    .toEqual(await overviewEditor.locator('label:has(textarea[data-calendar-field="monthlyOverview"]) > span').evaluate(labelStyle));
  expect(await overviewEditor.locator("textarea[data-calendar-field]").evaluateAll(elements => elements.map(element => element.getAttribute("aria-label")))).toEqual([
    "Monthly overview", "Season transition", "Lunar cycle", "Planetary changes", "Closing passage",
    "Seasonal opening", "Planetary highlights", "New Moon overview", "Full Moon overview", "Lunation connection"
  ]);
  page.once("dialog", dialog => dialog.accept());
  await editor.getByRole("button", { name: "Use invitation opening starter", exact: true }).click();
  await expect(editor.getByLabel("Seasonal opening", { exact: true })).toHaveValue(/\{\{placementFocus\}\}/);
  await editor.getByLabel("New Moon overview", { exact: true }).fill("The New Moon in ");
  await editor.getByRole("button", { name: "Insert {{signTitle}} into Calendar template", exact: true }).click();
  await expect(editor.getByLabel("New Moon overview", { exact: true })).toHaveValue("The New Moon in {{signTitle}}");
  await expect(editor.getByLabel("Monthly overview", { exact: true })).toHaveValue("Fixture saved monthly overview.");
  expect(state.writes).toEqual([]);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body).toBe(calendarMonthlyEditorialPattern());
  expect(state.writes[0].sections.calendarOverview.monthlyOverview).toBe("Fixture saved monthly overview.");
  expect(state.writes[0].sections.calendarOverview.monthlyIntegration).toBe("Fixture complete saved ending.");
  expect(state.writes[0].sections.calendarOverview.newMoonOverview).toBe("The New Moon in {{signTitle}}");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await preview.getByRole("tab", { name: "Preview", exact: true }).click();
  const rendered = preview.getByLabel("Rendered Calendar template");
  await expect(rendered).toContainText("{{placementFocus}}");
  await expect(rendered).not.toContainText("Fixture saved monthly overview.");
});

test("Weekly overview starter uses Monday Moon sign and passage", async ({ page }) => {
  const state = await fixture(page);
  const template = state.rows.find(row => row.content_key === weekly.contentKey);
  template.body = `{{weeklyOverview}}\n\n${pattern}`;
  const moon = state.rows.find(row => row.content_key === "authored/calendar-weekly-moon/scorpio");
  moon.source_snapshot.focus = "Necessary endings, emotional honesty, powerful truth";
  await page.goto("/admin/content#calendar-writeups?view=weekly-sky");
  const preview = page.getByRole("region", { name: "Calendar template preview", exact: true });
  await preview.getByLabel("Preview source").selectOption("signs");
  await preview.getByLabel("Preview Sun sign").selectOption("Capricorn");
  await preview.getByLabel("Preview Moon sign").selectOption("Scorpio");
  await page.getByRole("button", { name: "Open weekly template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor.getByLabel("Weekly overview", { exact: true })).toHaveValue("");
  await editor.getByRole("button", { name: "Use weekly overview starter", exact: true }).click();
  await expect(editor.getByLabel("Weekly overview", { exact: true })).toHaveValue(/The Moon is in \{\{mondayMoonSign\}\}, so the emotional tone for this week is:/);
  await expect(editor.getByLabel("Weekly overview", { exact: true })).toHaveValue(/\{\{mondayWriteup\}\}/);
  await expect(preview.getByLabel("Rendered Calendar template")).toContainText("The Moon is in Scorpio, so the emotional tone for this week is:");
  await expect(preview.getByLabel("Rendered Calendar template")).toContainText(moonBody("scorpio"));
  expect(state.writes).toEqual([]);
});
