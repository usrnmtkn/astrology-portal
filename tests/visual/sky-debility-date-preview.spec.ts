import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { assembleSkyDebilityCopy } from "../../apps/web/src/content/skyDebilityAssembly";
import { selectSkyDebilityPreviewDraft, skyDebilityPreviewInstant, verifiedSkyDebilityPreviewPositions } from "../../apps/admin/src/skyDebilityDateSelection";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";

test.use({ timezoneId: "Pacific/Honolulu" });
const cases = ["2026-10-28", "2027-01-10", "2027-02-15", "2027-10-08"];
let fixtures: any[];
test.beforeAll(async () => {
  fixtures = [];
  for (const [index, date] of cases.entries()) {
    const location = { label: "Synthetic QA", latitude: 0, longitude: 0, timeZone: "America/New_York" };
    const instant = skyDebilityPreviewInstant(date, "12:00", location.timeZone, { min: cases[0], max: cases.at(-1)! });
    const sky = await getAstrodienstSky(location, instant, { includeDailyEvents: false, includeTransitWindows: false, includeAspectTiming: false });
    const positions = verifiedSkyDebilityPreviewPositions(sky, instant.toISOString());
    const { snapshot, key } = selectSkyDebilityPreviewDraft(positions, []);
    const copy = assembleSkyDebilityCopy(snapshot, undefined, { contentKey: key!, headline: `Complete synthetic reading ${index + 1}`,
      body: `Complete synthetic opening ${index + 1}. With {planetList}, this is a complete fixture paragraph.\n\nComplete synthetic final sentence ${index + 1}.` });
    fixtures.push({ id: `date-fixture-${index}`, content_key: `cms/sky-debility/review-draft/fixture/${index}`, status: "DRAFT", surface: "sky", mode: "feed",
      lane: "reference", review_state: "owner-review-required", headline: copy.openingHook, body: copy.body, updated_at: "2026-10-27T12:00:00Z",
      source_snapshot: { sampleOnly: true, serving: false, ownerApproved: false, exactReadingScope: { readingKey: key, calculatedSky: true,
        placements: positions.filter(p => snapshot.planets.some(q => q.planet === p.planet)) } } });
  }
});

async function setup(page: Page, options: { fail?: boolean; missing?: boolean; duplicate?: boolean; pending?: Promise<void> } = {}) {
  const writes: string[] = [];
  await page.clock.setFixedTime(new Date("2026-10-27T16:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "date-preview-test-only"));
  await routeStudioInventoryApi(page, { call: async ({ method, url }) => {
    const parsed = new URL(url ?? "/", "https://studio.invalid");
    const id = parsed.searchParams.get("id");
    return method === "rows" ? [] : { status: 200, payload: { ok: true, rows: fixtures.filter(row => row.id === id), nextCursor: null } };
  } });
  await page.route("**/api/admin/generated-content-inventory?**", async route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("contentKeyPrefix") !== "cms/sky-debility/review-draft/") return route.fallback();
    const detail = params.get("view") === "detail";
    if (detail) {
      await options.pending;
      if (options.fail) return route.fulfill({ status: 503, json: { ok: false, error: "Synthetic source failure." } });
    }
    const rows = options.missing && detail ? [] : options.duplicate && detail ? [...fixtures, { ...fixtures[0], id: "duplicate" }] : fixtures;
    return route.fulfill({ json: { ok: true, rows: detail ? rows : rows.map(row => ({ id: row.id, content_key: row.content_key,
      status: row.status, headline: row.headline, updated_at: row.updated_at, inventory_only: true })), nextCursor: null } });
  });
  page.on("request", request => {
    if (request.url().includes("/api/admin/generated-content") && request.method() !== "GET") writes.push(request.method());
  });
  return writes;
}

