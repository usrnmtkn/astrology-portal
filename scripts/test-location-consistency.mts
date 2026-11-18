import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultLocation, getInitialLocation, getInitialTransitDate, isLocationInput, profileCurrentLocation, skyMatchesSelection } from "../apps/web/src/services/skySelection";

const concord = { label: "Concord, NH", latitude: 43.2081, longitude: -71.5376, timeZone: "America/New_York" };
const albany = { label: "Albany, NY", latitude: 42.6526, longitude: -73.7562, timeZone: "America/New_York" };
function storage(values: Record<string, unknown>) {
  const entries = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]));
  Object.assign(globalThis, { window: { location: { href: "https://location.test/#sky" }, localStorage: { getItem: (key: string) => entries[key] ?? null } } });
  return entries;
}

test("startup gives the profile city priority over an older Sky preference", () => {
  storage({ "tldrastro:selectedLocation": albany, "tldrastro:userProfile": { currentLocation: concord.label, currentLocationData: concord } });
  assert.deepEqual(getInitialLocation(), { location: concord, hasSavedLocation: true });
});

test("guests retain their selected city and damaged profiles do not hide it", () => {
  const entries = storage({ "tldrastro:selectedLocation": albany });
  assert.deepEqual(getInitialLocation().location, albany);
  entries["tldrastro:userProfile"] = "broken JSON";
  assert.deepEqual(getInitialLocation().location, albany);
});

test("unselected text, invalid coordinates and the retired label hash are not location facts", () => {
  assert.equal(profileCurrentLocation({ currentLocation: concord.label }), null);
  assert.equal(profileCurrentLocation({ currentLocation: concord.label, currentLocationData: albany }), null);
  for (const latitude of [NaN, Infinity, 91]) assert.equal(isLocationInput({ ...concord, latitude }), false);
  for (const longitude of [NaN, Infinity, -181]) assert.equal(isLocationInput({ ...concord, longitude }), false);
  const hash = [...concord.label].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const oldValue = { ...concord, latitude: ((hash % 1400) / 10) - 70, longitude: ((hash % 3000) / 10) - 150 };
  assert.equal(isLocationInput(oldValue), false);
  storage({ "tldrastro:selectedLocation": oldValue });
  assert.deepEqual(getInitialLocation(), { location: defaultLocation, hasSavedLocation: false });
});

test("the initial civil day follows the profile location time zone", () => {
  const location = { label: "Auckland, New Zealand", latitude: -36.8485, longitude: 174.7633, timeZone: "Pacific/Auckland" };
  storage({ "tldrastro:selectedLocation": albany, "tldrastro:userProfile": { currentLocation: location.label, currentLocationData: location } });
  const expected = new Intl.DateTimeFormat("en-CA", { timeZone: location.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  assert.equal(getInitialTransitDate(), expected);
});

test("snapshots match the exact city and local day across UTC midnight", () => {
  const auckland = { label: "Auckland, New Zealand", latitude: -36.8485, longitude: 174.7633, timeZone: "Pacific/Auckland" };
  const snapshot = { location: auckland, generatedAt: "2026-11-04T17:00:00.000Z" };
  assert.equal(skyMatchesSelection(snapshot, auckland, "2026-11-05"), true);
  assert.equal(skyMatchesSelection(snapshot, auckland, "2026-11-04"), false);
  assert.equal(skyMatchesSelection({ location: albany, generatedAt: snapshot.generatedAt }, concord, "2026-11-04"), false);
  assert.equal(skyMatchesSelection(null, auckland, "2026-11-05"), false);
});
