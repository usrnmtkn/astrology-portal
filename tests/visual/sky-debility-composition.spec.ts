import { expect, test, type Page } from "@playwright/test";
import { builtinContentRecords, contentLiveStatuses } from "../../api/_lib/content-live-status";
import { linkedThreePlanetContext as approvedThreePlanetContext, linkedSingularSaturnContext as singularSaturnContext, highlightedCountStatement } from "../fixtures/sky-effort-count-first";

async function mockStudio(page: Page, stored: any[]) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "effort-test-only"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    let data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
    if (url.pathname.endsWith("/content-live-status")) {
      const ids = route.request().postDataJSON()?.ids ?? [];
      data.statuses = contentLiveStatuses(ids.map((id: string) => stored.find(row => row.id === id) ?? builtinContentRecords.get(id.replace(/^builtin:/, ""))).filter(Boolean), stored);
    }
    if (url.pathname.endsWith("/generated-content")) {
      if (["POST", "PATCH"].includes(route.request().method())) {
        const input = route.request().postDataJSON();
        const row = { id: input.id || `effort-${stored.length}`, content_key: input.contentKey, surface: input.surface, mode: input.mode,
          status: input.status, headline: input.headline, summary: input.summary, body: input.body,
          lane: input.lane, review_state: input.reviewState, block_type: input.blockType, prompt_version: input.promptVersion,
          source_snapshot: input.sourceSnapshot, sections: input.sections, facts: input.facts, updated_at: new Date().toISOString() };
        const index = stored.findIndex(value => value.content_key === row.content_key);
        if (index === -1) stored.push(row); else stored[index] = row;
        data.rows = [row];
      } else {
        const key = url.searchParams.get("contentKey"), id = url.searchParams.get("id");
        data.rows = stored.filter(row => (!key || row.content_key === key) && (!id || row.id === id));
      }
    }
    await route.fulfill({ status: 200, json: data });
  });
}
const style = (element: HTMLElement) => {
  const value = getComputedStyle(element);
  return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].map(key => [key, value[key as any]]));
};
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`complete template and clickable map ${width} ${theme}`, async ({ page }) => {
    const stored: any[] = [];
    await mockStudio(page, stored);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    await page.goto("/#sky-writeups?view=daily-summary");
    await expect(page.locator(".admin-dashboard")).toHaveAttribute("data-studio-theme", theme);
    const studio = page.getByTestId("sky-debility-studio");
    await expect(studio.getByRole("heading", { name: "Things may take more effort right now", level: 3 })).toBeVisible();
    const reading = studio.getByLabel("Complete effort summary", { exact: true });
    await expect(reading).toContainText("You may want reassurance but find it hard to ask for");
    await expect(reading.getByTestId("effort-paragraph-1")).toHaveText(approvedThreePlanetContext);
    await expect(reading.getByTestId("effort-count-statement")).toHaveText(highlightedCountStatement);
    await expect(reading.locator('a[href*="#sky/placement/"]')).toHaveCount(3);
    await expect(reading.getByTestId("effort-paragraph-1").getByRole("link")).toHaveText(["Venus in Scorpio", "Mars in Cancer", "Saturn Rx in Aries"]);
    await expect(reading.locator(":scope > p")).toHaveCount(3); // count + two paragraphs, no footer
    await expect(studio.getByRole("button", { name: "Review and save wording" }).first()).toBeHidden();
    const original = await reading.locator('[data-testid^="effort-paragraph-"]').allTextContents();
    const bodyStyle = await reading.getByTestId("effort-paragraph-0").evaluate(style);
    expect(await studio.getByRole("heading", { name: "Full card and composition map" }).evaluate(style))
      .toEqual(await page.getByRole("heading", { name: "Sun and Moon together", exact: true }).evaluate(style));
    await studio.screenshot({ path: `test-results/effort-reading-${width}-${theme}.png` });
    await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
    const mapped = studio.getByLabel("Mapped effort summary", { exact: true });
    expect(await mapped.locator('[data-testid^="effort-paragraph-"]').allTextContents()).toEqual(original);
    await expect(mapped.getByTestId("effort-count-statement")).toHaveText(highlightedCountStatement);
    await expect(mapped.locator('a[href*="#sky/placement/"]')).toHaveText(["Venus in Scorpio", "Mars in Cancer", "Saturn Rx in Aries"]);
    expect(await mapped.getByTestId("effort-paragraph-0").evaluate(style)).toEqual(bodyStyle);
    expect(await mapped.getByRole("link", { name: "Edit Venus in Scorpio: Lived experience", exact: true }).evaluate(el => getComputedStyle(el).display)).toBe("inline");
    await expect(mapped.locator('[data-source-kind="fact"]').filter({ hasText: /^Three$/ })).toBeVisible();
    await mapped.getByRole("link", { name: "Edit Venus in Scorpio: Lived experience", exact: true }).click();
    const editor = studio.getByTestId("sky-debility-selected-source");
    await expect(editor.getByRole("textbox")).toBeFocused();
    await expect(editor.getByRole("textbox")).toHaveValue("want reassurance but find it hard to ask for");
    await editor.getByRole("textbox").fill("need more time to answer");
    await expect(mapped).toContainText("You may need more time to answer");
    await expect(mapped.getByTestId("effort-paragraph-1")).toHaveText(approvedThreePlanetContext);
    await studio.getByRole("tab", { name: "Read-through", exact: true }).click();
    await expect(reading).toContainText("You may need more time to answer");
    await studio.getByRole("tab", { name: "Full template", exact: true }).click();
    const full = studio.getByTestId("sky-debility-full-template");
    await expect(full).toContainText("You may {livedExperienceList}. {situationList} can take more out of you than you expected.");
    await expect(full).toContainText("{countWord} out of the {totalWord} classical planets {countVerb} currently in detriment or fall: {planetList}.");
    await expect(full.getByTestId("effort-count-statement")).toHaveText("{countWord} out of the {totalWord} classical planets {countVerb} currently in detriment or fall");
    await expect(full).not.toContainText("Calculated planet-in-sign links");
    await expect(full).toContainText("{dignityExplanationSentence} With {planetReference} involved");
    await expect(full).toContainText("It may help to {responseList}.");
    await full.getByRole("link", { name: "Inspect countWord variable", exact: true }).click();
    const variable = studio.getByLabel("Selected template variable", { exact: true });
    await expect(variable).toContainText("Three");
    await expect(variable).toContainText("This value is calculated");
    await full.getByRole("link", { name: "Inspect planetList variable", exact: true }).click();
    await expect(variable).toContainText("Venus in Scorpio, Mars in Cancer, Saturn Rx in Aries");
    await full.getByRole("link", { name: "Inspect dignityExplanationSentence variable", exact: true }).click();
    await expect(variable).toContainText("Multiple-planet detriment or fall explanation");
    await expect(variable).toContainText("This means they are moving through signs that make it harder for them to do their usual work.");
    await full.getByRole("link", { name: "Inspect livedExperienceList variable", exact: true }).click();
    await expect(variable).toContainText("Venus in Scorpio: Lived experience");
    await expect(variable).toContainText("Mars in Cancer: Lived experience");
    await expect(variable).toContainText("Saturn in Aries: Lived experience");
    expect(stored).toEqual([]);
    expect(await studio.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await studio.screenshot({ path: `test-results/effort-template-${width}-${theme}.png` });
    await editor.getByRole("button", { name: "Discard wording changes" }).click();
    await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
    expect(await mapped.locator('[data-testid^="effort-paragraph-"]').allTextContents()).toEqual(original);
  });
}

