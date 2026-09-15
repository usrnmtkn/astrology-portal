import { expect, test, type Page } from "@playwright/test";
import { skyForecastTemplates } from "../../apps/admin/src/skyForecastTemplates";
import { lunarSigns } from "../../apps/admin/src/lunarCalendarContent";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";

const weekly = skyForecastTemplates["weekly-sky"];
const pattern = "{{sunSign}} / {{moonSign}} · {{sunDegree}}\n\n{{sunSummary}}\n\n{{moonWriteup}}\n\n{{mondayDate}}\n{{mondayTiming}}\n{{mondayWriteup}}\n\n{{weeklyIntegration}}";
const notes = "Fixture editor-only writing instructions. Preserve this complete guidance.";
const moonBody = (sign: string) => `Fixture ${sign} opening.\n\nFixture ${sign} middle.\n\nFixture ${sign} final sentence.`;
async function fixture(page: Page) {
  const writes: any[] = [];
  const rows: any[] = [
    { id: "weekly", content_key: weekly.contentKey, headline: weekly.headline, body: pattern, summary: notes, status: "DRAFT", lane: "reference", surface: "sky", mode: "card", block_type: "fallback_template", source_snapshot: { contentType: "template", content_role: "template", contentSystem: "fallback" }, updated_at: "2026-09-14T12:00:00Z" },
    ...lunarSigns.flatMap(sign => [
      { id: `sun-${sign}`, content_key: `cms/sky-daily-summary/sun/${sign}`, body: `shows the ${sign} fixture`, status: "LIVE", lane: "serving" },
      { id: `moon-${sign}`, content_key: `authored/calendar-weekly-moon/${sign}${sign === "cancer" ? "/variant-2" : ""}`, body: moonBody(sign), status: "LIVE", lane: "serving", source_snapshot: { content_role: "full_copy", review_status: "approved_reuse" } }
    ])
  ];
  const state = { fail: false, writes, rows };
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "calendar-preview-fixture"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith("generated-content")) return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
    if (route.request().method() !== "GET") {
      const input = route.request().postDataJSON(); writes.push(input);
      const row = { ...rows.find(row => row.id === input.id), ...input, content_key: input.contentKey, updated_at: new Date().toISOString() };
      rows.splice(0, rows.length, ...rows.filter(value => value.id !== row.id), row);
      return route.fulfill({ json: { ok: true, rows: [row] } });
    }
    const keys = url.searchParams.getAll("contentKeys");
    if (state.fail && keys.length) return route.fulfill({ status: 503, json: { error: "Fixture saved-source outage" } });
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
    expect(await preview.getByRole("heading", { name: "Template preview" }).evaluate(style)).toEqual(reference);
    expect(await page.locator(".admin-main h1,.admin-main h2,.admin-main h3,.admin-main h4").allTextContents()).toEqual(["Calendar Write-ups", "Calendar writing workspaces", "Weekly overview template", "Template preview"]);
    await preview.getByLabel("Preview Sun sign").selectOption("Leo");
    await preview.getByLabel("Preview Moon sign").selectOption("Taurus");
    await expect(rendered).toContainText("The Sun in Leo shows the leo fixture.");
    await expect(rendered).toContainText(moonBody("taurus"));
    await expect(rendered).not.toContainText(moonBody("cancer"));
    await preview.getByRole("tab", { name: "Template pattern", exact: true }).click();
    await expect(preview.getByLabel("Calendar template pattern")).toHaveText(pattern);
    await preview.getByRole("tab", { name: "Variables", exact: true }).click();
    await expect(preview.getByLabel("Calendar preview variables")).toContainText("Example sign");
    await expect(preview.getByLabel("Calendar preview variables").getByRole("textbox")).toHaveCount(0);
    await preview.getByRole("tab", { name: "Preview", exact: true }).click();
    expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const toast = page.getByRole("button", { name: "Dismiss notification", exact: true });
    if (await toast.isVisible()) await toast.click();
    await preview.screenshot({ path: `test-results/calendar-live-preview-${width}-${theme}.png` });
    await page.getByRole("button", { name: "Open weekly template", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Template purpose (optional)", { exact: true })).toHaveValue(notes);
    await editor.getByLabel("Template pattern", { exact: true }).fill(`${pattern}\n\nFixture added {{moonSign}}.`);
    await expect(rendered).toContainText("Fixture added Taurus.");
    expect(state.writes).toEqual([]);
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0].summary).toBe(notes);
    expect(state.writes[0].body).toBe(`${pattern}\n\nFixture added {{moonSign}}.`);
    expect(state.writes[0].facts).toEqual({});
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tablist", { name: "Calendar Write-ups workspaces" }).getByRole("tab", { name: "Monthly Sky" }).click();
    await expect(preview.getByLabel("Rendered Calendar template")).toContainText("{{monthlyOverview}}");
    await expect(preview.getByRole("region", { name: "Selected Sun and Moon writing" })).toContainText(moonBody("taurus"));
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
  await page.getByRole("tablist", { name: "Calendar Write-ups workspaces" }).getByRole("tab", { name: "Monthly Sky" }).click();
  await expect(rendered).toContainText("Friday, January 1, 2027", { timeout: 45_000 });
  await expect(rendered).toContainText("Sunday, January 31, 2027");
  await expect(rendered).not.toContainText("{{keyDates}}");
  expect(state.writes).toEqual([]);
});
