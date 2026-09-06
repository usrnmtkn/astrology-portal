import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const panelSource = fs.readFileSync("apps/web/src/features/friends/ManualChartsPanel.tsx", "utf8");
const serviceSource = fs.readFileSync("apps/web/src/services/userGeneratedContent.ts", "utf8");
const apiSource = fs.readFileSync("api/generate-user-content.ts", "utf8");
const friendApiSource = fs.readFileSync("api/generate-friend-transit-reading.ts", "utf8");
const surfaceMigrationSource = fs.readFileSync(
  "apps/web/supabase/migrations/20260906190000_add_friends_user_generated_surface.sql",
  "utf8"
);

assert.match(panelSource, /friendTransitReadingSelectionKeyRef\.current = friendTransitReadingSelectionKey/u);
assert.equal(
  (panelSource.match(/friendTransitReadingSelectionKeyRef\.current !== requestSelectionKey/gu) ?? []).length,
  2,
  "Both success and error paths must discard stale friend/date responses."
);
assert.match(
  serviceSource,
  /request\.subjectType === "friend_transit_reading"[\s\S]{0,120}saved\.status === "DRAFT"[\s\S]{0,120}return fromRow\(saved\)/u,
  "The on-demand DRAFT must remain visible in the current session without being promoted LIVE."
);
assert.match(
  serviceSource,
  /subjectType === "friend_transit_reading"[\s\S]{0,120}query\.in\("status", \["DRAFT", "REVIEWED", "LIVE"\]\)/u,
  "A successfully generated Friends DRAFT must survive a refresh without another provider call."
);
assert.match(
  serviceSource,
  /request\.subjectType === "friend_transit_reading"[\s\S]{0,140}"\/api\/generate-friend-transit-reading"/u,
  "Friends paid readings must use the dedicated short-reading endpoint instead of the generic article generator."
);

assert.match(apiSource, /const locked = friendTransitReadingRequestLock\(\{/u);
assert.match(apiSource, /input\.status = "DRAFT"/u);
assert.match(apiSource, /input\.allowQualityFallback = false/u);
assert.match(apiSource, /requestSubjectType === "friend_transit_reading"[\s\S]{0,220}This paid reading is currently unavailable/u);

assert.match(friendApiSource, /const FRIEND_TRANSIT_READING_PROVIDER_SCHEMA|export const FRIEND_TRANSIT_READING_PROVIDER_SCHEMA/u);
assert.match(friendApiSource, /required: \["headline", "tldr", "summary", "body"\]/u);
assert.doesNotMatch(friendApiSource, /maxItems\s*:/u, "The live Friends provider schema must not use unsupported array-size constraints.");
assert.doesNotMatch(friendApiSource, /type:\s*"null"/u, "The live Friends provider schema must not require null-only article fields.");
assert.match(friendApiSource, /validateFriendTransitReadingDraft\(\{ draft, brief, expectedHeadline \}\)/u);
assert.match(friendApiSource, /validationProfile:\s*"friends-transit"[\s\S]{0,120}family:\s*"friend-transit-reading"[\s\S]{0,120}register:\s*"third_person"/u);
assert.match(friendApiSource, /\["DRAFT", "REVIEWED", "LIVE"\]\.includes\(existing\.status\)/u, "A saved paid reading must be reused instead of regenerated.");
assert.match(friendApiSource, /console\.error\("generate-friend-transit-reading failed", error\)/u);
assert.match(friendApiSource, /errorType:\s*"paid_reading_unavailable"[\s\S]{0,120}This paid reading is currently unavailable/u);
assert.doesNotMatch(friendApiSource, /error:\s*error instanceof Error \? error\.message/u, "Provider details must not be returned to the customer.");
assert.match(
  surfaceMigrationSource,
  /user_generated_interpretations_surface_check[\s\S]{0,260}'friends'/u,
  "The user-generated content surface constraint must allow Friends readings to persist."
);

const server = await createServer({
  root: "./apps/web",
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const { FriendTransitsTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendTransitsTab.tsx"
  );
  const { buildFriendTransitsBrief } = await server.ssrLoadModule(
    "/src/features/friends/friendTransitsBrief.ts"
  );

  const brief = buildFriendTransitsBrief({
    friendName: "Alex",
    dateLabel: "Today",
    personalTransitGroups: [{
      key: "short",
      label: "Short-term themes",
      transits: [{
        id: "mars-moon",
        title: "Mars trine Moon",
        durationLabel: "A few days",
        rangeLabel: "Sep 5-8",
        timingLabel: "Active now",
        summary: "Alex can act on what they feel with less friction.",
        orb: "1°",
        detailAvailable: true,
        evidence: {
          transitPlanet: "Mars",
          transitSign: "Aries",
          aspect: "trine",
          natalPoint: "Moon",
          natalSign: "Sagittarius",
          natalHouse: 7,
          direction: "applying",
          score: 80,
          significance: "major",
          timingBonuses: [],
          contentKeys: ["authored/transit-aspect/mars/moon/soft"]
        }
      }]
    }],
    bondTransits: [],
    houseTransits: [],
    dailyForecast: null,
    dailyDoItems: [],
    dailyDontItems: [],
    patternItems: []
  });

  const baseProps = {
    brief,
    readingAvailable: true,
    onGenerateReading() {},
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternTimingOverrides: {}
  };

  const idle = renderToStaticMarkup(React.createElement(FriendTransitsTab, baseProps));
  assert.match(idle, /What&#x27;s going on with Alex right now\?/u);
  assert.match(idle, /Paid reading/u);
  assert.match(idle, /Generate reading/u);
  assert.doesNotMatch(idle, /Purchase access|Unlock this reading/u);

  const loading = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    ...baseProps,
    readingStatus: "loading"
  }));
  assert.match(loading, /Preparing Alex&#x27;s reading/u);

  const ready = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    ...baseProps,
    readingStatus: "ready",
    reading: {
      headline: "What's going on with Alex right now?",
      summary: "Alex has more room to move with what they already know today.",
      body: "Alex can act on what they feel with less friction.\n\nThe transit cards below remain the source of truth."
    }
  }));
  assert.match(ready, /Alex has more room to move/u);
  assert.match(ready, /The transit cards below remain the source of truth/u);
  assert.doesNotMatch(ready, /Generate reading/u);

  const locked = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    ...baseProps,
    readingStatus: "locked"
  }));
  assert.match(locked, /This reading is unavailable right now/u);
  assert.match(locked, /Try again/u);
  assert.doesNotMatch(locked, /Anthropic|Claude|API|credit balance|Generation failed|Purchase access|Unlock this reading/iu);

  const unavailable = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    ...baseProps,
    readingAvailable: false
  }));
  assert.doesNotMatch(unavailable, /Generate reading/u);
} finally {
  await server.close();
}

console.log("Friend transit reading request/render regression passed.");
