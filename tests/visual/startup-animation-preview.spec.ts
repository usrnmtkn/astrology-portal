import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test.beforeAll(() => {
  // The configured webServer built the current app; generate its local playground.
  execFileSync(process.execPath, ["scripts/preview-startup-animation.mjs"]);
});

for (const { width, theme } of [{ width: 390, theme: "light" }, { width: 1440, theme: "dark" }]) {
  test(`explicit preview playback works with reduced motion at ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/loading-preview.html?theme=${theme}`);
    const sun = page.locator(".startup-symbol--sun");
    await expect(page.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
    await expect(sun).toHaveAttribute("opacity", "1");
    await page.waitForTimeout(150);
    await expect(sun).toHaveAttribute("opacity", "1");

    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    await expect(page).toHaveURL(/motion=play/);
    await expect.poll(() => sun.getAttribute("opacity")).not.toBe("1");
    // Observe a real loop wrap, not just a single changed SVG frame.
    const loopProgress = () => page.evaluate(() => {
      const animation = (window as any).lottie.getRegisteredAnimations()[0];
      return animation.currentFrame / animation.totalFrames;
    });
    await expect.poll(loopProgress).toBeGreaterThan(0.6);
    await expect.poll(loopProgress).toBeLessThan(0.2);

    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    const pausedFrame = await sun.getAttribute("opacity");
    await page.waitForTimeout(150);
    await expect(sun).toHaveAttribute("opacity", pausedFrame!);
    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Pause animation", exact: true })).toBeVisible();
    await expect(sun).toBeVisible();
    const reloadedFrame = await sun.getAttribute("opacity");
    await expect.poll(() => sun.getAttribute("opacity")).not.toBe(reloadedFrame);

    await page.getByRole("button", { name: "Moon", exact: true }).click();
    const shadow = page.locator(".startup-moon__shadow");
    await expect(page.locator(".startup-moon")).toBeVisible();
    await expect(shadow).toHaveCSS("animation-play-state", "running");
    const moonPhase = await shadow.evaluate(el => getComputedStyle(el).transform);
    await expect.poll(() => shadow.evaluate(el => getComputedStyle(el).transform)).not.toBe(moonPhase);
    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    await expect(shadow).toHaveCSS("animation-play-state", "paused");
    // CSS playback changes settle on the next compositor frame.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const pausedPhase = await shadow.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(150);
    await expect(shadow).toHaveCSS("transform", pausedPhase);
    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    await expect.poll(() => shadow.evaluate(el => getComputedStyle(el).transform)).not.toBe(pausedPhase);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
