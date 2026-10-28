import { expect, test } from "../helpers/polish-test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { bundledPublications } from "../helpers/bundled-publications";
import { expectReadableTheme } from "../helpers/theme-contrast";

const kinds = ["page", "article", "removed-article", "placement", "date", "horoscope", "profile", "connection", "chart", "invite", "report", "signed-out"];
async function harness() {
  const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {ReaderUnavailable} from './apps/web/src/components/ReaderUnavailable';
    const root=createRoot(document.getElementById('root'));
    window.showState=kind=>root.render(<main className="app-shell"><ReaderUnavailable kind={kind}/></main>);
    window.showState('page');
  ` }, bundle: true, write: false, format: "iife", jsx: "automatic", loader: { ".css": "empty" } });
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? "apps/web/dist"}/.vite/manifest.json`, "utf8"));
  const css = new Set<string>([manifest["src/styles.css"].file, ...Object.values(manifest).filter((entry: any) => entry.isEntry || entry.name === "App" || entry.name === "ReaderUnavailable").flatMap((entry: any) => entry.css ?? [])]);
  return { script: bundle.outputFiles[0].text, links: [...css].map(file => `<link rel="stylesheet" href="/${file}">`).join("") };
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Shared missing-reader design ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 }); await page.emulateMedia({ reducedMotion: "reduce" });
    const { script, links } = await harness();
    await page.route("**/__reader-unavailable", route => route.fulfill({ contentType: "text/html", body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${links}</head><body><div id="root"></div><script>${script}</script></body></html>` }));
    await page.goto("/__reader-unavailable");
    for (const kind of kinds) {
      await page.evaluate(kind => (window as any).showState(kind), kind);
      const card = page.locator(".reader-unavailable__card");
      await expect(card.locator("h1")).toHaveCount(1); await expect(card.locator("p")).toHaveCount(1);
      await expect(card.locator("a,button")).toHaveCount(1);
      await expect(card.locator("h1")).toHaveCSS("font-size", "36px");
      await expect(card.locator("h1")).toHaveCSS("font-family", /Newsreader/);
      await expect(card.locator("h1")).toHaveCSS("font-weight", "400");
      await expect(card).toHaveCSS("border-radius", "32px");
      await expect(card.locator("svg")).toHaveCSS("width", width < 800 ? "128px" : "160px");
      await expect(card.locator(".reader-unavailable__shake")).toHaveCSS("animation-name", "none");
      await expectReadableTheme(page, ".reader-unavailable h1, .reader-unavailable p, .reader-unavailable a");
      await expect(page).toHaveTitle(/ · TLDR Astro$/);
    }
    await page.screenshot({ path: `test-results/missing-reader-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`Missing-reader routes recover to their owning pages ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000); await page.setViewportSize({ width, height: 1100 });
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme); localStorage.setItem("tldrastro:pageAnimations", "off");
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" }));
    }, theme);
    await bundledPublications(page);
    await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const cases = [
      ["/#missing-fixture-page", "Page not found", "Go to Sky", "Sky"],
      ["/#sky/placement/mercury/unknown", "We couldn’t find that placement", "Go to Sky", "Sky"],
      ["/?date=2026-02-31#calendar", "Date not found", "Go to today", "Calendar"],
      ["/#horoscopes?period=weekly&sign=unknown", "We couldn’t find that horoscope", "Go to Horoscopes", "Horoscopes"],
      ["/#articles/article%2Fguide%2Fabsent-fixture", "Article unavailable", "Go to the Guide", "Guide"]
    ];
    for (const [url, title, action, owner] of cases) {
      await page.goto(url); await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator(".floating-back-button")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Switch to (light|dark) mode/ })).toBeVisible();
      await page.reload(); await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await page.getByRole("link", { name: action, exact: true }).click();
      await expect(page.locator(".reader-unavailable")).toHaveCount(0);
      await expect(page.locator(".site-nav button.active")).toHaveText(owner);
    }
  });
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Missing report and temporary failure stay distinct ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, email: 'report-reader@example.test' };
    const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({ user, storageKey, theme }) => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem(storageKey, JSON.stringify({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
    }, { user, storageKey, theme });
    await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    let missing = false;
    await page.route('**/api/report-delivery?**', route => route.fulfill({ status: missing ? 404 : 503, json: { error: missing ? 'Report not found.' : 'Temporary fixture failure.' } }));
    await page.goto('/reports/00000000-0000-4000-8000-000000000002');
    await expect(page.locator('.load-error--page').getByRole('alert')).toBeVisible();
    await expect(page.locator('.reader-unavailable')).toHaveCount(0);
    missing = true;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Report not found', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Reports', exact: true })).toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
    await expectReadableTheme(page, '.reader-unavailable h1, .reader-unavailable p, .reader-unavailable a');
    await page.goto('/reports/missing-fixture-slug');
    await expect(page.getByRole('heading', { name: 'Report not found', exact: true })).toBeVisible();
  });
}
