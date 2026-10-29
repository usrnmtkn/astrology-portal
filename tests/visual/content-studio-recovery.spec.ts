import { openSkyPlacementDefaultReading } from '../helpers/sky-placement-workspace-navigation';
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fork } from "node:child_process";
import path from "node:path";
import { studioListingFacts, studioListingRow } from "../../api/_lib/studio-listing-facts";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { createMonthlyAspectPublicationFixture } from "../helpers/horoscope-publication-fixture.mts";
import { studioApiStore } from "../helpers/studio-api-store";

// Exercise the real saved inventory, rather than an empty dashboard fixture.
const inventory = JSON.parse(readFileSync(new URL("../../apps/web/public/content-studio-last-known-good.json", import.meta.url), "utf8")).rows as Array<Record<string, unknown> & { id: string; content_key: string }>;
// Recovery includes two deliberate failures, backoff, and the complete paged inventory.
// Keep it within the existing 15-second reader/Studio readiness budget.
const recoveryReadiness = { timeout: 15_000 };
const studioPath = process.env.STUDIO_PRODUCTION_ENTRY === "1" ? "/admin/content" : "/";

async function within<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Synthetic fixture deadline: ${label}`)), milliseconds);
    })]);
  } finally { clearTimeout(timer!); }
}

async function mockStudio(page: Page, malformedStatus = false) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "studio-recovery-fixture"));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
    if (url.pathname === "/api/admin/content-coverage") {
      Object.assign(data, {
        generatedAt: "2026-10-20T00:00:00Z", authority: "Synthetic coverage", readerEligibility: null,
        summary: { complete: 0, incomplete: 0, unresolvedQueue: 0, unresolvedIssues: 0,
          unresolvedOptionalQueue: 0, unresolvedOptionalIssues: 0, unresolvedShadowed: 0, unresolvedRetired: 0 },
        coverage: [], notes: { friendsIntentionalGap: null, unresolvedReasonCounts: {}, unresolvedWorkload: {},
          unresolvedOptionalWorkload: {}, unresolvedShadowedReasonCounts: {}, unresolvedRetiredReasonCounts: {} }
      });
    }
    if (url.pathname.endsWith("/generated-content") || url.pathname.endsWith("/generated-content-inventory")) {
      const cursor = Number(url.searchParams.get("cursor") ?? 0);
      const keys = [...url.searchParams.getAll("contentKeys"), ...url.searchParams.getAll("contentKey")].flatMap(key => key.split(","));
      const id = url.searchParams.get("id");
      const prefix = url.searchParams.get("contentKeyPrefix");
      if (id || keys.length) data.rows = inventory.filter(row => id ? row.id === id : keys.includes(row.content_key));
      else {
        // Match the real compact, prefix-filtered list contract instead of sending
        // the complete document catalog again for every requested prefix.
        const rows = prefix ? inventory.filter(row => row.content_key.startsWith(prefix)) : inventory;
        const limit = Number(url.searchParams.get("limit") || 400);
        data.rows = rows.slice(cursor, cursor + limit).map(row => studioListingRow(row, studioListingFacts(row)));
        if (cursor + limit < rows.length) data.nextCursor = String(cursor + limit);
      }
    }
    if (url.pathname.endsWith("/content-live-status")) {
      const input = route.request().postDataJSON();
      data.statuses = (input.ids ?? []).map((id: string) => ({
        id, live: true, label: malformedStatus ? { invalid: true } : "Live", detail: "Fixture status",
        source: "fixture", updatedAt: null
      }));
    }
    await route.fulfill({ json: data });
  });
}

async function openStudioPage(page: Page, name: string) {
  await expect(page.locator("#admin-content-navigation")).toBeAttached();
  const navigation = page.getByRole("button", { name: "Open Content Studio navigation", exact: true });
  if (await navigation.isVisible()) await navigation.click();
  await page.getByRole("button", { name, exact: true }).click();
}

async function selectSaturnPlacement(page: Page) {
  await page.getByLabel("Sky placement planet or point").selectOption("saturn");
  await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
  await openSkyPlacementDefaultReading(page);
}

for (const [width, theme] of [[1440, "light"], [390, "dark"]] as const) {
  test(`aspect editing survives a missing article editor ${width} ${theme}`, async ({ page, context }, testInfo) => {
    const studioOrigin = new URL(testInfo.project.use.baseURL as string).origin;
    const row = structuredClone(inventory.find(row => row.content_key === "sky.aspect.moon.trine.pluto")!);
    // Mirror the live record's declared fields; the last-known-good transport
    // does not contain this editor metadata.
    Object.assign((row.sections as any).packageRecord, {
      studio_content_type: "aspect",
      studio_editable_fields: [{ path: "Summary", label: "Summary" }, { path: "Body", label: "Body" }]
    });
    const store = await studioApiStore([row]);
    let editorDownloads = 0, writes = 0;
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => {
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme", value);
      }, theme);
      await context.route("**/*", route => {
        const url = new URL(route.request().url());
        // Only frontend assets may reach the target. Every API response belongs
        // to the isolated handler fixture, including during production checks.
        return url.origin === studioOrigin && !url.pathname.startsWith("/api/")
          ? route.continue() : route.abort("blockedbyclient");
      });
      await page.route("**/SkyFallbackFieldsEditor-*.js", route => {
        editorDownloads++;
        return route.fulfill({ status: 404, contentType: "text/javascript", body: "/* Old deployment chunk is gone. */" });
      });
      await routeStudioInventoryApi(page, { call: message => {
        if (["POST", "PATCH", "DELETE"].includes(message.method)) writes++;
        return store.call(message);
      } });
      const destination = `${studioPath}#exact-content?category=Calendar+Aspects&first=moon&aspect=trine&second=pluto`;
      await page.goto(destination);
      const open = () => page.getByRole("row").filter({ hasText: row.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
      await open();
      const editor = page.getByRole("dialog", { name: "Generated content editor", exact: true });
      const body = editor.getByRole("textbox", { name: "Fallback field Body", exact: true });
      const original = (row.sections as any).packageRecord;
      await expect(body).toHaveValue(original.Body);
      await expect(editor.getByRole("textbox", { name: "Fallback field Summary", exact: true })).toHaveValue(original.Summary);
      expect(editorDownloads).toBe(0);
      expect(writes).toBe(0);
      const complete = "Synthetic complete aspect opening.\n\nThe complete final sentence survives a missing optional module.";
      await body.fill(complete);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).some((saved: any) => saved.sections.packageDraft?.Body === complete)).toBe(true);
      expect(writes).toBe(1);
      const saved = (await store.call({ method: "rows" })).find((saved: any) => saved.sections.packageDraft?.Body === complete);
      expect(saved.status).toBe("DRAFT");
      await page.reload();
      // The fixture lists the original first and its new private revision last.
      await page.getByRole("row").filter({ hasText: row.content_key }).last().getByRole("button", { name: "Edit", exact: true }).click();
      await expect(body).toHaveValue(complete);
      expect((await store.call({ method: "rows" })).find((saved: any) => saved.id === row.id)).toEqual(row);
      expect(editorDownloads).toBe(0);
      await expect(editor.getByRole("alert").filter({ hasText: "This section could not load." })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath("aspect-editor-with-missing-article-chunk.png") });
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      store.close();
    }
  });
}

