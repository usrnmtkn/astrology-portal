import { test, expect, type Page } from "@playwright/test";

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