test("one, four, and zero-planet branches use the same source map", async ({ page }) => {
  await mockStudio(page, []);
  await page.goto("/#sky-writeups?view=daily-summary");
  const studio = page.getByTestId("sky-debility-studio");
  await studio.getByText("Change preview placements", { exact: true }).click();
  await studio.getByLabel("Preview Venus placement").selectOption("");
  await studio.getByLabel("Preview Mars placement").selectOption("");
  await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
  const mapped = studio.getByLabel("Mapped effort summary", { exact: true });
  await expect(mapped.getByTestId("effort-paragraph-1")).toHaveText(singularSaturnContext);
  await expect(mapped.locator('a[href*="#sky/placement/"]')).toHaveText(["Saturn Rx in Aries"]);
  await expect(mapped.locator('[data-source-kind="fact"]').filter({ hasText: /^Aries$/ })).toBeVisible();
  const explanation = mapped.getByRole("button", { name: "Edit One-planet detriment or fall explanation", exact: true }).first();
  await explanation.focus();
  await explanation.press("Enter");
  const textbox = studio.getByTestId("sky-debility-selected-source").getByRole("textbox");
  await expect(textbox).toBeFocused();
  await expect(textbox).toHaveValue("This means it is moving through {signTitle}, a sign that makes it harder for it to do its usual work.");
  await studio.getByLabel("Preview Mercury placement").selectOption("Pisces");
  await studio.getByLabel("Preview Venus placement").selectOption("Scorpio");
  await studio.getByLabel("Preview Mars placement").selectOption("Cancer");
  await expect(mapped).toContainText("4 of 7 planets");
  await expect(mapped).toContainText("Four out of the seven classical planets are currently in detriment or fall: Mercury in Pisces, Venus in Scorpio, Mars in Cancer, Saturn Rx in Aries.");
  await expect(mapped.locator('a[href*="#sky/placement/"]')).toHaveCount(4);
  await expect(mapped.getByRole("link", { name: "Edit Saturn in Aries: Planetary function in human terms", exact: true })).toBeVisible();
  await expect(mapped.getByRole("link", { name: "Edit Saturn in Aries: Helpful response", exact: true })).toHaveCount(0);
  for (const planet of ["Mercury", "Venus", "Mars", "Saturn"]) await studio.getByLabel(`Preview ${planet} placement`).selectOption("");
  await expect(studio.getByTestId("sky-debility-preview")).toContainText("The reader card is hidden when no planets qualify");
  await studio.getByRole("tab", { name: "Full template", exact: true }).click();
  await expect(studio.getByTestId("sky-debility-full-template")).toContainText("{countWord}");
});

