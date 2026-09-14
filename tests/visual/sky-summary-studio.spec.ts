import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { builtinContentRecords, contentLiveStatuses } from "../../api/_lib/content-live-status";

const readerBaseURL = `http://127.0.0.1:${process.env.SKY_READER_TEST_PORT ?? "4294"}`;

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
    test(`summary studio navigation, populated summary fields ${width} ${theme}`, async ({ page }) => {
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
      const systemDetails = studio.getByLabel("Daily Sky summary system details", { exact: true });
      await systemDetails.getByText("Writing system & versions", { exact: true }).click();
      await expect(systemDetails).toContainText("Daily summary assembly");
      await expect(systemDetails).toContainText("Moon source variants · V6");
      await expect(systemDetails).toContainText("35 supplied passages and 25 empty entries");
      await expect(systemDetails).toContainText("empty entries do not reuse the older V5 copy");
      await expect(systemDetails.locator("strong")).toHaveText(["Daily summary assembly", "Summary templates and wording", "Moon source variants · V6", "Moon writing proposal · V5"]);
      expect(await systemDetails.locator("p").first().evaluate(typeStyle)).toEqual(await studio.locator(".admin-template-reader-copy p").first().evaluate(typeStyle));
      expect(await systemDetails.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await systemDetails.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/sky-summary-system-${width}-${theme}.png` });
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
      await expect(studio.getByRole("article", { name: "Sun in Aries", exact: true })).toContainText("puts more emphasis on starting");
      const map = studio.getByRole("region", { name: "Sun and Moon composition map" });
      const preview = map.getByLabel("Combined Sun and Moon preview");
      await expect(map.getByRole("heading", { name: "Sun and Moon together", level: 4 })).toBeVisible();
      expect(await map.getByRole("heading", { name: "Sun and Moon together" }).evaluate(typeStyle)).toEqual(summaryHeadingStyle);
      const assemblyHeading = studio.getByRole("heading", { name: "Full summary template", level: 4 });
      expect(await assemblyHeading.evaluate(typeStyle)).toEqual(summaryHeadingStyle);
      await expect(studio.locator("h4")).toHaveText(["Full summary template", "Sun and Moon together"]);
      await studio.getByRole("region", { name: "Full summary assembly", exact: true }).screenshot({ path: `test-results/assembly-${width}-${theme}.png` });
      const sourceLink = map.getByRole("link", { name: "Edit Sun in Virgo summary", exact: true });
      expect(await sourceLink.evaluate(el => getComputedStyle(el).display)).toBe("inline");
      await page.evaluate(() => document.fonts.ready);
      const previewWidth = await preview.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      // Chromium can round the ink extent of cloned inline highlights one pixel beyond clientWidth.
      expect(previewWidth.scroll, JSON.stringify(previewWidth)).toBeLessThanOrEqual(previewWidth.client + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await expect(preview).toHaveText("The Sun in Virgo turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing. The Moon in Cancer pulls us home to the places, people, and memories that nurture us.");
      await map.getByLabel("Composition Moon sign").selectOption("Leo");
      await expect(preview).toContainText("punishing. The Moon in Leo helps us access that inner fire more easily.");
      await map.getByLabel("Composition Sun sign").selectOption("Aries");
      await expect(preview).toContainText("The Sun in Aries puts more emphasis on starting, acting, and finding out what works by doing it. The Moon in Leo helps us access that inner fire more easily.");
      await expect(map.getByLabel("Composition copy view")).toHaveCount(0);
      await expect(preview).toHaveText("The Sun in Aries puts more emphasis on starting, acting, and finding out what works by doing it. The Moon in Leo helps us access that inner fire more easily.");
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
    const params = new URL(route.request().url()).searchParams;
    if (params.get("contentKey") === source.content_key || params.get("id") === source.id) {
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
  await reader.goto(`${readerBaseURL}/#sky`);
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
  await expect(field).toContainText("helps us access that inner fire more easily");
  await field.getByRole("button", { name: "Edit wording" }).click();
  await expect(page.getByRole("textbox", { name: "Summary wording", exact: true })).toHaveValue("helps us access that inner fire more easily");
  expect(stored).toHaveLength(0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  expect(stored[0].source_snapshot.moonSource.body).toBe("helps us access that inner fire more easily");
  await page.reload();
  await expect(field).toContainText("helps us access that inner fire more easily");
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
  await expect(status).toHaveText('Draft');
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
  await expect(status).toHaveText('Inactive');
});

test('Daily Sky retirement and an unavailable publication never reveal older bundled copy', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-07T16:00:00Z'));
  // Keep this publication fixture independent of the preview server's absent
  // Calendar API and the unrelated worker calculation fallback it triggers.
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: '2026-09-07', events: [] }] } } }));
  const key = 'cms/sky-daily-summary/sun/virgo';
  const publication = { content_key: key, state: 'retired', revision: 1, row_id: 'missing-summary', row_updated_at: '2026-09-07T15:00:00Z', updated_at: '2026-09-07T15:00:00Z' };
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v1', rowCount: 0, rows: [], publications: [publication]
  } }));
  await page.goto(`${readerBaseURL}/#sky`);
  const summary = page.getByLabel('Daily sky summary');
  await expect(summary).toContainText('The Sun is in Virgo');
  await expect(summary).not.toContainText('turns our attention to the daily rituals');
  publication.state = 'live'; publication.revision = 2;
  await page.reload();
  await expect(summary).toContainText('The daily summary could not load.');
  await expect(summary.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
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
  await reader.goto(`${readerBaseURL}/#sky`);
  const summary = reader.getByLabel("Daily sky summary");
  await expect(summary).toContainText("Saturn squares Lilith and Mercury opposes Neptune are exact today.");
  await expect(summary).toContainText("Mercury enters Libra today. Complete supplied short wording for this fixture.");
  await expect(summary).not.toContainText("Venus enters");
  await expect(summary.getByRole("link", { name: "Saturn squares Lilith", exact: true })).toHaveAttribute("href", `#sky/aspect/saturn/square/lilith/at/${encodeURIComponent(event.startsAt)}`);
  await summary.getByRole("link", { name: "Mercury enters Libra", exact: true }).click();
  await expect(reader).toHaveURL(/#sky\/placement\/mercury\/libra/);
});


