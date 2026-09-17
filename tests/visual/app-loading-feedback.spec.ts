import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const moonPlacement = (sign: string) => JSON.parse(readFileSync(
  "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json", "utf8"
)).hookRows.find((row: { contentKey: string }) => row.contentKey === `fallback-hook/sky-placement-lived/moon/${sign}`);

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-08T04:06:00Z"));
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
});

test("offline snapshot publication keeps complete Calendar guidance available during live API failure", async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = JSON.parse(readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
  const key = "authored/calendar-weekly-moon/taurus/variant-4";
  const row = snapshot.rows.find((candidate: { content_key: string }) => candidate.content_key === key);
  let releaseSnapshot!: () => void;
  let releaseLive!: () => void;
  const heldSnapshot = new Promise<void>(resolve => { releaseSnapshot = resolve; });
  const heldLive = new Promise<void>(resolve => { releaseLive = resolve; });
  await page.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
    label: "New York, New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York"
  })));
  await page.route("**/api/calendar?**", route => route.fulfill({ status: 503, json: {} }));
  await page.route("**/rest/v1/generated_interpretations*", route => route.fulfill({ status: 503, json: {} }));
  // Keep the independent live overlay request pending. The offline snapshot
  // must install its own rows before announcing their publication identities.
  await page.route("**/rest/v1/rpc/content_runtime_revision", async route => {
    await heldLive;
    await route.fulfill({ status: 503, json: {} }).catch(() => {});
  });
  await page.route("**/content-studio-last-known-good.json", async route => {
    await heldSnapshot;
    await route.fulfill({ json: snapshot }).catch(() => {});
  });
  try {
    await page.goto("/#calendar?view=weekly&date=2026-08-03");
    const weekly = page.locator("#lunar-weekly-2026-08-05 .lunar-weekly-day__guidance");
    await expect(weekly).toHaveAttribute("data-guidance-key", key, { timeout: 25_000 });
    releaseSnapshot();
    await expect.poll(() => page.evaluate(key => {
      const records = JSON.parse(localStorage.getItem("tldrastro:content-publications:v1") ?? "[]");
      return records.some((record: { content_key: string }) => record.content_key === key);
    }, key), { timeout: 15_000 }).toBe(true);
    await expect(weekly).toHaveText(row.body);
    await page.goto("/#calendar?view=day&date=2026-08-05");
    const day = page.getByRole("region", { name: "Moon guidance" });
    const fullMoon = moonPlacement("taurus");
    await expect(day).toHaveAttribute("data-guidance-key", fullMoon.contentKey, { timeout: 15_000 });
    await expect(day.locator("p")).toHaveText(fullMoon.body_you.split(/\n\n/));
  } finally { releaseSnapshot(); releaseLive(); }
});

test("Calendar Day waits for full event facts before selecting its full Moon passage", async ({ page }) => {
  const { getLunarCalendarWeek } = await import("../../apps/web/src/services/ephemeris");
  const location = { label: "New York, New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
  const anchor = new Date("2026-08-04T12:00:00Z");
  const full = await getLunarCalendarWeek(location, anchor, { detail: "full" });
  const basic = await getLunarCalendarWeek(location, anchor, { detail: "basic" });
  let holdFull = false;
  let waiting = false;
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.addInitScript(({ location, basic }) => {
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    // A pre-fix Day cache must not bypass the full-facts loading requirement.
    localStorage.setItem("tldr-lunar-calendar|v10|week|2026-08-03|40.7128|-74.0060|America/New_York",
      JSON.stringify({ savedAt: Date.now(), calendar: basic }));
  }, { location, basic });
  await page.route("**/api/calendar?**", async route => {
    const detailed = new URL(route.request().url()).searchParams.get("detail") === "full";
    if (detailed && holdFull) { waiting = true; await held; }
    await route.fulfill({ json: { ok: true, calendar: detailed ? full : basic } });
  });
  await page.goto("/#calendar?view=weekly&date=2026-08-04");
  const weekly = page.locator("#lunar-weekly-2026-08-04 .lunar-weekly-day__guidance");
  await expect(weekly).toBeVisible({ timeout: 15_000 });
  await expect(weekly).toHaveAttribute("data-guidance-key", "authored/calendar-weekly-moon/aries/variant-2");
  const fullMoon = moonPlacement("aries");
  holdFull = true;
  try {
    await page.goto("/#calendar?view=day&date=2026-08-04");
    await expect.poll(() => waiting).toBe(true);
    await expect(page.locator(".lunar-calendar-loading")).toBeVisible();
    await expect(page.getByRole("region", { name: "Moon guidance" })).toHaveCount(0);
  } finally { release(); }
  const day = page.getByRole("region", { name: "Moon guidance" });
  await expect(day).toHaveAttribute("data-guidance-key", fullMoon.contentKey);
  await expect(day.locator("p")).toHaveText(fullMoon.body_you.split(/\n\n/));
});

for (const leaveCalendar of [false, true]) test(`Calendar pending event click ${leaveCalendar ? "does not reopen after leaving" : "opens after the Sky calculation loads"}`, async ({ page }) => {
  test.setTimeout(60_000);
  const { getLunarCalendarWeek } = await import("../../apps/web/src/services/ephemeris");
  const location = { label: "New York, New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
  const calendar = await getLunarCalendarWeek(location, new Date("2026-09-10T12:00:00Z"), { detail: "full" });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.addInitScript(location => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location)), location);
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar } }));
  await page.route(/\/assets\/skyCalculation\.worker-.*\.js$/, async route => {
    await held;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/#calendar?view=day&date=2026-09-10");
    await page.getByRole("button", { name: "Venus enters Scorpio", exact: true }).click();
    await expect(page.locator(".sky-detail-article")).toHaveCount(0);
    if (leaveCalendar) await page.getByRole("button", { name: "Sky", exact: true }).first().click();
  } finally { release(); }
  if (leaveCalendar) {
    await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".sky-detail-article")).toHaveCount(0);
    return;
  }
  await expect(page.locator(".sky-detail-article h1")).toContainText("Venus in Scorpio", { timeout: 30_000 });
  const venus = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/venus-square-pluto.json", "utf8"));
  await expect(page.locator(".sky-detail-article")).toContainText(venus.readerCopy.body);
});

