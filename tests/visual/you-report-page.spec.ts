import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const sourceRows = JSON.parse(readFileSync(new URL("../../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", import.meta.url), "utf8"));
const macroBody: string = sourceRows.authoredCards.find((row: { contentKey: string }) => row.contentKey === "authored/sky-lunation-macro/new-moon/virgo").body;

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
const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
const session = {
  access_token: "synthetic-token", refresh_token: "synthetic-refresh",
  expires_at: Date.parse("2026-09-14T16:00:00Z") / 1000, token_type: "bearer", user
};

async function prepare(page: Page, theme: string, signedIn = true) {
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
    for (const signedIn of [true, false]) {
      test(`Account route stays separate from You with ${signedIn ? "active" : "cached"} account on ${viewport.name} ${theme}`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.setViewportSize(viewport);
        await prepare(page, theme, signedIn);
        await page.goto("/?date=2026-09-12#you");
        await expect(page.getByRole("region", { name: "In-depth transit reports" })).toBeVisible();
        await page.getByRole("button", { name: "Open menu", exact: true }).click();
        await page.getByRole("menuitem", { name: "Account", exact: true }).click();
        const account = page.locator(".account-page");
        const assertAccount = async () => {
          await expect(account.getByRole("heading", { name: "account.", exact: true })).toBeVisible();
          if (signedIn) {
            await expect(account.getByLabel("Birth date", { exact: true })).toHaveValue("1990-01-01");
            await expect(account.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
          } else {
            await expect(account.getByText(/You are signed out\./)).toBeVisible();
            await expect(account.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
            await expect(account.locator(".settings-profile-row, .account-chart-group, .account-data-group")).toHaveCount(0);
            await expect(account).not.toContainText(profile.name);
            await expect(account).not.toContainText(profile.email);
            expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).id)).toBe(user.id);
          }
          await expect(page.getByRole("region", { name: "In-depth transit reports" })).toBeHidden();
          await expect(page).toHaveURL(/\?date=2026-09-12#account$/);
        };
        await assertAccount();
        // An auth recovery check must not replace the selected destination.
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await assertAccount();
        await page.reload();
        await assertAccount();
        await page.screenshot({ path: test.info().outputPath(`account-${signedIn ? "active" : "cached"}-${viewport.name}-${theme}.png`) });
        await page.goBack();
        await expect(page.getByRole("region", { name: "In-depth transit reports" })).toBeVisible();
        await page.goForward();
        await assertAccount();
      });
    }

    test(`cached You profile offers Google reconnect on ${viewport.name} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await prepare(page, theme, false);
      await page.goto("/#you");
      const reports = page.getByRole("region", { name: "In-depth transit reports" });
      await expect(reports.getByText("Sign in to create or read your reports.")).toBeVisible();
      await expect(reports.getByRole("button", { name: "Create day report", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await expect(page.getByRole("menuitem", { name: "Sign out", exact: true })).toBeHidden();
      await expect(page.getByRole("menuitem", { name: "Login", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close menu", exact: true }).click();
      await expect(page.getByRole("menu", { name: "Site menu" })).toBeHidden();
      await expect(page.getByRole("region", { name: "Daily horoscope summary" }).getByRole("heading")).toBeVisible();
      expect(await reports.getByRole("button").evaluateAll(buttons => buttons.every(button => button.scrollWidth <= button.clientWidth + 1))).toBe(true);
      await reports.scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`you-reconnect-${viewport.name}-${theme}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      await reports.getByRole("button", { name: "Sign in", exact: true }).click();
      const login = page.getByRole("region", { name: "Log in", exact: true });
      await expect(login.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).id)).toBe(user.id);
      await login.getByRole("button", { name: "Close", exact: true }).click();
      await expect(reports).toBeVisible();
    });

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

    test(`You macro view expands its complete passage on ${viewport.name} ${theme}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await prepare(page, theme);
      await page.goto("/#you");
      const macro = page.locator(".weekly-horoscope__macro");
      const body = macro.locator(".weekly-horoscope__macro-body");
      const more = macro.getByRole("button", { name: "Read more", exact: true });
      await expect(more).toBeVisible();
      await expect(more).toHaveAttribute("aria-expanded", "false");
      await expect(more).toHaveAttribute("aria-controls", await body.getAttribute("id") as string);
      // The owner's sample is the first two paragraphs of this full passage.
      const preview = `${macroBody.split("\n\n").slice(0, 2).join("\n\n")}…`;
      expect((await body.locator("p").allTextContents()).join("\n\n")).toBe(preview);
      expect(preview.length).toBeLessThanOrEqual(576);
      await macro.scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`you-macro-${viewport.name}-${theme}.png`) });
      await more.focus();
      await page.keyboard.press("Enter");
      const less = macro.getByRole("button", { name: "Read less", exact: true });
      await expect(less).toHaveAttribute("aria-expanded", "true");
      expect((await body.locator("p").allTextContents()).join("\n\n")).toBe(macroBody);
      await expect(body).toContainText("They need a life that does not require you to keep treating yourself as the problem.");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      await less.click();
      await expect(more).toHaveAttribute("aria-expanded", "false");
      expect((await body.locator("p").allTextContents()).join("\n\n")).toBe(preview);
    });
  }
}

test("You recovers a session written by another tab and notices its removal", async ({ page, context }) => {
  await prepare(page, "light", false);
  await page.goto("/#you");
  const reports = page.getByRole("region", { name: "In-depth transit reports" });
  await expect(reports.getByText("Sign in to create or read your reports.")).toBeVisible();
  // Studio writes shared storage directly, without a Supabase broadcast.
  const otherTab = await context.newPage();
  await otherTab.route("**/__session-update", route => route.fulfill({ contentType: "text/html", body: "<title>Session fixture</title>" }));
  await otherTab.goto("/__session-update");
  await otherTab.evaluate(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), { storageKey, session });
  await expect(reports.getByRole("button", { name: "Read day report", exact: true })).toBeEnabled();
  await expect(reports.getByText("Sign in to create or read your reports.")).toBeHidden();
  await otherTab.evaluate(storageKey => localStorage.removeItem(storageKey), storageKey);
  await expect(reports.getByText("Sign in to create or read your reports.")).toBeVisible();
  await expect(reports.getByRole("button", { name: "Create day report", exact: true })).toBeDisabled();
  await otherTab.close();
});

test("You rechecks the session when returning to the page", async ({ page }) => {
  await prepare(page, "light", false);
  await page.goto("/#you");
  const reports = page.getByRole("region", { name: "In-depth transit reports" });
  await expect(reports.getByText("Sign in to create or read your reports.")).toBeVisible();
  // Model a storage update whose cross-tab notification was missed while away.
  await page.evaluate(({ storageKey, session }) => {
    localStorage.setItem(storageKey, JSON.stringify(session));
    window.dispatchEvent(new Event("focus"));
  }, { storageKey, session });
  await expect(reports.getByRole("button", { name: "Read day report", exact: true })).toBeEnabled();
  await page.evaluate(storageKey => {
    localStorage.removeItem(storageKey);
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  }, storageKey);
  await expect(reports.getByText("Sign in to create or read your reports.")).toBeVisible();
});
