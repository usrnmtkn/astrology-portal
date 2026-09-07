import { expect, test, type Page } from "@playwright/test";
import { builtinContentRecords, contentLiveStatuses } from "../../api/_lib/content-live-status";

async function mockStudio(page: Page, stored: any[]) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "summary-test-only"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    let data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
    if (url.pathname.endsWith("/content-live-status")) {
      const ids = route.request().postDataJSON().ids ?? [];
      data.statuses = contentLiveStatuses(ids.map((id: string) => stored.find(row => row.id === id) ?? builtinContentRecords.get(id.replace(/^builtin:/, ""))).filter(Boolean), stored);
    }
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
      await expect(studio.getByRole("article", { name: "Sun in Virgo", exact: true })).toContainText("turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing");
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
      await expect(preview).toHaveText("The Sun in Virgo turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing, while the Moon in Cancer brings more attention to home, family, and whether the care we give is coming back to us.");
      await map.getByLabel("Composition Moon sign").selectOption("Leo");
      await expect(preview).toContainText("punishing, while the Moon moves through Leo.");
      await map.getByLabel("Composition Sun sign").selectOption("Aries");
      await expect(preview).toContainText("The Sun is in Aries, while the Moon moves through Leo.");
      await expect(map.getByLabel("Composition copy view")).toHaveCount(0);
      await expect(preview).toHaveText("The Sun is in Aries, while the Moon moves through Leo.");
      await page.screenshot({ path: `test-results/sky-composition-empty-${width}-${theme}.png`, fullPage: true });
      await map.getByLabel("Composition Sun sign").selectOption("Virgo");
      await map.getByLabel("Composition Moon sign").selectOption("Cancer");
      await studio.getByLabel("Search summary wording").fill("Virgo");
      await expect(studio.getByRole("article")).toHaveCount(2);
      await page.screenshot({ path: `test-results/sky-studio-${width}-${theme}.png`, fullPage: true });
      await studio.getByLabel("Search summary wording").fill("unmatched-search");
      await expect(studio.getByText("No summary fields match this search.")).toBeVisible();
      await studio.getByLabel("Search summary wording").fill("");
      await studio.getByLabel("Summary section").selectOption("Timing and retrogrades");
      await expect(studio.getByRole("article")).toHaveCount(5);
      await expect(studio.getByRole("article", { name: "Full Moon explanation", exact: true })).toHaveCount(0);
      await expect(studio.getByRole("article", { name: "No retrograde planets", exact: true })).toHaveCount(0);
      await studio.getByLabel("Summary section").selectOption("Ingress TLDRs");
      await expect(studio.getByRole("article")).toHaveCount(1);
      await expect(studio.getByRole("article")).toContainText("No ingress TLDR added here.");
      await studio.getByLabel("Ingress planet or point").selectOption("North Node");
      await expect(studio.getByRole("article")).toHaveAttribute("aria-label", "North Node enters Libra");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }
}

test("missing ingress TLDR saves and reloads as a separate draft", async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  await page.getByLabel("Summary section").selectOption("Ingress TLDRs");
  await page.getByRole("article", { name: "Mercury enters Libra", exact: true }).getByRole("button", { name: "Edit wording" }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue("");
  await body.fill("Separate short wording for browser verification.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  expect(stored[0].content_key).toBe("cms/sky-daily-summary/ingress/mercury/libra");
  await page.reload();
  await page.getByLabel("Summary section").selectOption("Ingress TLDRs");
  await expect(page.getByRole("article", { name: "Mercury enters Libra", exact: true })).toContainText("Separate short wording for browser verification.");
});

test("ingress lookup finds a published TLDR outside the loaded inventory and preserves the article", async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  const source = { id: "existing-ingress", content_key: "sky.ingress.mercury.libra", surface: "sky", mode: "card", status: "LIVE", lane: "serving", review_state: null,
    headline: "Mercury enters Libra", summary: "Existing short wording remains intact.", body: "The complete article remains separate and intact.", block_type: "essay", source_snapshot: {}, sections: {}, facts: {} };
  await page.route("**/api/admin/generated-content?**", async route => {
    if (new URL(route.request().url()).searchParams.get("contentKey") === source.content_key) {
      await route.fulfill({ json: { ok: true, rows: [source] } });
    } else await route.fallback();
  });
  await page.goto("/#sky-writeups?view=daily-summary");
  await page.getByLabel("Summary section").selectOption("Ingress TLDRs");
  await page.getByRole("article", { name: "Mercury enters Libra", exact: true }).getByRole("button", { name: "Edit wording" }).click();
  await expect(page.getByRole("textbox", { name: "TL;DR / summary", exact: true })).toHaveValue(source.summary);
  expect(await page.locator("textarea").evaluateAll(elements => elements.map(element => element.value))).toContain(source.body);
  expect(stored).toEqual([]);
});

