import { expect, test, type Page } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { natalSkySnapshotCacheKey, skySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from "../../apps/web/src/services/verifiedSkyCache";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const user = { id: "reader-qa", email: "reader@example.test", app_metadata: { provider: "email" }, user_metadata: {} };
const profile = { ...user, name: "Reader QA", provider: "email", sun: "Capricorn", moon: "Pisces", rising: "Aries", currentLocation: location.label, currentLocationData: location,
  charts: [{ id: "reader-chart", name: "Reader QA", type: "Birth chart", birthDate: "1990-01-01", birthTime: "12:00 PM", birthCity: location.label, birthLocation: location }] };
const birth = new Date("1990-01-01T17:00:00Z");
let cacheRecords: unknown[];
test.beforeAll(async () => {
  const natal = await getAstrodienstSky(location, birth);
  const sky = await getAstrodienstSky(location, new Date("2026-11-27T12:00:00Z"));
  // This future date gives the synthetic chart a calculated Lilith–Pluto square.
  const squareSky = await getAstrodienstSky(location, new Date("2027-12-08T12:00:00Z"));
  cacheRecords = [
    { schema: VERIFIED_SKY_CACHE_SCHEMA, cacheKey: natalSkySnapshotCacheKey(location, birth), snapshot: natal },
    { schema: VERIFIED_SKY_CACHE_SCHEMA, cacheKey: skySnapshotCacheKey(location, "2026-11-27"), snapshot: sky },
    { schema: VERIFIED_SKY_CACHE_SCHEMA, cacheKey: skySnapshotCacheKey(location, "2027-12-08"), snapshot: squareSky }
  ];
});

async function prepare(page: Page, options: { circleFailure?: boolean; slowContent?: boolean; session?: "missing" | "rejected" | "unavailable" } = {}) {
  const readerProfile = profile;
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = { circleFailure: options.circleFailure ?? false, circleRequests: 0, contentRequests: 0, session: options.session };
  await page.addInitScript(({ location, user, profile, cacheRecords, session }) => {
    localStorage.setItem("tldrastro:theme", "light");
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    if (session !== "missing") for (const key of ["sb-reader-qa-auth-token", "sb-hdmdufozrgrajkfhydit-auth-token"]) {
      localStorage.setItem(key, JSON.stringify({ access_token: "fixture.reader.session", refresh_token: "fixture-refresh", expires_at: Math.floor(Date.now()/1000)+3600, token_type: "bearer", user }));
    }
    for (const record of cacheRecords as any[]) localStorage.setItem(record.cacheKey, JSON.stringify({ ...record, verifiedAt: new Date().toISOString() }));
  }, { location, user, profile: readerProfile, cacheRecords, session: options.session });
  await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 503, json: {} }));
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, json: {} }));
  await page.route(/^https:\/\/[^/]+\.supabase\.(?:test|co)\//, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/v1/token") {
      state.session = undefined;
      return route.fulfill({ json: { access_token: "fixture.reader.new-session", refresh_token: "fixture-new-refresh", expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: "bearer", user } });
    }
    if (path === "/auth/v1/user") return route.fulfill(state.session === "rejected"
      ? { status: 401, headers: { "x-supabase-api-version": "2024-01-01" }, json: { code: "session_not_found", message: "Session no longer exists" } }
      : state.session === "unavailable"
        ? { status: 503, json: { code: "unexpected_failure", message: "Auth temporarily unavailable" } }
        : { json: user });
    if (path === "/rest/v1/user_profiles") return route.fulfill({ json: { data: { version: 1, profile: readerProfile } } });
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

