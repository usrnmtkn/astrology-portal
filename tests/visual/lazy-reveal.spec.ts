import { expect, test } from "@playwright/test";
import { buildSync } from "esbuild";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const fixture = buildSync({ entryPoints: ["tests/helpers/card-loading-fixture.tsx"], bundle: true, write: false, loader: { ".css": "empty" }, format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" } }).outputFiles[0].text;

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`static card loading and mount-only fade at ${width} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: theme === "dark" ? "reduce" : "no-preference" });
    const css = readdirSync("apps/web/dist/assets").filter(file => file.endsWith(".css") && (file.startsWith("index-") || /\.card-skeleton-bar|\.calendar-stoic-card/.test(readFileSync(`apps/web/dist/assets/${file}`, "utf8"))));
    css.sort((a, b) => (a.startsWith("index-") ? 0 : a.startsWith("styles-") ? 1 : 2) - (b.startsWith("index-") ? 0 : b.startsWith("styles-") ? 1 : 2));
    await page.route("**/__card-fixture", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="${theme}"><head>${css.map(file => `<link rel="stylesheet" href="/assets/${file}">`).join("")}</head><body><main class="app-shell theme-${theme}"><div id="fixture"></div></main></body></html>` }));
    await page.goto("/__card-fixture");
    await page.addScriptTag({ type: "module", content: fixture });
    await page.waitForFunction(() => Boolean((window as any).renderFixture));
    await page.evaluate(() => document.fonts.ready);
    const bars = page.locator(".card-skeleton-bar");
    expect(await bars.count()).toBeGreaterThan(20);
    await expect(page.locator(".loading-spinner, canvas")).toHaveCount(0);
    for (const card of await page.locator(".card-skeleton").all()) {
      await expect(card).toHaveAttribute("aria-hidden", "true");
      await expect(card).toHaveCSS("animation-name", "none");
      await expect(card).toHaveCSS("transform", "none");
    }
    for (const bar of await bars.all()) {
      await expect(bar).toHaveCSS("animation-name", "none");
      const colors = await bar.evaluate(el => { const s = getComputedStyle(el); const probe = document.createElement("i"); probe.style.background = "var(--surface-2)"; el.append(probe); const expected = getComputedStyle(probe).backgroundColor; probe.remove(); return [s.backgroundColor, expected]; });
      expect(colors[0]).toBe(colors[1]);
    }
    await expect(page.locator(".placement-table-wrap")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".calendar-day-events")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "Loading this day’s reading…" })).toHaveCount(1);
    const sizes = () => page.evaluate(() => Object.fromEntries([".placement-table", ".planet-placement-row", ".calendar-day-events__grid", ".calendar-stoic-card", ".calendar-stoic-card.is-wide", ".calendar-season-transits ul", ".calendar-season-transits li"].map(selector => [selector, [...document.querySelectorAll(selector)].map(el => el.getBoundingClientRect().height)])));
    const anatomy = () => page.locator(".planet-placement-row").first().evaluate(el => [...el.querySelectorAll("[class]")].map(node => ({ class: node.className, height: node.getBoundingClientRect().height, line: getComputedStyle(node).lineHeight, font: getComputedStyle(node).fontSize })));
    const beforeAnatomy = await anatomy();
    const before = await sizes();
    await page.screenshot({ path: info.outputPath("skeletons.png"), fullPage: true });
    await page.evaluate(() => {
      (window as any).animations = [];
      document.addEventListener("animationstart", e => (window as any).animations.push({ target: (e.target as Element).className, name: e.animationName }));
      (window as any).renderFixture({ loading: false });
    });
    await expect(page.locator(".placement-table-wrap")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".calendar-day-events")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".planet-placement-row.card-skeleton, .calendar-day-panel .card-skeleton")).toHaveCount(0);
    const after = await sizes();
    writeFileSync(info.outputPath("card-heights.json"), JSON.stringify({ before, after, beforeAnatomy, afterAnatomy: await anatomy() }, null, 2));
    await info.attach("card-heights", { path: info.outputPath("card-heights.json"), contentType: "application/json" });
    expect(before[".planet-placement-row"]).toEqual(after[".planet-placement-row"]);
    expect(before[".placement-table"]).toEqual(after[".placement-table"]);
    for (const height of before[".calendar-season-transits li"]) expect(Math.abs(height - after[".calendar-season-transits li"][0])).toBeLessThanOrEqual(4);
    expect(before[".calendar-season-transits ul"]).toEqual(after[".calendar-season-transits ul"]);
    for (const card of await page.locator(".is-revealing").all()) {
      await expect(card).toHaveCSS("animation-name", "lazy-fade");
      await expect(card).toHaveCSS("animation-duration", "0.12s");
      await expect(card).toHaveCSS("animation-delay", "0s");
      await expect(card).toHaveCSS("transform", "none");
      await expect(card).toHaveCSS("opacity", "1");
    }
    const firstAnimations = await page.evaluate(() => (window as any).animations.length);
    expect(firstAnimations).toBe(9); // Three placements, three stoic cards, three transit rows.
    await page.evaluate(() => (window as any).renderFixture({}));
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).animations.length)).toBe(firstAnimations);
    await page.evaluate(() => (window as any).renderFixture({ later: true }));
    await expect(page.locator(".planet-placement-row")).toHaveCount(4);
    await expect.poll(() => page.evaluate(() => (window as any).animations.length)).toBe(firstAnimations + 1);
    await page.screenshot({ path: info.outputPath("resolved.png"), fullPage: true });

    // Full prose is deliberately preserved: capture its actual growth rather
    // than forcing text truncation to make a fixed-line skeleton test pass.
    await page.evaluate(() => (window as any).renderFixture({ long: true }));
    writeFileSync(info.outputPath("unbounded-copy-heights.json"), JSON.stringify(await sizes(), null, 2));
    await info.attach("unbounded-copy-heights", { path: info.outputPath("unbounded-copy-heights.json"), contentType: "application/json" });
    await page.evaluate(() => (window as any).renderFixture({ loading: true, empty: true }));
    await expect(page.locator(".calendar-stoic-card.card-skeleton")).toHaveCount(2);
    await expect(page.locator(".calendar-season-transits .card-skeleton")).toHaveCount(3);
    await page.evaluate(() => (window as any).renderFixture({ failed: true, loading: false, showSky: true }));
    await expect(page.locator(".calendar-day-panel .card-skeleton")).toHaveCount(0);
    await expect(page.getByRole("alert")).toContainText("This day’s reading could not load.");
  });
}