for (const { status, width, theme, late, action } of [
  { status: 200, width: 1440, theme: "light" },
  ...[390, 1440].flatMap(width => ["light", "dark"].map(theme => ({ status: 503, width, theme }))),
  { status: 503, width: 390, theme: "dark", action: true },
  { status: 503, width: 1440, theme: "light", action: true },
  { status: 503, width: 1440, theme: "light", late: "navigation" },
  { status: 503, width: 1440, theme: "light", late: "credential" }
] as Array<{ status: number; width: number; theme: string; late?: string; action?: boolean }>) test(`${action ? "caught save-recovery import" : "optional writing panel"} preserves an unsaved edition: ${status} ${width} ${theme}${late ? ` after ${late}` : ""}`, async ({ page, context }, testInfo) => {
  const child = fork(path.resolve("tests/helpers/sky-article-save-api.mts"), [], {
    env: { PATH: process.env.PATH, HOROSCOPE_WRITER_FIXTURE: "1", TZ: "America/New_York" },
    execArgv: ["--import", "tsx"], stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  let sequence = 0, writes = 0, requests = 0;
  const mutationStatuses: number[] = [];
  let releaseAsset = () => {};
  const assetGate = new Promise<void>(resolve => { releaseAsset = resolve; });
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
  const exited = new Promise<void>(resolve => child.once("exit", () => resolve()));
  const ready = new Promise<void>((resolve, reject) => {
    child.on("message", (message: any) => {
      if (message.ready) return resolve();
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id);
        message.error ? request.reject(new Error("Synthetic fixture failed")) : request.resolve(message.result);
      }
    });
    child.once("exit", () => {
      const error = new Error("Synthetic fixture exited");
      reject(error);
      pending.forEach(request => request.reject(error));
    });
    child.once("error", reject);
  });
  const call = (message: any) => {
    const id = ++sequence;
    return within(new Promise<any>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.send({ ...message, id });
    }), 10_000, message.method).finally(() => pending.delete(id));
  };
  try {
    await within(ready, 10_000, "ready");
    const created = await createMonthlyAspectPublicationFixture(call);
    expect(created.status).toBe(200);
    const row = created.payload.rows[0];
    const unsaved = "Synthetic complete unsaved opening.\n\nThe complete final sentence stays in this edition.";
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => {
      localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
      localStorage.setItem("tldrastro:studio-theme", value);
      (window as any).__writingAssetFailures = [];
      window.addEventListener("vite:preloadError", event => {
        (window as any).__writingAssetFailures.push(String((event as any).payload?.message ?? ""));
      });
    }, theme);
    await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue() : route.abort("blockedbyclient"));
    const statuses: number[] = [];
    const dialogs: string[] = [];
    // Standalone Studio shares the two optional editing panels. The web entry
    // keeps a separate recovery chunk; exercise the actual import in both.
    const moduleNames = action ? ["HoroscopeSaveRecovery", "HoroscopeWritingStudio"] : ["HoroscopeWritingStudio"];
    const modulePattern = new RegExp(`/(?:${moduleNames.join("|")})-[^/]+\\.js$`);
    let unavailable = status === 503;
    page.on("response", response => {
      if (modulePattern.test(new URL(response.url()).pathname)) statuses.push(response.status());
    });
    page.on("dialog", async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
    await page.route(modulePattern, async route => {
      requests++;
      if (late) await assetGate;
      return unavailable ? route.fulfill({ status: 503, contentType: "text/javascript", body: "/* Synthetic unavailable module. */" }) : route.continue();
    });
    await routeStudioInventoryApi(page, { call: async message => {
      const mutation = ["POST", "PATCH", "DELETE"].includes(message.method);
      if (mutation) writes++;
      const result = await call(message);
      if (mutation) mutationStatuses.push(result.status);
      return result;
    }, answer: async (route, url) => {
      if (url.pathname !== "/api/admin/horoscope-writing") return false;
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: { ok: true } });
      return true;
    } });
    await page.goto(`${studioPath}#horoscopes?edition=${row.id}`);
    const studio = page.getByRole("region", { name: "Horoscope editions", exact: true });
    const reading = studio.getByLabel("Complete reading", { exact: true });
    await expect(reading).toHaveValue(row.sections.horoscopeEdition.passages[0].body);
    if (late !== "navigation") await reading.fill(unsaved);
    const mountedEditor = await studio.elementHandle();
    if (action) {
      // A real competing metadata save forces the actual handler's 409 path.
      // Its reconciliation import is caught by the action, outside React.lazy.
      const updated = await call({ method: "PATCH", body: {
        id: row.id, expectedUpdatedAt: row.updated_at, reviewerNotes: "Synthetic competing metadata save."
      } });
      expect(updated.status).toBe(200);
      const latest = updated.payload.rows[0];
      await studio.getByRole("button", { name: "Save edition draft", exact: true }).click();
      await expect.poll(() => statuses).toEqual([503]);
      await expect(studio.getByRole("alert")).toContainText(/changed|newer|conflict/i);
      await expect(reading).toHaveValue(unsaved);
      expect(await mountedEditor!.evaluate(element => element.isConnected)).toBe(true);
      await expect(page.getByRole("region", { name: "Page recovery", exact: true })).toHaveCount(0);
      expect(writes).toBe(1); // Explicit rejected save only; no automatic overwrite.
      expect(mutationStatuses).toEqual([409]);
      expect(dialogs).toEqual([]);
      expect((await call({ method: "rows" })).find((saved: any) => saved.id === row.id)).toEqual(latest);
      await reading.fill(`${unsaved}\n\nFurther unsaved editing remains possible.`);
      expect((await call({ method: "writer-state" })).calls).toBe(0);
      await page.screenshot({ path: testInfo.outputPath("unsaved-action-recovery.png") });
      return;
    }
    await studio.getByRole("button", { name: "2 · Generate", exact: true }).click();
    await studio.getByText("Writing instructions · optional", { exact: true }).click();
    expect(requests).toBe(0);
    await studio.getByRole("button", { name: "Edit writing instructions", exact: true }).click();
    if (late) {
      await expect.poll(() => requests).toBe(1);
      if (late === "credential") await page.getByRole("region", { name: "Admin status" }).getByRole("button", { name: "Connection", exact: true }).click();
      else await openStudioPage(page, "Review Queue");
      if (late === "credential") {
        await page.getByLabel("CONTENT_GENERATION_SECRET", { exact: true }).fill("calendar-api-fixture-changed");
        await page.getByRole("button", { name: "Check Access", exact: true }).click();
        await expect.poll(() => page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBe("calendar-api-fixture-changed");
      }
      releaseAsset();
      await expect.poll(() => statuses).toEqual([503]);
      await expect(page.getByRole("region", { name: "Page recovery", exact: true })).toHaveCount(0);
      await expect(studio).toHaveCount(0); // Late failure must not reactivate the hidden editor.
      expect(dialogs).toEqual([]);
      expect(writes).toBe(0);
      expect((await call({ method: "rows" })).find((saved: any) => saved.id === row.id)).toEqual(row);
      if (late === "credential") {
        await page.evaluate(id => { window.location.hash = `horoscopes?edition=${id}`; }, row.id);
        // Rotating the emergency key does not authorize discarding a dirty
        // edition. Declining replacement retains its complete local draft.
        await expect.poll(() => dialogs).toEqual(["confirm"]);
        await studio.getByRole("button", { name: "3 · Review", exact: true }).click();
        await expect(reading).toHaveValue(unsaved);
        expect(await mountedEditor!.evaluate(element => element.isConnected)).toBe(true);
        expect(writes).toBe(0);
        expect((await call({ method: "rows" })).find((saved: any) => saved.id === row.id)).toEqual(row);
      } else {
        await expect(page.getByRole("heading", { name: "Review Queue", exact: true })).toBeVisible();
        // A preload event alone cannot distinguish a locally caught action
        // from an abandoned import, and must never unmount another editor.
        await page.evaluate(() => window.dispatchEvent(Object.assign(new Event("vite:preloadError"), {
          payload: new Error("Synthetic unrelated page asset failure")
        })));
        await expect(page.getByRole("region", { name: "Page recovery", exact: true })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "Review Queue", exact: true })).toBeVisible();
      }
      return;
    }
    if (status === 503) {
      const recovery = studio.getByRole("alert").filter({ hasText: "This section could not load." });
      await expect(recovery).toBeVisible();
      expect(statuses).toEqual([503]);
      expect(await page.evaluate(() => (window as any).__writingAssetFailures)).toEqual([
        expect.stringContaining("HoroscopeWritingStudio-")
      ]);
      expect(await mountedEditor!.evaluate(element => element.isConnected)).toBe(true);
      await expect(page.getByRole("region", { name: "Page recovery", exact: true })).toHaveCount(0);
      await expect(recovery).toContainText("Save your changes, then reload");
      await expect(page.locator(".admin-dashboard")).toHaveAttribute("data-studio-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await recovery.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("unsaved-edition-recovery.png") });
    } else {
      await expect(studio.getByRole("region", { name: "Horoscope writing profiles", exact: true })).toBeVisible();
    }
    expect(statuses).toEqual([status]);
    await studio.getByRole("button", { name: "3 · Review", exact: true }).click();
    await expect(reading).toHaveValue(unsaved);
    expect(await mountedEditor!.evaluate(element => element.isConnected)).toBe(true);
    expect(writes).toBe(0);
    expect(dialogs).toEqual([]);
    expect((await call({ method: "rows" })).find((saved: any) => saved.id === row.id)).toEqual(row);
    await studio.getByRole("button", { name: "Save edition draft", exact: true }).click();
    await expect(studio.getByRole("status")).toContainText("Saved edition draft.");
    expect(writes).toBe(1);
    expect((await call({ method: "rows" })).find((saved: any) => saved.id === row.id).sections.horoscopeEdition.passages[0].body).toBe(unsaved);
    unavailable = false;
    await page.reload();
    await expect(reading).toHaveValue(unsaved);
    await studio.getByRole("button", { name: "2 · Generate", exact: true }).click();
    await studio.getByText("Writing instructions · optional", { exact: true }).click();
    await studio.getByRole("button", { name: "Edit writing instructions", exact: true }).click();
    await expect(studio.getByRole("region", { name: "Horoscope writing profiles", exact: true })).toBeVisible();
    expect(statuses).toEqual([status, 200]);
    expect((await call({ method: "writer-state" })).calls).toBe(0);
  } finally {
    releaseAsset();
    await page.unrouteAll({ behavior: "wait" });
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    try { await within(exited, 3_000, "terminate"); }
    catch {
      child.kill("SIGKILL");
      await within(exited, 3_000, "kill");
    }
  }
});

