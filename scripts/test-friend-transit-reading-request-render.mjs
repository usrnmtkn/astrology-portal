import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const panelSource = fs.readFileSync("apps/web/src/features/friends/ManualChartsPanel.tsx", "utf8");
const serviceSource = fs.readFileSync("apps/web/src/services/userGeneratedContent.ts", "utf8");
const apiSource = fs.readFileSync("api/generate-user-content.ts", "utf8");

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
assert.match(apiSource, /const locked = friendTransitReadingRequestLock\(\{/u);
assert.match(apiSource, /input\.status = "DRAFT"/u);
assert.match(apiSource, /input\.allowQualityFallback = false/u);
assert.match(apiSource, /requestSubjectType === "friend_transit_reading"[\s\S]{0,220}This paid reading is currently unavailable/u);

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