for (const session of ["missing", "rejected"] as const) for (const theme of ["light", "dark"]) {
  test(`Friends offers sign-in with a ${session} session and cached profile (${theme})`, async ({ page }) => {
    await prepare(page, { session });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
    await page.goto("/?date=2026-11-27#friends?tab=circle");
    const notice = page.getByRole("alert");
    await expect(notice.getByRole("heading", { name: "Sign in to see your friends" })).toBeVisible();
    await expect(notice.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await expect(page.locator("h1, h2")).toHaveText(["friends.", "Sign in to see your friends"]);
    // Compare the new notice with the established connection-error treatment.
    const referenceContext = session === "missing"
      ? await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin })
      : null;
    const reference = await referenceContext?.newPage();
    if (reference) {
      await prepare(reference, { circleFailure: true });
      await reference.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
      await reference.goto("/?date=2026-11-27#friends?tab=circle");
      await expect(reference.getByRole("alert").getByRole("heading", { name: "Friends could not load." })).toBeVisible();
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(notice.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (reference) {
        await reference.setViewportSize({ width, height: 900 });
        const headingStyle = async (target: Page) => {
          await target.evaluate(() => document.fonts.ready.then(() => undefined));
          return target.getByRole("alert").getByRole("heading").evaluate(element => {
            const style = getComputedStyle(element);
            return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.margin, style.textTransform, style.textAlign];
          });
        };
        expect(await headingStyle(page)).toEqual(await headingStyle(reference));
      }
      await page.screenshot({ path: `test-results/reader-recovery/friends-sign-in-${session}-${theme}-${width}.png` });
    }
    await referenceContext?.close();
    await page.getByRole("tab", { name: /Charts/ }).click();
    await expect(page.getByRole("button", { name: "Add a chart", exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: /Circle/ }).click();
    await notice.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("region", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    // Opening sign-in must not destroy the saved natal chart or local profile.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).charts[0].id)).toBe("reader-chart");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("qa-only-password");
    await page.getByRole("button", { name: "Log in →", exact: true }).click();
    await expect(page.getByText("QA Friend", { exact: true })).toBeVisible();
    expect(new URL(page.url()).hash).toContain("friends");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).charts[0].id)).toBe("reader-chart");
  });
}

test("an Auth outage remains retryable and is not presented as a missing session", async ({ page }) => {
  await prepare(page, { session: "unavailable" });
  await page.goto("/?date=2026-11-27#friends?tab=circle");
  await expect(page.getByRole("alert").getByRole("button", { name: "Try again" })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole("heading", { name: "Sign in to see your friends" })).toHaveCount(0);
});

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
  // Approved offline writing can now make every transit actionable. Any
  // remaining facts-only row must still be a non-interactive article.
  const staticRows = page.locator("article.updates-aspect-row");
  for (const row of await staticRows.all()) {
    await expect(row).not.toHaveAttribute("role", "button");
  }
  await expect(page.locator("button.updates-aspect-row .updates-aspect-row__description").first()).toBeVisible();
  await page.screenshot({ path: "test-results/reader-recovery/you-transits-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await houses.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/reader-recovery/you-transits-mobile.png" });
});

test("Calendar honors the shared date and finishes skeletons on a stalled content request", async ({ page }) => {
  const state = await prepare(page, { slowContent: true });
  const date = "2026-11-27";
  // Synthetic station facts test loading without publishing any interpretation.
  const event = { id: "qa-station", type: "station", glyph: "⚸", planet: "Lilith", sign: "Capricorn", direction: "retrograde", primary: true, title: "Lilith stations retrograde in Capricorn", startsAt: `${date}T12:00:00Z`, dateKey: date };
  const ingress = { ...event, id: "qa-ingress", type: "ingress", planet: "Venus", sign: "Scorpio", toSign: "Scorpio", direction: undefined, title: "Venus enters Scorpio", startsAt: `${date}T13:00:00Z` };
  const moon = { id: "qa-lunation", type: "lunation", title: "New Moon", sign: "Sagittarius", startsAt: "2026-11-29T12:00:00Z", dateKey: "2026-11-29" };
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: {
    month: "2026-11", timeZone: location.timeZone, location,
    days: Array.from({ length: 7 }, (_, i) => { const key = `2026-11-${23+i}`; return { date: `${key}T12:00:00Z`, dateKey: key, inMonth: true, moonSign: "Leo", moonSignGlyph: "♌", moonPhase: "Waning Gibbous", illumination: 70, phaseAngle: 240, activeAspects: [], events: key === date ? [event, ingress] : key === "2026-11-28" ? [{ ...event, id: "qa-station-boundary-repeat" }] : [] }; }), events: [event, ingress, moon]
  } } }));
  await page.goto(`/?date=${date}#calendar?view=day`);
  await expect(page.getByLabel("Selected lunar day")).toContainText(/Fri.*November 27/, { timeout: 30_000 });
  const card = page.locator(".calendar-stoic-card").filter({ hasText: event.title });
  await expect(card).toBeVisible();
  await expect.poll(() => state.contentRequests).toBeGreaterThan(0);
  await card.click();
  const reading = page.getByRole("dialog").filter({ hasText: event.title });
  await expect(reading).toBeVisible();
  await expect(reading.getByLabel("Loading interpretation")).toHaveCount(0);
  await expect(reading).toContainText("Black Moon Lilith stations, and a preference, refusal, or old point of anger");
  await expect(reading).toContainText("It is to stop pretending the preference does not exist.");
  await expect(page.locator(".lunar-milestones")).toHaveCount(0);
  await page.screenshot({ path: "test-results/reader-recovery/calendar-finished.png", fullPage: true });
  await reading.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".lunar-week-day[data-calendar-date='2026-11-28']").click();
  expect(`${page.url()}`).toMatch(/2026-11-28/);
  await expect(page.locator(".lunar-milestones")).toHaveCount(0);
  await page.getByRole("tab", { name: "Month", exact: true }).click();
  await expect(page.locator(".lunar-calendar-day[data-calendar-date='2026-11-27']")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "You", exact: true }).click();
  await expect(page.getByRole("button", { name: /Nov 28/ })).toBeVisible();
});


