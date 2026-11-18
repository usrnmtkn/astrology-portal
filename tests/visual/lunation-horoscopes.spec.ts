import { expect, test } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { bundledPublications } from "../helpers/bundled-publications";
import { servingPackageRecords } from "../../api/_lib/serving-package-records";
import { lunationHoroscopeIdentities } from "../../src/shared/lunationHoroscopeIdentities";
import skyHandler from "../../api/sky";

const macroKey = "authored/sky-lunation-macro/full-moon/taurus";
const identity = lunationHoroscopeIdentities("full-moon", "taurus")[0];
const record = servingPackageRecords.get(identity.contentKey)!;
const macro = { id: "a0000000-0000-4000-8000-000000000072", content_key: macroKey,
  headline: "Taurus Full Moon", body: "Synthetic shared lunar article opening.\n\nThe complete synthetic lunar article ending.",
  surface: "sky", mode: "article", status: "DRAFT", lane: "reference", review_state: null,
  block_type: "sky_article", sections: {}, facts: {}, source_snapshot: {}, updated_at: "2026-10-29T12:00:00Z" };

for (const [width, theme] of [[390, "light"], [390, "dark"], [1440, "light"], [1440, "dark"]] as const) {
  test(`RATM Studio discovery, edit, save and reopen ${width} ${theme}`, async ({ page }) => {
    const store = await studioApiStore([macro]);
    let failBookRead = true;
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme", theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: async request => {
        if (failBookRead && request.method === "GET" && request.url?.includes("contentKeys=authored%2Fbook-ritual")) {
          return { status: 503, payload: { ok: false, error: "Synthetic source read failure." } };
        }
        return store.call(request);
      }, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname !== "/api/admin/content-live-status") return false;
        const result = await store.call({ method: "POST", url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      } });
      await page.goto("/#sky-writeups");
      const openMacro = async () => {
        await page.getByRole("row").filter({ hasText: macroKey }).getByRole("button", { name: "Edit", exact: true }).click();
        await page.getByText("Rising-sign horoscopes", { exact: true }).click();
      };
      await openMacro();
      const editor = page.getByRole("dialog");
      await expect(editor.getByRole("button", { name: "Retry horoscopes", exact: true })).toBeVisible();
      failBookRead = false;
      await editor.getByRole("button", { name: "Retry horoscopes", exact: true }).click();
      await expect(editor.getByText("RATM horoscope", { exact: true })).toHaveCount(12);
      const aries = editor.locator("article").filter({ has: page.getByText("Aries Rising · 2nd House", { exact: true }) });
      await expect(aries).toContainText(record.body.slice(0, 90));
      await expect(aries).toContainText(record.body.slice(-100));
      await expect(editor.getByText("Horoscope frame", { exact: true })).toHaveCount(0);
      expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await aries.getByRole("button", { name: "Edit source", exact: true }).click();
      const field = editor.locator('textarea[data-sky-field="body"]');
      await expect(field).toHaveValue(record.body);
      const body = "Synthetic RATM owner edit opening.\n\nThe full edited final sentence survives reload.";
      await field.fill(body);
      await editor.getByRole("button", { name: /^Save(?: draft)?$/, exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.content_key === identity.contentKey)?.sections?.packageDraft?.body).toBe(body);
      await page.reload();
      await openMacro();
      await expect(aries).toContainText(body.split("\n\n")[1]);
      await aries.getByRole("button", { name: "Edit source", exact: true }).click();
      await expect(field).toHaveValue(body);
      await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.content_key === identity.contentKey && row.status === "LIVE")?.body).toBe(body);
      await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
      await page.screenshot({ path: `test-results/ratm-editor-${width}-${theme}.png` });
    } finally { store.close(); }
  });

  for (const event of [
    { date: "2026-10-26", kind: "full-moon", sign: "taurus" },
    { date: "2026-07-14", kind: "new-moon", sign: "cancer" }
  ]) test(`RATM guest article ${event.kind} ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date(`${event.date}T20:00:00Z`));
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
    }, theme);
    await bundledPublications(page);
    await page.route("**/api/content-publications", route => route.fulfill({ json: { schema: "tldr-publications/v1", publications: [] } }));
    await page.route("**/api/sky?**", async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) {
        void route.fulfill({ status: this.statusCode, contentType: "application/json", body });
      } };
      await skyHandler({ method: "GET", url: route.request().url() } as any, response as any);
    });
    const first = lunationHoroscopeIdentities(event.kind, event.sign)[0];
    const source = servingPackageRecords.get(first.contentKey)!;
    const verify = async () => {
      const horoscopes = page.locator("#sky-rising-horoscopes");
      await expect(horoscopes.getByRole("heading", { level: 3 })).toHaveCount(12, { timeout: 90_000 });
      await expect(horoscopes.getByRole("heading", { name: "Aries & Aries Rising", exact: true })).toBeVisible();
      await expect(horoscopes.locator(".sky-rising-horoscope").first()).toContainText(source.body.slice(0, 80));
      await expect(horoscopes.locator(".sky-rising-horoscope").first()).toContainText(source.body.slice(-100));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    };
    await page.goto(`http://127.0.0.1:4396/?date=${event.date}#sky/lunation/${event.date}/${event.sign}`);
    await verify();
    await page.screenshot({ path: `test-results/ratm-reader-${event.kind}-${width}-${theme}.png`, fullPage: false });
    await page.reload();
    await verify();
  });
}
