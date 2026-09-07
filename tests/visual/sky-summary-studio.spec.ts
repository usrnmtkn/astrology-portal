import { expect, test, type Page } from "@playwright/test";

async function mockStudio(page: Page, stored: any[]) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "summary-test-only"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    let data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
    if (url.pathname.endsWith("/generated-content")) {
      if (["POST", "PATCH"].includes(route.request().method())) {
        const input = route.request().postDataJSON();
        const row = { id: input.id || "summary-test-row", content_key: input.contentKey, surface: input.surface, mode: input.mode,
          status: input.status, headline: input.headline, summary: input.summary, body: input.body,
          lane: input.lane, review_state: input.reviewState, block_type: input.blockType, prompt_version: input.promptVersion,
          source_snapshot: input.sourceSnapshot, sections: input.sections, facts: input.facts, updated_at: new Date().toISOString() };
        stored.splice(0, stored.length, row);
        data.rows = [row];
      } else {
        const key = url.searchParams.get("contentKey");
        data.rows = [...stored, { id: "daily-heading-fixture", content_key: "fallback-hook/daily-headline/test-studio-heading", surface: "you", mode: "card", status: "DRAFT", lane: "serving", block_type: "fallback_hook", headline: "Heading style fixture", body: "Browser fixture.", source_snapshot: {}, sections: {}, facts: {} }].filter(row => !key || row.content_key === key);
      }
    }
    await route.fulfill({ status: 200, json: data });
  });
}
for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`summary studio navigation, populated and empty fields ${width} ${theme}`, async ({ page }) => {
      await mockStudio(page, []);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/#sky-writeups?view=daily-summary");
      await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
      const studio = page.getByRole("region", { name: "Daily Sky Summary editor" });
      const heading = studio.getByRole("heading", { name: "Daily Sky Summary", level: 3 });
      await expect(heading).toBeVisible();
      const typeStyle = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "marginTop", "marginBottom", "textTransform", "textAlign"].map(key => [key, style[key as any]]));
      };
      const summaryHeadingStyle = await heading.evaluate(typeStyle);
      await page.goto("/#fallback-hooks?section=daily");
      const analogousHeading = page.getByRole("heading", { name: "Edit the complete write-up", exact: true });
      await expect(analogousHeading).toBeVisible();
      expect(summaryHeadingStyle).toEqual(await analogousHeading.evaluate(typeStyle));
      await page.goto("/#sky-writeups?view=daily-summary");
      await expect(page.locator(".admin-main h1, .admin-main h2, .admin-main h3")).toHaveText(["Sky Write-ups", "Placements, lunations, and transits", "Daily Sky Summary"]);
      const nav = page.getByLabel("Sky Write-ups sections");
      await expect(nav.locator("button")).toHaveText(["Daily Sky Summary", "Transit to Natal Charts", "House Transits"]);
      await expect(nav.getByRole("button", { name: "Daily Sky Summary", includeHidden: true })).toHaveAttribute("aria-current", "page");
      await expect(studio.getByRole("article", { name: "Sun in Virgo", exact: true })).toContainText("turning our attention to the daily rituals and systems we rely on and showing us which support us and which have become too rigid, demanding, or punishing");
      await expect(studio.getByRole("article", { name: "Sun in Aries", exact: true })).toContainText("putting more emphasis on starting");
      const map = studio.getByRole("region", { name: "Sun and Moon composition map" });
      const preview = map.getByLabel("Combined Sun and Moon preview");
      await expect(map.getByRole("heading", { name: "Sun and Moon together", level: 4 })).toBeVisible();
      expect(await map.getByRole("heading", { name: "Sun and Moon together" }).evaluate(typeStyle)).toEqual(summaryHeadingStyle);
      const sourceLink = map.getByRole("link", { name: "Edit Sun in Virgo summary", exact: true });
      expect(await sourceLink.evaluate(el => getComputedStyle(el).display)).toBe("inline");
      await page.evaluate(() => document.fonts.ready);
      const previewWidth = await preview.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      // Chromium can round the ink extent of cloned inline highlights one pixel beyond clientWidth.
      expect(previewWidth.scroll, JSON.stringify(previewWidth)).toBeLessThanOrEqual(previewWidth.client + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await expect(preview).toHaveText("The Sun is in Virgo, turning our attention to the daily rituals and systems we rely on and showing us which support us and which have become too rigid, demanding, or punishing, while the Moon moves through Cancer, making home, care, and who checked in matter more than usual.");
      await map.getByLabel("Composition Moon sign").selectOption("Leo");
      await expect(preview).toContainText("punishing, while the Moon moves through Leo, making appreciation land harder");
      await map.getByLabel("Composition Sun sign").selectOption("Aries");
      await expect(preview).toContainText("The Sun is in Aries, putting more emphasis on starting");
      await expect(preview).toContainText("while the Moon moves through Leo, making appreciation land harder");
      await map.getByLabel("Composition copy view").selectOption("reader");
      await expect(preview).toHaveText("The Sun is in Aries, while the Moon moves through Leo.");
      await page.screenshot({ path: `test-results/sky-composition-empty-${width}-${theme}.png`, fullPage: true });
      await map.getByLabel("Composition copy view").selectOption("working");
      await map.getByLabel("Composition Sun sign").selectOption("Virgo");
      await map.getByLabel("Composition Moon sign").selectOption("Cancer");
      await studio.getByLabel("Search summary wording").fill("Virgo");
      await expect(studio.getByRole("article")).toHaveCount(2);
      await page.screenshot({ path: `test-results/sky-studio-${width}-${theme}.png`, fullPage: true });
      await studio.getByLabel("Search summary wording").fill("unmatched-search");
      await expect(studio.getByText("No summary fields match this search.")).toBeVisible();
      await studio.getByLabel("Search summary wording").fill("");
      await studio.getByLabel("Summary section").selectOption("Timing and retrogrades");
      await expect(studio.getByRole("article")).toHaveCount(7);
    });
  }
}

