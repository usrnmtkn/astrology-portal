import { expect, test, type Page } from "@playwright/test";
import { builtinContentRecords, contentLiveStatuses } from "../../api/_lib/content-live-status";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";

async function mockStudio(page: Page, stored: any[]) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "effort-test-only"));
  await routeStudioInventoryApi(page, {
    call: async ({ method, body, url: requestUrl }) => {
      if (method === "rows") return stored;
      const url = new URL(requestUrl ?? "/api/admin/generated-content", "https://studio.invalid");
      const data: any = { ok: true, rows: [], nextCursor: null };
      if (["POST", "PATCH"].includes(method)) {
        const input = body as any;
        const row = { id: input.id || `effort-${stored.length}`, content_key: input.contentKey, surface: input.surface, mode: input.mode,
          status: input.status, headline: input.headline, summary: input.summary, body: input.body,
          lane: input.lane, review_state: input.reviewState, block_type: input.blockType, prompt_version: input.promptVersion,
          source_snapshot: input.sourceSnapshot, sections: input.sections, facts: input.facts, updated_at: new Date().toISOString() };
        const index = stored.findIndex(value => value.content_key === row.content_key);
        if (index === -1) stored.push(row); else stored[index] = row;
        data.rows = [row];
      } else {
        const key = url.searchParams.get("contentKey"), id = url.searchParams.get("id");
        const keys = url.searchParams.getAll("contentKeys");
        data.rows = stored.filter(row => (!key || row.content_key === key) && (!id || row.id === id) && (!keys.length || keys.includes(row.content_key)));
      }
      return { status: 200, payload: data };
    },
    answer: async (route, url) => {
      if (!url.pathname.endsWith("/content-live-status")) return false;
      const ids = route.request().postDataJSON()?.ids ?? [];
      const statuses = contentLiveStatuses(ids.map((id: string) => stored.find(row => row.id === id) ?? builtinContentRecords.get(id.replace(/^builtin:/, ""))).filter(Boolean), stored);
      await route.fulfill({ json: { ok: true, statuses } });
      return true;
    },
  });
}
const style = (element: HTMLElement) => {
  const value = getComputedStyle(element);
  return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].map(key => [key, value[key as any]]));
};

const reviewDraftPrefix = "cms/sky-debility/review-draft/";
function reviewDraftFixtures() {
  return ["Saturn retrograde in Aries", "Venus in Scorpio", "Mercury in Pisces", "Sun in Libra and Mars in Cancer",
    "Venus in Scorpio and Mars in Libra", "Sun in Libra, Venus in Scorpio, and Mars in Libra",
    "Sun in Aquarius, Mercury in Pisces, Venus in Aries, and Saturn retrograde in Aries"].map((headline, index) => ({
    id: `review-draft-${index + 1}`, content_key: `${reviewDraftPrefix}2026-10-26/0${index + 1}-fixture`,
    surface: "sky", mode: "feed", status: "DRAFT", lane: "reference", review_state: "owner-review-required",
    headline, body: `Complete fixture reading ${index + 1}.\n\nComplete fixture closing ${index + 1}.`,
    source_snapshot: { sampleOnly: true, editorialSample: true, ownerApproved: false, serving: false },
    updated_at: "2026-10-26T16:00:00.000Z"
  }));
}

