import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "00000000-0000-4000-8000-000000000101",
  email: "you-report@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { name: "Report Fixture" }
};
const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const profile = {
  id: user.id, name: "Report Fixture", email: user.email, provider: "email",
  currentLocation: location.label, currentLocationData: location,
  charts: [{ id: "fixture-chart", name: "Report Fixture", type: "Birth chart", birthDate: "1990-01-01", birthTime: "12:00 PM", birthCity: location.label, birthLocation: location }]
};

async function prepare(page: Page, theme: string, signedIn = true) {
  const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
  await page.clock.setFixedTime(new Date("2026-09-13T16:00:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ user, profile, location, storageKey, theme, signedIn }) => {
    localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:theme", theme);
    if (signedIn) localStorage.setItem(storageKey, JSON.stringify({
      access_token: "synthetic-token", refresh_token: "synthetic-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user
    }));
  }, { user, profile, location, storageKey, theme, signedIn });
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, body: "Use local fixture calculations." }));
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "No generation in this fixture." } }));
  await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
  await page.route("**/rest/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user_profiles")) return route.fulfill({ json: { data: { version: 1, profile } } });
    if (path.endsWith("/social_profiles")) return route.fulfill({ json: { user_id: user.id, display_name: profile.name, handle: "report-fixture" } });
    if (path.endsWith("/user_generated_interpretations")) return route.fulfill({ json: [{
      id: "00000000-0000-4000-8000-000000000102", subject_type: "you_day_reading", subject_id: user.id,
      content_key: "you-day-reading/2026-09-13", status: "DRAFT", body: "A saved synthetic report.",
      headline: "Saved day report", target_date: "2026-09-13", source_snapshot: {},
      you_report_entitlement_id: "fixture-entitlement", created_at: "2026-09-13T12:00:00Z", updated_at: "2026-09-13T12:00:00Z"
    }] });
    return route.fulfill({ json: [] });
  });
}

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
  for (const theme of ["light", "dark"]) {
    test(`signed-in You report card precedes the daily reading on ${viewport.name} ${theme}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await prepare(page, theme);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/#you");
      const reports = page.getByRole("region", { name: "In-depth transit reports" });
      const summary = page.getByRole("region", { name: "Daily horoscope summary" });
      await expect(reports).toBeVisible();
      await expect(summary).toBeVisible();
      await expect(reports.getByRole("button", { name: "Read day report", exact: true })).toBeEnabled();
      await expect(reports.getByText("Sign in to create or read your reports.")).toBeHidden();
      expect(await reports.evaluate(element => element.nextElementSibling?.getAttribute("aria-label"))).toBe("Daily horoscope summary");
      const reportBox = await reports.boundingBox();
      const summaryBox = await summary.boundingBox();
      expect(reportBox!.y + reportBox!.height).toBeLessThanOrEqual(summaryBox!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      expect(errors).toEqual([]);
      await reports.scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`you-reports-${viewport.name}-${theme}.png`) });
      await page.reload();
      await expect(reports.getByRole("button", { name: "Read day report", exact: true })).toBeEnabled();
      await expect(reports.getByText("Sign in to create or read your reports.")).toBeHidden();
    });
  }
}

test("a cached profile without a signed-in account cannot access reports", async ({ page }) => {
  await prepare(page, "light", false);
  await page.goto("/#you");
  const reports = page.getByRole("region", { name: "In-depth transit reports" });
  await expect(reports.getByText("Sign in to create or read your reports.")).toBeVisible();
  await expect(reports.getByRole("button", { name: "Create day report", exact: true })).toBeDisabled();
});
