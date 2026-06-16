import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const screenshotDir = path.join("test-results", "visual-smoke");

async function preparePage(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript(({ selectedTheme }) => {
    window.localStorage.setItem("tldrastro:theme", selectedTheme);
    window.localStorage.setItem("tldrastro:sunriseOrb", "true");
    window.localStorage.setItem("tldrastro:dyslexiaFont", "false");
  }, { selectedTheme: theme });

  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((selectedTheme) => {
    window.localStorage.setItem("tldrastro:theme", selectedTheme);
  }, theme);
}

async function capture(page: Page, name: string) {
  await mkdir(screenshotDir, { recursive: true });
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(screenshotDir, `${name}.png`)
  });
}

test.describe("visual smoke screens", () => {
  test("captures sky", async ({ page }) => {
    await preparePage(page);
    await page.goto("/#sky");
    await expect(page.getByText("Today, simple.")).toBeVisible();
    await capture(page, "sky-light");
  });

  test("captures you", async ({ page }) => {
    await preparePage(page);
    await page.goto("/#you");
    await capture(page, "you-light");
  });

  test("captures friends list", async ({ page }) => {
    await preparePage(page);
    await page.goto("/#friends?tab=charts");
    await page.waitForTimeout(500);

    if (!(await page.getByText("friends.").isVisible())) {
      test.skip(true, "Friends views require a local signed-in profile or seeded browser storage.");
    }

    await capture(page, "friends-list-light");
  });

  test("captures friends chart detail tabs when a chart exists", async ({ page }) => {
    await preparePage(page);
    await page.goto("/#friends?tab=charts");

    const firstChart = page.locator(".manual-chart-select").first();
    await firstChart.waitFor({ state: "visible", timeout: 10_000 }).catch(() => null);

    if (!(await firstChart.isVisible())) {
      test.skip(true, "No saved friend charts available in this local profile.");
    }

    await firstChart.click();
    await capture(page, "friends-natal-light");

    const synastryTab = page.getByRole("button", { name: "Synastry" });
    if (await synastryTab.isVisible()) {
      await synastryTab.click();
      await capture(page, "friends-synastry-light");
    }

    const compositeTab = page.getByRole("button", { name: "Composite" });
    if (await compositeTab.isVisible()) {
      await compositeTab.click();
      await capture(page, "friends-composite-light");
    }
  });

  test("captures settings in light and dark", async ({ page }) => {
    await preparePage(page, "light");
    await page.goto("/#settings");
    await expect(page.getByText("settings.")).toBeVisible();
    await capture(page, "settings-light");

    await setTheme(page, "dark");
    await page.goto("/#settings");
    await expect(page.getByText("settings.")).toBeVisible();
    await capture(page, "settings-dark");
  });
});
