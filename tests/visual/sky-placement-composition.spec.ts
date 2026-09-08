import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords, skyPlacementSourceCorpus } from "../../api/_lib/sky-placement-sources";
import { contentLiveStatuses } from "../../api/_lib/content-live-status";
import { skyPlacementAssembly, skyPlacementAssemblyFields } from "../../apps/admin/src/skyPlacementAssembly";
import { skyFallbackWorkspace } from "../../apps/admin/src/skyFallbackWorkspace";
import { renderSkyV4ReaderRoute, renderSkyV4ContinuousPreview } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
const virtual = (key: string) => {
 const source = skyPlacementSourceRecords.get(key);
 return source ? { id: `package:${key}`, content_key: key, surface: "sky", mode: "in_depth", status: "DRAFT", lane: "reference", provider: "tldrastro-fallback-architecture-v3", headline: source.headline, summary: source.summary, body: source.body_you, sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role }, block_type: "fallback_hook", event_type: "fallback-hook", package_starter: true } : null;
};
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
 test(`Saturn composition source discovery and editor ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "sky-composition-test"));
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.route("**/api/admin/**", async route => {
   const url = new URL(route.request().url());
   let data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
   if (url.pathname.endsWith("/content-live-status")) {
    const input = route.request().postDataJSON();
    data.statuses = contentLiveStatuses((input.ids ?? []).map((id: string) => virtual(id.replace(/^package:/, ""))).filter(Boolean));
   }
   if (url.pathname.endsWith("/generated-content")) {
    data.rows = (url.searchParams.get("contentKeys") ?? "").split(",").map(virtual).filter(Boolean);
   }
   await route.fulfill({ json: data });
  });
  await page.goto("/#sky-writeups");
  await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
  await page.getByLabel("Sky placement planet or point").selectOption("saturn");
  await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
  await page.getByLabel("Sky write-up motion").selectOption("retrograde");
  const map = page.getByRole("region", { name: "Sky placement composition map" });
  await expect(map.getByRole("heading", { name: "Saturn Rx in Aries", level: 3 })).toBeVisible();
  await expect(map.getByRole("tab", { name: "Reader preview" })).toHaveAttribute("aria-selected", "true");
  await expect(map.getByRole("button", { name: "Edit placement article", exact: true })).toContainText(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.placementArticle);
  await map.getByRole("tab", { name: "Assembly", exact: true }).click();
  await expect(map.getByRole("article", { name: "Retrograde source" })).toContainText(skyPlacementSourceRecords.get("sky-placement/retrograde/saturn")!.Body);
  await expect(map.getByRole("article", { name: "Planet-in-sign source" })).toContainText("The beginning matters more when it can survive the part nobody claps for.");
  await expect(map.getByRole("button", { name: "Edit fallback opening", exact: true })).toBeVisible();
  await expect(map.getByText("Live", { exact: true })).toHaveCount(2);
  const headingStyle = await map.getByRole("heading").evaluate(el => {
   const style = getComputedStyle(el);
   return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.margin, style.textTransform, style.textAlign];
  });
  await map.getByRole("tab", { name: "Main template", exact: true }).click();
  await expect(map.getByRole("list", { name: "Placement template order" }).locator("code")).toHaveText(["{{Body}}", "{{tldrWhat}}", "{{tldrTakeaway}}", "{{placementArticle}}"]);
  await map.getByLabel("Placement writing path").selectOption("fallback");
  await expect(map.getByRole("list", { name: "Placement template order" }).locator("code")).toHaveText(["{{Body}}", "{{tldrWhat}}", "{{tldrTakeaway}}", "{{fallback.hook}}", "{{fallback.lived}}", "{{fallback.turn}}"]);
  await map.getByRole("tab", { name: "Reader preview", exact: true }).click();
  const opening = map.getByRole("button", { name: "Edit fallback opening", exact: true });
  await expect(opening).toContainText(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.fallback.hook);
  await expect(map.getByRole("button", { name: "Edit placement article", exact: true })).toHaveCount(0);
  const colors = await map.locator(".admin-template-reader-copy .admin-composition-variable").evaluateAll(elements => Object.fromEntries(elements.map(el => [el.className, getComputedStyle(el).color])));
  expect(new Set(Object.values(colors)).size).toBe(3);
  await map.screenshot({ path: `test-results/saturn-fallback-${width}-${theme}.png` });
  await opening.click();
  await expect(page.getByRole("textbox", { name: "Fallback field Fallback opening", exact: true })).toBeFocused();
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await map.getByLabel("Placement writing path").selectOption("article");
  await map.screenshot({ path: `test-results/saturn-map-${width}-${theme}.png` });
  await map.getByRole("button", { name: "Edit placement article", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByRole("heading", { name: "Edit Saturn in Aries" })).toBeVisible();
  await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
  await expect(editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true })).toHaveValue(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.placementArticle);
  await expect(editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true })).toBeFocused();
  await editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true }).fill("Browser test revision.");
  await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeEnabled();
  await page.screenshot({ path: `test-results/saturn-editor-${width}-${theme}.png`, fullPage: true });
  page.once("dialog", dialog => dialog.accept());
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/#composition-map");
  await page.getByRole("button", { name: /Sky Placement Detail Pages/ }).click();
  await expect(map.getByRole("heading", { name: "Saturn Rx in Aries" })).toBeVisible();
  const analogous = page.locator(".admin-composition-surface-flow h3").first();
  expect(await analogous.evaluate(el => { const s = getComputedStyle(el); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.margin, s.textTransform, s.textAlign]; })).toEqual(headingStyle);
  await map.getByLabel("Composition motion").selectOption("direct");
  await expect(map.getByRole("article", { name: "Retrograde source" })).toHaveCount(0);
  await expect(map.getByRole("button", { name: "Edit retrograde body", exact: true })).toHaveCount(0);
  await expect(map.getByRole("button", { name: "Edit placement article", exact: true })).toBeVisible();
  await map.getByLabel("Composition planet or point").selectOption("moon");
  await expect(map.getByRole("alert")).toBeVisible();
  await expect(map.getByRole("status")).toContainText("Source unavailable");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
 });
}

test("an open Saturn editor survives initial and extended inventory loading", async ({ page }) => {
 let releaseInitial!: () => void;
 let releaseExtended!: () => void;
 let extendedStarted!: () => void;
 const initial = new Promise<void>(resolve => { releaseInitial = resolve; });
 const extended = new Promise<void>(resolve => { releaseExtended = resolve; });
 const started = new Promise<void>(resolve => { extendedStarted = resolve; });
 await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "sky-composition-test"));
 await page.route("**/api/admin/**", async route => {
  const url = new URL(route.request().url());
  const data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
  if (url.pathname.endsWith("/content-live-status")) {
   const input = route.request().postDataJSON();
   data.statuses = contentLiveStatuses((input.ids ?? []).map((id: string) => virtual(id.replace(/^package:/, ""))).filter(Boolean));
  }
  if (url.pathname.endsWith("/generated-content")) {
   if (url.searchParams.has("contentKeys")) data.rows = url.searchParams.get("contentKeys")!.split(",").map(virtual).filter(Boolean);
   else if (url.searchParams.get("visibility") === "editorial") {
    if (url.searchParams.has("cursor")) await initial;
    else { data.rows = [{ ...virtual("sky-placement/article/saturn/aries"), id: "inventory-fixture", content_key: "fixture/other", headline: "Other inventory row" }]; data.nextCursor = "pending-inventory"; }
   }
   else { extendedStarted(); await extended; }
  }
  await route.fulfill({ json: data });
 });
 try {
  await page.goto("/#sky-writeups");
  await page.getByLabel("Sky placement planet or point").selectOption("saturn");
  await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
  await page.getByLabel("Sky write-up motion").selectOption("retrograde");
  await page.getByRole("button", { name: "Edit placement article", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByRole("heading", { name: "Edit Saturn in Aries", exact: true })).toBeVisible();
  await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
  await editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true }).fill("Unsaved writing stays in this editor.");
  await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeEnabled();
  await expect(editor.getByRole("button", { name: "Close", exact: true })).toBeEnabled();
  releaseInitial();
  await started;
  await expect(editor.getByRole("heading", { name: "Edit Saturn in Aries", exact: true })).toBeVisible();
  await expect(editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true })).toHaveValue("Unsaved writing stays in this editor.");
  await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeEnabled();
  releaseExtended();
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected");
  await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeEnabled();
 } finally { releaseInitial(); releaseExtended(); }
});


test("placement assembly preserves canonical article and fallback order, saved edits, and empty fields", () => {
 const row = virtual("sky-placement/article/saturn/aries")!;
 const retrograde = virtual("sky-placement/retrograde/saturn")!;
 const direct = skyPlacementAssembly([row], "article");
 const reader = renderSkyV4ReaderRoute(skyPlacementSourceCorpus, { route: "placement", planet: "saturn", sign: "aries" });
 expect(direct.parts.map(part => part.value)).toEqual(reader.readerParts);
 const rx = renderSkyV4ReaderRoute(skyPlacementSourceCorpus, { route: "placement", planet: "saturn", sign: "aries", isRetrograde: true });
 expect(skyPlacementAssembly([retrograde, row], "article").parts.map(part => part.value)).toEqual(rx.readerParts);
 const fallback = renderSkyV4ContinuousPreview(skyPlacementSourceCorpus, { planet: "saturn", sign: "aries", articleAvailable: false });
 let previous = -1;
 for (const part of skyPlacementAssembly([row], "fallback").parts) {
  const position = fallback.page.indexOf(part.value);
  expect(position).toBeGreaterThan(previous); previous = position;
 }
 const revised = { ...row, sections: { ...row.sections, packageDraft: { fallback: { hook: "Saved opening revision", lived: "" } } } };
 const fields = skyPlacementAssemblyFields(revised);
 expect(fields.find(field => field.path === "fallback.hook")?.value).toBe("Saved opening revision");
 expect(fields.find(field => field.path === "fallback.turn")?.value).toBe(row.sections.packageRecord.fallback.turn);
 expect(fields.find(field => field.path === "fallback.lived")?.value).toBe("");
 expect(skyFallbackWorkspace(revised.content_key, revised.sections)?.fields.find(field => field.key === "fallback.turn")?.value).toBe(row.sections.packageRecord.fallback.turn);
 expect(skyFallbackWorkspace(revised.content_key, revised.sections)?.fields.some(field => field.key === "fallback.lived")).toBe(true);
});