for (const mode of ["create", "login", "incomplete-birth-time"] as const) test(`Google authentication starts without birth details (${mode})`, async ({ page }) => {
  await prepare(page, { session: "missing" });
  await page.addInitScript(() => localStorage.removeItem("tldrastro:userProfile"));
  await page.route("**/auth/v1/authorize?**", route => route.fulfill({ contentType: "text/html", body: "<p>OAuth provider reached</p>" }));
  await page.goto(mode === "login" ? "/?auth=login#you" : "/#you");
  await expect(page.getByRole("region", { name: mode === "login" ? "Log in" : "Create account", exact: true })).toBeVisible();
  if (mode === "incomplete-birth-time") await page.getByRole("textbox", { name: "Birth hour", exact: true }).fill("25");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByText("OAuth provider reached")).toBeVisible({ timeout: 10_000 });
  expect(new URL(page.url()).searchParams.get("provider")).toBe("google");
});

test("Lilith Pluto writing survives the reader adapter and opens its complete interpretation", async ({ page }) => {
  await prepare(page);
  await page.goto("/?date=2027-12-08#you");
  // The synthetic chart ranks other transits ahead of this aspect in the
  // primary cards. Its calculated factor remains available in this entry.
  const entry = page.getByRole("button").filter({ has: page.getByText("Lilith challenging power", { exact: true }) });
  await expect(entry).toBeVisible({ timeout: 45_000 });
  await entry.click();
  const article = page.locator(".sky-detail-page");
  await expect(article).toContainText("Power, depth, and slow transformation hit the limit");
  await expect(article).toContainText(/Lilith in Aquarius is squaring your natal Pluto through/);
  await page.screenshot({ path: "test-results/reader-recovery/lilith-pluto-detail.png", fullPage: true });
  await page.getByRole("button", { name: "Back to updates", exact: true }).click();
  await page.reload();
  // A reload hydrates the weekly transit entries again, like first navigation.
  await expect(entry).toBeVisible({ timeout: 45_000 });
  await entry.click();
  await expect(article).toContainText("Power, depth, and slow transformation hit the limit");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(article).toContainText("Power, depth, and slow transformation hit the limit");
  await page.screenshot({ path: "test-results/reader-recovery/lilith-pluto-mobile.png" });
});


test("Google from Create profile restores an existing account and its Friends", async ({ page }) => {
  await prepare(page, { session: "missing" });
  await page.addInitScript(() => localStorage.removeItem("tldrastro:userProfile"));
  await page.route("**/auth/v1/authorize?**", route => {
    const redirect = new URL(new URL(route.request().url()).searchParams.get("redirect_to")!);
    const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encoded({ alg: "HS256", typ: "JWT" })}.${encoded({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000) })}.fixture`;
    redirect.hash = new URLSearchParams({ access_token: token, refresh_token: "fixture-refresh", expires_in: "3600", token_type: "bearer" }).toString();
    return route.fulfill({ status: 302, headers: { location: redirect.href }, body: "" });
  });
  await page.goto("/#you");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("heading", { name: "Reader QA", exact: true })).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).charts[0].id)).toBe("reader-chart");
  await page.getByRole("button", { name: "Friends", exact: true }).click();
  await expect(page.getByText("QA Friend", { exact: true })).toBeVisible();
});
