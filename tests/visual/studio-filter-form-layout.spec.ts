import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const catalogPath = "/admin/content#sky-writeups";
const personalPath = `${catalogPath}?view=transits-to-natal`;
const housePath = `${catalogPath}?view=house-transits&motion=direct&transit=sun&sign=aries&transitHouse=1`;
const houseControls = ["House Transit planet", "House Transit zodiac sign", "House Transit house", "House Transit motion"];
const personalControls = ["Transiting planet", "Transit to natal aspect", "Natal planet or point", "Transit zodiac sign", "Transit house", "Natal point house"];
const placementControls = ["Sky placement planet or point", "Sky placement zodiac sign", "Sky write-up motion"];

// These rows are browser-only fixtures. No shipped writing or real storage is used.
const row = (id: string, content_key: string, headline: string, body: string, sections = {}) => ({
  id, content_key, headline, body, sections, surface: "sky", mode: "article", status: "DRAFT", lane: "reference",
  facts: {}, source_snapshot: {}, updated_at: "2026-09-14T00:00:00Z"
});
const fixtureRows = [
  row("fixture-house-intro", "authored/transit-house-intro/sun/1", "House fixture", "Complete house fixture paragraph."),
  row("fixture-house-sign", "authored/transit-house-sign/sun/1/aries", "Sign fixture", "Complete sign fixture paragraph."),
  row("fixture-saturn-aries", "sky-placement/article/saturn/aries", "Saturn in Aries fixture", "Amber fixture passage.", {
    packageRecord: { contentKey: "sky-placement/article/saturn/aries", headline: "Saturn in Aries fixture", placementArticle: "Amber fixture passage." }
  }),
  row("fixture-mars-taurus", "sky-placement/article/mars/taurus", "Mars in Taurus fixture", "Cobalt fixture passage.", {
    packageRecord: { contentKey: "sky-placement/article/mars/taurus", headline: "Mars in Taurus fixture", placementArticle: "Cobalt fixture passage." }
  }),
  row("fixture-aspect-square", "fallback-hook/natal-aspect-lived/sun/square/moon", "Sun square Moon fixture", "Indigo fixture passage."),
  row("fixture-aspect-trine", "fallback-hook/natal-aspect-lived/sun/trine/moon", "Sun trine Moon fixture", "Verdant fixture passage.")
];

async function isolate(page: Page, theme = "light") {
  await page.addInitScript(theme => {
    localStorage.setItem("tldrastro:contentAdminSecret", "studio-form-fixture");
    localStorage.setItem("tldrastro:studio-theme", theme);
  }, theme);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    let rows: typeof fixtureRows = [];
    if (url.pathname.endsWith("/generated-content") && route.request().method() === "GET") {
      const keys = (url.searchParams.get("contentKeys") ?? url.searchParams.get("contentKey"))?.split(",");
      rows = keys ? fixtureRows.filter(row => keys.includes(row.content_key)) : fixtureRows;
    }
    await route.fulfill({ json: { ok: true, rows, statuses: [], nextCursor: null } });
  });
}

async function assertGrid(region: Locator, labels: string[], columns: number) {
  const boxes = [];
  for (const label of labels) {
    const control = region.getByLabel(label, { exact: true });
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box, label).not.toBeNull();
    expect(box!.height, `${label} keeps a touch target`).toBeGreaterThanOrEqual(44);
    boxes.push(box!);
  }
  for (let index = 0; index < boxes.length; index += 1) {
    const firstInRow = boxes[Math.floor(index / columns) * columns];
    expect(Math.abs(boxes[index].y - firstInRow.y), `${labels[index]} stays in its intended row`).toBeLessThanOrEqual(1);
    if (index % columns) expect(boxes[index].x).toBeGreaterThan(boxes[index - 1].x + boxes[index - 1].width);
    else if (index) {
      expect(boxes[index].y).toBeGreaterThan(boxes[index - columns].y + boxes[index - columns].height);
      expect(Math.abs(boxes[index].x - boxes[0].x)).toBeLessThanOrEqual(1);
    }
  }
  expect(await region.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  return boxes;
}

async function typography(control: Locator) {
  return control.evaluate(element => {
    const style = getComputedStyle(element);
    return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
  });
}

