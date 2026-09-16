import { expect, test } from "@playwright/test";
import { skyPlacementSourceRecords } from "../../api/_lib/sky-placement-sources";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`AI direction uses shared Studio sizing ${width} ${theme}`, async ({ page }) => {
    const writes: string[] = [];
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:contentAdminSecret", "direction-field-fixture");
      localStorage.setItem("tldrastro:studio-theme", theme);
    }, theme);
    await page.route("**/api/admin/**", async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== "GET") writes.push(url.pathname);
      const keys = url.searchParams.getAll("contentKeys").flatMap(value => value.split(","));
      const rows = keys.flatMap(contentKey => {
        const source = skyPlacementSourceRecords.get(contentKey);
        if (!source) return [];
        return [{ id: `package:${contentKey}`, content_key: contentKey, surface: "sky", mode: "in_depth", status: "DRAFT", lane: "reference", provider: "tldrastro-fallback-architecture-v3", headline: source.headline, body: source.body_you ?? source.body ?? "", sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role }, block_type: "fallback_hook", event_type: "fallback-hook", package_starter: true }];
      });
      await route.fulfill({ json: { ok: true, rows, statuses: [], nextCursor: null } });
    });
    await page.goto("/admin/content#sky-writeups");
    await page.getByLabel("Sky placement planet or point").selectOption("saturn");
    await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
    await page.getByRole("region", { name: "Sky placement composition map" }).getByRole("button", { name: "Edit placement article", exact: true }).click();
    const editor = page.getByRole("dialog");
    const summary = editor.locator("summary").filter({ hasText: /^AI writing$/u });
    await summary.click();
    const writer = summary.locator("..");
    const direction = writer.getByLabel("Optional direction for the evergreen draft", { exact: true });
    await expect(direction).toBeVisible();
    await expect(direction).toHaveAttribute("rows", "4");
    expect(await direction.getAttribute("style")).toBeNull();
    const geometry = await direction.evaluate(element => {
      const style = getComputedStyle(element);
      const dashboard = element.closest(".admin-dashboard")!;
      return { minHeight: style.minHeight, height: element.getBoundingClientRect().height,
        token: getComputedStyle(dashboard).getPropertyValue("--studio-textarea-height").trim(),
        font: [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing] };
    });
    expect(parseFloat(geometry.minHeight)).toBe(parseFloat(geometry.token));
    expect(geometry.height).toBeLessThanOrEqual(parseFloat(geometry.token) + 1);
    expect(geometry.font).toEqual(await editor.locator("textarea[data-sky-field]").first().evaluate(element => {
      const s = getComputedStyle(element); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing];
    }));
    await direction.scrollIntoViewIfNeeded();
    const generate = writer.getByRole("button", { name: /^Generate evergreen (revision|draft)$/u });
    await expect(generate).toBeVisible();
    const fieldBox = await direction.boundingBox(), actionBox = await generate.boundingBox();
    expect(fieldBox).not.toBeNull(); expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height - fieldBox!.y).toBeLessThan(500);
    expect(await editor.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await writer.screenshot({ path: `test-results/studio-ai-direction-${width}-${theme}.png` });
    expect(writes).toEqual([]);
  });
}
