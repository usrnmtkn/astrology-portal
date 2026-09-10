import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords, skyPlacementSourceCorpus } from "../../api/_lib/sky-placement-sources";
import { contentLiveStatuses, servingPackageRecords } from "../../api/_lib/content-live-status";
import { skyPlacementAssembly, skyPlacementAssemblyFields } from "../../apps/admin/src/skyPlacementAssembly";
import { skyFallbackWorkspace } from "../../apps/admin/src/skyFallbackWorkspace";
import { renderSkyV4ReaderRoute, renderSkyV4ContinuousPreview } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
const virtual = (key: string) => {
 const source = skyPlacementSourceRecords.get(key) ?? servingPackageRecords.get(key);
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
    data.rows = (url.searchParams.get("contentKeys") ?? "authored/transit-aspect/saturn/ascendant/hard,authored/transit-aspect/saturn/ascendant/soft").split(",").map(virtual).filter(Boolean);
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
  await expect(map.getByRole("tab", { name: "Saved preview" })).toHaveAttribute("aria-selected", "true");
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
  await expect(map.getByRole("list", { name: "Placement template order" }).locator(".admin-sky-section-reference")).toHaveText(["sky-placement/retrograde/saturn#Body", ...["tldrWhat", "tldrTakeaway", "placementArticle"].map(path => `sky-placement/article/saturn/aries#${path}`)]);
  await map.getByLabel("Placement writing path").selectOption("fallback");
  await expect(map.getByRole("list", { name: "Placement template order" }).locator(".admin-sky-section-reference")).toHaveText(["sky-placement/retrograde/saturn#Body", ...["tldrWhat", "tldrTakeaway", "fallback.hook", "fallback.lived", "fallback.turn"].map(path => `sky-placement/article/saturn/aries#${path}`)]);
  await expect(map.getByRole("button", { name: "Edit fallback opening", exact: true })).toHaveText("Saturn in Aries · Fallback opening");
  await map.getByRole("tab", { name: "Saved preview", exact: true }).click();
  const opening = map.getByRole("button", { name: "Edit fallback opening", exact: true });
  await expect(opening).toContainText(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.fallback.hook);
  await expect(map.getByRole("button", { name: "Edit placement article", exact: true })).toHaveCount(0);
  const colors = await map.locator(".admin-template-reader-copy .admin-composition-variable").evaluateAll(elements => Object.fromEntries(elements.map(el => [el.className, getComputedStyle(el).color])));
  expect(new Set(Object.values(colors)).size).toBe(3);
  await map.screenshot({ path: `test-results/saturn-fallback-${width}-${theme}.png` });
  await opening.click();
  await expect(page.getByRole("textbox", { name: "Fallback field Fallback opening", exact: true })).toBeFocused();
  const sourceEditor = page.getByRole("dialog");
  await expect(sourceEditor.getByLabel("Placement writing context")).toContainText("Saturn Rx in Aries");
  await expect(sourceEditor.getByLabel("Writing section", { exact: true })).toHaveValue("fallback.hook");
  await expect(sourceEditor.locator("details.admin-sky-related-editor")).not.toHaveAttribute("open");
  await expect(sourceEditor.locator(".admin-sky-writing-editor textarea")).toHaveCount(1);
  await sourceEditor.getByLabel("Writing section", { exact: true }).selectOption("fallback.lived");
  await expect(sourceEditor.getByRole("textbox", { name: "Fallback field Fallback: how it shows up", exact: true })).toHaveValue(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.fallback.lived);
  await sourceEditor.getByRole("button", { name: "Edit retrograde writing", exact: true }).click();
  const retrogradeBody = sourceEditor.getByRole("textbox", { name: "Fallback field Retrograde body", exact: true });
  await expect(retrogradeBody).toHaveValue(skyPlacementSourceRecords.get("sky-placement/retrograde/saturn")!.Body);
  await expect(retrogradeBody).toBeFocused();
  await expect(sourceEditor.getByLabel("Placement writing context")).toContainText("Saturn Rx in Aries");
  await expect(sourceEditor.getByLabel("Writing section", { exact: true })).toHaveValue("Body");
  await expect(sourceEditor.getByRole("heading", { level: 2 })).toHaveText(`Edit ${skyPlacementSourceRecords.get("sky-placement/retrograde/saturn")!.headline}`);
  const proseStyles = (el: Element) => { const style = getComputedStyle(el); return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing]; };
  expect(await retrogradeBody.evaluate(proseStyles)).toEqual(await map.locator(".admin-template-reader-copy .admin-composition-preview-field p").first().evaluate(proseStyles));
  await page.screenshot({ path: `test-results/saturn-rx-writing-${width}-${theme}.png` });
  await retrogradeBody.fill("Unsaved retrograde revision.");
  await sourceEditor.getByLabel("Writing section", { exact: true }).selectOption("CanonicalShort");
  await expect(sourceEditor.getByRole("textbox", { name: "Fallback field Short retrograde copy", exact: true })).toHaveValue(skyPlacementSourceRecords.get("sky-placement/retrograde/saturn")!.CanonicalShort);
  await sourceEditor.getByLabel("Writing section", { exact: true }).selectOption("Body");
  await expect(retrogradeBody).toHaveValue("Unsaved retrograde revision.");
  page.once("dialog", dialog => dialog.dismiss());
  await sourceEditor.getByRole("button", { name: "Edit shared placement writing", exact: true }).click();
  await expect(retrogradeBody).toHaveValue("Unsaved retrograde revision.");
  page.once("dialog", dialog => dialog.accept());
  await sourceEditor.getByRole("button", { name: "Edit shared placement writing", exact: true }).click();
  await expect(sourceEditor.getByRole("textbox", { name: "Fallback field Placement article", exact: true })).toHaveValue(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.placementArticle);
  const related = sourceEditor.locator("details.admin-sky-related-editor");
  await related.locator(":scope > summary").click();
  await expect(related).toHaveAttribute("open");
  await related.locator(".admin-sky-related-group > summary").first().click();
  await expect(related.getByLabel("Find an aspect passage", { exact: true })).toBeVisible();
  await expect(related.locator(".admin-sky-related-row")).toHaveCount(2);
  await expect(related.locator(".admin-sky-related-row").first()).toContainText(servingPackageRecords.get("authored/transit-aspect/saturn/ascendant/hard")!.body_you);
  await related.locator(".admin-sky-related-row").first().scrollIntoViewIfNeeded();
  expect(await related.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `test-results/saturn-related-form-${width}-${theme}.png` });
  const articleField = sourceEditor.getByRole("textbox", { name: "Fallback field Placement article", exact: true });
  await articleField.fill("Keep my article edits while reviewing related passages.");
  await expect(related.getByRole("button", { name: "Edit house-aware reader override", exact: true })).toHaveCount(0);
  page.once("dialog", dialog => dialog.dismiss());
  await related.getByRole("button", { name: "Edit reusable source", exact: true }).first().click();
  await expect(articleField).toHaveValue("Keep my article edits while reviewing related passages.");
  await articleField.fill(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.placementArticle);
  await related.getByLabel("Find an aspect passage", { exact: true }).fill("no matching passage");
  await expect(related.getByText("No aspect passages match this search.", { exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
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
  await expect(map.getByRole("button", { name: "Edit placement passage", exact: true })).toContainText("The Moon moves into Aries");
  await expect(map.getByRole("alert")).toHaveCount(0);
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

test("retrograde editor saves two revisions to its own source and preserves the short copy", async ({ page }) => {
 const key = "sky-placement/retrograde/saturn";
 let saved: any = null;
 const writes: any[] = [];
 await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "sky-editor-save-test"));
 await page.route("**/api/admin/**", async route => {
  const url = new URL(route.request().url());
  let data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
  if (url.pathname.endsWith("/generated-content")) {
   if (route.request().method() === "GET") data.rows = saved && url.searchParams.get("id") === saved.id
     ? [saved] : (url.searchParams.get("contentKeys") ?? "").split(",").map(k => k === key && saved ? saved : virtual(k)).filter(Boolean);
   else {
    const input = route.request().postDataJSON(); writes.push(input);
    if (input.ownerAction) {
     expect(input.id).toBe("saved-saturn-retrograde");
     saved = { ...saved, status: "LIVE", lane: "serving", sections: { packageRecord: saved.sections.packageDraft }, updated_at: `2026-09-08T06:00:0${writes.length}Z` };
    } else {
     expect(input.contentKey ?? saved?.content_key).toBe(key);
     saved = { ...virtual(key), id: "saved-saturn-retrograde", package_starter: false, sections: input.sections, updated_at: `2026-09-08T06:00:0${writes.length}Z` };
    }
    data.rows = [saved];
   }
  }
  await route.fulfill({ json: data });
 });
 await page.goto("/#sky-writeups");
 await page.getByLabel("Sky placement planet or point").selectOption("saturn");
 await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
 await page.getByLabel("Sky write-up motion").selectOption("retrograde");
 await page.getByRole("button", { name: "Edit placement article", exact: true }).click();
 const editor = page.getByRole("dialog");
 await editor.getByRole("button", { name: "Edit retrograde writing", exact: true }).click();
 const body = editor.getByRole("textbox", { name: "Fallback field Retrograde body", exact: true });
 for (const revision of ["First saved test revision.", "Second saved test revision."]) {
  await body.fill(revision);
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect.poll(() => saved?.sections.packageRecord.Body).toBe(revision);
  await expect(body).toHaveValue(revision);
  expect(saved.sections.packageRecord.CanonicalShort).toBe(skyPlacementSourceRecords.get(key)!.CanonicalShort);
  await expect(editor.getByLabel("Placement writing context")).toContainText("Saturn Rx in Aries");
 }
 expect(writes.filter(write => write.ownerAction)).toHaveLength(2);
 await editor.getByRole("button", { name: "Edit shared placement writing", exact: true }).click();
 await expect(editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true })).toHaveValue(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.placementArticle);
 await editor.getByRole("button", { name: "Edit retrograde writing", exact: true }).click();
 await expect(body).toHaveValue("Second saved test revision.");
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
 test(`evergreen sections add arrange skip and publish twice ${width} ${theme}`, async ({ page }) => {
  const key = "sky-placement/article/saturn/aries";
  let saved: any = null;
  let version = 0;
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "evergreen-fixture"));
  await page.route("**/api/admin/**", async route => {
   const url = new URL(route.request().url());
   const data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
   if (url.pathname.endsWith("/generated-content")) {
    if (route.request().method() === "GET") data.rows = saved && url.searchParams.get("id") === saved.id
     ? [saved] : (url.searchParams.get("contentKeys") ?? "").split(",").map(k => k === key && saved ? saved : virtual(k)).filter(Boolean);
    else {
     const input = route.request().postDataJSON(); version++;
     saved = input.ownerAction
      ? { ...saved, status: "LIVE", lane: "serving", sections: { packageRecord: saved.sections.packageDraft } }
      : { ...virtual(key), id: "saved-evergreen", package_starter: false, sections: input.sections };
     saved.updated_at = new Date(Date.UTC(2026, 8, 8, 10, 0, version)).toISOString();
     data.rows = [saved];
    }
   }
   await route.fulfill({ json: data });
  });
  await page.goto("/#sky-writeups");
  await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
  await page.getByLabel("Sky placement planet or point").selectOption("saturn");
  await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
  const map = page.getByRole("region", { name: "Sky placement composition map" });
  await map.getByLabel("Placement writing path").selectOption("fallback");
  await expect(map.getByRole("button", { name: "Preview evergreen in app" })).toBeVisible();
  await map.getByRole("button", { name: "Edit fallback opening", exact: true }).click();
  const editor = page.getByRole("dialog");
  const order = editor.getByRole("list", { name: "Evergreen section order" });
  await expect(order.locator("li")).toHaveCount(3);
  await editor.getByRole("button", { name: "Add section", exact: true }).click();
  await expect(order.locator("li")).toHaveCount(4);
  await editor.getByLabel("Section name", { exact: true }).fill("Additional passage");
  const body = editor.getByRole("textbox", { name: "Fallback field Additional passage", exact: true });
  await expect(body).toHaveValue("");
  await expect(order.locator("li").last()).toContainText("Empty · skipped");
  await body.fill("During this transit, fixture additional paragraph one.");
  for (let index = 0; index < 3; index++) await editor.getByRole("button", { name: "Move Additional passage up", exact: true }).click();
  await expect(order.locator("li").first()).toContainText("Additional passage");
  await expect(editor.getByRole("button", { name: "Move Additional passage up", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "Move Additional passage down", exact: true }).click();
  await expect(order.locator("li").nth(1)).toContainText("Additional passage");
  await editor.getByRole("button", { name: "Move Additional passage up", exact: true }).click();
  page.once("dialog", dialog => dialog.dismiss());
  await editor.getByRole("button", { name: "Remove Additional passage", exact: true }).click();
  await expect(order.locator("li")).toHaveCount(4);
  await editor.getByLabel("Writing section", { exact: true }).selectOption("fallback.lived");
  await editor.getByRole("textbox", { name: "Fallback field Fallback: how it shows up", exact: true }).fill("");
  await expect(order.locator("li").filter({ hasText: "Fallback: how it shows up" })).toContainText("Empty · skipped");
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect.poll(() => saved?.sections.packageRecord?.fallback?.sections?.[0]?.label).toBe("Additional passage");
  expect(saved.sections.packageRecord.fallback.lived).toBe("");
  await editor.getByRole("button", { name: "Additional passage Has writing · retrograde", exact: true }).click();
  await body.fill("During this transit, fixture additional paragraph two.");
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect.poll(() => saved?.sections.packageRecord?.fallback?.sections?.[0]?.body).toBe("During this transit, fixture additional paragraph two.");
  const typography = (el: Element) => { const s = getComputedStyle(el); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing]; };
  for (const paragraph of await editor.locator(".admin-evergreen-sections > p").all()) expect(await paragraph.evaluate(typography)).toEqual(await editor.getByLabel("Placement writing context").locator("p").evaluate(typography));
  expect(await editor.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await editor.locator(".admin-evergreen-sections").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/evergreen-sections-${width}-${theme}.png` });
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await map.getByRole("button", { name: "Edit additional passage", exact: true }).click();
  await expect(body).toHaveValue("During this transit, fixture additional paragraph two.");
  await expect(order.locator("li").first()).toContainText("Additional passage");
  await editor.getByRole("button", { name: "Add section", exact: true }).click();
  await editor.getByRole("button", { name: "Remove New section", exact: true }).click();
  await expect(order.locator("li")).toHaveCount(4);
 });
}
