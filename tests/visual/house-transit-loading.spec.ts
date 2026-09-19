import { expect, test, type Page } from "@playwright/test";

const housePath = "/admin/content#sky-writeups?view=house-transits&motion=direct&transit=sun&sign=aries&transitHouse=1";
const intro = "First complete fixture paragraph.\n\nSecond complete fixture paragraph.";
const sign = "The complete sign-specific fixture passage.";
const rows = [
  { id: "house-intro", content_key: "authored/transit-house-intro/sun/1", body: intro },
  { id: "house-sign", content_key: "authored/transit-house-sign/sun/1/aries", body: sign }
].map(row => ({ ...row, headline: "House Transit fixture", surface: "sky", mode: "article", status: "DRAFT", lane: "reference", sections: {}, facts: {}, source_snapshot: {}, updated_at: "2026-09-14T00:00:00Z" }));
const unrelated = { ...rows[0], id: "unrelated", content_key: "fixture/unrelated" };

async function mock(page: Page) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "house-loading-fixture"));
  await page.route("**/api/**", route => route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } }));
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`House Transit waits for all pages and uses Studio surfaces ${width} ${theme}`, async ({ page }) => {
    await mock(page);
    await page.setViewportSize({ width, height: 1100 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/admin/generated-content-inventory?**", async route => {
      const query = new URL(route.request().url()).searchParams;
      if (query.get("visibility") !== "all") return route.fulfill({ json: { ok: true, rows: [unrelated], nextCursor: null } });
      if (!query.has("cursor")) return route.fulfill({ json: { ok: true, rows: [rows[0]], nextCursor: "second" } });
      await pending;
      await route.fulfill({ json: { ok: true, rows: [rows[1]], nextCursor: null } });
    });
    await page.goto(housePath);
    const finder = page.getByRole("region", { name: "House Transits source finder" });
    await expect(finder.getByText("Loading House Transit passages…", { exact: true })).toBeVisible();
    await expect(finder).not.toContainText(/Source passage required|Missing:|No saved passage|Source row unavailable|incomplete/);
    // A selection change while the final page is pending must not report missing sources.
    await page.getByLabel("House Transit zodiac sign").selectOption("taurus");
    await expect(finder).not.toContainText("Source passage required");
    await page.getByLabel("House Transit zodiac sign").selectOption("aries");
    release();
    const preview = finder.getByRole("region", { name: "Effective House Transit reader preview" });
    await expect(preview.getByText("Complete composition", { exact: true })).toBeVisible();
    await expect(preview.locator("blockquote")).toHaveText(`${intro}\n\n${sign}`);
    await expect(finder.getByText("Loading House Transit passages…", { exact: true })).toHaveCount(0);
    // The tab panel carries the surface, and passage rows inside it are flat and
    // divided rather than nested cards. Asserting a bordered card per row made this
    // spec fail on every viewport after that treatment shipped.
    const panel = page.locator('.studio-tab-panel[role="tabpanel"]').filter({ has: finder });
    const surface = await panel.evaluate(el => {
      const s = getComputedStyle(el);
      return { padding: parseFloat(s.paddingLeft), background: s.backgroundColor };
    });
    expect(surface.padding).toBeGreaterThan(0);
    expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");

    const cards = finder.locator(".admin-natal-source-card");
    expect(await cards.count()).toBeGreaterThan(1);
    let dividedRows = 0;
    for (const card of await cards.all()) {
      const metrics = await card.evaluate(el => {
        const s = getComputedStyle(el), q = el.querySelector("blockquote")!, qs = getComputedStyle(q);
        const p = document.querySelector('.admin-natal-placement-finder-heading p:not(.admin-eyebrow)')!, ps = getComputedStyle(p);
        return { inlinePadding: parseFloat(s.paddingLeft), blockPadding: parseFloat(s.paddingTop), radius: parseFloat(s.borderRadius),
          background: s.backgroundColor, followsRow: Boolean(el.previousElementSibling?.classList.contains("admin-natal-source-card")),
          divider: parseFloat(s.borderTopWidth),
          margin: qs.margin, whiteSpace: qs.whiteSpace, typography: [qs.fontFamily, qs.fontSize, qs.fontWeight, qs.lineHeight, qs.letterSpacing],
          bodyTypography: [ps.fontFamily, ps.fontSize, ps.fontWeight, ps.lineHeight, ps.letterSpacing], overflow: el.scrollWidth - el.clientWidth };
      });
      expect(metrics.inlinePadding).toBe(0);
      expect(metrics.radius).toBe(0);
      expect(metrics.background).toBe("rgba(0, 0, 0, 0)");
      expect(metrics.blockPadding).toBeGreaterThan(0);
      if (metrics.followsRow) {
        expect(metrics.divider).toBeGreaterThan(0);
        dividedRows += 1;
      }
      expect(metrics.margin).toBe("0px");
      expect(metrics.whiteSpace).toBe("pre-wrap");
      expect(metrics.typography).toEqual(metrics.bodyTypography);
      expect(metrics.overflow).toBeLessThanOrEqual(1);
    }
    // Without a divided pair the flat treatment would pass on an unseparated list.
    expect(dividedRows).toBeGreaterThan(0);
    await expect(preview.getByRole("heading", { level: 3 })).toHaveText("What you see");
    await expect(preview.getByRole("heading", { level: 4 })).toHaveText("Sun in Aries through your 1st house");
    expect(await preview.evaluate(el => Boolean(el.compareDocumentPosition(el.nextElementSibling!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await preview.screenshot({ path: `test-results/house-transit-preview-${width}-${theme}.png` });
    await finder.locator(".admin-natal-source-grid").first().screenshot({ path: `test-results/house-transit-passages-${width}-${theme}.png` });
  });
}

test("House Transit failed inventory offers retry, then distinguishes confirmed missing copy", async ({ page }) => {
  await mock(page);
  let fail = true;
  await page.route("**/api/admin/generated-content-inventory?**", route => {
    const extended = new URL(route.request().url()).searchParams.get("visibility") === "all";
    return extended && fail ? route.fulfill({ status: 503, json: { error: "Fixture inventory unavailable" } })
      : route.fulfill({ json: { ok: true, rows: [unrelated], nextCursor: null } });
  });
  await page.goto(housePath);
  const finder = page.getByRole("region", { name: "House Transits source finder" });
  await expect(finder.getByRole("alert")).toContainText("Fixture inventory unavailable");
  await expect(finder).not.toContainText(/Source passage required|Missing:|No saved passage/);
  fail = false;
  await finder.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(finder.getByText("Source passage required", { exact: true })).toBeVisible();
  await expect(finder).toContainText("Missing: Sun through the 1st house, Sun in Aries through the 1st house");
  await expect(finder.getByRole("alert")).toHaveCount(0);
});
