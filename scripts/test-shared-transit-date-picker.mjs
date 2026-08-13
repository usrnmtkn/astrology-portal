import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const friendsPanel = fs.readFileSync("apps/web/src/features/friends/ManualChartsPanel.tsx", "utf8");
const friendTransits = fs.readFileSync("apps/web/src/features/friends/FriendTransitsTab.tsx", "utf8");
const youPage = fs.readFileSync("apps/web/src/features/you/YouPage.tsx", "utf8");
const responsiveStyles = fs.readFileSync("apps/web/src/styles/responsive.css", "utf8");

assert.match(
  app,
  /const isTransitDateMode = isTodayMode \|\| mode === "profile" \|\| mode === "friends";/u,
  "The shared header date control must be available on Sky, You, and Friends."
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
  /url\.searchParams\.set\("date", value\)/u,
  "The selected transit date must be restorable from the URL."
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
  contract: "You and Friends expose date selection and render only matching-date transit facts."
}, null, 2));
