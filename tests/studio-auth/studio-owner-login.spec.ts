import { expect, test, type Page } from "@playwright/test";

// All identities and API responses are synthetic; this suite never contacts production.
const token = "fixture.owner.session";
const user = { id: "studio-qa-owner", email: "owner@example.test", app_metadata: { role: "admin", provider: "email" }, user_metadata: {} };
const session = { access_token: token, refresh_token: "fixture-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
const destination = "/admin/content#sky-writeups?planet=saturn&sign=aries&motion=retrograde";

async function prepare(page: Page, signedIn: boolean) {
  await page.addInitScript(({ signedIn, session }) => {
    localStorage.removeItem("tldrastro:contentAdminSecret");
    if (signedIn) localStorage.setItem("sb-studio-auth-auth-token", JSON.stringify(session));
  }, { signedIn, session });
  await page.route("https://studio-auth.supabase.test/**", route => route.fulfill({ json: route.request().url().includes("/auth/v1/user") ? user : [] }));
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, json: {} }));
  const state = { status: 200, credentials: [] as string[] };
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/admin/generated-content" && !url.searchParams.has("sourceDrafts")) {
      state.credentials.push(route.request().headers()["x-content-admin-session"] ?? route.request().headers()["x-content-generation-secret"] ?? "");
      await route.fulfill({ status: state.status, json: state.status === 200 ? { ok: true, rows: [], nextCursor: null } : { error: state.status === 401 ? "Unauthorized." : "Content storage did not respond within 8 seconds." } });
    } else {
      await route.fulfill({ json: { ok: true, rows: [], records: [], items: [], statuses: [] } });
    }
  });
  return state;
}

test("owner session survives a storage timeout and Retry uses the same session", async ({ page }) => {
  const state = await prepare(page, true);
  state.status = 504;
  await page.goto(destination);
  const failure = page.getByRole("region", { name: "Content load failed" });
  await expect(failure).toContainText("HTTP 504");
  await expect(page.getByRole("region", { name: "Admin access required" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connection error");
  state.status = 200;
  await failure.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected");
  expect(state.credentials.length).toBeGreaterThan(1);
  expect(state.credentials.every(value => value === token)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBeNull();
});

test("emergency access keeps the entered credential for Retry after storage failure", async ({ page }) => {
  const state = await prepare(page, false);
  state.status = 504;
  await page.goto(destination);
  await page.getByLabel("Emergency admin secret").fill("fixture-emergency");
  await page.getByRole("button", { name: "Verify emergency access" }).click();
  const failure = page.getByRole("region", { name: "Content load failed" });
  await expect(failure).toContainText("HTTP 504");
  await expect(page.getByRole("region", { name: "Admin access required" })).toHaveCount(0);
  state.status = 200;
  await failure.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected");
  expect(state.credentials.every(value => value === "fixture-emergency")).toBe(true);
});

test("owner sign-in returns to the selected Studio page instead of You", async ({ page }) => {
  const state = await prepare(page, true);
  state.status = 401;
  await page.goto(destination);
  const link = page.getByRole("link", { name: "Sign in as owner" });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(new URL(href!, "http://127.0.0.1:4296").searchParams.get("returnTo")).toBe(destination);
  await expect(link).not.toHaveAttribute("target", "_blank");
  state.status = 200;
  await link.click();
  await expect(page).toHaveURL(`http://127.0.0.1:4296${destination}`);
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected");
  await expect(page.getByRole("heading", { name: "Sky Write-ups", exact: true })).toBeVisible();
});
