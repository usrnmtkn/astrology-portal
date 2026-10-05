import { expect, test } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";
import { moonStudioRows } from "../helpers/sky-moon-studio";
import { skyMoonWriteupKeys } from "../../apps/admin/src/skyMoonWriteup";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
 test(`Moon complete write-up discovery edit and reload ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(150_000);
  const originals = moonStudioRows();
  // Production Moon passages have an empty Friend variant. It must not make
  // the exact published You revision appear Inactive after reopening Studio.
  for (const row of originals.filter(row => skyMoonWriteupKeys("cancer").includes(row.content_key))) row.sections.packageRecord.body_they = "";
  const placeholder = { ...originals[0], id: "00000000-0000-4000-8000-000000000100", content_key: "sky-placement/article/moon/cancer",
   headline: "Moon in Cancer", body: "", sections: { packageRecord: { contentKey: "sky-placement/article/moon/cancer", studio_content_type: "continuous-placement", placementArticle: "" } } };
  const store = await studioApiStore([...originals, placeholder], { uuidIds: true });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
   await page.context().route("**/*", route => {
    const request = route.request();
    if (new URL(request.url()).pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method())) return route.abort();
    return route.continue();
   });
   await page.setViewportSize({ width, height: 1000 });
   await page.clock.setFixedTime(new Date("2026-10-03T15:00:00Z"));
   await page.addInitScript(value => {
    localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
    localStorage.setItem("tldrastro:studio-theme", value);
    localStorage.setItem("tldrastro:theme", value);
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" }));
   }, theme);
   await page.route("**/content-studio-last-known-good.json", route => route.fulfill({ json: {
    schema: "content-studio-last-known-good-v2", rows: [], publications: [], rowCount: 0
   } }));
   await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
   await page.route("**/api/content-publications", async route => route.fulfill({ json: {
    schema: "tldr-publications/v1", publications: await store.call({ method: "publications" })
   } }));
   await page.route("**/api/content-reader", async route => {
    const result = await store.call({ method: "POST", url: "/api/content-reader", body: route.request().postDataJSON() });
    return route.fulfill({ status: result.status, json: result.payload });
   });
   await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
   await page.route("**/api/admin/**", async route => {
    const request = route.request(), url = new URL(request.url());
    if (["/api/admin/generated-content", "/api/admin/generated-content-inventory", "/api/admin/content-publication", "/api/admin/content-live-status"].includes(url.pathname)) {
     const result = await store.call({ method: request.method(), url: url.pathname + url.search, body: request.method() === "GET" ? undefined : request.postDataJSON() });
     return route.fulfill({ status: result.status, json: result.payload });
    }
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
   });
   await page.goto("/admin/content#sky-writeups");
   await page.getByLabel("Sky placement planet or point").selectOption("moon");
   await page.getByLabel("Sky placement zodiac sign").selectOption("cancer");
   const map = page.getByRole("region", { name: "Sky placement composition map" });
   const table = page.getByRole("complementary", { name: "Sky write-up rows" });
   const keys = skyMoonWriteupKeys("cancer");
   const labels = ["Opening", "How it shows up", "Challenge and response"];
   const copies = keys.map(key => originals.find(row => row.content_key === key)!.body);
   for (let index = 0; index < keys.length; index++) {
    await expect(map.getByRole("button", { name: `Edit ${labels[index].toLowerCase()}`, exact: true })).toHaveText(copies[index]);
    await expect(map.getByRole("button", { name: `Edit ${labels[index].toLowerCase()}`, exact: true })).toHaveCSS("white-space", "pre-wrap");
    await expect(table.getByRole("row").filter({ hasText: `Moon in Cancer · ${labels[index]}` })).toHaveCount(1);
   }
   await expect(table).not.toContainText("sky-placement/article/moon/cancer");
   await expect(table.getByRole("row").filter({ has: page.getByRole("button", { name: "Edit", exact: true }) })).toHaveCount(3);
   await page.getByLabel("Sky write-up motion").selectOption("direct");
   await expect(table.getByRole("row").filter({ has: page.getByRole("button", { name: "Edit", exact: true }) })).toHaveCount(3);
   await expect(map.locator(".admin-template-reader-copy .admin-eyebrow")).toHaveText(["Headline", ...labels]);
   await expect(map.getByRole("heading")).toHaveText("Moon in Cancer");
   const labelStyles = await map.locator(".admin-template-reader-copy .admin-eyebrow").evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.margin, style.textTransform, style.textAlign];
   }));
   for (const style of labelStyles) expect(style).toEqual(labelStyles[0]);
   const before = await store.call({ method: "rows" });
   expect(before).toEqual([...originals, placeholder]);
   await map.getByRole("tab", { name: "Main template", exact: true }).click();
   await expect(map.getByRole("list", { name: "Placement template order" }).locator(".admin-sky-section-reference")).toHaveText(keys.map(key => `${key}#body_you`));
   await map.getByRole("tab", { name: "Saved preview", exact: true }).click();
   await page.evaluate(() => window.scrollTo(0, 0));
   await page.screenshot({ path: `test-results/moon-complete-${width}-${theme}.png`, fullPage: true });
   for (let index = 0; index < keys.length; index++) {
    // Exercise both discovery routes: the list and the exact colored passage.
    if (index === 1) await table.getByRole("row").filter({ hasText: `Moon in Cancer · ${labels[index]}` }).getByRole("button", { name: "Edit", exact: true }).click();
    else await map.getByRole("button", { name: `Edit ${labels[index].toLowerCase()}`, exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    const field = editor.getByRole("textbox", { name: "Reader phrase · You", exact: true });
    await expect(field).toHaveValue(copies[index]);
    const revised = `Synthetic Moon section ${index + 1} opening.\n\nSynthetic complete closing sentence ${index + 1}.`;
    await field.fill(revised);
    await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
    await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.content_key === keys[index] && row.status === "LIVE")?.sections.packageRecord.body_you).toBe(revised);
    await expect(editor.getByRole("alert")).toHaveCount(0);
    copies[index] = revised;
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page.getByLabel("Sky placement planet or point").selectOption("moon");
    await page.getByLabel("Sky placement zodiac sign").selectOption("cancer");
    for (let section = 0; section < keys.length; section++) await expect(map.getByRole("button", { name: `Edit ${labels[section].toLowerCase()}`, exact: true })).toHaveText(copies[section]);
    await expect(table.getByRole("row").filter({ hasText: `Moon in Cancer · ${labels[index]}` }).locator(".studio-status-badge:visible").first()).toHaveText("Live");
   }
   const saved = await store.call({ method: "rows" });
   for (const row of originals.filter(row => !keys.includes(row.content_key))) expect(saved.find((item: any) => item.id === row.id)).toEqual(row);
   for (const key of keys) expect(saved.find((row: any) => row.content_key === key && row.status === "LIVE").sections.packageRecord.body_they).toBe(originals.find(row => row.content_key === key)!.sections.packageRecord.body_they);
   await page.getByRole("searchbox", { name: "Search Sky write-ups", exact: true }).fill("no matching moon section");
   await expect(table).toContainText("No Sky write-ups match");
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

   // Studio success is insufficient: follow its real publication receipts and
   // reader handler through the shipped App to the complete reader article.
   await page.goto("/?date=2026-10-03#sky/placement/moon/cancer");
   const article = page.locator(".sky-detail-article .article-body-inner").first();
   const assertCompleteWriteup = async () => {
    await expect(article.locator("p")).toHaveText(copies.flatMap(copy => copy.split("\n\n")), { timeout: 45_000 });
    const text = await article.innerText();
    expect(text.indexOf(copies[0].split("\n")[0])).toBeLessThan(text.indexOf(copies[1].split("\n")[0]));
    expect(text.indexOf(copies[1].split("\n")[0])).toBeLessThan(text.indexOf(copies[2].split("\n")[0]));
   };
   await assertCompleteWriteup();
   await page.reload();
   await assertCompleteWriteup();
   await page.screenshot({ path: `test-results/moon-published-reader-${width}-${theme}.png`, fullPage: true });

   // Each required Moon section remains governed by its own publication; a
   // retired opening, middle or ending must not resurrect packaged old copy.
   const retiredKey = keys[width === 390 ? (theme === "light" ? 0 : 1) : 2];
   const live = saved.find((row: any) => row.content_key === retiredKey && row.status === "LIVE");
   const retired = await store.call({ method: "POST", url: "/api/admin/content-publication", body: {
    action: "retire", contentKey: retiredKey, id: live.id, expectedUpdatedAt: live.updated_at
   } });
   expect(retired.status, JSON.stringify(retired.payload)).toBe(200);
   await page.reload();
   await expect(page.getByRole("heading", { name: "Moon in Cancer", exact: true })).toBeVisible();
   await expect(page.locator(".sky-detail-article")).toBeVisible();
   await expect(article).toHaveCount(0);
   await expect(page.locator(".sky-detail-article")).not.toContainText("Synthetic Moon section");
   expect(errors).toEqual([]);
  } finally {
   // Stop reader hydration while its isolated API is still available, then
   // drain both routing layers before terminating the fixture process.
   try {
    await page.goto("about:blank");
    await page.unrouteAll({ behavior: "wait" });
    await page.context().unrouteAll({ behavior: "wait" });
   } finally { store.close(); }
  }
 });
}