test("preview motion and sign changes update the same inline links without saving", async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const studio = page.getByTestId("sky-debility-studio");
  await studio.getByText("Change preview placements", { exact: true }).click();
  const placements = { Sun: "Aquarius", Moon: "Scorpio", Mercury: "Pisces", Venus: "Scorpio", Mars: "Cancer", Jupiter: "Capricorn", Saturn: "Aries" };
  for (const [planet, sign] of Object.entries(placements)) await studio.getByLabel(`Preview ${planet} placement`).selectOption(sign);
  for (const planet of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"]) await studio.getByLabel(`Preview ${planet} motion`).selectOption("retrograde");
  const reading = studio.getByLabel("Complete effort summary", { exact: true });
  await expect(reading.getByTestId("effort-count-statement")).toHaveText("Seven out of the seven classical planets are currently in detriment or fall");
  await expect(reading.locator('a[href*="#sky/placement/"]')).toHaveText(["Sun in Aquarius", "Moon in Scorpio", "Mercury Rx in Pisces", "Venus Rx in Scorpio", "Mars Rx in Cancer", "Jupiter Rx in Capricorn", "Saturn Rx in Aries"]);
  await studio.getByLabel("Preview Saturn motion").selectOption("direct");
  await expect(reading.getByRole("link", { name: "Read about Saturn in Aries", exact: true })).toHaveCount(1);
  await studio.getByLabel("Preview Saturn placement").selectOption("Leo");
  await expect(reading.locator('a[href="/#sky/placement/saturn/leo"]')).toHaveText("Saturn in Leo");
  await expect(reading.locator('a[href="/#sky/placement/saturn/aries"]')).toHaveCount(0);
  const before = await reading.getByTestId("effort-paragraph-1").textContent();
  await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
  await expect(studio.getByLabel("Mapped effort summary", { exact: true }).getByTestId("effort-paragraph-1")).toHaveText(before!);
  expect(stored).toEqual([]);
});

