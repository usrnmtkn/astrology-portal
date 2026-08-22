import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const friendsPanel = fs.readFileSync("apps/web/src/features/friends/ManualChartsPanel.tsx", "utf8");
const friendTransits = fs.readFileSync("apps/web/src/features/friends/FriendTransitsTab.tsx", "utf8");
const youPage = fs.readFileSync("apps/web/src/features/you/YouPage.tsx", "utf8");
const responsiveStyles = fs.readFileSync("apps/web/src/styles/responsive.css", "utf8");

assert.match(
  app,
  /const isPersonalTransitDateMode = mode === "profile" \|\| mode === "friends";[\s\S]*const isTransitDateMode = isTodayMode \|\| isPersonalTransitDateMode;/u,
  "The shared header date control must be available on Sky, You, and Friends."
);
assert.match(
  app,
  /if \(isPersonalTransitDateMode\) \{[\s\S]*openMobileDatePicker\(\);[\s\S]*return;/u,
  "You and Friends must open the date picker directly from the header control."
);
assert.match(
  app,
  /isPersonalTransitDateMode && skyDate === todaySkyDate[\s\S]*\? "Today"/u,
  "You and Friends must visibly present the current date as Today."
);
assert.equal(
  (app.match(/<SkyDatePicker/gu) ?? []).length,
  1,
  "The date picker must be mounted once in the shared app shell."
);
assert.match(
  app,
  /const selectedDateSky = sky\?\.generatedAt\.slice\(0, 10\) === skyDate \? sky : null;/u,
  "Date-dependent surfaces must reject a sky snapshot from another date."
);
assert.match(
  app,
  /transitItems=\{selectedDateTransits\}[\s\S]*currentSky=\{selectedDateSky\}/u,
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
assert.match(
  app,
  /if \(value === dateInputValue\(\)\) \{[\s\S]*url\.searchParams\.delete\("date"\);[\s\S]*\} else \{[\s\S]*url\.searchParams\.set\("date", value\);/u,
  "Today must use a timeless URL while fixed transit dates remain restorable."
);
assert.match(
  app,
  /if \(followsCurrentTransitDateRef\.current\) \{[\s\S]*updateTransitDateUrl\(currentLocalDateRef\.current, "replace"\);/u,
  "A legacy current-date URL must be canonicalized into timeless Today mode."
);
assert.match(
  app,
  /const followsCurrentTransitDateRef = useRef\(skyDate === currentLocalDate\)/u,
  "The app must distinguish a live Today selection from an intentionally fixed date."
);
assert.match(
  app,
  /function syncTransitDateWithLocalDay\(\)[\s\S]*setCurrentLocalDate\(nextCurrentLocalDate\)[\s\S]*if \(followsCurrentTransitDateRef\.current\)[\s\S]*setSkyDate\(nextCurrentLocalDate\)[\s\S]*updateTransitDateUrl\(nextCurrentLocalDate, "replace"\)/u,
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
  /<FriendTransitsTab[\s\S]*dateLabel=\{transitDateLabel\}/u,
  "The Friends transit tab must receive its selected-date label."
);
assert.match(
  friendsPanel,
  /<FriendTransitsTab[\s\S]*isLoading=\{currentSkyLoading\}/u,
  "The Friends transit tab must receive its selected-date loading state."
);
assert.match(
  friendTransits,
  /Calculating transits for the selected date/u,
  "Friends must show an explicit loading state while the selected date is calculated."
);
assert.match(
  youPage,
  /Calculating transits for \{transitDateLabel\}/u,
  "You must show an explicit loading state while the selected date is calculated."
);
assert.match(
  responsiveStyles,
  /\.mode-profile :where\(\.sky-header-date-button, \.menu-toggle\),[\s\S]*\.mode-friends :where\(\.sky-header-date-button, \.menu-toggle\)/u,
  "The shared header date control must retain its mobile treatment on You and Friends."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "shared transit date picker",
  contract: "You and Friends expose date selection, follow local-day rollover in Today mode, and render only matching-date transit facts."
}, null, 2));