test("edit, save, reload, publish, and hydrate the summary reader", async ({ page, context }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const field = page.getByRole("article", { name: "Next New Moon, Full Moon, or eclipse", exact: true });
  await field.getByRole("button", { name: "Edit wording" }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue("The next {name} arrives in {sign} {countdown}.");
  const edited = "The next {name} arrives {countdown} in {sign}.";
  await body.fill(edited);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  await page.reload();
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(body).toHaveValue(edited);
  await body.fill("The next {name} arrives.");
  await expect(page.getByRole("button", { name: "Publish to app", exact: true })).toBeDisabled();
  await body.fill(edited);
  const reader = await context.newPage();
  await reader.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
  await reader.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: {
    schema: "content-studio-last-known-good-v1", rowCount: stored.length, rows: stored
  } }));
  await reader.goto("http://127.0.0.1:4294/#sky");
  const summary = reader.getByLabel("Daily sky summary");
  await expect(summary).toContainText("The next New Moon arrives in Virgo in 3 days.");
  await page.getByRole("button", { name: "Publish to app", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("LIVE");
  await reader.reload();
  await expect(summary).toContainText("The next New Moon arrives in 3 days in Virgo.");
  await expect(summary.getByRole("link", { name: "New Moon", exact: true })).toHaveText("New Moon");
  await expect(summary.locator("mark.content-highlight").filter({ hasText: "void of course" })).toContainText("void of course");
  await expect(summary).toContainText("Saturn, Neptune, Pluto, and Chiron");
  await page.reload();
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(body).toHaveValue(edited);
  await body.fill("The next {name} arrives in {sign} {countdown}.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  await reader.reload();
  await expect(summary).toContainText("The next New Moon arrives in Virgo in 3 days.");
});


test("composition follows open drafts and keeps reader copy separate", async ({ page }) => {
  const sun = { key: "cms/sky-daily-summary/sun/virgo", label: "Sun in Virgo" };
  const stored = [{ id: "sun-draft", content_key: sun.key, body: "Browser-only draft wording", headline: sun.label, surface: "sky", mode: "card", status: "DRAFT", lane: "serving", review_state: "EDITORIAL_REVIEW_REQUIRED", block_type: "essay", source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", allowedSlots: [] }, sections: {}, facts: {} }];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const map = page.getByRole("region", { name: "Sun and Moon composition map" });
  const preview = map.getByLabel("Combined Sun and Moon preview");
  await expect(preview).toContainText("Browser-only draft wording");
  await map.getByLabel("Composition copy view").selectOption("reader");
  await expect(preview).toContainText("turning our attention to the daily rituals and systems we rely on and showing us which support us and which have become too rigid, demanding, or punishing");
  await expect(preview).not.toContainText("Browser-only draft wording");
  await map.getByLabel("Composition copy view").selectOption("working");
  await map.getByRole("link", { name: "Edit Sun in Virgo summary", exact: true }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue("Browser-only draft wording");
  await body.fill("Updated browser-only draft wording");
  await expect(preview).toContainText("Updated browser-only draft wording");
  await map.getByLabel("Composition copy view").selectOption("reader");
  await expect(preview).not.toContainText("Updated browser-only draft wording");
  expect(stored[0].body).toBe("Browser-only draft wording");
});


test("supplied wording opens intact as an editable unsaved draft", async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const field = page.getByRole("article", { name: "Moon in Cancer", exact: true });
  await expect(field).toContainText("Supplied working copy");
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(page.getByRole("textbox", { name: "Summary wording", exact: true })).toHaveValue("making home, care, and who checked in matter more than usual");
  expect(stored).toHaveLength(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  expect(stored[0].source_snapshot.suppliedCopy.sourceAttachment).toBe("9509f3ee-68a1-4888-b9fa-c7cff47de573/pasted-text.txt");
  await page.reload();
  await expect(field).toContainText("Saved draft");
});
