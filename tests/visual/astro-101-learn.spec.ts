import { expect, test } from "@playwright/test";

test("Learn hub is reachable from primary navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Learn" }).click();
  await expect(page).toHaveURL(/\/learn\/?$/);
  await expect(page.getByRole("heading", { name: "Astro 101", level: 1 })).toBeVisible({ timeout: 60_000 });
});

test("Learn hub uses the canvas index card decks", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn");
  const learnPage = page.locator(".learn-page");
  await expect(learnPage).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".learn-layout")).toBeVisible();
  await expect(learnPage.getByRole("heading", { level: 1 })).toHaveText("Astro 101");

  const headingTags = await learnPage.locator("h1, h2, h3, h4, h5, h6").evaluateAll((nodes) =>
    nodes.map((node) => node.tagName)
  );
  expect(headingTags[0]).toBe("H1");
  expect(headingTags.slice(1).every((tag) => tag !== "H1")).toBeTruthy();

  await expect(learnPage.getByRole("heading", { name: "The twelve zodiac signs", level: 2 })).toBeVisible();
  await expect(learnPage.getByRole("heading", { name: "The aspects", level: 2 })).toBeVisible();
  await expect(learnPage.getByRole("heading", { name: "The twelve houses", level: 2 })).toBeVisible();
  await expect(learnPage.getByRole("heading", { name: "References", level: 2 })).toBeVisible();

  const aries = learnPage.getByRole("button", { name: /Aries/ });
  await expect(aries).toBeVisible();
  await expect(aries).toContainText("Cardinal");
  await expect(aries).toContainText("Fire");

  const firstHouse = learnPage.getByRole("link", { name: /Self/ }).first();
  await expect(firstHouse).toContainText("I");
  await expect(firstHouse).not.toContainText("1H");
  await expect(firstHouse).not.toContainText("What it means");
  await expect(firstHouse).toContainText("Ruled by Mars");
  await expect(learnPage.getByRole("link", { name: /Livelihood/ })).toBeVisible();
  await expect(learnPage.getByRole("link", { name: /Siblings & the daily round/ })).toBeVisible();

  const conjunction = learnPage.getByRole("button", { name: /Conjunction/ });
  await expect(conjunction).toContainText("0°");
  await expect(conjunction).toContainText("Fused. Two planets acting as one.");
  await expect(learnPage).not.toContainText("How planets talk to each other");

  await expect(learnPage.locator(".learn-chapter__num")).toHaveCount(0);

  const mercuryRx = learnPage.getByRole("button", { name: /Mercury Rx/ }).first();
  await expect(mercuryRx).toBeVisible();
  await expect(mercuryRx).not.toContainText("3 to 4 times a year");
  await expect(learnPage.getByRole("button", { name: /Venus Rx/ }).first()).not.toContainText("Every 18 months");
  await expect(learnPage.getByRole("button", { name: /Mars Rx/ }).first()).not.toContainText("Every 2 years");
});

test("House article keeps the long title and lede", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Livelihood/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: /Livelihood/ }).click();
  await expect(page).toHaveURL(/\/learn\/houses\/0?2\/?/);
  await expect(page.locator(".learn-article-header .learn-kicker")).toHaveText(/ASTRO 101 \/ 2ND HOUSE/i);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/What it means to have planets in the 2nd house/i);
  await expect(page.locator(".learn-lede")).toBeVisible();
  const emptyHouse = page.locator("#an-empty-2nd-house");
  const southNode = page.locator("#south-node-in-the-2nd-house");
  await expect(emptyHouse).toHaveClass(/learn-placement/);
  await expect(southNode).toHaveClass(/learn-placement/);
  await expect(emptyHouse.getByRole("heading", { name: "An empty 2nd house", level: 2 })).toBeVisible();
  await expect(southNode.getByRole("heading", { name: "South Node in the 2nd house", level: 2 })).toBeVisible();
});

test("Learn article uses the full desktop navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn/astro-101/what-is-a-birth-chart");
  await expect(page.locator(".learn-article-page")).toBeVisible({ timeout: 60_000 });
  const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(primaryNav).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: "Sky" })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: "Learn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Astro 101" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Astro 101" })).toContainText("Back");
  await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();

  await page.goto("/learn/houses/2");
  await expect(page.locator(".learn-article-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
});

test("Learn article uses compact navigation on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/astro-101/what-is-a-birth-chart");
  await expect(page.locator(".learn-article-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Back to Astro 101" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle theme" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
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
