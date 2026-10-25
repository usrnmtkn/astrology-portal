import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { studioApiStore } from "../helpers/studio-api-store";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { bundledPublications } from "../helpers/bundled-publications";
import { skyPlacementSourceFixture } from "../helpers/sky-placement-source-fixture.mts";
import { expectStudioReadingType } from "../helpers/studio-readability";

const key = "article/manual/scorpio-season-2026";
const title = "Synthetic Scorpio Season 2026 article";
const body = "Synthetic complete season opening.\n\n## Synthetic lunar section\n\nSynthetic complete season ending.";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Sky keeps dated season status separate from optional linked articles ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await skyPlacementSourceFixture('sun', 'libra');
    const store = await studioApiStore([fixture.active]);
    const writes: unknown[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await bundledPublications(page);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      } });
      await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
      await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await page.goto('/admin/content#sky-writeups?planet=sun&sign=libra');
      const visits = page.getByRole('region', { name: 'Saved visits', exact: true });
      await expect(visits).toContainText(fixture.edition.headline);
      await expect(visits).toContainText('Published');
      const linked = page.locator('details[aria-label="Additional linked season article"]');
      await expect(linked).not.toHaveAttribute('open', '');
      await expect(page.getByText('No article saved for this season and year.', { exact: true })).not.toBeVisible();
      await linked.locator(':scope > summary').click();
      const workspace = linked.getByRole('region', { name: 'Year-specific season article', exact: true });
      await workspace.getByLabel('Season year', { exact: true }).fill('2026');
      await expect(workspace.getByRole('status')).toHaveText('No additional linked article saved for this season and year.');
      await expect(workspace).toContainText('separate from the dated Sky reading');
      await expect(visits).toContainText('Published');
      await expectStudioReadingType(workspace.locator(':scope > p').first());
      const typography = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
      };
      expect(await linked.locator(':scope > summary').evaluate(typography))
        .toEqual(await page.getByText('Content library sources', { exact: true }).evaluate(typography));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sky Write-ups');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await linked.screenshot({ path: `test-results/season-linked-status-${width}-${theme}.png` });
      await linked.locator(':scope > summary').click();
      await page.reload();
      await expect(linked).not.toHaveAttribute('open', '');
      await expect(visits).toContainText('Published');
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });

  test(`one season article saves and reopens from Calendar and Sky ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore([], { uuidIds: true });
    let failRead = false;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme", theme);
        localStorage.setItem("tldrastro:theme", theme);
      }, theme);
      await bundledPublications(page);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname === "/api/content-reader") {
          const result = await store.call({ method: "POST", url: url.pathname, body: route.request().postDataJSON() });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        return false;
      } });
      await page.route("**/api/admin/generated-content-inventory?**", async route => {
        const url = new URL(route.request().url());
        if (!url.searchParams.has("contentKeys")) return route.fallback();
        if (failRead) return route.fulfill({ status: 503, json: { error: "Synthetic read failure" } });
        return route.fallback();
      });
      await page.goto("/admin/content#calendar-writeups?view=season-writeups");
      const workspace = page.getByRole("region", { name: "Year-specific season article", exact: true });
      await workspace.getByLabel("Article season", { exact: true }).selectOption("scorpio");
      await workspace.getByLabel("Season year", { exact: true }).fill("2026");
      await expect(workspace.getByRole("status")).toHaveText("No article saved for this season and year.");
      expect(await store.call({ method: "rows" })).toEqual([]);
      await workspace.getByRole("button", { name: "Write Scorpio Season 2026 article", exact: true }).click();
      const editor = page.getByRole("dialog");
      await expect(editor.getByLabel("Article title", { exact: true })).toHaveValue("Scorpio Season 2026");
      await editor.getByLabel("Article title", { exact: true }).fill(title);
      await editor.getByLabel("Article body", { exact: true }).fill(body);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.content_key === key)?.body).toBe(body);
      const saved = (await store.call({ method: "rows" })).find((row: any) => row.content_key === key);
      expect(saved.summary).toBe("");
      expect(saved.status).toBe("DRAFT");
      await page.goto("/admin/content#sky-writeups");
      await page.reload();
      await page.getByLabel("Sky placement planet or point", { exact: true }).selectOption("sun");
      await page.getByLabel("Sky placement zodiac sign", { exact: true }).selectOption("scorpio");
      await page.getByText('Additional linked season article', { exact: true }).click();
      await workspace.getByLabel("Season year", { exact: true }).fill("2026");
      await workspace.getByRole("button", { name: "Open Scorpio Season 2026 article", exact: true }).click();
      await expect(editor.getByLabel("Article body", { exact: true })).toHaveValue(body);
      await expect(editor.getByLabel("Article title", { exact: true })).toHaveValue(title);
      await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.id === saved.id)?.status).toBe("LIVE");
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      await workspace.getByRole("button", { name: "Open Scorpio Season 2026 article", exact: true }).click();
      const revised = body + "\n\nSynthetic latest saved paragraph.";
      await editor.getByLabel("Article body", { exact: true }).fill(revised);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.id === saved.id)?.body).toBe(revised);
      await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" })).find((row: any) => row.id === saved.id)?.status).toBe("LIVE");
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      await workspace.getByLabel("Season year", { exact: true }).fill("2027");
      await expect(workspace.getByRole("status")).toHaveText("No additional linked article saved for this season and year.");
      await expect(workspace.getByRole("button", { name: "Write Scorpio Season 2027 article", exact: true })).toBeEnabled();
      failRead = true;
      await workspace.getByLabel("Season year", { exact: true }).fill("2028");
      await expect(workspace.getByRole("alert")).toContainText("saved article could not load");
      await expect(workspace.getByRole("button", { name: "Write Scorpio Season 2028 article", exact: true })).toBeDisabled();
      failRead = false;
      await workspace.getByRole("button", { name: "Retry article", exact: true }).click();
      await expect(workspace.getByRole("status")).toHaveText("No additional linked article saved for this season and year.");
      await workspace.getByLabel("Season year", { exact: true }).fill("2026");
      await expect(workspace.getByRole("status")).toContainText(title);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/season-article-studio-${width}-${theme}.png`, fullPage: true });

      // Render both actual access-point components with calculated-event fixtures,
      // then follow each link into the real app's article reader and actual API.
      const bundled = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
        import React from 'react'; import {createRoot} from 'react-dom/client';
        import {SkyDetailArticle} from './apps/web/src/features/sky/SkyDetailArticle';
        import {CalendarEventReading} from './apps/web/src/features/calendar/CalendarEventReading';
        const year=new URLSearchParams(location.search).get('year')||'2026';
        const context={sign:'Scorpio',startsAt:year+'-10-23T09:37:57Z',timeZone:'America/New_York'};
        const isCalendar=new URLSearchParams(location.search).get('from')==='calendar';
        createRoot(document.getElementById('root')).render(isCalendar ? <CalendarEventReading
          event={{type:'ingress',planet:'Sun',sign:'Scorpio',toSign:'Scorpio',startsAt:context.startsAt,title:'Sun enters Scorpio'}}
          title="Scorpio season" dateLine="October 23, 2026" paragraphs={[]} onClose={()=>{}} timeZone={context.timeZone}/>
          : <SkyDetailArticle detail={{title:'Sun in Scorpio',meta:'Scorpio',glyph:'☉',kicker:'Sky',body:[],seasonArticle:context}} onClose={()=>{}}/>);
      ` }, bundle: true, format: "esm", write: false, jsx: "automatic", external: ["module"], loader: { ".css": "empty" }, define: { "import.meta.env": "{}" }, logLevel: "silent" });
      const css = readFileSync("apps/web/dist/index.html", "utf8").match(/<link[^>]+rel="stylesheet"[^>]*>/gu)?.join("") ?? "";
      const readerCss = readdirSync("apps/web/dist/assets").filter(name => /^(?:styles|LunarCalendar|lunar-calendar|CalendarRoute)-.*\.css$/u.test(name))
        .map(name => `<link rel="stylesheet" href="/assets/${name}">`).join("");
      await page.route("**/__season-access.js", route => route.fulfill({ contentType: "text/javascript", body: bundled.outputFiles[0].text }));
      await page.route("**/__season-access?**", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="${theme}"><head>${css}${readerCss}</head><body><div id="root"></div><script type="module" src="/__season-access.js"></script></body></html>` }));
      for (const from of ["sky", "calendar"]) {
        await page.goto(`/__season-access?from=${from}&year=2027`);
        await expect(page.getByRole("link", { name: /Read Scorpio Season/ })).toHaveCount(0);
        await page.goto(`/__season-access?from=${from}`);
        const link = page.getByRole("link", { name: "Read Scorpio Season 2026", exact: true });
        await expect(link).toHaveAttribute("href", `/#articles/${encodeURIComponent(key)}`);
        await page.screenshot({ path: `test-results/season-article-${from}-${width}-${theme}.png`, fullPage: true });
        await link.click();
        await expect(page.locator(".learn-article-body")).toContainText("Synthetic complete season opening.");
        await expect(page.locator(".learn-article-body")).toContainText("Synthetic complete season ending.");
        await expect(page.locator(".learn-article-body h2")).toHaveText("Synthetic lunar section");
        await page.reload();
        await expect(page.locator(".learn-article-body")).toContainText("Synthetic complete season ending.");
        await page.screenshot({ path: `test-results/season-article-reader-${width}-${theme}.png`, fullPage: true });
      }
      expect((await store.call({ method: "rows" })).filter((row: any) => row.content_key === key)).toHaveLength(1);
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: "ignoreErrors" }); store.close(); }
  });
}