for (const { malformed, width, theme } of [
  ...[390, 1440].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme, malformed: null }))),
  { width: 1440, theme: 'light', malformed: { ok: true, rows: null } }
]) test(`invalid secondary responses do not block saved Studio content: ${JSON.stringify(malformed)} ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
  await mockStudio(page);
  let failing = true;
  await page.route(/\/api\/admin\/(review-records|user-generated-content|content-review-events)\?/, route => failing ? route.fulfill({ json: malformed }) : route.fallback());
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${studioPath}#sky-writeups`);
  await expect(page.getByLabel("Sky write-up rows").locator("tbody tr").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Incomplete", recoveryReadiness);
  const failure = page.getByRole("alert").filter({ hasText: "Some content could not load" });
  await expect(failure).toContainText("Review records");
  await expect(failure).toContainText("User content");
  await expect(failure).toContainText("Reader omission reports");
  const statusDot = page.getByRole("region", { name: "Admin status" }).locator('.admin-sidebar-status-dot');
  const failureColor = await statusDot.evaluate(element => getComputedStyle(element).backgroundColor);
  await expect(page.locator('.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
  await page.screenshot({ path: `test-results/studio-partial-load-${width}-${theme}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.waitForTimeout(7_500); // Outlast the transient toast: the warning must persist.
  await expect(failure).toBeVisible();
  failing = false;
  await failure.getByRole("button", { name: "Retry failed loads", exact: true }).click();
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
  expect(await statusDot.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(failureColor);
  await expect(failure).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "The dashboard could not load saved CMS rows" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const initialPage of ["review-queue", "articles"]) {
  test(`invalid inventory pages retry automatically before completing from ${initialPage}`, async ({ page }) => {
    await mockStudio(page);
    const attempts: Record<string, number> = {};
    const failingPass = initialPage === "review-queue" ? "0" : "section";
    const expectedAttempts = initialPage === "review-queue" ? { "0": 3, "1": 1, "2": 1 } : { section: 3 };
    await page.route("**/api/admin/generated-content**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("scope") === "all" && !url.searchParams.has("cursor")) {
        const pass = url.searchParams.get("partition") ?? "section";
        attempts[pass] = (attempts[pass] ?? 0) + 1;
        if (pass === failingPass && attempts[pass] <= 2) {
          await route.fulfill({ json: attempts[pass] === 1 ? null : { rows: null } });
          return;
        }
      }
      await route.fallback();
    });
    await page.goto(`${studioPath}#${initialPage}`);
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
    expect(attempts).toEqual(expectedAttempts);
    await openStudioPage(page, "Sky Write-ups");
    await expect(page.getByLabel("Sky write-up rows").locator("tbody tr").first()).toBeVisible();
  });

  test(`persistent invalid inventory stops retrying and can recover manually from ${initialPage}`, async ({ page }) => {
    await mockStudio(page);
    let invalid = true;
    const attempts: Record<string, number> = {};
    const expectedPasses = initialPage === "review-queue" ? ["0", "1", "2"] : ["section"];
    await page.route("**/api/admin/generated-content**", async route => {
      const url = new URL(route.request().url());
      if (invalid && url.searchParams.get("scope") === "all") {
        const pass = url.searchParams.get("partition") ?? "section";
        attempts[pass] = (attempts[pass] ?? 0) + 1;
        await route.fulfill({ json: null });
      } else await route.fallback();
    });
    await page.goto(`${studioPath}#${initialPage}`);
    await expect(page.getByRole("heading", { name: "The dashboard could not load saved CMS rows" })).toBeVisible(recoveryReadiness);
    await expect(page.getByText(/Expected a JSON object\. The response was empty or invalid/).first()).toBeVisible();
    expect(Object.keys(attempts).sort()).toEqual(expectedPasses);
    // Exhausting one pass cancels its siblings; a sibling may be aborted before
    // its third read. Every pass must respect the same three-attempt ceiling.
    expect(Math.max(...Object.values(attempts))).toBe(3);
    for (const count of Object.values(attempts)) {
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(3);
    }
    const stoppedAttempts = { ...attempts };
    await page.waitForTimeout(1_500); // Outlast retry backoff to prove automatic reads stopped.
    expect(attempts).toEqual(stoppedAttempts);
    invalid = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
  });
}

test("Sky Write-ups navigation remains usable with a malformed status response", async ({ page }) => {
  await mockStudio(page, true);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${studioPath}#review-queue`);
  await openStudioPage(page, "Sky Write-ups");
  await expect(page.getByLabel("Sky placement planet or point")).toBeVisible();
  const savedStatus = page.getByLabel("Sky write-up rows").locator("tbody tr").first().locator(".admin-col-visibility .admin-status");
  await expect(savedStatus).toHaveText("Unavailable");
  await expect(savedStatus).toHaveAttribute("title", "Reader serving status could not be verified. Refresh to retry.");
  await openStudioPage(page, "Content Library");
  await openStudioPage(page, "Sky Write-ups");
  await expect(page.getByLabel("Sky write-up rows").locator("tbody tr").first()).toBeVisible();
  expect(errors).toEqual([]);
});

for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`Studio recovers from a page crash ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockStudio(page);
    // Fault injection is confined to the test browser's module response.
    let recoverOnReload = false;
    await page.route("**/SkyPlacementComposition-*.js", route => route.fulfill({
      contentType: "text/javascript",
      body: recoverOnReload ? 'export default function(){return null;}' : 'export default function(){if(!document.documentElement.hasAttribute("data-qa-recovered"))throw new Error("Studio recovery fixture");return null;}'
    }));
    await page.goto(`${studioPath}#review-queue`);
    await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
    await openStudioPage(page, "Sky Write-ups");
    // A complete placement mounts the map and exercises the injected failure.
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toBeVisible();
    await page.getByText("Error details", { exact: true }).click();
    await expect(page.getByText("Error: Studio recovery fixture", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload page", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/studio-recovery-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    // Retry remounts the dashboard and reloads its inventory without clearing authentication.
    await page.evaluate(() => document.documentElement.setAttribute("data-qa-recovered", ""));
    await page.getByRole("button", { name: "Retry page", exact: true }).click();
    await expect(page.getByLabel("Sky placement planet or point")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBe("studio-recovery-fixture");

    // A repeated crash can be escaped through a separate Studio destination.
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
    await openStudioPage(page, "Review Queue");
    await page.evaluate(() => document.documentElement.removeAttribute("data-qa-recovered"));
    await openStudioPage(page, "Sky Write-ups");
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toBeVisible();
    await page.getByRole("link", { name: "Open Review Queue", exact: true }).click();
    await expect(page).toHaveURL(/#review-queue$/);
    await expect(page.getByRole("heading", { name: "Review Queue", exact: true })).toBeVisible();
    await openStudioPage(page, "Sky Write-ups");
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toBeVisible();
    recoverOnReload = true;
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Reload page", exact: true }).click()
    ]);
    await expect(page.getByLabel("Sky placement planet or point")).toBeVisible();
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBe("studio-recovery-fixture");
  });
}

for (const action of ['Retry page', 'Open Review Queue']) {
  test(`Studio recovers a missing initial dashboard chunk through ${action}`, async ({ page }) => {
    await mockStudio(page);
    let missing = true;
    let documents = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
    await page.route('**/ContentCoverageDashboard-*.js', route => missing
      ? route.fulfill({ status: 503, contentType: 'text/javascript', body: '/* Initial dashboard unavailable. */' })
      : route.continue());
    await page.goto('/admin/content/coverage');
    const recovery = page.getByRole('region', { name: 'Page recovery', exact: true });
    await expect(recovery).toBeVisible();
    await recovery.getByText('Error details', { exact: true }).click();
    // Vite must reject the import with its real failure, not resolve undefined
    // and poison React.lazy with "reading default" for every future Retry.
    await expect(recovery.locator('pre')).toContainText(/Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload/);
    expect(documents).toBe(1); // Authoring pages never reload without an action.
    missing = false;
    await recovery.getByRole(action === 'Retry page' ? 'button' : 'link', { name: action, exact: true }).click();
    await expect.poll(() => documents).toBe(2);
    if (action === 'Open Review Queue') {
      await expect(page.getByRole('heading', { name: 'Review Queue', exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Content coverage', exact: true })).toBeVisible();
    }
    await expect(recovery).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('tldrastro:contentAdminSecret'))).toBe('studio-recovery-fixture');
  });
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`new unsaved guide survives a formatting asset failure ${width} ${theme}`, async ({ page, context }, testInfo) => {
    const studioOrigin = new URL(testInfo.project.use.baseURL as string).origin;
    const store = await studioApiStore([]);
    try {
      let missing = true, writes = 0;
      const statuses: number[] = [];
      const original = "Synthetic new guide opening.\n\nThe full unsaved guide ending stays intact.";
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => {
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme", value);
      }, theme);
      await context.route("**/*", route => {
        const url = new URL(route.request().url());
        // Only frontend assets may reach the target. Every API response belongs
        // to the isolated handler fixture, including during production checks.
        return url.origin === studioOrigin && !url.pathname.startsWith("/api/")
          ? route.continue() : route.abort("blockedbyclient");
      });
      await page.route("**/StudioFormattingEditor-*.js", route => missing
        ? route.fulfill({ status: 503, contentType: "text/javascript", body: "/* Optional formatting unavailable. */" })
        : route.continue());
      page.on("response", response => {
        if (/\/StudioFormattingEditor-[^/]+\.js$/.test(new URL(response.url()).pathname)) statuses.push(response.status());
      });
      await routeStudioInventoryApi(page, { call: message => {
        if (["POST", "PATCH", "DELETE"].includes(message.method)) writes++;
        return store.call(message);
      } });
      await page.goto(`${studioPath}#articles`);
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await page.getByRole("menuitem", { name: /New guide/u }).click();
      const editor = page.getByRole("dialog", { name: "Generated content editor", exact: true });
      const body = editor.getByLabel("Article body", { exact: true });
      await editor.getByLabel("Article title", { exact: true }).fill("Synthetic unsaved recovery guide");
      await body.fill(original);
      const mountedEditor = await editor.elementHandle();
      expect(await store.call({ method: "rows" })).toEqual([]);
      await body.locator("..").getByRole("button", { name: "Format text", exact: true }).click();
      const recovery = editor.getByRole("alert").filter({ hasText: "This section could not load." });
      await expect(recovery).toBeVisible();
      await recovery.getByText("Error details", { exact: true }).click();
      await expect(recovery).toContainText(/StudioFormattingEditor-/);
      expect(statuses).toEqual([503]);
      expect(await mountedEditor!.evaluate(element => element.isConnected)).toBe(true);
      await expect(page.locator(".admin-dashboard")).toHaveAttribute("data-studio-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await recovery.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("new-guide-recovery.png") });
      await recovery.getByRole("button", { name: "Back to plain text", exact: true }).click();
      await expect(body).toBeVisible();
      await expect(body).toHaveValue(original);
      const complete = original + "\n\nThis additional final sentence can still be edited.";
      await body.fill(complete);
      expect(writes).toBe(0);
      expect(await store.call({ method: "rows" })).toEqual([]);
      expect(await page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(false);
      let confirmedDiscard = false;
      page.once("dialog", async dialog => { confirmedDiscard = true; await dialog.dismiss(); });
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      expect(confirmedDiscard).toBe(true);
      await expect(body).toHaveValue(complete);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" }))[0]?.body).toBe(complete);
      expect(writes).toBe(1);
      const saved = (await store.call({ method: "rows" }))[0];
      expect(saved.status).toBe("DRAFT");
      missing = false;
      await page.reload();
      await page.getByRole("row").filter({ hasText: saved.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
      await expect(body).toHaveValue(complete);
      await body.locator("..").getByRole("button", { name: "Format text", exact: true }).click();
      await expect(editor.getByRole("textbox", { name: "Article body formatted text", exact: true })).toContainText("This additional final sentence can still be edited.");
      expect(statuses).toEqual([503, 200]);
      expect(writes).toBe(1);
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      store.close();
    }
  });
}

for (const [width, theme] of [[390, "dark"], [1440, "light"]] as const) {
  test(`cold sign-in panel failure preserves a retained draft ${width} ${theme}`, async ({ page, context }, testInfo) => {
    const store = await studioApiStore([]);
    try {
      let denied = false, deniedRequests = 0, writes = 0;
      const statuses: number[] = [];
      const original = "Synthetic retained guide opening.\n\nThe complete draft ending survives access recovery.";
      const storageKey = "sb-visual-smoke-auth-token";
      const token = (signature: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: "studio-recovery-owner" })).toString("base64url")}.${signature}`;
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(({ storageKey, token, theme }) => {
        localStorage.setItem(storageKey, JSON.stringify({ access_token: token, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
        localStorage.setItem("tldrastro:studio-theme", theme);
      }, { storageKey, token: token("initial"), theme });
      await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue() : route.abort("blockedbyclient"));
      await page.route("**/AdminAccessGate-*.js", route => route.fulfill({ status: 503, contentType: "text/javascript", body: "/* Synthetic sign-in panel unavailable. */" }));
      page.on("response", response => {
        if (/\/AdminAccessGate-[^/]+\.js$/.test(new URL(response.url()).pathname)) statuses.push(response.status());
      });
      await routeStudioInventoryApi(page, { call: message => {
        if (["POST", "PATCH", "DELETE"].includes(message.method)) writes++;
        return store.call(message);
      } });
      await page.route("**/api/admin/generated-content*", route => {
        if (!denied) return route.fallback();
        deniedRequests++;
        return route.fulfill({ status: 401, json: { ok: false, error: "Unauthorized", code: "content_admin_unauthorized" } });
      });
      const rotateSession = (signature: string) => page.evaluate(({ storageKey, token }) => {
        localStorage.setItem(storageKey, JSON.stringify({ access_token: token, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
        window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
      }, { storageKey, token: token(signature) });
      await page.goto(`${studioPath}#articles`);
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await page.getByRole("menuitem", { name: /New guide/u }).click();
      const editor = page.getByRole("dialog", { name: "Generated content editor", exact: true });
      const body = editor.getByLabel("Article body", { exact: true });
      await editor.getByLabel("Article title", { exact: true }).fill("Synthetic retained access recovery");
      await body.fill(original);
      const dashboard = await page.locator(".admin-dashboard").elementHandle();
      expect(statuses).toEqual([]); // Preauthenticated entry never loaded this panel.
      denied = true;
      await rotateSession("denied");
      await expect.poll(() => statuses).toEqual([503]);
      expect(deniedRequests).toBeGreaterThan(0);
      await expect(page.getByRole("alert").filter({ hasText: "Sign-in could not load." })).toBeVisible();
      const signIn = page.getByRole("link", { name: "Sign in in another tab", exact: true });
      await expect(signIn).toHaveAttribute("target", "_blank");
      await expect(signIn).toHaveAttribute("rel", "noopener");
      const signInUrl = new URL(await signIn.getAttribute("href") ?? "", page.url());
      expect(signInUrl.origin).toBe(new URL(page.url()).origin);
      expect(signInUrl.searchParams.get("auth")).toBe("login");
      expect(signInUrl.searchParams.get("returnTo")).toBe(studioPath === "/" ? "/admin/content" : "/admin/content#articles-guides");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath("retained-access-recovery.png") });
      expect(await dashboard!.evaluate(element => element.isConnected)).toBe(true);
      await expect(page.getByRole("region", { name: "Page recovery", exact: true })).toHaveCount(0);
      await expect(editor).toHaveCount(0); // Access denial must still hide the editor.
      expect(writes).toBe(0);
      expect(await store.call({ method: "rows" })).toEqual([]);
      denied = false;
      await rotateSession("authorized-again");
      await expect(body).toHaveValue(original);
      expect(await dashboard!.evaluate(element => element.isConnected)).toBe(true);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" }))[0]?.body).toBe(original);
      expect(writes).toBe(1);
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      store.close();
    }
  });
}