for (const view of ["weekly", "week"]) test(`Calendar ${view} waits for authored Moon content before choosing copy`, async ({ page }) => {
  test.setTimeout(60_000);
  const key = "authored/calendar-weekly-moon/aries/variant-2";
  const source = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json", "utf8"))
    .authoredCards.find((row: { contentKey: string }) => row.contentKey === key);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/assets\/fallbackArchitectureV3DeferredBundle-.*\.js$/, async route => {
    await held;
    await route.continue().catch(() => {});
  });
  await page.route("**/api/calendar?**", route => route.fulfill({ status: 503, json: {} }));
  await page.addInitScript(() => localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
    label: "New York, New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York"
  })));
  try {
    await page.goto(`/#calendar?view=${view}&date=2026-08-04`, { waitUntil: "domcontentloaded" });
    // Calculation has completed independently of the deliberately held prose bundle.
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("tldr-lunar-calendar|"))), { timeout: 25_000 }).toBe(true);
    await expect(page.locator(".lunar-calendar-loading")).toBeVisible();
    await expect(page.locator(".lunar-calendar-body")).toHaveCount(0);
  } finally { release(); }
  const guidance = view === "weekly"
    ? page.locator("#lunar-weekly-2026-08-04 .lunar-weekly-day__guidance")
    : page.getByRole("region", { name: "Moon guidance" });
  const selected = view === "weekly" ? { contentKey: key, body: source.body } : { contentKey: moonPlacement("aries").contentKey, body: moonPlacement("aries").body_you.split(/\n\n/) };
  await expect(guidance).toHaveAttribute("data-guidance-key", selected.contentKey, { timeout: 25_000 });
  await expect(view === "weekly" ? guidance : guidance.locator("p")).toHaveText(selected.body);
  await expect(page.locator(".lunar-calendar-loading")).toHaveCount(0);
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
    // A collapsing startup-card margin used to move the whole document down
    // until the app stylesheet arrived, producing a visible reload jump.
    expect(await page.locator("body").evaluate(el => el.getBoundingClientRect().top)).toBe(0);
    expect(await page.locator("#root").evaluate(el => el.getBoundingClientRect().top)).toBe(0);
    await expect(loading).toHaveAttribute("role", "status");
    await expect(loading).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(loading).toHaveCSS("border-width", "0px");
    const illustration = loading.locator('.loading-illustration .loading-orb');
    await expect(illustration).toBeVisible();
    expect(await illustration.evaluate(el => getComputedStyle(el).animationDuration)).toBe('0s');
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

test("an unavailable entry bundle attempts one guarded recovery before manual reload", async ({ page }) => {
  let navigations = 0;
  page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++; });
  await page.route(/\/assets\/index-.*\.js$/, route => route.abort("failed"));
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  const error = page.getByRole("alert");
  await expect(error).toContainText("The page could not load");
  await expect(error).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(error).not.toHaveCSS("border-width", "0px");
  await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(navigations).toBe(2);
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
    const loading = page.getByRole("status").filter({ hasText: "Loading calendar…" });
    await expect(loading).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(loading).toHaveCSS("border-width", "0px");
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
  await page.route(workerAssets, async route => {
    const retryClicked = await page.evaluate(() => document.documentElement.dataset.testSkyRetryClicked === "true");
    await (retryClicked ? route.continue() : route.abort("failed"));
  });
  await page.goto("/#sky");
  await expect(page.getByRole("alert")).toContainText("The current sky could not load");
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  // Keep the worker unavailable until the real click. Unrouting beforehand
  // lets a concurrent calculation recover and remove Retry before it is clicked.
  await retry.evaluate(button => button.addEventListener("click", () => {
    document.documentElement.dataset.testSkyRetryClicked = "true";
  }, { capture: true, once: true }));
  await retry.click();
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/\/#sky$/);
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
    try {
      const loading = page.locator("#app-startup");
      await expect(loading).toBeVisible();
      await expect(loading).toHaveCSS("font-family", /system-ui/);
      await expect(loading).toHaveAttribute("role", "status");
      await expect(loading).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(loading).toHaveCSS("border-width", "0px");
    }
    finally { release(); }
    await expect(page.locator("#app-startup")).toHaveCount(0);
    await page.unroute(matcher);
  }
});
