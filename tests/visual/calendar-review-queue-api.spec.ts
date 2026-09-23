import { test, expect } from "@playwright/test";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { fork } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import { studioApiStore } from "../helpers/studio-api-store";
import { bundledPublications } from "../helpers/bundled-publications";
import { readerResponse } from "../helpers/reader-response";
import { lunationKey, lunationOriginal, lunationRevision, lunationPublicationDraft } from "../helpers/lunation-publication.mjs";
const key = "sky-card/venus/scorpio/sextile/mars/virgo";
const studioPath = "/admin/content";

for (const width of [390, 1440]) for (const theme of ["light", "dark"] as const) {
  test(`Calendar Review Queue uses real API save/publish at ${width} ${theme}`, async ({ page }) => {
    const child = fork(path.resolve("tests/helpers/calendar-review-api.mjs"), ["--ipc"], { execArgv: ["--import", "tsx"], stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let sequence = 0;
    const pending = new Map<number, { resolve: (data: any) => void; reject: (error: Error) => void }>();
    let stderr = "";
    child.stderr?.on("data", data => { stderr += data; });
    const ready = new Promise<void>((resolve, reject) => {
      child.on("message", (message: any) => {
        if (message.ready) return resolve();
        const task = pending.get(message.id);
        if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); }
      });
      child.on("exit", code => { const error = new Error(`API fixture exited ${code}: ${stderr}`); reject(error); pending.forEach(task => task.reject(error)); });
    });
    const call = (message: any) => new Promise<any>((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id }); });
    try {
      await ready;
      const fixture = await call({ method: "fixture", key });
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture"));
      const errors: string[] = [];
      const writes: any[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await routeStudioInventoryApi(page, {
        call,
        listRows: rows => rows.filter((row: any) => row.content_key === key && row.status !== "ARCHIVED"),
        onWrite: write => writes.push(write),
        answer: async (route, url) => {
          if (url.pathname !== "/api/admin/content-live-status") return false;
          const statuses = await call({ method: "statuses", body: route.request().postDataJSON() });
          await route.fulfill({ json: { ok: true, statuses } });
          return true;
        }
      });
      await page.goto(`${studioPath}#review-queue`);
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const item = page.getByRole("row").filter({ hasText: key }).first();
      await expect(item).toBeVisible();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await item.getByRole("button", { name: "Edit", exact: true }).click();
      const editor = page.getByRole("dialog");
      await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeVisible();
      const field = editor.getByLabel("Fallback field Calendar Exact today body", { exact: true });
      await expect(field).toHaveValue(fixture.body);
      // The originally staged Body-only proposal must publish even without edits.
      await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
      await expect.poll(() => writes.filter(entry => entry.body.ownerAction).length).toBe(1);
      await expect(editor.getByRole("alert")).toHaveCount(0);
      await expect.poll(async () => (await call({ method: "rows" })).find((row: any) => row.id === fixture.id)?.status).toBe("LIVE");
      const revised = `${fixture.body}\n\nQA saved revision remains complete.`;
      await field.fill(revised);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(() => writes.some(entry => entry.body.sections?.packageDraft && entry.result.status === 200)).toBe(true);
      await expect(editor.getByRole("alert")).toHaveCount(0);
      const rows = await call({ method: "rows" });
      expect(rows.find((row: any) => row.id === fixture.id).body).toBe(fixture.body);
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      await page.reload();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await page.getByRole("row").filter({ hasText: key }).first().getByRole("button", { name: "Edit", exact: true }).click();
      await expect(field).toHaveValue(revised);
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
      await expect.poll(async () => (await call({ method: "rows" })).find((row: any) => row.id === fixture.id)?.body).toBe(revised);
      await expect(editor.getByRole("alert")).toHaveCount(0);
      await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
      await expect(editor.getByRole("region", { name: "SKY V4 source provenance" })).toContainText("content-studio-calendar-publication/v1");
      expect(writes.every(entry => entry.result.status === 200)).toBe(true);
      expect(errors).toEqual([]);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.screenshot({ path: `test-results/calendar-review-${width}-${theme}.png`, fullPage: true });
    } finally { child.kill(); }
  });
}