test("full template controls preview order, publish, and reload", async ({ page, context }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const assembly = page.getByRole("region", { name: "Full summary assembly", exact: true });
  await assembly.getByText("Preview event examples", { exact: true }).click();
  await assembly.getByLabel("Exact aspect examples").fill("Saturn squares Lilith");
  await assembly.getByLabel("Station examples", { exact: true }).fill("Mercury stations retrograde in Scorpio");
  await assembly.getByLabel("Ingress examples", { exact: true }).fill("Venus enters Scorpio");
  await assembly.getByLabel("Lunation example", { exact: true }).selectOption("today");
  const preview = assembly.getByLabel("Full summary preview", { exact: true });
  await expect(preview.locator("p")).toHaveCount(3);
  await expect(preview).toContainText("Venus enters Scorpio today. Mercury stations retrograde in Scorpio today.");
  await expect(preview).toContainText("New Moon in Virgo calls us to clear the clutter");
  await assembly.getByText("Paragraphs and event order", { exact: true }).click();
  await assembly.getByRole("button", { name: "Move Stations earlier", exact: true }).click();
  await expect(preview).toContainText("Mercury stations retrograde in Scorpio today. Venus enters Scorpio today.");
  const layout = "{openingSentence}\n\n{stationsSentence}\n\n{lunationSentence}";
  await assembly.getByLabel("Assembly layout", { exact: true }).fill(layout);
  await expect(preview).not.toContainText("Saturn squares");
  await assembly.getByRole("button", { name: "Edit and publish full template", exact: true }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue(layout);
  await page.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("LIVE");
  expect(stored[0].body).toBe(layout);
  await page.reload();
  await assembly.getByText("Paragraphs and event order", { exact: true }).click();
  await expect(assembly.getByLabel("Assembly layout", { exact: true })).toHaveValue(layout);
  // Reopening an existing row with a local edit must not replace it with the saved body.
  const revised = "{openingSentence}\n\n{lunationSentence}";
  await assembly.getByLabel("Assembly layout", { exact: true }).fill(revised);
  await assembly.getByRole("button", { name: "Edit and publish full template", exact: true }).click();
  await expect(body).toHaveValue(revised);
  const reader = await context.newPage();
  await reader.clock.setFixedTime(new Date("2026-09-11T02:00:00Z"));
  await reader.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" })));
  await reader.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: { schema: "content-studio-last-known-good-v1", rowCount: stored.length, rows: stored } }));
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-10", events: [
    { id: "station", type: "station", phase: "station-retrograde", direction: "retrograde", planet: "Mercury", sign: "Scorpio", startsAt: "2026-09-11T03:27:00.999Z", dateKey: "2026-09-10" },
    { id: "ongoing", type: "station", phase: "retrograde-passage", direction: "retrograde", planet: "Saturn", sign: "Aries", startsAt: "2026-09-11T00:00:00Z", dateKey: "2026-09-10" },
    { id: "moon", type: "lunation", title: "New Moon", sign: "Virgo", startsAt: "2026-09-11T03:27:00.999Z", dateKey: "2026-09-10" }
  ] }] } } }));
  await reader.goto(`${readerBaseURL}/?date=2026-09-10#sky`);
  const summary = reader.getByLabel("Daily sky summary", { exact: true });
  await expect(summary).toContainText("Mercury stations retrograde in Scorpio today.");
  await expect(summary).not.toContainText("Saturn stations");
  await expect(summary).toContainText("New Moon in Virgo at 18° calls us to clear the clutter");
  await expect(summary).not.toContainText("The next New Moon");
  await expect(summary.getByRole("link", { name: "Mercury stations retrograde in Scorpio" })).toHaveAttribute("href", "#sky/placement/mercury/scorpio");
});

