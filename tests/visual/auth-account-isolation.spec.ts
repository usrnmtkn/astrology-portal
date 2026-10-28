import { test, expect, type Page } from "../helpers/polish-test";

const owner = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "owner-a@example.test", app_metadata: { provider: "google" }, user_metadata: { name: "Fixture A" } };
const key = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
const row = { id: "22222222-2222-4222-8222-222222222222", subject_type: "you_day_reading", status: "DRAFT", body: "Synthetic reading.", headline: "Account A private report", target_date: "2026-09-21", created_at: "2026-09-21T12:00:00Z", updated_at: "2026-09-21T12:00:00Z" };
async function seed(page: Page, stored = true) {
  await page.addInitScript(({ owner, key, stored }) => {
    if (stored && !sessionStorage.getItem("fixture-seeded")) {
      localStorage.setItem(key, JSON.stringify({ user: owner, access_token: "synthetic-a", refresh_token: "synthetic-refresh", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600 }));
      sessionStorage.setItem("fixture-seeded", "true");
    }
  }, { owner, key, stored });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: owner }));
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
  await page.routeWebSocket("**/realtime/v1/websocket*", socket => socket.onMessage(raw => {
    const message = JSON.parse(String(raw));
    socket.send(JSON.stringify({ topic: message.topic, event: "phx_reply", ref: message.ref, payload: { status: "ok", response: {} } }));
  }));
}
async function signOutSignal(page: Page) {
  await page.evaluate(key => {
    localStorage.removeItem(key);
    const channel = new BroadcastChannel(key);
    channel.postMessage({ event: "SIGNED_OUT", session: null });
    channel.close();
  }, key);
}

test("auth access clears private report rows on sign-out and ignores a late read", async ({ page }) => {
  await seed(page);
  let delay = false, reads = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/user_generated_interpretations?**", async route => {
    reads++;
    if (delay) await held;
    await route.fulfill({ json: [row] });
  });
  await page.goto("/reports/");
  await expect(page.getByText(row.headline, { exact: true })).toBeVisible();
  delay = true;
  const initial = reads;
  await expect.poll(() => reads, { timeout: 15_000 }).toBeGreaterThan(initial);
  await signOutSignal(page);
  await expect(page.getByText("Sign in to view your reports.", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText(row.headline, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Reports 0", exact: true })).toBeVisible();
});

test("auth access drops notification events and pending reads from a signed-out account", async ({ page }) => {
  await seed(page);
  let delay = false, reads = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/user_generated_interpretations?**", async route => {
    reads++;
    if (delay) await held;
    await route.fulfill({ json: [row] });
  });
  await page.goto("/#account");
  await expect(page.locator(".report-ready-toast")).toContainText(row.headline);
  delay = true;
  const initial = reads;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => reads).toBeGreaterThan(initial);
  await signOutSignal(page);
  await expect(page.locator(".report-ready-toast")).toHaveCount(0);
  release();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("tldrastro:report-ready", { detail: { sourceKind: "generated_interpretation", sourceId: "late-a", title: "Previous account late report", route: "/reports/old" } })));
  await expect(page.locator(".report-ready-toast")).toHaveCount(0);
  await expect(page.locator(".reports-nav-badge")).toHaveCount(0);
});

for (const path of ["/#account?view=journal", "/#friends?tab=circle", "/reports/"]) {
  test(`auth callback restores requested feature ${path}`, async ({ page }) => {
    await seed(page, false);
    await page.goto(`/?readerReturn=${encodeURIComponent(path)}#access_token=synthetic-callback&refresh_token=synthetic-refresh&expires_in=3600&token_type=bearer`);
    await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
    if (path.includes("journal")) await expect(page.getByText("No check-ins yet", { exact: true })).toBeVisible();
    else if (path.includes("reports")) await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    else await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeHidden();
  });
}

async function seedSavedRequests(page: Page) {
  await page.addInitScript(owner => {
    if (sessionStorage.getItem("request-route-seeded")) return;
    sessionStorage.setItem("request-route-seeded", "true");
    localStorage.setItem("tldrastro:portalMode", "friends");
    localStorage.setItem("tldrastro:friendsTab", "requests");
    localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: owner.id, name: "Fixture A", email: owner.email, provider: "google",
      sun: "Capricorn", moon: "Pisces", rising: "Aries", charts: []
    }));
  }, owner);
}

