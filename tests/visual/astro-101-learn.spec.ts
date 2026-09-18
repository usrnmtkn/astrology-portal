import { expect, test } from "@playwright/test";

test("Learn hub is reachable from primary navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Learn" }).click();
  await expect(page).toHaveURL(/\/learn\/?$/);
  await expect(page.getByRole("heading", { name: "Astro 101", level: 1 })).toBeVisible({ timeout: 60_000 });
});

test("Learn uses the shared full-page article layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn");
  const learnPage = page.locator(".learn-page");
  await expect(learnPage).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".learn-layout")).toBeVisible();
  await expect(learnPage.locator(".learn-sheet").first()).toBeVisible();

  const box = await learnPage.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(1000);

  const headingTags = await learnPage.locator("h1, h2, h3, h4, h5, h6").evaluateAll((nodes) =>
    nodes.map((node) => node.tagName)
  );
  expect(headingTags[0]).toBe("H1");
  expect(headingTags.slice(1).every((tag) => tag !== "H1")).toBeTruthy();

  await expect(learnPage.locator(".learn-kicker").first()).toHaveText(/Learn/i);
  await expect(learnPage.getByRole("heading", { level: 1 })).toHaveText("Astro 101");
  await expect(learnPage.locator(".learn-sheet__header h2", { hasText: "Chapters" })).toHaveCount(0);
  await expect(learnPage.locator(".learn-kicker").filter({ hasText: /chapters/i })).toHaveCount(0);

  const tileGlyph = learnPage.locator(".learn-tile__glyph").first();
  await expect(tileGlyph).toBeVisible();
  await expect(tileGlyph).toHaveCSS("font-size", "22px");
});

test("Learn article copy stays on the prose measure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn/astro-101/aspects");
  const lede = page.locator(".learn-lede");
  await expect(lede).toBeVisible({ timeout: 60_000 });
  const measure = await page.evaluate(() => {
    const sheet = document.querySelector(".learn-sheet--article");
    const body = document.querySelector(".learn-article-body");
    const lead = document.querySelector(".learn-lede");
    const padding = body ? Number.parseFloat(getComputedStyle(body).paddingLeft) : 0;
    return {
      lede: lead?.getBoundingClientRect().width ?? 0,
      sheet: sheet?.getBoundingClientRect().width ?? 0,
      padding
    };
  });
  expect(measure.lede).toBeGreaterThan(480);
  expect(measure.lede).toBeLessThanOrEqual(720);
  expect(measure.sheet).toBeLessThanOrEqual(720 + measure.padding * 2 + 1);
});

test("Learn section titles match chapter card titles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn");
  const cardTitle = page.locator(".learn-chapter__title").first();
  await expect(cardTitle).toBeVisible({ timeout: 60_000 });
  const cardTitleSize = await cardTitle.evaluate((node) => getComputedStyle(node).fontSize);

  await page.goto("/learn/astro-101/what-is-a-birth-chart");
  const sectionTitle = page.locator(".learn-article-body h2").first();
  await expect(sectionTitle).toBeVisible({ timeout: 60_000 });
  await expect(sectionTitle).toHaveCSS("font-size", cardTitleSize);
});