test("inline connecting words preserve variables, publish and reach the reader", async ({ page, context }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const map = page.getByRole("region", { name: "Sun and Moon composition map" });
  const preview = map.getByLabel("Combined Sun and Moon preview");
  await map.getByRole("textbox", { name: "Opening connecting words 1", exact: true }).fill("Today, the ");
  await map.getByRole("textbox", { name: "Opening connecting words 2", exact: true }).fill(" moving through ");
  await expect(preview).toContainText("Today, the Sun moving through Virgo turns our attention");
  await expect(preview.locator('[contenteditable="plaintext-only"]')).toHaveCount(9);
  await expect(preview.getByRole("link", { name: "Edit Sun in Virgo summary" })).toHaveAttribute("href", /sun%2Fvirgo/);
  await expect(preview.getByRole("link").locator('[contenteditable]')).toHaveCount(0);
  await map.getByRole("button", { name: "Review and save wording" }).click();
  const body = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(body).toHaveValue(/^Today, the \{sunName\} moving through \{sunSign\}\{sunDegree\}/);
  await page.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect.poll(() => stored[0]?.status).toBe("LIVE");
  await page.reload();
  await expect(preview).toContainText("Today, the Sun moving through Virgo turns our attention");
  const reader = await context.newPage();
  await reader.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-07", events: [] }] } } }));
  await reader.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: { schema: "content-studio-last-known-good-v1", rowCount: stored.length, rows: stored } }));
  await reader.goto(`${readerBaseURL}/#sky`);
  const summary = reader.getByLabel("Daily sky summary", { exact: true });
  await expect(summary).toContainText("Today, the Sun moving through Virgo at 15° turns our attention");
  await expect(summary).toContainText("the places, people, and memories that nurture us.");
  await expect(summary.locator('a[href="#sky/placement/sun/virgo"]')).toHaveText("Sun moving through Virgo at 15°");
});