// The previously staged Aquarius entry is absent from the bundled manifest.
// Mutations use the actual API handler in isolated storage, including on production.
for (const width of [390, 1440]) for (const theme of ["light", "dark"] as const) {
  test(`Staged Aquarius New Moon publishes to Calendar at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([lunationPublicationDraft()]);
    await page.context().route("**/*", route => {
      const request = route.request();
      if (new URL(request.url()).pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method())) return route.abort();
      return route.continue();
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(value => {
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme", value);
        localStorage.setItem("tldrastro:theme", value);
      }, theme);
      await routeStudioInventoryApi(page, {
        call: store.call,
        answer: async (route, url) => {
          if (url.pathname !== "/api/admin/content-live-status") return false;
          const body = route.request().postDataJSON();
          await route.fulfill({ json: body.action === "composition-catalog"
            ? { ok: true, rows: [] }
            : { ok: true, statuses: await store.call({ method: "statuses", body }) } });
          return true;
        }
      });
      await page.goto("/admin/content#sky-writeups");
      await expect(page.locator("main.admin-dashboard")).toHaveAttribute("data-studio-theme", theme);
      const item = page.getByRole("row").filter({ hasText: lunationKey }).first();
      await item.getByRole("button", { name: "Edit", exact: true }).click();
      const editor = page.getByRole("dialog", { name: "Generated content editor" });
      const field = editor.getByLabel("Full lunar passage", { exact: true });
      await expect(field).toHaveValue(lunationOriginal);
      await field.fill(lunationRevision);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" }))[0]?.sections?.packageDraft?.body).toBe(lunationRevision);
      expect((await store.call({ method: "rows" }))[0].status).toBe("DRAFT");
      await expect(editor.getByRole("alert")).toHaveCount(0);
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      await page.reload();
      await item.getByRole("button", { name: "Edit", exact: true }).click();
      await expect(field).toHaveValue(lunationRevision);
      await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" }))[0]?.status).toBe("LIVE");
      await expect(editor.getByRole("alert")).toHaveCount(0);
      await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
      const published = (await store.call({ method: "rows" }))[0];
      expect(published.body).toBe(lunationRevision);
      expect(published.sections.packageRecord.body).toBe(lunationRevision);
      expect(published.sections.packageOriginalRecord.body).toBe(lunationOriginal);
      await page.screenshot({ path: `test-results/lunation-published-${width}-${theme}.png`, fullPage: true });

      await page.unrouteAll({ behavior: "wait" });
      await bundledPublications(page);
      await page.route("**/rest/v1/rpc/content_runtime_revision", route => route.fulfill({ json: published.updated_at }));
      await page.route("**/api/content-reader", route => {
        const query = route.request().postDataJSON();
        const matches = (!query.keys || query.keys.includes(lunationKey))
          && (!query.ids || query.ids.includes(published.id))
          && (!query.prefix || lunationKey.startsWith(query.prefix))
          && (!query.provider || query.provider === published.provider);
        return route.fulfill({ json: readerResponse(matches ? [published] : [], [{
          content_key: lunationKey, state: "live", revision: 100_000,
          row_id: published.id, row_updated_at: published.updated_at, updated_at: published.updated_at
        }]) });
      });
      const manifest = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-manifest-summary-v3.json", "utf8"));
      await page.evaluate(({ manifest, version }) => {
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
        // An old reader can already have cached this revision without the new key.
        localStorage.setItem("tldrastro:fallbackArchitectureV3:dashboardBundle", JSON.stringify({
          schema: "fallback-architecture-v3-dashboard-overlay-cache-v8",
          runtimeCapability: manifest.runtimeCapability, bundledPackageVersion: manifest.packageVersion,
          dashboardVersion: version,
          bundle: { transitLib: { authoredCards: [{ contentKey: "authored/transit-house-intro/sun/1", content_role: "full_copy", review_status: "approved", body: "Synthetic previous cache entry." }] }, rowsFile: { hookRows: [], vocabularyRows: [] }, templatesFile: { templates: [] } }
        }));
        localStorage.setItem("tldrastro:fallbackArchitectureV3:dashboardBundleVersion", String(version));
      }, { manifest, version: Date.parse(published.updated_at) });
      await page.goto("/?date=2027-02-06#calendar?view=day&date=2027-02-06");
      for (const paragraph of lunationRevision.split("\n\n")) {
        await expect(page.getByText(paragraph, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      }
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:fallbackArchitectureV3:dashboardBundle") ?? "null")?.schema)).toBe("fallback-architecture-v3-dashboard-overlay-cache-v9");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/lunation-reader-${width}-${theme}.png`, fullPage: true });
      await page.reload();
      for (const paragraph of lunationRevision.split("\n\n")) await expect(page.getByText(paragraph, { exact: true }).first()).toBeVisible();
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}
