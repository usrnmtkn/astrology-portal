import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

// These rows come from the actual request -> worker -> save -> retrieval
// fixture, not hand-built report results. No provider or live storage calls.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "report-source-reader-"));
execFileSync(process.execPath, ["scripts/test-transit-source-completion.mjs", "--browser-fixture-dir", directory], { stdio: "pipe" });
const rows = ["day", "week", "friends", "friends-personal"].map(kind => JSON.parse(fs.readFileSync(path.join(directory, `${kind}.json`), "utf8")));
fs.rmSync(directory, { recursive: true });

for (const row of rows) for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) for (const theme of ['light','dark']) {
  test(`source report ${row.id} opens and reloads at ${viewport.width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
    const user = { id: "synthetic-owner", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: {}, email: "source@example.test" };
    const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
    await page.addInitScript(({ user, storageKey }) => localStorage.setItem(storageKey, JSON.stringify({ access_token: "fixture", refresh_token: "fixture", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user })), { user, storageKey });
    const errors: string[] = [];
    let apiCalls = 0;
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
    await page.route("**/api/**", route => { apiCalls++; return route.fulfill({ status: 409, json: { error: "No generation during reader checks" } }); });
    await page.route("**/rest/v1/**", route => {
      const url = new URL(route.request().url());
      if (!url.pathname.endsWith("/user_generated_interpretations")) return route.fulfill({ json: [] });
      const id = url.searchParams.get("id");
      const selected = id?.startsWith("eq.") ? [row].filter(item => item.id === id.slice(3)) : [row];
      return route.fulfill({ json: route.request().headers().accept?.includes("vnd.pgrst.object") ? selected[0] ?? null : selected });
    });
    await page.goto("/reports/");
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await page.locator(".report-library-row__open").filter({ hasText: row.headline }).click();
    const verify = async () => {
      await expect(page.getByRole("heading", { level: 1, name: row.headline, exact: true })).toBeVisible();
      await expect(page.locator(".saved-generated-report__body .article-section")).toHaveText(row.body.replace(/^## /gmu,''), { useInnerText: true });
      const heading = page.locator('.saved-generated-report__body h2');
      if(row.body.includes('## Between you and Morgan')) {
        await expect(heading).toHaveText('Between you and Morgan');
        expect(await page.locator('.saved-generated-report h1, .saved-generated-report h2').allTextContents()).toEqual([row.headline,'Between you and Morgan']);
        const styles = await heading.evaluate(el => {
          const reference = document.createElement('section'); reference.className='article-section sky-detail-section';
          const h2=document.createElement('h2'); h2.textContent='Existing article heading';reference.append(h2);el.parentElement!.append(reference);
          const keys=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'] as const;
          const values=(node:Element)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(node)[k]]));
          const result={actual:values(el),reference:values(h2)};reference.remove();return result;
        });
        expect(styles.actual).toEqual(styles.reference);
      } else await expect(heading).toHaveCount(0);
      if (row.summary) await expect(page.locator(".article-tldr__copy")).toHaveText(row.summary, { useInnerText: true });
      else await expect(page.locator(".article-tldr__copy")).toHaveCount(0);
    };
    await verify();
    await page.reload();
    await verify();
    expect(apiCalls).toBe(0);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  });
}