test("restored login does not reopen a saved Requests tab", async ({ page }) => {
  await seed(page);
  await seedSavedRequests(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Create your chart.", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You", exact: true })).toHaveClass(/active/);
  await expect(page).not.toHaveURL(/friends.*requests/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create your chart.", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You", exact: true })).toHaveClass(/active/);
  await expect(page).not.toHaveURL(/friends.*requests/);
});

test("OAuth login replaces an old Requests return with You", async ({ page }) => {
  await seed(page, false);
  await seedSavedRequests(page);
  await page.goto("/?readerReturn=%2F%23friends%3Ftab%3Drequests#access_token=synthetic-callback&refresh_token=synthetic-refresh&expires_in=3600&token_type=bearer");
  await expect(page).toHaveURL(/\/#you$/);
  await expect(page.getByRole("heading", { name: "Create your chart.", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You", exact: true })).toHaveClass(/active/);
  await page.screenshot({ path: "test-results/login-returns-to-you.png" });
});

test("email login ignores a stale Requests return", async ({ page }) => {
  await seed(page, false);
  await seedSavedRequests(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("email-return-seeded")) return;
    sessionStorage.setItem("email-return-seeded", "true");
    sessionStorage.setItem("tldrastro:readerAuthReturn", JSON.stringify({ path: "/#friends?tab=requests", at: Date.now() }));
  });
  await page.route("**/auth/v1/token?grant_type=password", route => route.fulfill({ json: {
    user: owner, access_token: "synthetic-password", refresh_token: "synthetic-refresh",
    token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600
  } }));
  await page.goto("/?auth=login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(owner.email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-test-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create your chart.", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You", exact: true })).toHaveClass(/active/);
  await expect(page).not.toHaveURL(/friends.*requests/);
});

test("auth callback cancellation can restart sign-in without replaying the callback", async ({ page }) => {
  await seed(page, false);
  await page.goto("/#error=access_denied&error_code=provider_error&error_description=Synthetic+cancellation");
  await expect(page).toHaveURL(/auth=login/);
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  expect(new URL(page.url()).hash).not.toContain("error=");
});

test("auth access binds invitation acceptance to the displayed token", async ({ page }) => {
  await seed(page);
  const preview = { invitation_id: "fixture-invitation", contact_kind: "link", inviter_user_id: "fixture-sender", inviter_handle: "fixture_sender", inviter_display_name: "Fixture Sender", expires_at: "2026-12-01T12:00:00Z" };
  let claims = 0;
  await page.route("**/rest/v1/rpc/preview_social_invitation", route => route.fulfill({ json: [preview] }));
  await page.route("**/rest/v1/rpc/claim_social_invitation", route => {
    claims++;
    return route.fulfill({ json: [{ invitation_id: preview.invitation_id, request_status: "friends" }] });
  });
  await page.goto("/i/synthetic-invite-a");
  await expect(page.getByRole("button", { name: "Accept invitation", exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("tldrastro.pending-social-invitation", "synthetic-invite-b"));
  await page.getByRole("button", { name: "Accept invitation", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your account or invitation changed");
  expect(claims).toBe(0);
  await signOutSignal(page);
  await expect(page.getByRole("button", { name: "Accept invitation", exact: true })).toHaveCount(0);
});

test("auth access rejects a delayed invitation preview after sign-out", async ({ page }) => {
  await seed(page);
  let reads = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/preview_social_invitation", async route => {
    reads++;
    await held;
    await route.fulfill({ json: [{ invitation_id: "old-invitation", contact_kind: "link", inviter_user_id: "sender", inviter_handle: "old_sender", inviter_display_name: "Old Sender", expires_at: "2026-12-01" }] });
  });
  await page.goto("/i/synthetic-delayed-invite");
  await expect.poll(() => reads).toBeGreaterThan(0);
  await signOutSignal(page);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Login", exact: true })).toBeVisible();
  release();
  await expect(page.getByText(/Your friend Old Sender/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Accept invitation", exact: true })).toHaveCount(0);
});
