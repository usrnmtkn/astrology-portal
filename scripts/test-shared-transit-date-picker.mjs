import assert from "node:assert/strict";
import fs from "node:fs";
import { runInNewContext } from "node:vm";

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const friendsPanel = fs.readFileSync("apps/web/src/features/friends/ManualChartsPanel.tsx", "utf8");
const friendTransits = fs.readFileSync("apps/web/src/features/friends/FriendTransitsTab.tsx", "utf8");
const youPage = fs.readFileSync("apps/web/src/features/you/YouPage.tsx", "utf8");
const responsiveStyles = fs.readFileSync("apps/web/src/styles/responsive.css", "utf8");
const headerControls = fs.readFileSync("apps/web/src/features/sky/HeaderSkyControls.tsx", "utf8");

assert.match(
  app,
  /const isPersonalTransitDateMode = mode === "profile" \|\| mode === "friends";[\s\S]*const isTransitDateMode = isTodayMode \|\| isPersonalTransitDateMode;/u,
  "The shared header date control must be available on Sky, You, and Friends."
);
assert.match(
  app,
  /showTransitDateControls && mobileSkyControlsOpen[\s\S]*<HeaderSkyControls/u,
  "You and Friends must open the date picker directly from the header control."
);
assert.match(
  app,
  /const transitDateButtonLabel = skyDate === todaySkyDate \? "Today"/u,
  "You and Friends must visibly present the current date as Today."
);
assert.equal(
  (headerControls.match(/<SkyDatePicker/gu) ?? []).length,
  1,
  "The date picker must be mounted once inside the shared header controls."
);
assert.match(
  app,
  /const sky = skyMatchesSelection\(loadedSky, location, skyDate\) \? loadedSky : null;[\s\S]*const selectedDateSky = sky;/u,
  "Date-dependent surfaces must reject a snapshot from another city or local date."
);
assert.match(
  app,
  /transitItems=\{youDetailsReady \? selectedDateTransits : \[\]\}[\s\S]*currentSky=\{youDetailsReady \? selectedDateSky : null\}/u,
  "You must receive only sky and transit facts for the selected date."
);
assert.match(
  app,
  /currentSky=\{selectedDateSky\}[\s\S]*profileTransits=\{selectedDateTransits\}/u,
  "Friends must receive only sky and transit facts for the selected date."
);
assert.match(
  app,
  /now: dateFromInput\(targetDate\)/u,
  "The You weekly forecast must use the week containing the selected date."
);
const updateUrlSource = app.slice(app.indexOf("function updateTransitDateUrl("), app.indexOf("function timeInZoneForInput("));
const windowFixture = { location: { href: "https://date.test/?date=2026-11-04#you" }, history: {
  state: {}, replaceState(_state, _title, href) { windowFixture.location.href = href; },
  pushState(_state, _title, href) { windowFixture.location.href = href; }
} };
const updateUrl = runInNewContext(`(${updateUrlSource.replace('(value: string, mode: "push" | "replace", today: string | null)', '(value, mode, today)')})`, { window: windowFixture, URL });
updateUrl("2026-11-05", "replace", "2026-11-05");
assert.equal(new URL(windowFixture.location.href).searchParams.has("date"), false, "Today follows the selected location's day, even when the browser is on the previous date.");
updateUrl("2026-11-04", "push", "2026-11-05");
assert.equal(new URL(windowFixture.location.href).searchParams.get("date"), "2026-11-04", "Fixed transit dates remain restorable.");
assert.match(
  app,
  /if \(mode !== "calendar" && followsCurrentTransitDateRef\.current\) \{[\s\S]*updateTransitDateUrl\(currentLocalDateRef\.current, "replace", currentLocalDateRef\.current\);/u,
  "A legacy current-date URL must be canonicalized into timeless Today mode."
);
assert.match(
  app,
  /const followsCurrentTransitDateRef = useRef\(skyDate === currentLocalDate\)/u,
  "The app must distinguish a live Today selection from an intentionally fixed date."
);
assert.match(
  app,
  /function syncTransitDateWithLocalDay\(\)[\s\S]*setCurrentLocalDate\(nextCurrentLocalDate\)[\s\S]*if \(followsCurrentTransitDateRef\.current\)[\s\S]*setSkyDate\(nextCurrentLocalDate\)[\s\S]*updateTransitDateUrl\(nextCurrentLocalDate, "replace", nextCurrentLocalDate\)/u,
  "A live Today selection must advance the state and URL when the local day changes."
);
assert.match(
  app,
  /document\.addEventListener\("visibilitychange", handleVisibilityChange\);[\s\S]*window\.addEventListener\("focus", handleWindowFocus\);/u,
  "The transit date must catch up when a sleeping or backgrounded page becomes active."
);
assert.match(
  app,
  /followsCurrentTransitDateRef\.current = nextDate === currentLocalDateRef\.current;/u,
  "Choosing a past or future date must stop automatic Today rollover."
);
assert.match(
  friendsPanel,
  /buildFriendTransitsBrief\(\{[\s\S]*dateLabel: transitDateLabel/u,
  "The Friends transit tab must receive its selected-date label."
);
assert.match(
  friendsPanel,
  /<FriendTransitsTab[\s\S]*isLoading=\{currentSkyLoading \|\| transitCopyLoading(?: \|\| [^}]*)?\}/u,
  "The Friends transit tab must wait for the selected date and the transit copy packages."
);
assert.match(
  friendTransits,
  /Calculating transits for the selected date/u,
  "Friends must show an explicit loading state while the selected date is calculated."
);
assert.match(
  app,
  /Calculating transits for \$\{formatSkyFullChartDate\(targetDate\)\}/u,
  "You must show an explicit loading state while the selected date is calculated."
);
assert.match(
  responsiveStyles,
  /:is\(\.mode-guest, \.mode-member, \.mode-profile, \.mode-friends\) :where\(\.sky-header-date-button, \.menu-toggle\)/u,
  "The shared header date control must retain its mobile treatment on You and Friends."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "shared transit date picker",
  contract: "You and Friends expose date selection, follow local-day rollover in Today mode, and render only matching-date transit facts."
}, null, 2));
