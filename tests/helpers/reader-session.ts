import type { Page } from "@playwright/test";

/** Verify the synthetic cached profile through the same single-session path as the reader. */
export async function readerSession(page: Page, id: string, authURL = process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test") {
  const user = { id, email: "reader-session@example.test", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: {} };
  const key = `sb-${new URL(authURL).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(({ user, key }) => localStorage.setItem(key, JSON.stringify({ access_token: "synthetic-reader-session", refresh_token: "synthetic-reader-refresh", token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user })), { user, key });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
  await page.route("**/rest/v1/user_profiles*", async route => route.fulfill({ json: { data: { version: 1, profile: await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile") ?? "null")) } } }));
  await page.route("**/rest/v1/manual_charts*", route => route.fulfill({ status: 400, json: { message: "Synthetic unavailable chart sync" } }));
}
