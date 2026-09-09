import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords } from "../../api/_lib/sky-placement-sources";

const key = "sky-placement/article/saturn/aries";
const template = "Fixture {{planetTitle}} in {{signTitle}}, {{motion}}. Entry: {{entryDate}}.";
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
 test(`Sky variable insertion and named template ${width} ${theme}`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "sky-variable-fixture"));
  await page.route("**/api/admin/**", async route => {
   const url = new URL(route.request().url());
   const rows = (url.searchParams.get("contentKeys") ?? "").split(",").flatMap(contentKey => {
    const baseline = skyPlacementSourceRecords.get(contentKey);
    if (!baseline) return [];
    const source = contentKey === key ? { ...baseline, placementArticle: template, fallback: { ...baseline.fallback, hook: template } } : baseline;
    return [{ id: `package:${contentKey}`, content_key: contentKey, surface: "sky", mode: "in_depth", status: "DRAFT", lane: "reference", provider: "tldrastro-fallback-architecture-v3", headline: source.headline, summary: source.summary, body: source.body_you, sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role }, block_type: "fallback_hook", event_type: "fallback-hook", package_starter: true }];
   });
   await route.fulfill({ json: { ok: true, rows, statuses: [], nextCursor: null } });
  });
  await page.goto("/#sky-writeups");
  await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
  await page.getByLabel("Sky placement planet or point").selectOption("saturn");
  await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
  await page.getByLabel("Sky write-up motion").selectOption("retrograde");
  const map = page.getByRole("region", { name: "Sky placement composition map" });
  await expect(map.getByRole("button", { name: "Edit placement article", exact: true })).toContainText("Fixture Saturn in Aries, retrograde. Entry: {{entryDate}}.");
  await map.getByLabel("Placement writing path").selectOption("fallback");
  await map.getByRole("tab", { name: "Main template", exact: true }).click();
  const list = map.getByRole("list", { name: "Placement template order" });
  const opening = list.locator("li").filter({ has: page.getByRole("button", { name: "Edit fallback opening", exact: true }) });
  await expect(opening.getByRole("button")).toHaveText("Saturn in Aries · Fallback opening");
  await expect(opening.locator(".admin-sky-section-reference")).toHaveText(`${key}#fallback.hook`);
  await expect(opening.locator(".admin-sky-template-comparison > div").first()).toContainText(template);
  await expect(opening.locator(".admin-sky-template-comparison > div").last()).toContainText("Fixture Saturn in Aries, retrograde. Entry: {{entryDate}}.");
  await expect(opening.locator(".variable-fact")).toHaveCount(3);
  await expect(opening.locator(".variable-unmapped")).toHaveText("{{entryDate}}");
  const labelStyle = (el: Element) => { const s = getComputedStyle(el); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.textTransform]; };
  expect(await opening.locator(".admin-eyebrow").first().evaluate(labelStyle)).toEqual(await map.locator("header .admin-eyebrow").evaluate(labelStyle));
  await opening.screenshot({ path: `test-results/sky-variable-template-${width}-${theme}.png` });
  await opening.getByRole("button").click();
  const editor = page.getByRole("dialog");
  const writing = editor.locator(".admin-sky-writing-editor textarea");
  await writing.fill("Before TARGET after");
  await writing.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(7, 13));
  await editor.locator(".admin-sky-variable-key > summary").click();
  await editor.getByRole("button", { name: "Insert {{signTitle}}", exact: true }).click();
  await expect(writing).toHaveValue("Before {{signTitle}} after");
  await expect(writing).toBeFocused();
  expect(await writing.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(20);
  await editor.getByText("Preview this section", { exact: true }).click();
  await expect(editor.locator(".admin-sky-writing-preview")).toHaveText("Before Aries after");
  await writing.fill("{{unknown}}");
  await expect(writing).toHaveAttribute("aria-invalid", "true");
  await expect(editor.getByRole("alert")).toContainText("Unknown Sky variable {{unknown}}");
  await writing.fill("");
  await expect(writing).not.toHaveAttribute("aria-invalid", "true");
  await expect(editor.locator(".admin-sky-writing-preview")).toHaveText("No writing saved for this section.");
  await editor.getByLabel("Writing section", { exact: true }).selectOption("placementArticle");
  await writing.fill("{{planetTitle}} in {{signTitle}}");
  await expect(editor.locator(".admin-sky-writing-preview")).toHaveText("Saturn in Aries");
  expect(await editor.locator(".admin-sky-variable-key p").first().evaluate(labelStyle)).toEqual(await writing.evaluate(labelStyle));
  await editor.locator(".admin-sky-variable-key").screenshot({ path: `test-results/sky-variable-key-${width}-${theme}.png` });
  expect(await editor.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
 });
}
