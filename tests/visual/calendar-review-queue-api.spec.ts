import { test, expect } from "@playwright/test";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { fork } from "node:child_process";
import path from "node:path";
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
