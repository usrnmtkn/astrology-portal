import { expect, test, type Page } from "@playwright/test";
import { readerResponse } from "../helpers/reader-response";

const playerAsset = /\/assets\/lottie_light\.min-.*\.js$/;
const appAsset = /\/assets\/App-.*\.js$/;

async function holdApp(page: Page) {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(appAsset, async route => { await held; await route.continue().catch(() => {}); });
  return release;
}

async function useMoonDocument(page: Page) {
  // Exercise the documented HTML selection without changing the app default.
  await page.route("**/", async route => {
    if (route.request().resourceType() !== "document") { await route.continue(); return; }
    const response = await route.fetch();
    const body = (await response.text()).replace('id="app-startup"', 'id="app-startup" data-loader="moon"');
    await route.fulfill({ response, body });
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
  await page.route("**/api/content-reader", route => route.fulfill({ json: readerResponse([]) }));
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`startup Lottie animates and hands off at ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
    const release = await holdApp(page);
    await page.goto("/#sky", { waitUntil: "domcontentloaded" });
    try {
      const artwork = page.locator(".startup-artwork");
      await expect(artwork.locator(".startup-artwork__animation svg")).toBeVisible();
      await expect(artwork.locator(".startup-artwork__poster")).toBeHidden();
      const ink = theme === "dark" ? "rgb(236, 238, 242)" : "rgb(28, 31, 38)";
      await expect(artwork.locator(".startup-linework__stroke").first()).toHaveCSS("stroke", ink);
      await expect(artwork.locator(".startup-linework__fill")).toHaveCSS("fill", ink);
      await expect(artwork).toHaveCSS("width", "80px");
      await expect(page.locator("[data-startup-message]")).toHaveCSS("font-size", "14px");
      await expect(page.locator("[data-startup-message]")).toHaveCSS("color", theme === "dark" ? "rgb(141, 147, 160)" : "rgb(110, 118, 133)");
      await expect(page.locator("body")).toHaveCSS("background-color", theme === "dark" ? "rgb(22, 24, 27)" : "rgb(238, 240, 243)");
      const frame = await artwork.locator(".startup-artwork__animation svg").innerHTML();
      await expect.poll(() => artwork.locator(".startup-artwork__animation svg").innerHTML()).not.toBe(frame);
      await expect(page.getByText("Loading TLDR Astro…", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await artwork.boundingBox();
      expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(1);
      const labelBounds = await page.locator("[data-startup-message]").boundingBox();
      expect(labelBounds!.y - bounds!.y - bounds!.height).toBe(22);
      await page.screenshot({ path: `test-results/startup-lottie-${width}-${theme}.png` });
    } finally { release(); }
    await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
    await expect(page.locator("#app-startup")).toHaveCount(0);
    await expect(page.locator("script[data-startup-decoration]")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).lottie.getRegisteredAnimations().length)).toBe(0);
    if (width < 600) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.getByRole("menuitem", { name: "Calendar", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Calendar", exact: true }).first().click();
    }
    await expect(page.getByRole("region", { name: "Lunar calendar", exact: true })).toBeVisible();
    await expect(page.locator(".startup-artwork")).toHaveCount(0);
  });
}

test("four symbols brighten clockwise with a restrained elastic bounce", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const release = await holdApp(page);
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.locator(".startup-artwork__animation svg")).toBeVisible();
    const phases = await page.evaluate(() => {
      const animation = (window as any).lottie.getRegisteredAnimations()[0];
      // The composition's out-point is exclusive; inspect its last rendered frame.
      return [0, 42, 84, 126, 167].map(frame => {
        animation.goToAndStop(frame, true);
        const symbols = ["sun", "moon", "star", "earth"].map(name => {
          const node = document.querySelector(`.startup-symbol--${name}`)!;
          const box = node.getBoundingClientRect();
          return { name, opacity: Number(getComputedStyle(node).opacity),
            box: { x: box.x, y: box.y, width: box.width, height: box.height } };
        });
        return { brightest: [...symbols].sort((a, b) => b.opacity - a.opacity)[0].name, symbols };
      });
    });
    expect(phases.map(phase => phase.brightest)).toEqual(["sun", "moon", "star", "earth", "sun"]);
    const [sun, moon, star, earth] = phases[0].symbols.map(symbol => symbol.box);
    expect(sun.x).toBeLessThan(moon.x);
    expect(earth.x).toBeLessThan(star.x);
    expect(sun.y).toBeLessThan(earth.y);
    expect(moon.y).toBeLessThan(star.y);

    const gestures = await page.evaluate(() => {
      const animation = (window as any).lottie.getRegisteredAnimations()[0];
      return ["sun", "moon", "star", "earth"].map((name, index) => {
        return [0, 4, 8, 13, 14, 28, 35, 42].map(offset => {
          animation.goToAndStop((index * 42 + offset) % 168, true);
          const matrix = document.querySelector<SVGGraphicsElement>(`.startup-symbol--${name}`)!.getScreenCTM()!;
          return { y: matrix.f, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
            scaleX: Math.hypot(matrix.a, matrix.b), scaleY: Math.hypot(matrix.c, matrix.d) };
        });
      });
    });
    for (const [rest, early, middle, nearTop, top, landing, rebound, settled] of gestures) {
      expect(rest.y - top.y).toBeCloseTo(3, 2);
      expect(top.angle).toBeCloseTo(-2, 2);
      expect(landing.y - rest.y).toBeCloseTo(0.5, 2);
      expect(top.scaleY).toBeGreaterThan(rest.scaleY);
      expect(landing.scaleX / rest.scaleX).toBeGreaterThan(1.04);
      expect(landing.scaleY / rest.scaleY).toBeLessThan(0.96);
      expect(rest.y - rebound.y).toBeCloseTo(0.4, 2);
      expect(settled.y).toBeCloseTo(rest.y, 2);
      expect(settled.angle).toBeCloseTo(0, 2);
      // An eased lift travels further in the middle than at its slow arrival.
      expect(Math.abs(middle.y - early.y)).toBeGreaterThan(Math.abs(top.y - nearTop.y) * 2);
      for (const sample of [early, middle, nearTop, top, landing, rebound, settled]) {
        // Elasticity stays subtle and approximately preserves the icon's area.
        expect(sample.scaleX / rest.scaleX).toBeGreaterThan(0.94);
        expect(sample.scaleX / rest.scaleX).toBeLessThan(1.06);
        expect(sample.scaleY / rest.scaleY).toBeGreaterThan(0.94);
        expect(sample.scaleY / rest.scaleY).toBeLessThan(1.06);
        expect(sample.scaleX * sample.scaleY / (rest.scaleX * rest.scaleY)).toBeCloseTo(1, 2);
      }
      expect(settled.scaleX).toBeCloseTo(rest.scaleX, 4);
      expect(settled.scaleY).toBeCloseTo(rest.scaleY, 4);
    }

    const turns = await page.evaluate(() => {
      const animation = (window as any).lottie.getRegisteredAnimations()[0];
      const samples: number[][] = [];
      for (const [index, name] of ["sun", "moon", "star", "earth"].entries()) {
        for (const turn of [14, 28, 35, 42]) {
          samples.push([-0.1, 0, 0.1].map(delta => {
            animation.goToAndStop((index * 42 + turn + delta) % 168, true);
            return document.querySelector<SVGGraphicsElement>(`.startup-symbol--${name}`)!.getScreenCTM()!.f;
          }));
        }
      }
      return samples;
    });
    for (const [before, at, after] of turns) {
      // Takeoff, landing, rebound, and loop handoff must not snap in velocity.
      expect(Math.abs((at - before) / 0.1)).toBeLessThan(0.02);
      expect(Math.abs((after - at) / 0.1)).toBeLessThan(0.02);
    }

    const handoffs = await page.evaluate(() => {
      const animation = (window as any).lottie.getRegisteredAnimations()[0];
      const names = ["sun", "moon", "star", "earth"];
      return names.map((outgoing, index) => {
        const incoming = names[(index + 1) % names.length];
        return [-3, 0, 3].map(delta => {
          // Inspect the real SVG 50 ms either side of every handoff, including the loop.
          animation.goToAndStop(((index + 1) * 42 + delta) % 168, true);
          return [outgoing, incoming].map(name =>
            document.querySelector<SVGGraphicsElement>(`.startup-symbol--${name}`)!.getScreenCTM()!.f);
        });
      });
    });
    for (const [before, at, after] of handoffs) {
      // The outgoing icon finishes settling; the next starts rising without a prep beat.
      expect(at[0] - before[0]).toBeGreaterThan(0.1);
      expect(after[0]).toBeCloseTo(at[0], 4);
      expect(before[1]).toBeCloseTo(at[1], 4);
      expect(at[1] - after[1]).toBeGreaterThan(0.15);
    }
    await expect(page.locator(".startup-linework__stroke").first()).toHaveCSS("stroke-width", "2px");
    await expect(page.locator(".startup-linework__stroke").first()).toHaveCSS("vector-effect", "non-scaling-stroke");
  } finally { release(); }
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
});

test("reduced motion signals progress before the entry bundle without moving the icons", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/assets\/index-.*\.js$/, async route => { await held; await route.continue().catch(() => {}); });
  let playerRequests = 0;
  page.on("request", request => { if (playerAsset.test(new URL(request.url()).pathname)) playerRequests++; });
  await page.goto("/#sky", { waitUntil: "commit" });
  try {
    const poster = page.locator(".startup-artwork__poster");
    await expect(poster).toBeVisible();
    const first = poster.locator("g").first();
    const before = await first.evaluate(node => ({ opacity: getComputedStyle(node).opacity, box: node.getBoundingClientRect().toJSON() }));
    await expect.poll(() => first.evaluate(node => getComputedStyle(node).opacity)).not.toBe(before.opacity);
    expect(await first.evaluate(node => node.getBoundingClientRect().toJSON())).toEqual(before.box);
    const sequence = await poster.evaluate(node => {
      const icons = [...node.querySelectorAll("g")];
      const animations = icons.flatMap(icon => icon.getAnimations());
      animations.forEach(animation => animation.pause());
      const names = ["sun", "moon", "earth", "star"];
      return [0, 700, 1400, 2100].map(time => {
        animations.forEach(animation => { animation.currentTime = time; });
        const opacities = icons.map(icon => Number(getComputedStyle(icon).opacity));
        return names[opacities.indexOf(Math.max(...opacities))];
      });
    });
    expect(sequence).toEqual(["sun", "moon", "star", "earth"]);
    expect(playerRequests).toBe(0);
  } finally { release(); }
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
});

test("reduced motion skips the player and changing the preference returns to the fading poster", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let requests = 0;
  page.on("request", request => { if (playerAsset.test(new URL(request.url()).pathname)) requests++; });
  const release = await holdApp(page);
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.locator(".startup-artwork__poster")).toBeVisible();
    expect(requests).toBe(0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".startup-artwork__animation svg")).toBeVisible();
    expect(requests).toBe(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.evaluate(() => {
      const animation = (window as any).lottie.getRegisteredAnimations()[0];
      return { paused: animation.isPaused, frame: animation.currentFrame };
    })).toEqual({ paused: true, frame: 0 });
    await expect(page.locator(".startup-artwork__poster")).toBeVisible();
    await expect(page.locator(".startup-artwork__animation")).toBeHidden();
    const frame = await page.locator(".startup-artwork__animation svg").innerHTML();
    await page.waitForTimeout(250);
    expect(await page.locator(".startup-artwork__animation svg").innerHTML()).toBe(frame);
  } finally { release(); }
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
});

test("an unavailable Lottie player keeps the poster without reader recovery", async ({ page }) => {
  let navigations = 0;
  page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++; });
  await page.route(playerAsset, route => route.abort("failed"));
  const release = await holdApp(page);
  const failed = page.waitForEvent("requestfailed", request => playerAsset.test(new URL(request.url()).pathname));
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try {
    await failed;
    await expect(page.locator(".startup-artwork__poster")).toBeVisible();
    await expect(page.locator("#app-startup")).toHaveAttribute("role", "status");
    await expect(page.getByRole("button", { name: "Reload page" })).toBeHidden();
    expect(navigations).toBe(1);
  } finally { release(); }
  await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
  expect(navigations).toBe(1);
});

test("a stalled player never blocks startup and cannot recreate the splash after handoff", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(playerAsset, async route => { await held; await route.continue().catch(() => {}); });
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
    await expect(page.locator("#app-startup")).toHaveCount(0);
  } finally { release(); }
  await expect(page.locator("script[data-startup-decoration]")).toHaveCount(0);
  await expect(page.locator(".startup-artwork")).toHaveCount(0);
});

test("a slow start keeps recovery available and a failed app stops the animation", async ({ page }) => {
  await page.clock.install();
  let documentLoads = 0;
  page.on("request", request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentLoads++;
  });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(appAsset, async route => {
    await held;
    await route.fulfill({ contentType: "text/javascript", body: 'throw new Error("Synthetic app initialization failure")' }).catch(() => {});
  });
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.locator(".startup-artwork__animation svg")).toBeVisible();
    // Exercise cleanup after the guarded reload has already been used. A new
    // document would discard the running player before this test can inspect it.
    // The unavailable-entry test separately verifies the one-reload recovery.
    await page.evaluate(() => history.replaceState({
      ...history.state,
      __tldrastroReaderPageRecovery: { route: `${location.pathname}${location.hash}`, at: Date.now() }
    }, "", location.href));
    await page.clock.fastForward(12000);
    await expect(page.getByText("Still loading. You can wait or try reloading the page.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
  } finally { release(); }
  await expect(page.getByRole("alert")).toContainText("The page could not load");
  await expect(page.locator(".startup-artwork__poster")).toBeVisible();
  await expect(page.locator(".startup-artwork__animation svg")).toHaveCount(0);
  expect(documentLoads).toBe(1);
  expect(await page.evaluate(() => (window as any).lottie.getRegisteredAnimations().length)).toBe(0);
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`moon alternative matches the specification and hands off at ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
    await useMoonDocument(page);
    let playerRequests = 0;
    page.on("request", request => { if (playerAsset.test(new URL(request.url()).pathname)) playerRequests++; });
    const release = await holdApp(page);
    await page.goto("/#sky", { waitUntil: "domcontentloaded" });
    try {
      const moon = page.locator(".startup-moon");
      const shadow = moon.locator(".startup-moon__shadow");
      const label = page.locator("[data-startup-message]");
      await expect(moon).toBeVisible();
      await expect(page.locator(".startup-artwork")).toBeHidden();
      await expect(moon).toHaveCSS("width", "48px");
      await expect(moon).toHaveCSS("height", "48px");
      await expect(moon.locator(".startup-moon__outline")).toHaveCSS("stroke-width", "1.25px");
      await expect(moon.locator(".startup-moon__lit")).toHaveCSS("fill", theme === "dark" ? "rgb(236, 238, 242)" : "rgb(28, 31, 38)");
      await expect(shadow).toHaveCSS("fill", await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor));
      await expect(label).toHaveCSS("font-size", "14px");
      await expect(label).toHaveCSS("color", theme === "dark" ? "rgb(141, 147, 160)" : "rgb(110, 118, 133)");
      const iconBox = await moon.boundingBox();
      const labelBox = await label.boundingBox();
      expect(labelBox!.y - iconBox!.y - iconBox!.height).toBe(22);
      await expect(shadow).toHaveCSS("animation-duration", "2.6s");
      await expect(shadow).toHaveCSS("animation-direction", "alternate");
      await expect(shadow).toHaveCSS("animation-timing-function", "cubic-bezier(0.6, 0, 0.4, 1)");
      const phase = await shadow.evaluate(el => getComputedStyle(el).transform);
      await expect.poll(() => shadow.evaluate(el => getComputedStyle(el).transform)).not.toBe(phase);
      expect(playerRequests).toBe(0);
      await page.screenshot({ path: `test-results/startup-moon-${width}-${theme}.png` });
    } finally { release(); }
    await expect(page.getByLabel("Daily sky summary")).toBeVisible({ timeout: 25000 });
    await expect(page.locator("#app-startup")).toHaveCount(0);
    expect(playerRequests).toBe(0);
  });
}

test("moon reduced motion stays static and error recovery uses the card background", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await useMoonDocument(page);
  const release = await holdApp(page);
  await page.goto("/#sky", { waitUntil: "domcontentloaded" });
  try {
    const shadow = page.locator(".startup-moon__shadow");
    await expect(page.locator(".startup-moon")).toBeVisible();
    await expect(shadow).toHaveCSS("animation-name", "none");
    await expect(shadow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 8, 0)");
    await page.evaluate(() => window.dispatchEvent(new Event("tldrastro:startup-error")));
    const error = page.getByRole("alert");
    await expect(error).toContainText("The page could not load");
    await expect(shadow).toHaveCSS("fill", await error.evaluate(el => getComputedStyle(el).backgroundColor));
    await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
  } finally { release(); }
});