test("edit, save, reload, publish, and hydrate the summary reader", async ({ page, context }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const field = page.getByRole("article", { name: "Next New Moon, Full Moon, or eclipse", exact: true });
  await field.getByRole("button", { name: "Edit wording" }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue("The next {name} in {sign} is {countdown}.");
  const edited = "The next {name} in {sign} happens {countdown}.";
  await body.fill(edited);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  await page.reload();
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(body).toHaveValue(edited);
  await body.fill("The next {name} arrives.");
  await expect(page.getByRole("button", { name: "Save & publish", exact: true })).toBeDisabled();
  await body.fill(edited);
  const reader = await context.newPage();
  await reader.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
  await reader.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: {
    schema: "content-studio-last-known-good-v1", rowCount: stored.length, rows: stored
  } }));
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-07", events: [] }] } } }));
  await reader.goto("http://127.0.0.1:4294/#sky");
  const summary = reader.getByLabel("Daily sky summary");
  await expect(summary).toContainText("The next New Moon in Virgo is in 3 days.");
  const sunLink = summary.getByRole("link", { name: "Read about Sun in Virgo", exact: true });
  const moonLink = summary.getByRole("link", { name: "Read about Moon in Cancer", exact: true });
  await expect(sunLink).toHaveText("Sun in Virgo at 15°");
  await expect(moonLink).toHaveText("Moon in Cancer at 29°");
  await expect(sunLink).toHaveAttribute("href", /sky\/placement\/sun\/virgo/);
  await expect(moonLink).toHaveAttribute("href", /sky\/placement\/moon\/cancer/);
  await page.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("LIVE");
  await reader.reload();
  await expect(summary).toContainText("The next New Moon in Virgo happens in 3 days.");
  await expect(summary.getByRole("link", { name: "New Moon in Virgo", exact: true })).toHaveText("New Moon in Virgo");
  await expect(summary.locator("mark.content-highlight").filter({ hasText: "void of course" })).toContainText("void of course");
  await expect(summary).toContainText("Saturn Rx in Aries at 13°");
  await page.reload();
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(body).toHaveValue(edited);
  await body.fill("The next {name} in {sign} is {countdown}.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  await reader.reload();
  await expect(summary).toContainText("The next New Moon in Virgo is in 3 days.");
});