const computedType = (element: HTMLElement) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform"].map(key => [key, style[key as any]]));
};
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`exact date preview preserves full single and combined drafts ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    const writes = await setup(page);
    await page.goto("/#sky-writeups?view=detriment-fall");
    const preview = page.getByTestId("sky-debility-date-preview");
    await preview.locator(":scope > summary").click();
    expect(await preview.locator(":scope > summary").evaluate(computedType)).toEqual(await page.getByTestId("sky-debility-review-drafts").locator("summary").evaluate(computedType));
    const reading = preview.getByTestId("sky-debility-date-reading");
    for (const [index, date] of cases.entries()) {
      await preview.getByLabel("Dignity preview date").fill(date);
      await expect(reading.getByRole("heading")).toHaveText(fixtures[index].headline);
      const paragraphs = await reading.locator("p").allTextContents();
      expect(paragraphs.join("\n\n")).toBe(fixtures[index].body);
      await expect(reading.locator("p").first()).toContainText(`Complete synthetic opening ${index + 1}`);
      await expect(reading.locator("p").last()).toHaveText(`Complete synthetic final sentence ${index + 1}.`);
      await expect(preview.getByRole("list", { name: "Calculated qualifying placements" }).getByRole("listitem")).toHaveCount(fixtures[index].source_snapshot.exactReadingScope.placements.length);
      await expect(preview).toContainText("Saved draft · Not published");
      if (index === 1) await expect(preview).toContainText("One-planet reading");
      if (index === 2) await expect(preview).toContainText("Combined reading");
    }
    expect(await reading.getByRole("heading").evaluate(computedType)).toEqual(await page.getByTestId("sky-debility-studio").getByRole("heading", { name: "Full card and composition map", exact: true }).evaluate(computedType));
    expect(await reading.getByRole("heading").evaluate(el => el.tagName)).toBe("H4");
    expect(await reading.locator("p").first().evaluate(computedType)).toEqual(await page.getByTestId("sky-debility-preview").locator("p").first().evaluate(computedType));
    await preview.getByText("Selection details", { exact: true }).click();
    await expect(preview.locator("code").first()).toBeVisible();
    await preview.screenshot({ path: `test-results/dignity-date-preview-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.reload();
    await expect(preview.getByLabel("Dignity preview date")).toHaveValue(cases[3]);
    await expect(reading.getByRole("heading")).toHaveText(fixtures[3].headline);
    await preview.getByRole("button", { name: "Open selected draft" }).click();
    await expect(page.getByRole("textbox", { name: /^(Source text|Summary wording)$/ })).toHaveValue(fixtures[3].body);
    await expect(page.getByRole("button", { name: /^Save & publish$/ })).toBeDisabled();
    expect(writes).toEqual([]);
  });
}

test("date preview reports loading, errors, missing drafts and duplicate bindings without writes", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const options = { fail: true, missing: false, duplicate: false, pending };
  const writes = await setup(page, options);
  await page.goto("/#sky-writeups?view=detriment-fall&previewDate=2026-10-28");
  const preview = page.getByTestId("sky-debility-date-preview");
  await expect(preview.getByRole("status")).toHaveText("Calculating sky and loading saved drafts…");
  release();
  await expect(preview.getByRole("alert")).toHaveText("Synthetic source failure.");
  options.fail = false; options.missing = true;
  await preview.getByRole("button", { name: "Refresh date preview" }).click();
  await expect(preview).toContainText("No saved draft matches this complete sky.");
  options.missing = false; options.duplicate = true;
  await preview.getByRole("button", { name: "Refresh date preview" }).click();
  await expect(preview.getByRole("alert")).toContainText("More than one saved draft matches");
  options.duplicate = false;
  await preview.getByRole("button", { name: "Refresh date preview" }).click();
  await expect(preview.getByTestId("sky-debility-date-reading")).toBeVisible();
  await preview.getByLabel("Dignity preview date").fill("2027-10-27");
  await expect(preview.getByRole("alert")).toHaveText("Choose a date within the next 12 months.");
  await expect(preview.getByTestId("sky-debility-date-reading")).toHaveCount(0);
  expect(writes).toEqual([]);
});
