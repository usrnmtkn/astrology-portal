import { expect, test } from "@playwright/test";

test.describe("Content Studio reader destinations", () => {
  test("reader links open separately while Studio links stay in place", async ({ page }) => {
    await page.goto("/admin/content", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#root")).toBeAttached();

    await page.locator("#root").evaluate((root) => {
      const reader = document.createElement("a");
      reader.href = "/#/sky/placement/mercury/cancer";
      reader.textContent = "QA exact reader destination";
      reader.dataset.qaReaderDestination = "exact";
      root.append(reader);

      const internal = document.createElement("a");
      internal.href = "/admin/content/coverage";
      internal.textContent = "QA Studio destination";
      internal.dataset.qaStudioDestination = "internal";
      root.append(internal);
    });

    const reader = page.locator("[data-qa-reader-destination='exact']");
    await expect(reader).toHaveAttribute("href", "/#/sky/placement/mercury/cancer");
    await expect(reader).toHaveAttribute("target", "_blank");
    await expect(reader).toHaveAttribute("rel", /noopener/);
    await expect(reader).toHaveAttribute("rel", /noreferrer/);

    const internal = page.locator("[data-qa-studio-destination='internal']");
    await expect(internal).toHaveAttribute("href", "/admin/content/coverage");
    await expect(internal).not.toHaveAttribute("target", "_blank");
  });
});
