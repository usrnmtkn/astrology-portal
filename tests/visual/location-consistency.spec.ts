import { expect, test, type Page } from "@playwright/test";
import type { LocationInput } from "../../apps/web/src/types";
import { bundledPublications } from "../helpers/bundled-publications";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";

const concord = { label: "Concord, NH", latitude: 43.2081, longitude: -71.5376, timeZone: "America/New_York" };
const albany = { label: "Albany, NY", latitude: 42.6526, longitude: -73.7562, timeZone: "America/New_York" };
const austin = { label: "Austin, TX", latitude: 30.2672, longitude: -97.7431, timeZone: "America/Chicago" };
const birthLocation = { label: "Boston, MA", latitude: 42.3601, longitude: -71.0589, timeZone: "America/New_York" };
const profile = { id: "qa-location-user", name: "Location Tester", email: "location@example.test", provider: "email", currentLocation: concord.label, currentLocationData: concord,
  charts: [{ id: "qa-birth", name: "Location Tester", type: "Birth chart", birthDate: "1990-01-01", birthTime: "12:00 PM", birthCity: birthLocation.label, birthLocation }] };

async function setup(page: Page, options: { guest?: boolean; legacy?: boolean; current?: LocationInput } = {}) {
  await bundledPublications(page);
  const requests: URL[] = [];
  const personalLocations: unknown[] = [];
  await page.route("**/api/sky{,-reader}?**", async route => {
    const url = new URL(route.request().url()); requests.push(url);
    const latitude = Number(url.searchParams.get("lat")), longitude = Number(url.searchParams.get("lon"));
    const location = { label: "Calculated fixture", latitude, longitude, timeZone: url.searchParams.get("timeZone")! };
    const sky = await getAstrodienstSky(location, new Date(url.searchParams.get("at")!), { includeTransitWindows: true, includeAspectTiming: false });
    await route.fulfill({ json: { sky: { ...sky, calculationDetail: url.searchParams.get("detail") } } });
  });
  const calendarRequests: URL[] = [];
  await page.route("**/api/calendar?**", route => {
    const url = new URL(route.request().url()); calendarRequests.push(url);
    return route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: url.searchParams.get("date"), events: [] }] } } });
  });
  await page.route("https://location-api.invalid/**", route => {
    if (route.request().url().includes("/timing/personal")) personalLocations.push(route.request().postDataJSON().targetLocation);
    if (route.request().url().includes("timezone")) {
      const body = route.request().postDataJSON();
      return route.fulfill({ json: { timeZone: body.longitude < -90 ? austin.timeZone : concord.timeZone, source: "coordinates" } });
    }
    return route.fulfill({ status: 503, body: "Synthetic offline timing fixture" });
  });
  await page.route("https://api.mapbox.com/search/geocode/v6/**", route => {
    const url = new URL(route.request().url());
    const city = url.pathname.endsWith("reverse") || url.searchParams.get("q")?.includes("Austin") ? austin : concord;
    return route.fulfill({ json: { features: [{ id: city.label, properties: { name: city.label.split(",")[0], context: { region: { name: city.label.split(", ")[1] } }, coordinates: { latitude: city.latitude, longitude: city.longitude } } }] } });
  });
  await page.addInitScript(({ profile, albany, options }) => {
    if (localStorage.getItem("qa-location-seeded")) return;
    localStorage.setItem("qa-location-seeded", "true");
    localStorage.setItem("tldrastro:pageAnimations", "off");
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(albany));
    localStorage.setItem("tldrastro:horoscopeLocation", JSON.stringify(albany));
    if (!options.guest) {
      if (options.current) {
        profile.currentLocation = options.current.label;
        profile.currentLocationData = options.current;
      }
      if (options.legacy) {
        const hash = [...profile.currentLocation].reduce((sum, char) => sum + char.charCodeAt(0), 0);
        profile.currentLocationData = { ...profile.currentLocationData, latitude: ((hash % 1400) / 10) - 70, longitude: ((hash % 3000) / 10) - 150 };
      }
      localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    }
  }, { profile, albany, options });
  await page.clock.setFixedTime(new Date("2026-11-04T17:00:00Z"));
  return { requests, calendarRequests, personalLocations };
}

async function expectSavedCity(page: Page, city: typeof concord, member = true) {
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:selectedLocation")!))).toMatchObject(city);
  if (member) {
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!))).toMatchObject({ currentLocation: city.label, currentLocationData: city });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).charts[0].birthLocation)).toEqual(birthLocation);
  }
}