for (const width of [390, 1024, 1440]) for (const theme of ["light", "dark"]) {
  test(`seven saved reference drafts open under detriment and fall ${width} ${theme}`, async ({ page }) => {
    const stored: any[] = reviewDraftFixtures();
    const initial = structuredClone(stored);
    const writes: any[] = [];
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:studio-theme", theme), theme);
    await mockStudio(page, stored);
    // Global inventory excludes references; the dedicated list must request them itself.
    await page.route("**/api/admin/generated-content-inventory?**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("contentKeyPrefix") === reviewDraftPrefix) {
        expect(url.searchParams.get("visibility")).toBe("all");
        expect(url.searchParams.get("status")).toBe("DRAFT");
        return route.fulfill({ json: { ok: true, rows: stored.map(row => ({ id: row.id, content_key: row.content_key,
          headline: row.headline, status: row.status, updated_at: row.updated_at, inventory_only: true })), nextCursor: null } });
      }
      if (!["id", "contentKey", "contentKeys"].some(key => url.searchParams.has(key))) {
        return route.fulfill({ json: { ok: true, rows: [], nextCursor: null } });
      }
      await route.fallback();
    });
    page.on("request", request => {
      if (["POST", "PATCH", "DELETE"].includes(request.method()) && request.url().includes("/api/admin/generated-content")) writes.push(request.postDataJSON());
    });
    await page.goto("/#sky-writeups");
    await page.getByRole("tab", { name: "Detriment and fall", exact: true }).click();
    await expect(page).toHaveURL(/view=detriment-fall/u);
    const studio = page.getByTestId("sky-debility-studio");
    const list = studio.getByTestId("sky-debility-review-drafts");
    await expect(list.locator("summary")).toHaveText("Saved review drafts · 7");
    await expect(list.getByRole("article")).toHaveCount(7);
    expect(await list.getByRole("article").evaluateAll(elements => elements.map(el => el.getAttribute("aria-label")))).toEqual(initial.map(row => row.headline));
    await expect(list.locator(".admin-status")).toHaveText(Array(7).fill("Draft"));
    expect(await studio.getByRole("heading").evaluateAll(elements => elements.map(el => el.tagName))).toEqual(["H3", "H4", "H4"]);
    expect(await list.locator("summary").evaluate(style)).toEqual(await studio.getByText("Complete interpretation for these placements", { exact: true }).evaluate(style));
    expect(await list.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await list.screenshot({ path: `test-results/dignity-review-drafts-${width}-${theme}.png` });
    const body = page.getByRole("textbox", { name: /^(Source text|Summary wording)$/ });
    for (const row of initial) {
      await list.getByRole("button", { name: `Review draft: ${row.headline}`, exact: true }).click();
      await expect(body).toHaveValue(row.body);
      if (row.id !== initial[6].id) await page.getByRole("button", { name: "Close", exact: true }).click();
    }
    expect(writes).toEqual([]);
    // Saving uses the same record and draft lane, without replacing another sample.
    await body.fill(`${initial[6].body}\n\nFixture review change.`);
    await page.getByRole("button", { name: /^Save draft(?: & return)?$/ }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ id: initial[6].id, status: "DRAFT", lane: "reference" });
    expect(stored).toHaveLength(7);
    expect(stored.slice(0, 6)).toEqual(initial.slice(0, 6));
    expect(stored[6].source_snapshot.sampleOnly).toBe(true);
    await page.reload();
    await expect(list.getByRole("article")).toHaveCount(7);
    await list.getByRole("button", { name: `Review draft: ${initial[6].headline}`, exact: true }).click();
    await expect(body).toHaveValue(`${initial[6].body}\n\nFixture review change.`);
    expect(stored.every(row => row.status === "DRAFT")).toBe(true);
  });
}

test("saved dignity draft list distinguishes loading, failed, empty and refreshed results", async ({ page }) => {
  const stored: any[] = reviewDraftFixtures();
  await mockStudio(page, stored);
  let attempt = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/admin/generated-content-inventory?**", async route => {
    if (new URL(route.request().url()).searchParams.get("contentKeyPrefix") !== reviewDraftPrefix) return route.fallback();
    attempt++;
    if (attempt === 1) {
      await pending;
      return route.fulfill({ status: 503, json: { ok: false, error: "Fixture draft list unavailable." } });
    }
    return route.fulfill({ json: { ok: true, rows: attempt === 2 ? [] : stored, nextCursor: null } });
  });
  await page.goto("/#sky-writeups?view=daily-summary");
  const list = page.getByTestId("sky-debility-review-drafts");
  await expect(list.getByRole("status")).toHaveText("Loading saved review drafts…");
  release();
  await expect(list.getByRole("alert")).toHaveText("Fixture draft list unavailable.");
  await expect(list).not.toContainText("No saved dignity review drafts yet.");
  await list.getByRole("button", { name: "Refresh review drafts" }).click();
  await expect(list).toContainText("No saved dignity review drafts yet.");
  await list.getByRole("button", { name: "Refresh review drafts" }).click();
  await expect(list.getByRole("article")).toHaveCount(7);
});
