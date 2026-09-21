import { test, expect } from "@playwright/test";
import { build } from "esbuild";

let componentScript: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Panel from './apps/admin/src/SkyV4StudioReviewPanel'; window.mountEditor = props => { window.editorRoot ??= createRoot(document.getElementById('root')); window.editorRoot.render(React.createElement(Panel, props)); };`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, outdir: "test-results/secondary-editor", platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
  });
  componentScript = result.outputFiles.find(file => file.path.endsWith(".js"))!.text;
});

const contentKey = "sky-placement/article/saturn/aries";
const initialRecord = { contentKey, studio_content_type: "continuous-placement", tldrWhat: "Fixture summary", tldrTakeaway: "Fixture ending", placementArticle: "Original fixture article.", fallback: { hook: "Original fixture hook.", lived: "Fixture development.", turn: "Fixture close." } };

test("Sky editors use rows envelopes, opened versions and confirmed receipts", async ({ page }) => {
  let row = { id: "saved-fixture", content_key: contentKey, status: "DRAFT", updated_at: "2026-09-01T00:00:00.000Z", sections: { packageRecord: initialRecord } as Record<string, any> };
  const versions: string[] = [];
  let conflict = false;
  let invalidReceipt = false;
  await page.route("**/__secondary-editor-test", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }));
  await page.route("**/api/admin/generated-content**", async route => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      versions.push(body.expectedUpdatedAt);
      if (conflict) return route.fulfill({ status: 409, json: { ok: false, error: "This content changed after the editor was opened. Reload before saving." } });
      if (invalidReceipt) return route.fulfill({ json: { ok: true, rows: [] } });
      row = { ...row, sections: body.sections, updated_at: `2026-09-01T00:00:0${versions.length}.000Z` };
      return route.fulfill({ json: { ok: true, rows: [row] } });
    }
    return route.fulfill({ json: { ok: true, rows: [row], nextCursor: null } });
  });
  await page.goto("/__secondary-editor-test");
  await page.addScriptTag({ content: componentScript });
  await page.evaluate(props => (window as any).mountEditor(props), { secret: "isolated-fixture", contentKey, effectiveRecord: initialRecord, disabled: false });
  const article = page.getByRole("textbox", { name: /Placement article/ });
  await expect(article).toBeEnabled();
  await expect(article).toHaveValue("Original fixture article.");
  await article.fill("First browser fixture edit.");
  await page.getByRole("button", { name: "Save grouped draft", exact: true }).click();
  await expect(page.getByText("Draft saved. The approved serving baseline remains live until this version is separately reviewed and released.", { exact: true })).toBeVisible();
  expect(versions[0]).toBe("2026-09-01T00:00:00.000Z");
  await article.fill("Second browser fixture edit.");
  await page.getByRole("button", { name: "Save grouped draft", exact: true }).click();
  await expect.poll(() => versions.length).toBe(2);
  expect(versions[1]).toBe("2026-09-01T00:00:01.000Z");
  await expect(page.getByRole("button", { name: "Save grouped draft", exact: true })).toBeEnabled();
  conflict = true;
  await article.fill("Unsaved fixture edit stays here.");
  await page.getByRole("button", { name: "Save grouped draft", exact: true }).click();
  await expect(page.getByText(/This content changed after the editor was opened/)).toBeVisible();
  await expect(article).toHaveValue("Unsaved fixture edit stays here.");
  expect(row.sections.packageDraft.placementArticle).toBe("Second browser fixture edit.");
  // Variant editor opened the original version independently; it must not fetch
  // a newer version just to make an old draft appear safe to save.
  await page.getByRole("button", { name: "Save variant family draft", exact: true }).click();
  await expect.poll(() => versions.length).toBe(4);
  expect(versions[3]).toBe("2026-09-01T00:00:00.000Z");
  conflict = false; invalidReceipt = true;
  await page.getByRole("button", { name: "Save variant family draft", exact: true }).click();
  await expect(page.getByText(/The API did not confirm the saved draft/)).toBeVisible();
  await expect(page.getByText(/Variant family draft saved/)).toHaveCount(0);
});

test("static Studio preview cannot return HTML success for API requests", async ({ request }) => {
  const result = await request.get("/api/admin/generated-content?status=all&limit=400");
  expect(result.status()).toBe(503);
  expect(result.headers()["cache-control"]).toBe("no-store");
  expect(await result.json()).toMatchObject({ ok: false, error: expect.stringContaining("static Studio preview has no API server") });
});

test("Needs Attention stops on a repeated inventory cursor", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("tldrastro:contentAdminSecret", "isolated-fixture"));
  let inventoryRequests = 0;
  await page.route("**/api/admin/content-coverage", route => route.fulfill({ json: { ok: true, summary: { complete: 0, incomplete: 0, unresolvedIssues: 0 }, coverage: [] } }));
  await page.route("**/api/admin/generated-content-inventory?**", route => {
    inventoryRequests++;
    return route.fulfill({ json: { ok: true, rows: [], nextCursor: "same-cursor" } });
  });
  await page.goto("/admin/content/coverage?view=attention");
  await expect(page.getByRole("alert")).toContainText("invalid pagination cursor");
  expect(inventoryRequests).toBeLessThanOrEqual(4);
});