for (const width of [390, 1440]) test(`saved profile city replaces stale Sky and horoscope cities at ${width}px`, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  const { requests, calendarRequests, personalLocations } = await setup(page);
  await page.goto("/#sky");
  await expect(page.locator(".sky-today-ledger__head").first()).toContainText("Concord, NH", { timeout: 60_000 });
  expect(requests[0].searchParams.get("lat")).toBe(String(concord.latitude));
  expect(requests[0].searchParams.get("lon")).toBe(String(concord.longitude));
  await page.locator("#header-date-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Date and location" });
  await expect(dialog).toContainText("Concord, NH");
  await page.screenshot({ path: testInfo.outputPath("consistent-location.png") });
  await dialog.getByRole("button", { name: "Close date and location", exact: true }).filter({ visible: true }).click();
  await page.goto("/#settings");
  await expect(page.getByRole("button", { name: /Current location/ })).toContainText("Concord, NH");
  await page.goto("/#horoscopes");
  await expect(page.locator(".horoscope-location summary")).toContainText("Concord, NH");
  await page.goto("/#calendar");
  await expect.poll(() => calendarRequests.length).toBeGreaterThan(0);
  expect(calendarRequests.at(-1)!.searchParams.get("lat")).toBe(String(concord.latitude));
  await page.goto("/#you");
  await expect.poll(() => personalLocations.length, { timeout: 30_000 }).toBeGreaterThan(0);
  expect(personalLocations.at(-1)).toMatchObject(concord);
  await page.goto("/#friends?tab=charts");
  await expect(page.locator("#header-date-trigger")).toBeVisible();
  await page.goto("/?location-check=reload#sky");
  await expect(page.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Concord, NH/);
  await page.reload();
  await expect(page.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Concord, NH/);
  await expectSavedCity(page, concord);
});

test("Settings requires a selected city and persists it across Sky, profile and reload", async ({ page }) => {
  await setup(page);
  await page.goto("/#settings");
  await page.getByRole("button", { name: /Current location/ }).click();
  await page.getByLabel("Current location", { exact: true }).fill("Austin");
  await expect(page.getByRole("button", { name: "Save location" })).toBeDisabled();
  await page.getByRole("option", { name: /Austin, TX/ }).click();
  await page.getByRole("button", { name: "Save location" }).click();
  await expectSavedCity(page, austin);
  await page.goto("/#sky");
  await expect(page.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Austin, TX/);
  await page.reload();
  await expectSavedCity(page, austin);
});

test("Sky city search updates Settings and cannot submit unresolved text", async ({ page }) => {
  await setup(page);
  await page.goto("/#sky");
  await page.locator("#header-date-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Date and location" });
  await dialog.getByRole("button", { name: "Concord, NH", exact: true }).click();
  await dialog.getByRole("textbox", { name: "City", exact: true }).fill("Unresolved town");
  await page.keyboard.press("Enter");
  await expectSavedCity(page, concord);
  await dialog.getByRole("textbox", { name: "City", exact: true }).fill("Austin");
  await dialog.getByRole("option", { name: /Austin, TX/ }).click();
  await expectSavedCity(page, austin);
  await page.goto("/#settings");
  await expect(page.getByRole("button", { name: /Current location/ })).toContainText("Austin, TX");
});

test("device geolocation updates the shared city and denied permission preserves it", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: austin.latitude, longitude: austin.longitude });
  await setup(page);
  await page.goto("/#sky");
  await page.locator("#header-date-trigger").click();
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expectSavedCity(page, austin);
  await context.clearPermissions();
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not get your location");
  await expectSavedCity(page, austin);
});

test("a delayed device location cannot replace a city selected afterward", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: austin.latitude, longitude: austin.longitude });
  await setup(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let reverseStarted = false;
  await page.route("https://api.mapbox.com/search/geocode/v6/reverse?**", async route => {
    reverseStarted = true;
    await pending;
    await route.fulfill({ json: { features: [{ id: "delayed-austin", properties: { name: "Austin", context: { region: { name: "TX" } } } }] } });
  });
  await page.goto("/#sky");
  await page.locator("#header-date-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Date and location" });
  await dialog.getByRole("button", { name: "Use my current location" }).click();
  await expect.poll(() => reverseStarted).toBe(true);
  await dialog.getByRole("button", { name: "Concord, NH", exact: true }).click();
  await dialog.getByRole("textbox", { name: "City", exact: true }).fill("Concord");
  await dialog.getByRole("option", { name: /Concord, NH/ }).click();
  release();
  await expect(dialog.getByRole("button", { name: "Use my current location" })).toBeEnabled();
  await expectSavedCity(page, concord);
});

test("legacy generated coordinates are replaced only by a matching geocoded city", async ({ page }) => {
  await setup(page, { legacy: true });
  await page.goto("/#settings");
  await expectSavedCity(page, concord);
});

test("a guest keeps the chosen city through reload", async ({ page }) => {
  await setup(page, { guest: true });
  await page.goto("/#sky");
  await expect(page.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Albany, NY/);
  await page.reload();
  await expectSavedCity(page, albany, false);
});

test("a city selected in Horoscopes becomes the shared current city", async ({ page }) => {
  await setup(page);
  await page.goto("/#horoscopes");
  await page.locator(".horoscope-location summary").click();
  await page.locator(".horoscope-location input").fill("Austin");
  await page.getByRole("button", { name: "Austin, TX", exact: true }).click();
  await expectSavedCity(page, austin);
  await page.goto("/#settings");
  await expect(page.getByRole("button", { name: /Current location/ })).toContainText("Austin, TX");
});

