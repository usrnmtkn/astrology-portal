import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords } from "../../api/_lib/sky-placement-sources";
import { contentLiveStatuses } from "../../api/_lib/content-live-status";
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
  await expect(map.getByRole("article", { name: "Retrograde source" })).toContainText(skyPlacementSourceRecords.get("sky-placement/retrograde/saturn")!.Body);
  await expect(map.getByRole("article", { name: "Planet-in-sign source" })).toContainText("The beginning matters more when it can survive the part nobody claps for.");
  await expect(map.getByRole("button", { name: "Edit fallback opening", exact: true })).toBeVisible();
  await expect(map.getByText("Live", { exact: true })).toHaveCount(2);
  const headingStyle = await map.getByRole("heading").evaluate(el => {
   const style = getComputedStyle(el);
   return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.margin, style.textTransform, style.textAlign];
  });
  await page.screenshot({ path: `test-results/saturn-map-${width}-${theme}.png`, fullPage: true });
  await map.getByRole("button", { name: "Edit placement article", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByRole("heading", { name: "Edit Saturn in Aries" })).toBeVisible();
  await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
  await expect(editor.getByRole("textbox", { name: "Fallback field Placement article", exact: true })).toHaveValue(skyPlacementSourceRecords.get("sky-placement/article/saturn/aries")!.placementArticle);
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
  await expect(map.getByRole("article", { name: "Planet-in-sign source" })).toBeVisible();
  await map.getByLabel("Composition planet or point").selectOption("moon");
  await expect(map.getByRole("alert")).toBeVisible();
  await expect(map.getByRole("status")).toContainText("Source unavailable");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
 });
}
