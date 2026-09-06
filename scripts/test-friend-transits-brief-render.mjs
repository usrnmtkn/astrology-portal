import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

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

  const emptyBrief = buildFriendTransitsBrief({
    friendName: "Alex",
    dateLabel: "Today",
    personalTransitGroups: [],
    bondTransits: [],
    houseTransits: [],
    dailyForecast: null,
    dailyDoItems: [],
    dailyDontItems: [],
    patternItems: []
  });
  const emptyHtml = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    brief: emptyBrief,
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternTimingOverrides: {}
  }));
  assert.match(emptyHtml, /No prioritized transits are active/);

  const populatedBrief = buildFriendTransitsBrief({
    friendName: "Alex",
    dateLabel: "Today",
    personalTransitGroups: [{
      key: "short",
      label: "Short-term themes",
      transits: [{
        id: "transit-1",
        title: "Mars trine Moon",
        durationLabel: "A few days",
        rangeLabel: "Sep 5–8",
        timingLabel: "Active now",
        summary: "Emotional momentum is easier to use.",
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
          significance: "medium",
          timingBonuses: [],
          contentKeys: ["personal-transit/mars/moon/trine"]
        }
      }]
    }],
    bondTransits: [{
      id: "bond-1",
      headline: "A shared pressure point is active",
      effectBody: "The connection feels more serious today.",
      activationBody: "Patience reveals what needs attention.",
      transitPlanet: "Saturn"
    }],
    houseTransits: [{
      id: "house-1",
      contentKey: "transit/saturn/2h",
      transitPlanet: "Saturn",
      title: "Saturn through Alex's 2nd house",
      durationLabel: "Long cycle",
      timingRange: "Aug 1–Oct 20",
      rowSummary: "Resources require deliberate structure.",
      termLabel: "Long-term",
      keywords: ["Money", "Values"],
      house: 2,
      houseLabel: "2nd house",
      detailAvailable: true
    }],
    dailyForecast: {
      headline: "An opening just appeared.",
      body: "Alex gets an answer sooner than expected and can use the opening while it is here.",
      moonContext: {
        sign: "Sagittarius",
        houseLabel: "7th house",
        topic: "partnership and one-to-one relationships"
      }
    },
    dailyDoItems: ["Name the plan", "Keep it practical", "Leave room"],
    dailyDontItems: ["Force an answer", "Assume the worst", "Overpromise"],
    patternItems: []
  });
  const populatedHtml = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    brief: populatedBrief,
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternTimingOverrides: {}
  }));

  assert.match(populatedHtml, /Daily forecast for Alex/);
  assert.match(populatedHtml, /An opening just appeared/);
  assert.match(populatedHtml, /Name the plan/);
  assert.match(populatedHtml, /Force an answer/);
  assert.match(populatedHtml, /Between you two/);
  assert.match(populatedHtml, /Mars trine Moon/);
  assert.match(populatedHtml, /Where it lands/);
  assert.match(populatedHtml, /Saturn through Alex&#x27;s 2nd house/);
  assert.ok(
    populatedHtml.indexOf("An opening just appeared") < populatedHtml.indexOf("Name the plan"),
    "The daily forecast should lead its Do/Don't guidance."
  );
  assert.ok(
    populatedHtml.indexOf("Name the plan") < populatedHtml.indexOf("Between you two"),
    "The safe post-revert reader hierarchy must keep daily guidance ahead of relationship activations."
  );
  assert.ok(
    populatedHtml.indexOf("Between you two") < populatedHtml.indexOf("Mars trine Moon"),
    "The safe post-revert hierarchy must not restore PR #568's personal-transit-first reorder."
  );
  assert.ok(
    populatedHtml.indexOf("Mars trine Moon") < populatedHtml.indexOf("Where it lands"),
    "Personal transit cards should remain ahead of house context in the restored hierarchy."
  );
  assert.doesNotMatch(populatedHtml, /No prioritized transits are active/);

  const unknownBirthTimeBrief = buildFriendTransitsBrief({
    friendName: "Alex",
    dateLabel: "Today",
    personalTransitGroups: [],
    bondTransits: [],
    houseTransits: [],
    dailyForecast: {
      headline: "Keep the pace simple.",
      body: "Alex can leave one decision open until there is more information.",
      moonContext: {
        sign: "Sagittarius",
        houseLabel: null,
        topic: null
      }
    },
    dailyDoItems: [],
    dailyDontItems: [],
    patternItems: []
  });
  const unknownBirthTimeHtml = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    brief: unknownBirthTimeBrief,
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternTimingOverrides: {}
  }));
  assert.match(unknownBirthTimeHtml, /Keep the pace simple/);
  assert.doesNotMatch(unknownBirthTimeHtml, /7th house|Partnership|One-to-one relationships/);
} finally {
  await server.close();
}

console.log("Friends transits brief render regression passed.");