test("account hydration repairs conflicting remote preferences and saves one current city", async ({ page }) => {
  await setup(page, { guest: true });
  const user = { id: profile.id, email: profile.email, aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: { name: profile.name } };
  const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(({ user, storageKey }) => localStorage.setItem(storageKey, JSON.stringify({ access_token: "location-fixture-token", refresh_token: "location-fixture-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user })), { user, storageKey });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
  const writes: Array<{ data: { profile: typeof profile; preferences: { selectedLocation: typeof concord } } }> = [];
  await page.route("**/rest/v1/user_profiles*", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: { version: 1, profile, preferences: { selectedLocation: albany } } } });
    writes.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto("/#settings");
  await expect(page.getByRole("button", { name: /Current location/ })).toContainText("Concord, NH");
  await expectSavedCity(page, concord);
  await expect.poll(() => writes.length).toBeGreaterThan(0);
  for (const write of writes) {
    expect(write.data.profile.currentLocationData).toMatchObject(concord);
    expect(write.data.preferences.selectedLocation).toMatchObject(concord);
  }
});

for (const phase of ["auth", "profile"]) test(`a slow account ${phase} load cannot overwrite a city saved while it was loading`, async ({ page }) => {
  await setup(page);
  const user = { id: profile.id, email: profile.email, aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: { name: profile.name } };
  const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? "https://visual-smoke.supabase.test").hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(({ user, storageKey }) => localStorage.setItem(storageKey, JSON.stringify({ access_token: "location-fixture-token", refresh_token: "location-fixture-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user })), { user, storageKey });
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let profileRequested = false;
  await page.route("**/auth/v1/**", async route => {
    if (phase === "auth") { profileRequested = true; await pending; }
    return route.fulfill({ json: user });
  });
  let savedRemote = { version: 1, profile, preferences: { selectedLocation: albany } };
  await page.route("**/rest/v1/user_profiles*", async route => {
    if (route.request().method() !== "GET") {
      savedRemote = route.request().postDataJSON().data;
      return route.fulfill({ status: 201, json: {} });
    }
    if (phase === "profile") { profileRequested = true; await pending; }
    await route.fulfill({ json: { data: savedRemote } });
  });
  await page.goto("/#settings");
  await expect.poll(() => profileRequested).toBe(true);
  await page.getByRole("button", { name: /Current location/ }).click();
  await page.getByLabel("Current location", { exact: true }).fill("Austin");
  await page.getByRole("option", { name: /Austin, TX/ }).click();
  await page.getByRole("button", { name: "Save location" }).click();
  await expectSavedCity(page, austin);
  release();
  await expect.poll(() => savedRemote.profile.currentLocationData).toMatchObject(austin);
  await expect(page.getByRole("button", { name: /Current location/ })).toContainText("Austin, TX");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:userProfile")!).id)).toBe(profile.id);
  await page.goto("/?location-check=auth-finished#sky");
  await expect(page.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Austin, TX/);
  await expectSavedCity(page, austin);
});

test("a current-city change reaches another open tab without a reload", async ({ page, context }) => {
  await setup(page);
  await page.goto("/#settings");
  const skyPage = await context.newPage();
  await setup(skyPage);
  await skyPage.goto("/#sky");
  await expect(skyPage.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Concord, NH/);
  await page.getByRole("button", { name: /Current location/ }).click();
  await page.getByLabel("Current location", { exact: true }).fill("Austin");
  await page.getByRole("option", { name: /Austin, TX/ }).click();
  await page.getByRole("button", { name: "Save location" }).click();
  await expect(skyPage.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Austin, TX/);
  await expectSavedCity(skyPage, austin);
  await skyPage.close();
});

test("You transits use the selected local day when it differs from the UTC day", async ({ page }) => {
  const auckland = { label: "Auckland, New Zealand", latitude: -36.8485, longitude: 174.7633, timeZone: "Pacific/Auckland" };
  const { requests, personalLocations } = await setup(page, { current: auckland });
  await page.goto("/#you");
  await expect.poll(() => personalLocations.length).toBeGreaterThan(0);
  expect(personalLocations.at(-1)).toMatchObject(auckland);
  await expect.poll(() => requests.some(url => url.searchParams.get("lat") === String(auckland.latitude))).toBe(true);
  await expect(page.getByText(/Calculating transits for Thu, Nov 5/)).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator("#header-date-trigger")).toHaveAttribute("aria-label", /Thu, Nov 5/);
  await page.locator("#header-date-trigger").click();
  await page.getByRole("tab", { name: "Date", exact: true }).click();
  await expect(page.getByRole("gridcell", { name: "Thursday, November 5, 2026", exact: true })).toHaveClass(/today/);
  await expect(page.getByRole("gridcell", { name: "Wednesday, November 4, 2026", exact: true })).not.toHaveClass(/today/);
});