test("composition shows only published copy while editing drafts", async ({ page }) => {
  const sun = { key: "cms/sky-daily-summary/sun/virgo", label: "Sun in Virgo" };
  const stored = [{ id: "sun-draft", content_key: sun.key, body: "Browser-only draft wording", headline: sun.label, surface: "sky", mode: "card", status: "DRAFT", lane: "serving", review_state: "EDITORIAL_REVIEW_REQUIRED", block_type: "essay", source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", allowedSlots: [] }, sections: {}, facts: {} }];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const map = page.getByRole("region", { name: "Sun and Moon composition map" });
  const preview = map.getByLabel("Combined Sun and Moon preview");
  await expect(map.getByLabel("Composition copy view")).toHaveCount(0);
  await expect(preview).toContainText("turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing");
  await expect(preview).not.toContainText("Browser-only draft wording");
  await map.getByRole("link", { name: "Edit Sun in Virgo summary", exact: true }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue("Browser-only draft wording");
  await body.fill("Updated browser-only draft wording");
  await expect(map.getByLabel("Composition copy view")).toHaveCount(0);
  await expect(preview).not.toContainText("Updated browser-only draft wording");
  expect(stored[0].body).toBe("Browser-only draft wording");
});


test("supplied wording opens intact as an editable unsaved draft", async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const field = page.getByRole("article", { name: "Moon in Leo", exact: true });
  await expect(field).toContainText("Not live");
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(page.getByRole("textbox", { name: "Summary wording", exact: true })).toHaveValue("making appreciation land harder and being overlooked harder to shrug off");
  expect(stored).toHaveLength(0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  expect(stored[0].source_snapshot.suppliedCopy.sourceAttachment).toBe("9509f3ee-68a1-4888-b9fa-c7cff47de573/pasted-text.txt");
  await page.reload();
  await expect(field).toContainText("Not live");
});

test('live bundled summary stays Live when opened, then publishes twice without another approval', async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto('/#sky-writeups?view=daily-summary');
  const field = page.getByRole('article', { name: 'Sun in Virgo', exact: true });
  await expect(field.getByText('Live', { exact: true })).toBeVisible();
  const map = page.getByRole('region', { name: 'Sun and Moon composition map' });
  await map.getByRole('button', { name: 'Edit Sun source', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Generated content editor' });
  await expect(editor.getByRole('heading', { name: 'Edit Sun in Virgo', exact: true })).toBeVisible();
  const status = editor.getByLabel('Reader status', { exact: true });
  await expect(status).toHaveText('Live');
  const body = editor.getByRole('textbox', { name: 'Summary wording', exact: true });
  const baseline = await body.inputValue();
  await expect(map.getByLabel('Combined Sun and Moon preview')).toContainText(baseline);
  await body.fill('QA first published summary');
  await expect(status).toHaveText('Not live');
  await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe('LIVE');
  await expect(status).toHaveText('Live');
  await body.fill('QA second published summary');
  await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
  await expect.poll(() => stored[0]?.body).toBe('QA second published summary');
  await expect(status).toHaveText('Live');
  expect(stored).toHaveLength(1);
  await page.reload();
  await field.getByRole('button', { name: 'Edit wording', exact: true }).click();
  await expect(body).toHaveValue('QA second published summary');
  await expect(status).toHaveText('Live');
  await body.fill('QA unpublished revision');
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe('DRAFT');
  await expect(status).toHaveText('Not live');
});

test('Daily Sky retirement and an unavailable publication never reveal older bundled copy', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-07T16:00:00Z'));
  const key = 'cms/sky-daily-summary/sun/virgo';
  const publication = { content_key: key, state: 'retired', revision: 1, row_id: 'missing-summary', row_updated_at: '2026-09-07T15:00:00Z', updated_at: '2026-09-07T15:00:00Z' };
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v1', rowCount: 0, rows: [], publications: [publication]
  } }));
  await page.goto('http://127.0.0.1:4294/#sky');
  const summary = page.getByLabel('Daily sky summary');
  await expect(summary).toContainText('The Sun is in Virgo');
  await expect(summary).not.toContainText('turns our attention to the daily rituals');
  publication.state = 'live'; publication.revision = 2;
  await page.reload();
  await expect(summary).toContainText('The Sun is in Virgo');
  await expect(summary).not.toContainText('turns our attention to the daily rituals');
});

test("reader composes selected-day events with a dedicated ingress TLDR", async ({ context }) => {
  const reader = await context.newPage();
  await reader.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
  const event = { id: "mercury-libra", type: "ingress", planet: "Mercury", toSign: "Libra", sign: "Libra", title: "Mercury enters Libra", dateKey: "2026-09-07", startsAt: "2026-09-07T20:00:00Z", longitude: 180 };
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [
    { dateKey: "2026-09-07", events: [event, { id: "aspect-a", type: "aspect", planets: ["Saturn", "Lilith"], aspect: "square", startsAt: event.startsAt, dateKey: event.dateKey }, { id: "aspect-b", type: "aspect", planets: ["Mercury", "Neptune"], aspect: "opposition", startsAt: event.startsAt, dateKey: event.dateKey }] },
    { dateKey: "2026-09-08", events: [{ ...event, id: "other-day", planet: "Venus" }] }
  ] } } }));
  const row = { id: "ingress-tldr", content_key: "cms/sky-daily-summary/ingress/mercury/libra", surface: "sky", mode: "card", status: "LIVE", lane: "serving", review_state: null, body: "Complete supplied short wording for this fixture.", headline: "Mercury enters Libra", source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", allowedSlots: [] } };
  await reader.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: { schema: "content-studio-last-known-good-v1", rowCount: 1, rows: [row] } }));
  await reader.goto("http://127.0.0.1:4294/#sky");
  const summary = reader.getByLabel("Daily sky summary");
  await expect(summary).toContainText("Today’s exact aspects are Saturn squares Lilith and Mercury opposes Neptune.");
  await expect(summary).toContainText("Mercury enters Libra today. Complete supplied short wording for this fixture.");
  await expect(summary).not.toContainText("Venus enters");
  await expect(summary.getByRole("link", { name: "Saturn squares Lilith", exact: true })).toHaveAttribute("href", `#sky/aspect/saturn/square/lilith/at/${encodeURIComponent(event.startsAt)}`);
  await summary.getByRole("link", { name: "Mercury enters Libra", exact: true }).click();
  await expect(reader).toHaveURL(/#sky\/placement\/mercury\/libra/);
});
