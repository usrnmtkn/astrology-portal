import { expect, test } from "@playwright/test";

test("Learn hub is reachable from primary navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Learn" }).click();
  await expect(page).toHaveURL(/\/learn\/?$/);
  await expect(page.getByRole("heading", { name: "Astro 101", level: 1 })).toBeVisible({ timeout: 60_000 });
});