test("V6 Moon event sources stay separate and missing copy stays blank", async ({ page, context }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const map = page.getByRole("region", { name: "Sun and Moon composition map" });
  await map.getByLabel("Composition Moon sign").selectOption("Virgo");
  await map.getByLabel("Composition Moon event").selectOption("newMoon");
  const preview = map.getByLabel("Combined Sun and Moon preview");
  await expect(preview).toContainText("New Moon in Virgo calls us to clear the clutter, refine our routines, and prioritize the details that nourish our well-being");
  await expect(preview.getByRole("link", { name: "Edit New Moon in Virgo summary" })).toHaveAttribute("href", /moon%2Fvirgo%2FnewMoon/);
  await map.getByLabel("Composition Moon event").selectOption("fullMoon");
  await expect(map.getByLabel("Composition sources")).toContainText("NEEDS OWNER COPY");
  await expect(preview).toContainText("The Full Moon is in Pisces.");
  await map.getByRole("button", { name: "Edit Moon source" }).click();
  await expect(page.getByRole("textbox", { name: "Summary wording", exact: true })).toHaveValue("");
  expect(stored).toHaveLength(0);
  const reader = await context.newPage();
  await reader.clock.setFixedTime(new Date("2026-09-11T02:00:00Z"));
  await reader.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" })));
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-10", events: [
    { id: "ordinary", type: "lunation", title: "New Moon", sign: "Virgo", longitude: 165, startsAt: "2026-09-11T03:27:00.999Z", dateKey: "2026-09-10" },
    { id: "eclipse", type: "lunation", title: "New Moon", eclipseType: "solar", sign: "Virgo", longitude: 165, startsAt: "2026-09-11T03:27:00.999Z", dateKey: "2026-09-10" }
  ] }] } } }));
  const calendarResponse = reader.waitForResponse(response => response.url().includes("/api/calendar?") && response.status() === 200);
  await reader.goto(`${readerBaseURL}/?date=2026-09-10#sky`);
  await calendarResponse;
  const summary = reader.getByLabel("Daily sky summary", { exact: true });
  // Calendar loading is followed by an exact-event ephemeris worker calculation.
  await expect(summary).toContainText("Solar Eclipse in Virgo at 18° reminds us that striving for perfection can hinder growth", { timeout: 30_000 });
  await expect(summary).not.toContainText("Moon in Cancer");
  await expect(summary).not.toContainText("New Moon in Virgo");
  await expect(summary.getByRole("link", { name: "Solar Eclipse in Virgo at 18°" })).toHaveAttribute("href", "#sky/lunation/2026-09-11/virgo");
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`source bank review and event geometry ${width} ${theme}`, async ({ page }) => {
    const stored: any[] = [];
    await mockStudio(page, stored);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#sky-writeups?view=daily-summary");
    await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
    const studio = page.getByRole("region", { name: "Daily Sky Summary editor" });
    const map = studio.getByRole("region", { name: "Sun and Moon composition map" });
    await map.getByLabel("Composition Moon event").selectOption("newMoon");
    await expect(map.getByLabel("Composition Moon sign")).toHaveValue("Virgo");
    await map.getByLabel("Composition Moon sign").selectOption("Aries");
    await expect(map.getByLabel("Composition Sun sign")).toHaveValue("Aries");
    await map.getByLabel("Composition Moon event").selectOption("lunarEclipse");
    await expect(map.getByLabel("Composition Moon sign")).toHaveValue("Libra");
    await map.getByLabel("Composition Sun sign").selectOption("Gemini");
    await expect(map.getByLabel("Composition Moon sign")).toHaveValue("Sagittarius");
    await map.getByLabel("Composition Moon event").selectOption("regular");
    await map.getByLabel("Composition Moon sign").selectOption("Cancer");
    await expect(map.getByLabel("Composition Sun sign")).toHaveValue("Gemini");
    const virgo = studio.getByRole("article", { name: "Sun in Virgo", exact: true });
    await expect(virgo.getByText("Review supplied wording", { exact: true })).toHaveCount(0);
    const aries = studio.getByRole("article", { name: "Sun in Aries", exact: true });
    await aries.getByText("Review supplied wording", { exact: true }).click();
    await expect(aries).toContainText("acts as a cosmic reset button that ignites our personal and collective fire");
    await expect(aries).toContainText("puts more emphasis on starting");
    await aries.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/sky-bank-${width}-${theme}.png` });
    await aries.getByRole("button", { name: "Open supplied wording", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Summary wording", exact: true })).toHaveValue("acts as a cosmic reset button that ignites our personal and collective fire");
    expect(stored).toHaveLength(0);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => stored[0]?.status).toBe("DRAFT");
    expect(stored[0].content_key).toBe("cms/sky-daily-summary/sun/aries");
    expect(stored[0].source_snapshot.suppliedBank.sourceKey).toBe("ms/sky-summary/sun/aries");
    expect(stored[0].source_snapshot.suppliedBank.promotionAuthorized).toBe(false);
    await page.reload();
    await expect(aries).toContainText("acts as a cosmic reset button");
  });
}

for (const asset of ["skySummarySourceBank", "skyMoonSummarySources"]) {
test(`${asset} loading can retry without blocking current summary editing`, async ({ page }) => {
  await mockStudio(page, []);
  let attempts = 0;
  await page.route(`**/${asset}-*.json`, async route => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.continue();
  });
  await page.goto("/#sky-writeups?view=daily-summary");
  await expect(page.getByRole("alert").filter({ hasText: "Supplied summary wording could not load" })).toBeVisible();
  const aries = page.getByRole("article", { name: "Sun in Aries", exact: true });
  await expect(aries).toContainText("puts more emphasis on starting");
  await page.getByRole("button", { name: "Retry supplied wording" }).click();
  await expect(aries.getByText("Review supplied wording", { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  await expect(page.getByText(/Source status: OWNER PHRASE/).first()).toBeVisible();
});
}

test("reader omits an impossible calendar lunation without losing the current sky", async ({ context }) => {
  const reader = await context.newPage();
  await bundledPublications(reader);
  await reader.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
  await reader.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" })));
  const warnings: string[] = [];
  reader.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-07", events: [
    { id: "impossible", type: "lunation", title: "New Moon", sign: "Virgo", startsAt: "2026-09-07T10:00:00Z", dateKey: "2026-09-07" }
  ] }] } } }));
  const calendarResponse = reader.waitForResponse(response => response.url().includes("/api/calendar?") && response.status() === 200);
  await reader.goto(`${readerBaseURL}/?date=2026-09-07#sky`);
  // The rejection can only occur after the synthetic calendar data arrives.
  await calendarResponse;
  await expect.poll(() => warnings.some(message => message.includes("IMPOSSIBLE_SKY")), { timeout: 30_000 }).toBe(true);
  const summary = reader.getByLabel("Daily sky summary");
  await expect(summary).toContainText("Sun in Virgo");
  await expect(summary).toContainText("Moon in Cancer");
  await expect(summary).not.toContainText("New Moon");
  await expect(summary.getByRole("link", { name: /New Moon/ })).toHaveCount(0);
});

