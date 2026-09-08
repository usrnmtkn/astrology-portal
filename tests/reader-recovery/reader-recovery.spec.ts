import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { natalSkySnapshotCacheKey, skySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from "../../apps/web/src/services/verifiedSkyCache";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const user = { id: "reader-qa", email: "reader@example.test", app_metadata: { provider: "email" }, user_metadata: {} };
const profile = { ...user, name: "Reader QA", provider: "email", sun: "Aquarius", moon: "Scorpio", rising: "Gemini", currentLocation: location.label, currentLocationData: location,
  charts: [{ id: "reader-chart", name: "Reader QA", type: "Birth chart", birthDate: "1990-01-01", birthTime: "12:00 PM", birthCity: location.label, birthLocation: location }] };
const birth = new Date("1990-01-01T17:00:00Z");
let cacheRecords: unknown[];
test.beforeAll(async () => {
  const natal = await getAstrodienstSky(location, birth);
  const sky = await getAstrodienstSky(location, new Date("2026-11-27T12:00:00Z"));
  cacheRecords = [
    { schema: VERIFIED_SKY_CACHE_SCHEMA, cacheKey: natalSkySnapshotCacheKey(location, birth), snapshot: natal },
    { schema: VERIFIED_SKY_CACHE_SCHEMA, cacheKey: skySnapshotCacheKey(location, "2026-11-27"), snapshot: sky }
  ];
});

async function prepare(page: Page, options: { circleFailure?: boolean; slowContent?: boolean } = {}) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = { circleFailure: options.circleFailure ?? false, circleRequests: 0, contentRequests: 0 };
  await page.addInitScript(({ location, user, profile, cacheRecords }) => {
    localStorage.setItem("tldrastro:theme", "light");
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    localStorage.setItem("sb-reader-qa-auth-token", JSON.stringify({ access_token: "fixture.reader.session", refresh_token: "fixture-refresh", expires_at: Math.floor(Date.now()/1000)+3600, token_type: "bearer", user }));
    for (const record of cacheRecords as any[]) localStorage.setItem(record.cacheKey, JSON.stringify({ ...record, verifiedAt: new Date().toISOString() }));
  }, { location, user, profile, cacheRecords });
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, json: {} }));
  await page.route("https://reader-qa.supabase.test/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/v1/user") return route.fulfill({ json: user });
    if (path === "/rest/v1/user_profiles") return route.fulfill({ json: { data: { version: 1, profile } } });
    if (path === "/rest/v1/social_profiles") return route.fulfill({ json: { user_id: user.id, display_name: "Reader QA", handle: "reader", discoverable: true } });
    if (path === "/rest/v1/rpc/list_social_friends") {
      state.circleRequests++;
      return route.fulfill(state.circleFailure ? { status: 503, json: { message: "Database unavailable" } } : { json: [{ friendship_id: "qa-friendship", user_id: "friend-qa", handle: "qa-friend", display_name: "QA Friend", natal_chart: null, accepted_at: "2026-09-01T12:00:00Z" }] });
    }
    if (path === "/rest/v1/generated_interpretations") {
      state.contentRequests++;
      if (options.slowContent) { await new Promise(resolve => setTimeout(resolve, 30_000)); }
    }
    return route.fulfill({ json: [] }).catch(() => {});
  });
  return state;
}

for (const recoveryEvent of ["focus", "online"]) {
  test(`Friends recovers on ${recoveryEvent} after the database returns`, async ({ page }) => {
    const state = await prepare(page, { circleFailure: true });
    await page.goto("/?date=2026-11-27#friends?tab=circle");
    await expect(page.getByText("Friends could not load.", { exact: true })).toBeVisible();
    state.circleFailure = false;
    await page.evaluate(event => window.dispatchEvent(new Event(event)), recoveryEvent);
    await expect(page.getByText("QA Friend", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(state.circleRequests).toBeGreaterThanOrEqual(2);
  });
}

test("You keeps calculated planet and house transits visible while saved content is unavailable", async ({ page }) => {
  await prepare(page, { slowContent: true });
  await page.goto("/?date=2026-11-27#you");
  const houses = page.getByLabel("House transits", { exact: true });
  await expect(houses).toBeVisible({ timeout: 45_000 });
  await expect(houses.getByText(/Saturn through your/)).toBeVisible();
  await expect(houses.getByText(/Jupiter through your/)).toBeVisible();
  await expect(houses.locator(".updates-aspect-row")).toHaveCount(14);
  await expect(page.getByText(/No major updates are active/)).toHaveCount(0);
  const staticRows = page.locator("article.updates-aspect-row");
  expect(await staticRows.count()).toBeGreaterThan(0);
  await expect(staticRows.first()).not.toHaveAttribute("role", "button");
  await page.screenshot({ path: "outputs/reader-recovery/you-transits-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await houses.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/reader-recovery/you-transits-mobile.png" });
});

test("Calendar honors the shared date and finishes skeletons on a stalled content request", async ({ page }) => {
  const state = await prepare(page, { slowContent: true });
  const date = "2026-11-27";
  // Synthetic station facts test loading without publishing any interpretation.
  const event = { id: "qa-station", type: "station", glyph: "⚸", planet: "Lilith", sign: "Capricorn", direction: "retrograde", primary: true, title: "Lilith stations retrograde in Capricorn", startsAt: `${date}T12:00:00Z`, dateKey: date };
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: {
    month: "2026-11", timeZone: location.timeZone, location,
    days: Array.from({ length: 7 }, (_, i) => { const key = `2026-11-${23+i}`; return { date: `${key}T12:00:00Z`, dateKey: key, inMonth: true, moonSign: "Leo", moonSignGlyph: "♌", moonPhase: "Waning Gibbous", illumination: 70, phaseAngle: 240, activeAspects: [], events: key === date ? [event] : [] }; }), events: [event]
  } } }));
  await page.goto(`/?date=${date}#calendar`);
  await expect(page.getByText(/Friday, November 27/)).toBeVisible({ timeout: 30_000 });
  const card = page.locator(".tx-card").filter({ hasText: event.title });
  await expect(card).toBeVisible();
  await expect.poll(() => state.contentRequests).toBeGreaterThan(0);
  await expect(card).toHaveAttribute("aria-busy", "false", { timeout: 20_000 });
  await expect(card.getByLabel("Loading interpretation")).toHaveCount(0);
  await expect(card).toContainText("Nov 27");
  await page.screenshot({ path: "outputs/reader-recovery/calendar-finished.png", fullPage: true });
  await page.getByRole("button", { name: /Saturday.*November 28/ }).click();
  expect(new URL(page.url()).searchParams.get("date")).toBe("2026-11-28");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You", exact: true }).click();
  await expect(page.getByRole("button", { name: /Nov 28/ })).toBeVisible();
});