test("mapped source edits reach the existing draft, publish, and reload controls", async ({ page }) => {
  const stored: any[] = [];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const studio = page.getByTestId("sky-debility-studio");
  await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
  await studio.getByLabel("Mapped effort summary", { exact: true }).getByRole("link", { name: "Edit Venus in Scorpio: Lived experience", exact: true }).click();
  const selected = studio.getByTestId("sky-debility-selected-source");
  await selected.getByRole("textbox").fill("need more time to answer");
  await selected.getByRole("button", { name: "Review and save wording" }).click();
  const review = page.getByRole("textbox", { name: "Summary wording", exact: true });
  await expect(review).toHaveValue("need more time to answer");
  await review.fill("need more time to explain what would help");
  await page.getByRole("button", { name: /^Save draft(?: & return)?$/ }).click();
  await expect.poll(() => stored[0]?.status).toBe("DRAFT");
  expect(stored[0].content_key).toBe("cms/sky-debility/placement/venus/scorpio/livedExperienceClause");
  await page.reload();
  await expect(studio.getByLabel("Complete effort summary", { exact: true })).toContainText("need more time to explain what would help");
  await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
  await studio.getByLabel("Mapped effort summary", { exact: true }).getByRole("link", { name: "Edit Venus in Scorpio: Lived experience", exact: true }).click();
  await selected.getByRole("button", { name: "Review and save wording" }).click();
  await expect(review).toHaveValue("need more time to explain what would help");
  await page.getByRole("button", { name: /^Save (& publish|& return)$/ }).click();
  await expect.poll(() => stored[0]?.status).toBe("LIVE");
  await page.reload();
  await expect(studio.getByLabel("Complete effort summary", { exact: true })).toContainText("need more time to explain what would help");
});

test("new explanation field saves and reopens without changing older connector overrides", async ({ page }) => {
  const stored: any[] = [{ id: "legacy-connector", content_key: "cms/sky-debility/signConditionMany", body: "are now in signs that complicate", status: "LIVE", lane: "serving", review_state: null }];
  await mockStudio(page, stored);
  await page.goto("/#sky-writeups?view=daily-summary");
  const studio = page.getByTestId("sky-debility-studio");
  await expect(studio.getByTestId("effort-paragraph-1")).toHaveText(approvedThreePlanetContext);
  await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
  await studio.getByLabel("Mapped effort summary", { exact: true }).getByRole("button", { name: "Edit Multiple-planet detriment or fall explanation", exact: true }).click();
  const selected = studio.getByTestId("sky-debility-selected-source");
  await selected.getByRole("textbox").fill("This is the explanation saved in the browser test.");
  await selected.getByRole("button", { name: "Review and save wording" }).click();
  await page.getByRole("button", { name: /^Save draft(?: & return)?$/ }).click();
  await expect.poll(() => stored.find(row => row.content_key === "cms/sky-debility/dignityExplanationMany")?.status).toBe("DRAFT");
  await page.reload();
  await expect(studio.getByTestId("effort-paragraph-1")).toContainText("This is the explanation saved in the browser test.");
  expect(stored.find(row => row.id === "legacy-connector")?.body).toBe("are now in signs that complicate");
  await studio.getByRole("tab", { name: "Composition map", exact: true }).click();
  await studio.getByLabel("Mapped effort summary", { exact: true }).getByRole("button", { name: "Edit Multiple-planet detriment or fall explanation", exact: true }).click();
  await selected.getByRole("button", { name: "Review and save wording" }).click();
  await page.getByRole("button", { name: /^Save (& publish|& return)$/ }).click();
  await expect.poll(() => stored.find(row => row.content_key === "cms/sky-debility/dignityExplanationMany")?.status).toBe("LIVE");
  await page.reload();
  await expect(studio.getByTestId("effort-paragraph-1")).toContainText("This is the explanation saved in the browser test.");
});
