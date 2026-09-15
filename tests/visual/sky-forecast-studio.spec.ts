import { expect, test, type Page } from "@playwright/test";
import { skyForecastTemplates } from "../../apps/admin/src/skyForecastTemplates";

const weekly = skyForecastTemplates["weekly-sky"];
const weeklyBody = "{{weekRange}}\n\n{{weeklyOverview}}\n\nOwner’s complete template ending: {{weeklyIntegration}}";
const weeklyNotes = "Editor-only weekly writing instructions. Keep this exact saved guidance.";
function fixtureRows() {
  return [{
    id: "weekly-template-fixture", content_key: weekly.contentKey, surface: "sky", mode: "feed", status: "DRAFT",
    headline: weekly.headline, summary: weeklyNotes, body: weeklyBody, lane: "reference", review_state: "EDITORIAL_REVIEW_REQUIRED",
    block_type: "fallback_template", source_snapshot: { contentType: "template", content_role: "template", contentSystem: "fallback" },
    sections: null, facts: null, updated_at: "2026-09-14T12:00:00.000Z"
  }];
}
async function studioApi(page: Page, rows = fixtureRows()) {
  const writes: any[] = [];
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "sky-forecast-fixture"));
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    let data: any = { ok: true, rows: [], statuses: [], records: [], nextCursor: null };
    if (url.pathname.endsWith("/generated-content")) {
      if (["POST", "PATCH"].includes(route.request().method())) {
        const input = route.request().postDataJSON();
        writes.push(input);
        const saved = { ...rows.find(row => row.id === input.id), id: input.id ?? "monthly-template-fixture", content_key: input.contentKey,
          headline: input.headline, summary: input.summary, body: input.body, status: input.status, lane: input.lane,
          review_state: input.reviewState, surface: input.surface, mode: input.mode, block_type: input.blockType,
          source_snapshot: input.sourceSnapshot, sections: input.sections, facts: input.facts, updated_at: new Date().toISOString() };
        rows.splice(0, rows.length, ...rows.filter(row => row.id !== saved.id), saved);
        data.rows = [saved];
      } else {
        const key = url.searchParams.get("contentKey");
        const keys = url.searchParams.getAll("contentKeys");
        const id = url.searchParams.get("id");
        data.rows = rows.filter(row => (!key || row.content_key === key) && (!keys.length || keys.includes(row.content_key)) && (!id || row.id === id));
      }
    }
    await route.fulfill({ json: data });
  });
  return writes;
}
const headingStyle = (element: Element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "marginTop", "marginBottom", "textTransform", "textAlign"].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
};

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Calendar forecast sections and saved template ${width} ${theme}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const writes = await studioApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    await page.goto("/admin/content#sky-writeups?view=daily-summary");
    const skyTabs = page.getByRole("tablist", { name: "Sky Write-ups workspaces" });
    await expect(skyTabs.getByRole("tab")).toHaveText(["Daily Sky Summary", "Placements & lunations", "Personal Transits", "House Transits"]);
    await expect(skyTabs.getByRole("tab", { name: "Daily Sky Summary", exact: true })).toHaveAttribute("aria-selected", "true");
    const summaryStyle = await page.getByRole("heading", { name: "Daily Sky Summary", exact: true }).evaluate(headingStyle);
    const nav = page.getByRole("navigation", { name: "Content operations" });
    await expect(page.getByLabel("Sky Write-ups sections").getByRole("button", { includeHidden: true })).toHaveText(["Daily Sky Summary", "Transit to Natal Charts", "House Transits"]);
    if (width === 390) await page.getByRole("button", { name: "Open Content Studio navigation" }).click();
    await nav.getByRole("button", { name: "Calendar Write-ups", exact: true }).click();
    const tabs = page.getByRole("tablist", { name: "Calendar Write-ups workspaces" });
    await expect(tabs.getByRole("tab")).toHaveText(["Daily Sky", "Weekly Sky", "Monthly Sky"]);
    await expect(page.getByLabel("Calendar Write-ups sections").getByRole("button", { includeHidden: true })).toHaveText(["Daily Sky", "Weekly Sky", "Monthly Sky"]);
    await tabs.getByRole("tab", { name: "Weekly Sky", exact: true }).click();
    const heading = page.getByRole("heading", { name: "Weekly overview template", exact: true });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate(headingStyle)).toEqual(summaryStyle);
    await expect(page.locator(".admin-main h1, .admin-main h2, .admin-main h3")).toHaveText(["Calendar Write-ups", "Calendar writing workspaces", "Weekly overview template"]);
    const notification = page.getByRole("button", { name: "Dismiss notification", exact: true });
    if (await notification.isVisible()) await notification.click();
    await page.screenshot({ path: `test-results/sky-weekly-${width}-${theme}.png`, fullPage: true });
    await page.getByRole("button", { name: "Open weekly template" }).click();
    await expect(page.getByLabel("Template pattern", { exact: true })).toHaveValue(weeklyBody);
    await expect(page.getByLabel("Template purpose (optional)", { exact: true })).toHaveValue(weeklyNotes);
    await expect(page).toHaveURL(/calendar-writeups\?view=weekly-sky/);
    await page.getByLabel("Template purpose (optional)", { exact: true }).fill(`${weeklyNotes} Added editor note.`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].contentKey).toBe(weekly.contentKey);
    expect(writes[0].body).toBe(weeklyBody);
    expect(writes[0].summary).toBe(`${weeklyNotes} Added editor note.`);
    expect(writes[0].status).toBe("DRAFT");
    await page.reload();
    await page.getByRole("button", { name: "Open weekly template" }).click();
    await expect(page.getByLabel("Template pattern", { exact: true })).toHaveValue(weeklyBody);
    await page.getByRole("dialog", { name: "Generated content editor" }).getByRole("button", { name: "Close", exact: true }).click();
    await tabs.getByRole("tab", { name: "Monthly Sky", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Monthly overview template" })).toBeVisible();
    expect(await page.getByRole("heading", { name: "Monthly overview template" }).evaluate(headingStyle)).toEqual(summaryStyle);
    await expect(page.getByText("Open to find your saved template or start a draft.", { exact: false })).toBeVisible();
    if (await notification.isVisible()) await notification.click();
    await page.screenshot({ path: `test-results/sky-forecast-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Open monthly template" }).click();
    await expect(page.getByLabel("Template pattern", { exact: true })).toHaveValue(skyForecastTemplates["monthly-sky"].body);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1].blockType).toBe("fallback_template");
    expect(writes[1].lane).toBe("reference");
    await page.reload();
    await expect(page.getByText("Saved template · draft", { exact: true })).toBeVisible();
    if (await notification.isVisible()) await notification.click();
    await page.screenshot({ path: `test-results/sky-monthly-saved-${width}-${theme}.png`, fullPage: true });
    await page.goto("/admin/content#fallback-hooks?section=lunar-calendar&q=unmatched");
    await expect(page.locator(".admin-dashboard-header h1")).toHaveText("Calendar Write-ups");
    await expect(tabs.getByRole("tab", { name: "Daily Sky", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Search Lunar Calendar")).toHaveValue("unmatched");
    await expect(page.getByText("No lunar passages match these filters.")).toBeVisible();
    await page.getByRole("link", { name: "Edit Sun summary" }).click();
    await expect(page.getByRole("region", { name: "Daily Sky Summary editor", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("Calendar forecast source errors do not open an empty replacement", async ({ page }) => {
  await studioApi(page);
  await page.route("**/api/admin/generated-content?**contentKey=**", route => route.fulfill({ status: 503, json: { error: "Template source unavailable" } }));
  await page.goto("/admin/content#sky-writeups?view=weekly-sky");
  await page.getByRole("button", { name: "Open weekly template" }).click();
  await expect(page.getByText("Template source unavailable", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Template pattern", { exact: true })).toHaveCount(0);
});

test("Calendar forecast tabs leave Friends context and protect unsaved changes", async ({ page }) => {
  await studioApi(page);
  await page.goto("/admin/content#sky-writeups?view=transits-to-natal&audience=friends");
  const skyTabs = page.getByRole("tablist", { name: "Sky Write-ups workspaces" });
  await skyTabs.getByRole("tab", { name: "House Transits", exact: true }).click();
  await expect(page).toHaveURL(/view=house-transits&audience=friends/);
  await skyTabs.getByRole("tab", { name: "Personal Transits", exact: true }).click();
  await expect(page).toHaveURL(/view=transits-to-natal&audience=friends/);
  await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Calendar Write-ups", exact: true }).click();
  const tabs = page.getByRole("tablist", { name: "Calendar Write-ups workspaces" });
  await tabs.getByRole("tab", { name: "Weekly Sky", exact: true }).click();
  await expect(page).toHaveURL(/#calendar-writeups\?view=weekly-sky$/);
  await page.getByRole("button", { name: "Open weekly template" }).click();
  await page.getByLabel("Template pattern", { exact: true }).fill("{{unsavedTemplate}}");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("dialog", { name: "Generated content editor" }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(tabs.getByRole("tab", { name: "Weekly Sky", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Template pattern", { exact: true })).toHaveValue("{{unsavedTemplate}}");
});

for (const view of ["weekly-sky", "monthly-sky"]) test(`Calendar preserves the earlier ${view} link`, async ({ page }) => {
  await studioApi(page);
  await page.goto(`/admin/content#sky-writeups?view=${view}`);
  await expect(page.locator(".admin-dashboard-header h1")).toHaveText("Calendar Write-ups");
  await expect(page.getByRole("tab", { name: view === "weekly-sky" ? "Weekly Sky" : "Monthly Sky", exact: true })).toHaveAttribute("aria-selected", "true");
});
