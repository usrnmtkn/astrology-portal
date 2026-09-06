import { expect, test } from "@playwright/test";

// Keep this flow in the standard admin smoke run so the actionable queue and its internal navigation cannot drift.
test.describe("Content Studio Needs attention", () => {
  test("shows only actionable required work and keeps actions inside Studio", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("tldrastro:contentAdminSecret", "qa-secret");
    });

    await page.route("**/api/admin/content-coverage", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          generatedAt: "2026-09-06T00:00:00.000Z",
          summary: {
            complete: 5,
            incomplete: 1,
            unresolvedQueue: 1,
            unresolvedIssues: 1,
            unresolvedOptionalQueue: 80,
            unresolvedOptionalIssues: 69,
            unresolvedShadowed: 47,
            unresolvedRetired: 62
          },
          coverage: [
            { id: "healthy", label: "Healthy corpus", missing: 0, state: "complete", detail: "Complete." },
            { id: "missing-corpus", label: "Required corpus", missing: 2, state: "incomplete", detail: "Two required records are missing." }
          ]
        })
      });
    });

    await page.route("**/api/admin/generated-content?**", async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");
      if (status === "LIVE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            nextCursor: null,
            rows: [
              {
                id: "unwired-1",
                content_key: "sky.planetary.jupiter",
                headline: "Jupiter source",
                status: "LIVE",
                lane: "serving",
                review_state: null,
                mode: "article",
                facts: null,
                sections: null,
                source_snapshot: null
              },
              {
                id: "connected-1",
                content_key: "sky.placement.sun.cancer",
                headline: "Sun in Cancer",
                status: "LIVE",
                lane: "serving",
                review_state: null,
                mode: "article",
                facts: null,
                sections: null,
                source_snapshot: null
              }
            ]
          })
        });
        return;
      }
      if (status === "ERROR") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            nextCursor: null,
            rows: [{
              id: "error-1",
              content_key: "article/broken-example",
              headline: "Broken example",
              status: "ERROR",
              lane: "serving",
              review_state: "validation_failed",
              mode: "article"
            }]
          })
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/admin/content/coverage?view=attention", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: "Needs attention" })).toBeVisible();
    await expect(page.getByLabel("Needs attention summary")).toContainText("4");
    await expect(page.getByText("1 required editorial decision", { exact: true })).toBeVisible();
    await expect(page.getByText("Jupiter source", { exact: true })).toBeVisible();
    await expect(page.getByText("Broken example", { exact: true })).toBeVisible();
    await expect(page.getByText("Required corpus", { exact: true })).toBeVisible();
    await expect(page.getByText("69 optional decisions can add rotation or depth later.")).toBeVisible();

    const openContentRow = page.getByRole("link", { name: "Open content row" });
    await expect(openContentRow).toHaveAttribute("href", /\/admin\/content#exact-content/);
    await expect(openContentRow).not.toHaveAttribute("target", "_blank");

    await expect(page.getByRole("link", { name: "Content coverage", exact: true })).toHaveAttribute("href", "/admin/content/coverage");
  });
});