for (const width of [390, 900, 1440]) for (const theme of ["light", "dark"]) {
  test(`Sky filters and forms share responsive controls ${width} ${theme}`, async ({ page }) => {
    await isolate(page, theme);
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(housePath);
    const house = page.getByRole("region", { name: "House Transits source finder" });
    await expect(house.getByRole("heading", { level: 3, name: "Sun in Aries through your 1st house", exact: true })).toBeVisible();
    await assertGrid(house, houseControls, width <= 720 ? 1 : width >= 1280 ? 4 : 2);
    // The surrounding workspace provides the card; the heading and fields must
    // not add another card's inset and push the actual write-up down the page.
    for (const selector of [".admin-natal-placement-finder-heading", ".admin-natal-placement-selectors"]) {
      expect(await house.locator(selector).evaluate(element => getComputedStyle(element).padding)).toBe("0px");
    }
    const sharedType = await typography(house.getByLabel(houseControls[0], { exact: true }));
    await expect(house.getByRole("region", { name: "Effective House Transit reader preview" })).toContainText("Complete house fixture paragraph.");
    await page.screenshot({ path: `test-results/studio-house-form-${width}-${theme}.png`, fullPage: true });

    await page.goto(personalPath);
    const personal = page.getByRole("region", { name: "Personal Transits source finder" });
    await expect(personal.getByRole("heading", { level: 3, name: "Find a Personal Transit write-up", exact: true })).toBeVisible();
    await assertGrid(personal, personalControls, width <= 720 ? 1 : width >= 1280 ? 3 : 2);
    expect(await typography(personal.getByLabel(personalControls[0], { exact: true }))).toEqual(sharedType);
    await expect(personal).toContainText("Choose transiting planet, aspect, and natal planet or chart point");
    await expect(personal.locator('optgroup[label="Natal chart points"]')).toHaveCount(1);
    await page.screenshot({ path: `test-results/studio-personal-form-${width}-${theme}.png`, fullPage: true });

    await page.goto(catalogPath);
    const filters = page.getByRole("region", { name: "Sky write-up filters" });
    const boxes = await assertGrid(filters, placementControls, width <= 720 ? 1 : width >= 1280 ? 3 : 2);
    expect(await typography(filters.getByLabel(placementControls[0], { exact: true }))).toEqual(sharedType);
    const search = filters.getByRole("searchbox", { name: "Search Sky write-ups" });
    await expect(search).toHaveAttribute("placeholder", "Search write-ups");
    const searchBox = (await search.boundingBox())!;
    expect(searchBox.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(searchBox.x - Math.min(...boxes.map(box => box.x)))).toBeLessThanOrEqual(1);
    expect(Math.abs(searchBox.x + searchBox.width - Math.max(...boxes.map(box => box.x + box.width)))).toBeLessThanOrEqual(1);
    expect(searchBox.y).toBeGreaterThan(Math.max(...boxes.map(box => box.y + box.height)));
    const more = filters.locator("details").filter({ has: page.locator("summary", { hasText: "More filters" }) });
    await expect(more).not.toHaveAttribute("open");
    await expect(filters.getByLabel("Sky write-up type", { exact: true })).toBeHidden();
    await expect(filters.getByLabel("Sky write-up reader use", { exact: true })).toBeHidden();
    await expect(filters.getByLabel("Sort Sky write-ups", { exact: true })).toBeHidden();
    await expect(filters.getByRole("button", { name: "Clear filters", exact: true })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Sky placement composition map" })).toHaveCount(0);
    await expect(page.locator(".admin-save-toast").filter({ hasText: /Loaded \d+.*content records/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/studio-placement-filters-${width}-${theme}.png`, fullPage: true });
  });
}

test("placement filters keep the composition, keyword results, advanced filters and reset in sync", async ({ page }) => {
  await isolate(page);
  await page.goto(catalogPath);
  const filters = page.getByRole("region", { name: "Sky write-up filters" });
  const list = page.getByRole("complementary", { name: "Sky write-up rows" });
  const map = page.getByRole("region", { name: "Sky placement composition map" });
  await expect(list).toContainText("Saturn in Aries");
  await expect(list).toContainText("Mars in Taurus");
  await filters.getByLabel("Sky placement planet or point").selectOption("saturn");
  await expect(map).toHaveCount(0);
  await expect(list).toContainText("Saturn in Aries");
  await expect(list).not.toContainText("Mars in Taurus");
  await filters.getByLabel("Sky placement zodiac sign").selectOption("aries");
  await filters.getByLabel("Sky write-up motion").selectOption("direct");
  await expect(map.getByRole("heading", { level: 3, name: "Saturn in Aries", exact: true })).toBeVisible();
  await expect(map.getByLabel("Composition planet or point", { exact: true })).toHaveCount(0);
  await expect(map.getByLabel("Composition zodiac sign", { exact: true })).toHaveCount(0);
  await filters.getByRole("searchbox", { name: "Search Sky write-ups" }).fill("no-matching-fixture");
  await expect(list).toContainText("No Sky write-ups match “no-matching-fixture”");
  await filters.locator("summary").filter({ hasText: "More filters" }).click();
  await filters.getByLabel("Sky write-up type", { exact: true }).selectOption("point");
  await filters.getByLabel("Sky write-up reader use", { exact: true }).selectOption("calendar");
  await filters.getByLabel("Sort Sky write-ups", { exact: true }).selectOption("title-desc");
  await filters.getByRole("button", { name: "Clear filters", exact: true }).click();
  for (const label of [...placementControls, "Sky write-up type", "Sky write-up reader use"]) await expect(filters.getByLabel(label, { exact: true })).toHaveValue("all");
  await expect(filters.getByLabel("Sort Sky write-ups", { exact: true })).toHaveValue("updated-desc");
  await expect(filters.getByRole("searchbox", { name: "Search Sky write-ups" })).toHaveValue("");
  await expect(map).toHaveCount(0);
  await expect(list).toContainText("Saturn in Aries");
  await expect(list).toContainText("Mars in Taurus");
  await expect(filters.getByRole("button", { name: "Clear filters", exact: true })).toBeDisabled();

  await page.goto(housePath);
  await page.getByLabel("House Transit zodiac sign").selectOption("taurus");
  await expect(page).toHaveURL(/sign=taurus/);
  await expect(page.getByRole("region", { name: "House Transits source finder" }).getByRole("heading", { level: 3, name: "Sun in Taurus through your 1st house", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Effective House Transit reader preview" })).toContainText("Source passage required");

  await page.goto(personalPath);
  const personal = page.getByRole("region", { name: "Personal Transits source finder" });
  for (const [label, value] of personalControls.map((label, index) => [label, ["saturn", "square", "moon", "aries", "1", "4"][index]])) {
    await personal.getByLabel(label, { exact: true }).selectOption(value);
  }
  await expect(personal.getByRole("heading", { level: 3, name: "Saturn square your Moon", exact: true })).toBeVisible();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const query = new URLSearchParams(new URL(page.url()).hash.split("?")[1]);
  expect(Object.fromEntries(query)).toMatchObject({ view: "transits-to-natal", transit: "saturn", sign: "aries", transitHouse: "1", aspect: "square", natal: "moon", natalHouse: "4" });
});

test("Natal Aspects opens the passage the finder is showing", async ({ page }) => {
  await isolate(page);
  const key = (aspect: string) => `fallback-hook/natal-aspect-lived/sun/${aspect}/moon`;
  await page.goto("/admin/content#exact-content?category=Natal+Aspects&first=sun&aspect=square&second=moon");
  const finder = page.getByRole("region", { name: "Find natal aspect source writing" });
  const passages = finder.getByRole("region", { name: "Matching natal aspect passages" });
  await expect(passages.getByRole("heading", { level: 4, name: "Sun Square Moon", exact: true })).toBeVisible();
  await expect(passages.getByText(key("square"), { exact: true })).toBeVisible();
  await expect(passages.getByText(key("trine"), { exact: true })).toHaveCount(0);

  // Edit must open the passage on screen. Opening a neighbouring pairing instead is
  // the Sun in Virgo to Sun in Aries jump that made phrase editing unusable.
  await passages.getByRole("button", { name: "Edit source", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(key("square"));
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor).toHaveCount(0);

  // A changed aspect must replace the row rather than leave the previous pairing
  // on screen for the next click.
  await finder.getByLabel("Natal aspect type", { exact: true }).selectOption("trine");
  await expect(passages.getByRole("heading", { level: 4, name: "Sun Trine Moon", exact: true })).toBeVisible();
  await expect(passages.getByText(key("square"), { exact: true })).toHaveCount(0);
  await passages.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(key("trine"));
});

test("inventory loading reports progress in the sidebar without an overlay over the form", async ({ page }) => {
  await isolate(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/admin/generated-content-inventory?**", async route => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get("visibility") !== "all") return route.fulfill({ json: { ok: true, rows: fixtureRows, nextCursor: null } });
    if (!query.has("cursor")) return route.fulfill({ json: { ok: true, rows: fixtureRows.slice(0, 1), nextCursor: "next-fixture-page" } });
    await pending;
    await route.fulfill({ json: { ok: true, rows: fixtureRows.slice(1), nextCursor: null } });
  });
  try {
    await page.goto(housePath);
    const status = page.getByRole("region", { name: "Admin status" });
    await expect(page.getByRole("region", { name: "House Transit content loading" })).toContainText("Loading House Transit passages…");
    await expect(status).toContainText(/Loading|Loaded/i);
    await expect(page.locator(".admin-save-toast").filter({ hasText: /Loaded \d+.*content records/ })).toHaveCount(0);
    await page.getByLabel("House Transit zodiac sign").selectOption("taurus");
    await expect(page).toHaveURL(/sign=taurus/);
    release();
    await expect(status).toContainText("Connected");
    await expect(page.getByRole("region", { name: "House Transit content loading" })).toHaveCount(0);
    await expect(page.locator(".admin-save-toast").filter({ hasText: /Loaded \d+.*content records/ })).toHaveCount(0);
  } finally { release(); }
});

test("Natal Aspect filters sit in a canvas card and transit finders stay flat in the tab panel", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/admin/content#exact-content?category=Natal+Aspects");
  const filters = page.getByRole("region", { name: "Natal aspect filters" });
  await expect(filters).toBeVisible();
  await expect(filters).toHaveClass(/studio-surface/);
  const filterBackground = await filters.evaluate(element => getComputedStyle(element).backgroundColor);
  const canvasBackground = await page.locator("main.admin-dashboard").evaluate(element => getComputedStyle(element).backgroundColor);
  expect(filterBackground).not.toEqual(canvasBackground);

  await page.goto(housePath);
  const house = page.getByRole("region", { name: "House Transits source finder" });
  await expect(house.getByRole("heading", { level: 3, name: "Sun in Aries through your 1st house", exact: true })).toBeVisible();
  expect(await house.locator(".admin-natal-placement-finder-heading").evaluate(element => Boolean(element.closest(".studio-surface")))).toBe(false);
  expect(await house.locator(".admin-natal-placement-selectors").evaluate(element => Boolean(element.closest(".studio-surface")))).toBe(false);
});

test("Daily Sky Summary keeps nested disclosures flat in the tab panel", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/admin/content#sky-writeups?view=daily-summary");
  await expect(page.locator(".admin-dashboard-header h1")).toHaveText("Sky Write-ups");
  const studio = page.getByRole("region", { name: "Daily Sky Summary editor" });
  await expect(studio.getByRole("heading", { level: 3, name: "Daily Sky Summary", exact: true })).toBeVisible();
  const assembly = studio.getByRole("region", { name: "Full summary assembly" });
  await expect(assembly).toBeVisible();
  expect(await assembly.evaluate(element => element.classList.contains("studio-surface"))).toBe(false);
  expect(await assembly.evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  const writing = studio.locator("details").filter({ has: page.locator("summary", { hasText: "Writing system" }) });
  await expect(writing).toBeVisible();
  expect(await writing.evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
});

test("Natal Chart keeps the page header and flattens empty-house sources in the tab panel", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/admin/content#exact-content?category=Natal+Chart");
  const header = page.locator(".admin-dashboard-header h1");
  await expect(header).toHaveText("Natal Chart Write-ups");
  await page.getByRole("tab", { name: "Empty houses", exact: true }).click();
  const workspace = page.getByRole("region", { name: "Empty house writing" });
  await expect(workspace.getByRole("heading", { level: 3, name: "Choose the house, cusp sign, and where its ruler lands", exact: true })).toBeVisible();
  await expect(header).toBeVisible();
  expect(await header.evaluate(element => getComputedStyle(element).overflowWrap)).toBe("normal");
  const preview = workspace.getByRole("region", { name: /Full empty-house assembly/ });
  await expect(preview).toBeVisible();
  expect(await preview.evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await expect(workspace.getByRole("heading", { level: 3, name: "Edit the assembly sources", exact: true })).toBeVisible();
});

test("open mobile navigation keeps the brand mark free of page titles", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/content#exact-content?category=Natal+Aspects");
  const mark = page.locator(".admin-brand-mark");
  await expect(mark).toHaveText("TLDR");
  const toggle = page.getByRole("button", { name: "Open Content Studio navigation" });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toContainText("Write-ups");
  const markBox = await mark.boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(markBox && toggleBox).toBeTruthy();
  expect(toggleBox!.x).toBeGreaterThan(markBox!.x + markBox!.width);
  await toggle.click();
  await expect(page.getByRole("button", { name: "Hide Content Studio navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Natal Aspects" })).toBeVisible();
  await expect(mark).toHaveText("TLDR");
});

test("sidebar can switch green chrome without replacing light and dark", async ({ page }) => {
  await isolate(page);
  await page.goto(catalogPath);
  const dashboard = page.locator("main.admin-dashboard");
  await expect(dashboard).toHaveAttribute("data-studio-palette", "neutral");
  await expect(dashboard).toHaveAttribute("data-studio-theme", "light");
  const canvasBefore = await dashboard.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Switch to green chrome", exact: true }).click();
  await expect(dashboard).toHaveAttribute("data-studio-palette", "green");
  await expect(dashboard).toHaveAttribute("data-studio-theme", "light");
  expect(await dashboard.evaluate(element => getComputedStyle(element).backgroundColor)).not.toEqual(canvasBefore);
  await expect(page.getByRole("button", { name: "Switch to black and white chrome", exact: true })).toBeVisible();
});

