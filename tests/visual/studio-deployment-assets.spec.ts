import { expect, test } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";
import { build } from "vite";
import { mkdtempSync, realpathSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { deploymentAssetsPlugin } from "../../scripts/deployment-assets-plugin.mjs";
import { normalizeTransitNatalPreviewInput, renderTransitNatalDraftStarter, renderTransitNatalPreviewState } from "../../api/admin/transit-natal-preview";

const studioPath = process.env.STUDIO_PRODUCTION_ENTRY === "1" ? "/admin/content" : "/";

for (const protectedAssets of [false, true]) {
  test(`two real builds across an alias switch: ${protectedAssets ? "protected" : "unprotected control"}`, async ({ page }) => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), "studio-deployment-browser-")));
    try {
      const builds = new Map<string, Map<string, string>>();
      for (const version of ["old", "new"]) {
        writeFileSync(path.join(root, "index.html"), '<textarea aria-label="Unsaved copy"></textarea><button>Open section</button><div id="section"></div><script type="module" src="/main.js"></script>');
        writeFileSync(path.join(root, "main.js"), `document.querySelector('button').onclick=()=>import('./section.js').then(module=>{document.querySelector('#section').innerHTML='<p class="panel">'+module.copy+'</p>';}).catch(()=>{document.querySelector('#section').textContent='This section could not load.';});`);
        writeFileSync(path.join(root, "section.js"), `import './section.css';export const copy='Complete ${version} section';`);
        writeFileSync(path.join(root, "section.css"), `.panel {color:${version === "old" ? "rgb(32,64,96)" : "rgb(96,64,32)"};}`);
        const result = await build({ configFile: false, envFile: false, root, logLevel: "silent",
          plugins: [deploymentAssetsPlugin(protectedAssets ? { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: version } : {})],
          build: { write: false }
        });
        builds.set(version, new Map(result.output.map(file => ["/" + file.fileName, file.type === "chunk" ? file.code : String(file.source)])));
      }
      let current = "old", documents = 0;
      const requests: string[] = [];
      await page.route("**/*", route => {
        const url = new URL(route.request().url());
        const selected = url.searchParams.get("dpl") ?? current;
        const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
        const body = builds.get(selected)?.get(pathname);
        requests.push(url.pathname + url.search);
        return route.fulfill({ status: body === undefined ? 404 : 200,
          contentType: pathname.endsWith(".js") ? "text/javascript" : pathname.endsWith(".css") ? "text/css" : "text/html",
          body: body ?? "File no longer exists in the new deployment" });
      });
      page.on("request", request => { if (request.isNavigationRequest()) documents++; });
      await page.goto("/");
      const draft = page.getByRole("textbox", { name: "Unsaved copy", exact: true });
      await draft.fill("The complete unsaved passage stays in this document.");
      current = "new";
      await page.getByRole("button", { name: "Open section", exact: true }).click();
      if (protectedAssets) {
        await expect(page.locator(".panel")).toHaveText("Complete old section");
        await expect(page.locator(".panel")).toHaveCSS("color", "rgb(32, 64, 96)");
        expect(requests.some(url => /section-.*\.css\?dpl=old/u.test(url))).toBe(true);
      } else {
        await expect(page.locator("#section")).toHaveText("This section could not load.");
      }
      await expect(draft).toHaveValue("The complete unsaved passage stays in this document.");
      expect(documents).toBe(1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

for (const [width, theme] of [[1440, "light"], [390, "dark"]] as const) {
  test(`an open Studio keeps editing across a deployment ${width} ${theme}`, async ({ page, context }, testInfo) => {
    const store = await studioApiStore([]);
    try {
      let replaced = false, writes = 0, documents = 0;
      const rejected: string[] = [], requested: string[] = [];
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem("tldrastro:contentAdminSecret", "calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme", theme);
      }, theme);
      await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue() : route.abort("blockedbyclient"));
      // Model the platform's alias switch: only requests pinned to the original
      // deployment can still reach the old asset graph after the replacement.
      await page.route("**/assets/**", route => {
        const url = new URL(route.request().url());
        requested.push(url.href);
        if (replaced && url.searchParams.get("dpl") !== "dpl_0123456789abcdefghijklmnopqr") {
          rejected.push(url.href);
          return route.fulfill({ status: 404, contentType: "text/plain", body: "File absent from the new deployment" });
        }
        return route.continue();
      });
      await routeStudioInventoryApi(page, { call: message => {
        if (["POST", "PATCH", "DELETE"].includes(message.method)) writes++;
        return store.call(message);
      }, answer: async (route, url) => {
        if (url.pathname !== "/api/admin/transit-natal-preview") return false;
        const input = normalizeTransitNatalPreviewInput(route.request().postDataJSON());
        await route.fulfill({ json: input.draftStarter
          ? { ok: true, starter: renderTransitNatalDraftStarter(input) }
          : { ok: true, rendered: renderTransitNatalPreviewState(input) } });
        return true;
      } });
      page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
      await page.goto(`${studioPath}#articles`);
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await page.getByRole("menuitem", { name: /New guide/u }).click();
      const editor = page.getByRole("dialog", { name: "Generated content editor", exact: true });
      const body = editor.getByLabel("Article body", { exact: true });
      const copy = "Synthetic unsaved guide opening.\n\nThe complete final paragraph survives a deployment.";
      await editor.getByLabel("Article title", { exact: true }).fill("Synthetic deployment recovery guide");
      await body.fill(copy);
      const mountedEditor = await editor.elementHandle();
      expect(requested.some(url => /StudioFormattingEditor-/u.test(url))).toBe(false);
      replaced = true;
      const count = requested.length;
      await body.locator("..").getByRole("button", { name: "Format text", exact: true }).click();
      await expect(editor.getByRole("textbox", { name: "Article body formatted text", exact: true })).toContainText("The complete final paragraph survives a deployment.");
      expect(requested.slice(count).some(url => /StudioFormattingEditor-/u.test(url))).toBe(true);
      expect(rejected).toEqual([]);
      expect(requested.every(url => new URL(url).searchParams.get("dpl") === "dpl_0123456789abcdefghijklmnopqr")).toBe(true);
      expect(await mountedEditor!.evaluate(element => element.isConnected)).toBe(true);
      expect(documents).toBe(1);
      expect(writes).toBe(0);
      await expect(page.getByRole("alert").filter({ hasText: "This section could not load" })).toHaveCount(0);
      await editor.getByRole("button", { name: "Done formatting", exact: true }).click();
      await expect(body).toHaveValue(copy);
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect.poll(async () => (await store.call({ method: "rows" }))[0]?.body).toBe(copy);
      expect(writes).toBe(1);
      const saved = (await store.call({ method: "rows" }))[0];
      expect(saved.status).toBe("DRAFT");
      await page.reload();
      await page.getByRole("row").filter({ hasText: saved.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
      await expect(body).toHaveValue(copy);
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      const navigation = page.getByRole("button", { name: "Open Content Studio navigation", exact: true });
      if (await navigation.isVisible()) await navigation.click();
      await page.locator("#admin-content-navigation").getByRole("button", { name: "Friends Transits", exact: true }).click();
      const finder = page.getByRole("region", { name: "Personal Transits source finder", exact: true });
      await finder.getByLabel("Transiting planet", { exact: true }).selectOption("sun");
      await finder.getByLabel("Transit to natal aspect", { exact: true }).selectOption("trine");
      await finder.getByLabel("Natal planet or point", { exact: true }).selectOption("moon");
      await expect(finder.getByRole("region", { name: "Effective transit to natal reader preview", exact: true })).toContainText("Sun trine their Moon");
      await expect(page.getByRole("alert").filter({ hasText: "This section could not load" })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath("studio-after-deployment.png") });
      expect(writes).toBe(1);
      expect(documents).toBe(2); // Only the deliberate reload above navigated.
      expect(rejected).toEqual([]);
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      store.close();
    }
  });
}
