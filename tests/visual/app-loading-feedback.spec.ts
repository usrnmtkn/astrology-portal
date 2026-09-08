import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-08T04:06:00Z"));
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`document shell paints before JavaScript at ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route(/\/assets\/.*\.js$/, async route => { await held; await route.continue().catch(() => {}); });
    await page.goto("/#sky", { waitUntil: "commit" });
    const loading = page.locator("#app-startup");
    try {
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(page.getByText("Loading TLDR Astro…", { exact: true })).toBeVisible();
    // Document commit exposes the DOM before the render-blocking stylesheet
    // arrives over a real network. Assert its computed style with a web-first
    // expectation before measuring typography and reduced-motion behavior.
    await expect(loading).toHaveCSS("font-family", /system-ui/);
    expect(await page.locator(".app-loading__lines span").first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    const typography = await loading.evaluate(el => { const s = getComputedStyle(el); return { font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, line: s.lineHeight, tracking: s.letterSpacing }; });
    expect(typography.font).toContain("system-ui");
    expect(typography.weight).toBe("400");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const cdp = await page.context().newCDPSession(page);
    const shot = await cdp.send("Page.captureScreenshot");
    await writeFile(`test-results/loading-${width}-${theme}.png`, Buffer.from(shot.data, "base64"));
    await test.info().attach(`loading-${width}-${theme}`, { body: Buffer.from(shot.data, "base64"), contentType: "image/png" });
    await cdp.detach();
    } finally { release(); }
    await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 20000 });
    await expect(loading).toHaveCount(0);
  });
}

test("an unavailable entry bundle shows a reload action without an automatic refresh", async ({ page }) => {
  let navigations = 0;
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
  await page.route(/\/assets\/index-.*\.js$/, route => route.abort("failed"));
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("The page could not load");
  await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
  expect(navigations).toBe(1);
});

test("blocked web fonts do not block startup or reader content", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("https://fonts.googleapis.com/**", async route => { await held; await route.abort().catch(() => {}); });
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try { await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 10000 }); }
  finally { release(); }
});

test("lazy Calendar navigation keeps the nav and a visible loading state", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/assets\/CalendarRoute-.*\.js$/, async route => { await held; await route.continue().catch(() => {}); });
  await page.goto("/#sky");
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Calendar", exact: true }).first().click();
  try {
    await expect(page.getByText("Loading calendar…", { exact: true })).toBeVisible();
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sky", exact: true }).first()).toBeVisible();
  } finally { release(); }
  await expect(page.getByRole("region", { name: "Lunar calendar", exact: true })).toBeVisible({ timeout: 20000 });
});

test("a failed lazy route keeps navigation usable", async ({ page }) => {
  await page.route(/\/assets\/CalendarRoute-.*\.js$/, route => route.abort("failed"));
  await page.goto("/#sky");
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Calendar", exact: true }).first().click();
  await expect(page.getByRole("alert")).toContainText("This page could not load");
  await expect(page.locator(".topbar")).toBeVisible();
  await page.getByRole("button", { name: "Sky", exact: true }).first().click();
  await expect(page.getByLabel("Daily sky summary")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("failed astronomy shows Retry and recovers on the same route", async ({ page }) => {
  const workerAssets = /\/assets\/skyCalculation\.worker-.*\.js$/;
  await page.route(workerAssets, route => route.abort("failed"));
  await page.goto("/#sky");
  await expect(page.getByRole("alert")).toContainText("The current sky could not load");
  await page.unroute(workerAssets);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 15000 });
});

test("a signed-out Friends link explains what is needed instead of staying blank", async ({ page }) => {
  await page.goto("/#friends");
  await expect(page.getByText("Sign in to view your Friends.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("reports and Studio have document feedback before their bundles arrive", async ({ page }) => {
  for (const routePath of ["/reports", "/admin/content"]) {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const matcher = /\/assets\/.*\.js$/;
    await page.route(matcher, async route => { await held; await route.continue().catch(() => {}); });
    await page.goto(routePath, { waitUntil: "commit" });
    try { await expect(page.locator("#app-startup")).toBeVisible(); }
    finally { release(); }
    await expect(page.locator("#app-startup")).toHaveCount(0);
    await page.unroute(matcher);
  }
});