for (const entry of ["/", "/admin/content"]) test(`standalone Studio retains initial entry recovery at ${entry}`, async ({ page }) => {
  test.skip(process.env.STUDIO_PRODUCTION_ENTRY === "1", "The web entry has a separate startup control.");
  await mockStudio(page);
  let missing = true, documents = 0;
  page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.route("**/assets/index-*.js", route => missing
    ? route.fulfill({ status: 503, contentType: "text/javascript", body: "/* Entry unavailable. */" })
    : route.continue());
  await page.goto(entry);
  await expect(page.locator("#app-startup")).toHaveAttribute("role", "alert");
  // The shared startup shell permits one guarded retry at root before the
  // application has mounted. The explicit authoring path never auto-reloads.
  const initialDocuments = entry === "/" ? 2 : 1;
  await expect.poll(() => documents).toBe(initialDocuments);
  missing = false;
  await page.getByRole("button", { name: "Reload page", exact: true }).click();
  await expect(page.locator(".admin-dashboard")).toBeVisible();
  expect(documents).toBe(initialDocuments + 1);
});

test('reader startup keeps its guarded reload and manual recovery', async ({ page }) => {
  test.skip(process.env.STUDIO_PRODUCTION_ENTRY !== '1', 'Reader startup requires the production web entry.');
  await mockStudio(page);
  let missing = true;
  let documents = 0;
  await page.addInitScript(() => {
    const key = "qa:startup-document";
    sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) || 0) + 1));
  });
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.route('**/App-*.js', route => missing ? route.abort('failed') : route.continue());
  await page.goto('/#sky', { waitUntil: 'commit' });
  // The first failure can announce an alert just before the guarded reload.
  // Wait for that replacement document to fail before enabling recovery.
  await expect.poll(async () => {
    try {
      return await page.evaluate(() => Number(sessionStorage.getItem("qa:startup-document")));
    } catch (error) {
      // The intentional reload can destroy the first document mid-evaluation.
      // Keep polling for document two; unrelated failures must still fail.
      if (error instanceof Error && error.message.includes('Execution context was destroyed')) return 0;
      throw error;
    }
  }).toBe(2);
  await expect(page.locator('#app-startup')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#app-startup button')).toBeVisible();
  expect(documents).toBe(2);
  await page.waitForTimeout(12_500);
  await expect(page.locator('#app-startup')).toHaveAttribute('role', 'alert');
  missing = false;
  await page.locator('#app-startup button').click();
  await expect(page.locator('.topbar')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#app-startup')).toHaveCount(0);
  expect(documents).toBe(3);
});
