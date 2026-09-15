import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`generating report beam preserves layout and menus at ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: theme === "light" ? "dark" : "light" });
      const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "beam@example.test" };
      const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
      const row = {
        id: "00000000-0000-4000-8000-000000000002", subject_type: "you_day_reading", status: "DRAFT", body: "",
        headline: "Your day report", target_date: "2026-09-15", created_at: "2026-09-15T12:00:00Z", updated_at: "2026-09-15T12:00:00Z",
        you_report_entitlement_id: "fixture-entitlement", source_snapshot: { reportProgress: { stage: "writing" } }
      };
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(({ user, storageKey, theme }) => {
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem(storageKey, JSON.stringify({ access_token: "fixture-token", refresh_token: "fixture-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
      }, { user, storageKey, theme });
      await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
      await page.route("**/rest/v1/**", route => route.fulfill({
        json: new URL(route.request().url()).pathname.endsWith("/user_generated_interpretations")
          ? [row, { ...row, id: "00000000-0000-4000-8000-000000000003", headline: "Saved report", body: "Completed fixture report." }]
          : []
      }));
      await page.goto("/reports/");
      const card = page.locator('.report-library-row[data-report-status="generating"]');
      const beam = card.locator("[data-beam]");
      await expect(beam).toBeVisible();
      await expect(page.locator('.report-library-row[data-report-status="ready"] [data-beam]')).toHaveCount(0);
      await expect(beam).toHaveCSS("border-radius", await card.evaluate(el => getComputedStyle(el).borderRadius));
      await expect(card.locator(".report-generation-beam")).toHaveAttribute("aria-hidden", "true");
      await expect(card.locator(".report-generation-beam")).toHaveCSS("pointer-events", "none");
      const before = await card.boundingBox();
      const beamBox = await beam.boundingBox();
      expect(beamBox!.width).toBeGreaterThan(before!.width - 4);
      expect(beamBox!.height).toBeGreaterThan(before!.height - 4);
      await expect.poll(() => beam.evaluate(el => getComputedStyle(el).animationName)).toContain("beam-spin");
      await card.getByRole("button", { name: "More options for Your day report", exact: true }).click();
      const archive = page.getByRole("menuitem", { name: "Archive", exact: true });
      await expect(archive).toBeVisible();
      await archive.click({ trial: true });
      await page.keyboard.press("Escape");
      await expect(archive).toBeHidden();
      // Capture the completed fade-in, and verify the effect follows the app
      // theme even when the OS preference is the opposite.
      if (width === 1440) {
        const effectStyles = card.locator(".report-generation-beam > style");
        const originalStyles = await effectStyles.textContent();
        await page.getByRole("button", { name: `Switch to ${theme === "light" ? "dark" : "light"} mode` }).click();
        await expect.poll(() => effectStyles.textContent()).not.toBe(originalStyles);
        await page.getByRole("button", { name: `Switch to ${theme} mode` }).click();
        await expect.poll(() => effectStyles.textContent()).toBe(originalStyles);
      }
      await expect.poll(() => beam.evaluate(el => getComputedStyle(el).getPropertyValue(`--beam-opacity-${el.getAttribute("data-beam")}`))).toBe("1");
      await page.screenshot({ path: test.info().outputPath(`beam-${width}-${theme}.png`) });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator("[data-beam]")).toHaveCount(0);
      await expect(card.getByText("Writing", { exact: true })).toBeVisible();
      expect(await card.boundingBox()).toEqual(before);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(beam).toBeVisible();
      await page.clock.install();
      row.status = "ERROR";
      await page.clock.fastForward(10_100);
      await expect(page.locator('[data-report-status="needs_attention"]')).toBeVisible();
      await expect(page.locator("[data-beam]")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      expect(errors).toEqual([]);
    });
  }
}
