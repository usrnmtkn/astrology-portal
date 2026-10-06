import fs from "node:fs";
import { test, expect } from "@playwright/test";

const key = "fallback-hook/bond-effect-sextile/mars";
const pair = process.env.RELATIONSHIP_TEMPLATE_FIXTURE
  ? JSON.parse(fs.readFileSync(process.env.RELATIONSHIP_TEMPLATE_FIXTURE, "utf8"))
  : { you: "You and {{holder1}} preserve the authored opening. The exact ending stays.", friend: "{{holder1}} preserves the separate perspective. Its exact ending stays too." };

for (const variant of [
  { width: 1440, height: 1000, theme: "light" },
  { width: 1440, height: 1000, theme: "dark" },
  { width: 390, height: 844, theme: "light" },
  { width: 390, height: 844, theme: "dark" }
]) test(`Exact stored pair and revision selection ${variant.width} ${variant.theme}`, async ({ page }) => {
  await page.setViewportSize(variant);
  await page.addInitScript(theme => {
    localStorage.setItem("tldrastro:contentAdminSecret", "template-integrity-fixture");
    localStorage.setItem("tldrastro:studio-theme", theme);
  }, variant.theme);
  const current = { body_you: "Current saved version, different by identity.", body_they: "Current saved friend version." };
  const source = { body_you: pair.you, body_they: pair.friend };
  const row = { id: "fixture-mars", content_key: key, status: "DRAFT", lane: "reference", surface: "relationship", mode: "feed", provider: "tldrastro-fallback-architecture-v3", block_type: "fallback_hook", updated_at: "2026-10-05T23:51:20Z", headline: "Mars", facts: { fallbackArchitectureV3: true, content_role: "fallback_hook" }, sections: {
    packageDraft: current, packageRecord: { ...source, contentKey: key },
    dashboardEditHistory: [{ versionId: "exact-authored", editedAt: "2026-10-05T22:52:14Z", packageDraft: source }, { versionId: "partial", packageDraft: { body_you: pair.you } }]
  } };
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const readOnlyStatusLookup = url.pathname.endsWith("/content-live-status") && route.request().method() === "POST";
    if ((!readOnlyStatusLookup && route.request().method() !== "GET") || /(?:generate|preview-write|writer|openai)/u.test(url.pathname.replace("generated-content", "content"))) unexpected.push(route.request().method() + " " + url.pathname);
    const exact = url.searchParams.get("contentKey");
    if (url.pathname.endsWith("/generated-content-inventory") || url.pathname.endsWith("/generated-content")) {
      return route.fulfill({ json: { ok: true, rows: !exact || exact === key ? [row] : [], nextCursor: null } });
    }
    return route.fulfill({ json: { ok: true, rows: [], records: [], statuses: [], nextCursor: null, packageSource: null } });
  });
  const route = "/admin/content#fallback-hooks?section=friends&audience=friends&workspace=between-you-two&q=Mars+sextile+your+Sun";
  await page.goto(route);
  const map = page.getByRole("region", { name: "Between you two composition map" });
  await expect(map.getByRole("button", { name: "Edit You opening", exact: true })).toHaveText(current.body_you);
  await page.getByLabel("Opening version", { exact: true }).selectOption("exact-authored");
  for (const [audience, button] of [["you", "Edit You opening"], ["friend", "Edit Friend opening"]]) {
    await expect.poll(() => map.getByRole("button", { name: button, exact: true }).textContent()).toBe(pair[audience].split("{{holder1}}").join("Name"));
  }
  await expect(map.getByText("Transit hits your chart", { exact: true })).toBeVisible();
  await expect(map.getByText("Transit hits their chart", { exact: true })).toBeVisible();
  await map.getByRole("tab", { name: "Main template", exact: true }).click();
  await expect(map.getByText(pair.you, { exact: true })).toBeVisible();
  await expect(map.getByText(pair.friend, { exact: true })).toBeVisible();
  await map.getByRole("tab", { name: "Saved preview", exact: true }).click();
  await map.getByLabel("Preview friend name").fill("O'Neil $&");
  await expect.poll(() => map.getByRole("button", { name: "Edit Friend opening", exact: true }).textContent()).toBe(pair.friend.split("{{holder1}}").join("O'Neil $&"));
  await page.getByLabel("Opening version", { exact: true }).selectOption("partial");
  await expect(page.getByRole("alert")).toHaveText(/missing friend perspective/);
  await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText("No Friend opening saved. Select to write this section.");
  await page.getByLabel("Opening version", { exact: true }).selectOption("exact-authored");
  await map.getByLabel("Preview friend name").fill("Name");
  await map.locator(".admin-template-reader-surface").first().screenshot({ path: `test-results/relationship-exact-${variant.width}-${variant.theme}.png` });
  await page.reload();
  await expect(map.getByRole("button", { name: "Edit You opening", exact: true })).toHaveText(current.body_you);
  await page.getByLabel("Opening version", { exact: true }).selectOption("exact-authored");
  await expect.poll(() => map.getByRole("button", { name: "Edit Friend opening", exact: true }).textContent()).toBe(pair.friend.split("{{holder1}}").join("Name"));
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