test("event grammar preview links an occurred station to its Rx count", async ({ page }) => {
  await mockStudio(page, []);
  await page.goto("/#sky-writeups?view=daily-summary");
  const assembly = page.getByLabel("Full summary assembly", { exact: true });
  await assembly.getByText("Preview event examples", { exact: true }).click();
  await assembly.getByLabel("Retrograde planet examples").fill("Saturn; Uranus; Neptune; Pluto; Chiron; Lilith");
  await assembly.getByLabel("Station examples", { exact: true }).fill("Uranus stations retrograde in Gemini");
  await assembly.getByLabel("Ingress examples", { exact: true }).fill("Venus enters Scorpio; Mercury enters Libra");
  await assembly.getByLabel("Exact aspect examples").fill("Moon squares Uranus; Sun trines Lilith Rx; Moon trines Lilith Rx");
  const preview = assembly.getByLabel("Full summary preview", { exact: true });
  await expect(preview.locator("p")).toHaveCount(3);
  await expect(preview.locator("p").nth(1)).toHaveText("Two planets change signs today: Venus enters Scorpio and Mercury enters Libra. Uranus stations retrograde in Gemini today, bringing the number of retrograde planets to six: Saturn Rx, Uranus Rx, Neptune Rx, Pluto Rx, Chiron Rx, and Lilith Rx.");
  await expect(preview.locator("p").nth(2)).toHaveText("Three aspects are exact today: Moon squares Uranus, Sun trines Lilith Rx, and Moon trines Lilith Rx.");
  await assembly.getByLabel("Station has occurred in this example").uncheck();
  await expect(preview.locator("p")).toHaveCount(4);
  await expect(preview).not.toContainText("bringing the number");
  await expect(preview.locator("p").last()).toContainText("Six planets are retrograde right now:");
  await assembly.getByLabel("Exact aspect examples").fill("Moon squares Uranus; Sun trines Lilith Rx");
  await expect(preview).toContainText("Moon squares Uranus and Sun trines Lilith Rx are exact today.");
});

for (const width of [390, 1440]) test(`owner event-first summary reaches reader ${width}`, async ({ context }) => {
  const revision = JSON.parse(readFileSync(new URL("../../docs/content-review/sky-summary-owner-revision-2026-09-11.json", import.meta.url), "utf8"));
  const reader = await context.newPage();
  await reader.setViewportSize({ width, height: 1000 });
  await reader.clock.setFixedTime(new Date("2026-09-11T02:00:00Z"));
  await reader.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" })));
  const rows = [{ id: "owner-new-moon", content_key: revision.contentKey, body: revision.body, status: "LIVE", lane: "serving", surface: "sky", mode: "feed", block_type: "essay", prompt_version: "cms-surface-template-v1", source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override" } }];
  await reader.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: { schema: "content-studio-last-known-good-v1", rowCount: rows.length, rows } }));
  const events = [
    { id: "station", type: "station", phase: "station-retrograde", direction: "retrograde", planet: "Uranus", sign: "Gemini", startsAt: "2026-09-10T12:00:00Z", dateKey: "2026-09-10" },
    { id: "venus", type: "ingress", planet: "Venus", sign: "Scorpio", startsAt: "2026-09-10T08:00:00Z", dateKey: "2026-09-10" },
    { id: "mercury", type: "ingress", planet: "Mercury", sign: "Libra", startsAt: "2026-09-10T10:00:00Z", dateKey: "2026-09-10" },
    { id: "aspect", type: "aspect", planets: ["Moon", "Uranus"], aspect: "square", startsAt: "2026-09-10T05:21:35.999Z", dateKey: "2026-09-10" },
    { id: "moon", type: "lunation", title: "New Moon", sign: "Virgo", startsAt: "2026-09-11T03:27:00.999Z", dateKey: "2026-09-10" }
  ];
  await reader.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: "2026-09-10", events }] } } }));
  await reader.goto(`${readerBaseURL}/?date=2026-09-10#sky`);
  const summary = reader.getByLabel("Daily sky summary", { exact: true });
  await expect(summary).toContainText(revision.body);
  await expect(summary.locator(":scope > p")).toHaveCount(3);
  await expect(summary.locator(":scope > p").first()).toContainText(`punishing. The New Moon in Virgo at 18° ${revision.body}.`);
  await expect(summary.locator(":scope > p").nth(1)).toContainText("Two planets change signs today: Venus enters Scorpio and Mercury enters Libra.");
  await expect(summary.locator(":scope > p").nth(1)).toContainText("Uranus stations retrograde in Gemini today, bringing the number of retrograde planets to six:");
  await expect(summary.locator(":scope > p").last()).toHaveText("Moon squares Uranus is exact today.");
  await expect(summary.getByRole("link", { name: "New Moon in Virgo at 18°", exact: true })).toHaveAttribute("href", "#sky/lunation/2026-09-11/virgo");
  await expect(summary).not.toContainText(/Also today|There are|Today brings/u);
  await summary.screenshot({ path: `test-results/sky-owner-event-summary-${width}.png` });
});
