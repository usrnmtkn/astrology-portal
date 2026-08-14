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
  const { FriendPlacementTable, SynastryPlacementsComparison } = await server.ssrLoadModule(
    "/src/features/friends/FriendPlacementTables.tsx"
  );
  const { FriendNatalViewControl } = await server.ssrLoadModule(
    "/src/features/friends/FriendNatalViewControl.tsx"
  );
  const { RelationshipApiSummary } = await server.ssrLoadModule(
    "/src/features/friends/RelationshipApiSummary.tsx"
  );
  const { FriendCompositeTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendCompositeTab.tsx"
  );
  const { FriendSynastryTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendSynastryTab.tsx"
  );
  const { FriendNatalTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendNatalTab.tsx"
  );
  const { FriendTransitsTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendTransitsTab.tsx"
  );
  const { FriendProfileChartRail } = await server.ssrLoadModule(
    "/src/features/friends/FriendProfileChartRail.tsx"
  );
  const {
    completeNatalChartTableRows,
    natalChartTableRowFromSocial
  } = await server.ssrLoadModule("/src/components/charts/natalChartTableRows.ts");
  const friendHtml = renderToStaticMarkup(React.createElement(FriendPlacementTable, {
    title: "Alex's natal placements",
    rows: [{
      id: "Sun",
      glyph: "☉",
      label: "Sun",
      sign: "Aries",
      degree: 10,
      house: 1,
      retrograde: false,
      description: "Alex leads with direct, self-starting energy."
    }]
  }));

  assert.match(friendHtml, /aria-label="Alex&#x27;s natal placements placements"/);
  assert.match(friendHtml, /Sun in Aries/);
  assert.match(friendHtml, /Alex leads with direct, self-starting energy\./);

  const sky = {
    ascendant: "Aries",
    ascendantLongitude: 0,
    positions: [{
      planet: "Sun",
      glyph: "☉",
      sign: "Aries",
      signGlyph: "♈",
      degree: 10.5,
      house: 1,
      motion: "direct"
    }]
  };
  const synastryHtml = renderToStaticMarkup(React.createElement(SynastryPlacementsComparison, {
    outerName: "Alex",
    outerSky: sky,
    innerName: "Jordan",
    innerSky: sky,
    innerIsSelf: true
  }));

  assert.match(synastryHtml, /aria-label="Synastry placements comparison"/);
  assert.match(synastryHtml, /aria-label="Alex placements"/);
  assert.match(synastryHtml, /aria-label="You placements"/);
  assert.match(synastryHtml, /aria-label="Sun in Aries, 10°30&#x27;, house 1"/);

  const viewControlHtml = renderToStaticMarkup(React.createElement(FriendNatalViewControl, {
    value: "circle",
    onChange() {},
    ariaLabel: "Alex natal chart display"
  }));

  assert.match(viewControlHtml, /aria-label="Alex natal chart display"/);
  assert.match(viewControlHtml, />Circle</);
  assert.match(viewControlHtml, />Table</);
  assert.match(viewControlHtml, /aria-selected="true"/);

  const profileChartRailHtml = renderToStaticMarkup(React.createElement(FriendProfileChartRail, {
    activeTab: "natal",
    chartName: "Alex",
    chartIsEvent: false,
    comparisonIsSelf: true,
    comparisonName: "You",
    comparisonOptions: [],
    comparisonPickerOpen: false,
    comparisonSelectedId: "self",
    compositeSky: null,
    currentSkyPositions: [],
    houseSignLabelStyle: "text",
    natalSky: { ...sky, aspects: [], ascendantLongitude: 0, midheavenLongitude: 270 },
    natalTableRows: [{
      id: "Sun",
      degree: "10°30'",
      glyph: "☉",
      house: 1,
      label: "Sun",
      sign: "Aries"
    }],
    natalViewMode: "table",
    onComparisonSelect() {},
    onComparisonToggle() {},
    onNatalViewModeChange() {},
    outerInitials: "A",
    relationshipComparisonSky: null,
    synastryAspects: [],
    transitAspects: []
  }));
  assert.match(profileChartRailHtml, /aria-label="Relationship chart"/);
  assert.match(profileChartRailHtml, /aria-label="Alex natal placement table"/);
  assert.match(profileChartRailHtml, /10°30&#x27;/);

  const loadingSummaryHtml = renderToStaticMarkup(React.createElement(RelationshipApiSummary, {
    mode: "composite",
    response: null,
    status: "loading"
  }));
  assert.match(loadingSummaryHtml, /aria-label="composite relationship summary"/);
  assert.match(loadingSummaryHtml, /Calculating relationship pattern/);

  const readySummaryHtml = renderToStaticMarkup(React.createElement(RelationshipApiSummary, {
    mode: "synastry",
    response: {
      app: {
        headline: "A steady relationship pattern",
        summary: "The strongest contacts support trust and direct communication.",
        keyFactors: ["Trust", "Candor", "Patience", "Warmth", "Overflow"]
      }
    },
    status: "ready"
  }));
  assert.match(readySummaryHtml, /Relationship patterns/);
  assert.match(readySummaryHtml, /A steady relationship pattern/);
  assert.doesNotMatch(readySummaryHtml, /Overflow/);

  const unavailableCompositeHtml = renderToStaticMarkup(React.createElement(FriendCompositeTab, {
    aspectGroups: [],
    compositeAvailable: false,
    placementRows: [],
    relationshipCompare: null,
    relationshipCompareStatus: "idle"
  }));
  assert.match(unavailableCompositeHtml, /What a composite chart is/);
  assert.match(unavailableCompositeHtml, /Composite chart needs both birth charts/);

  const populatedCompositeHtml = renderToStaticMarkup(React.createElement(FriendCompositeTab, {
    aspectGroups: [{
      key: "gifts",
      label: "Gifts",
      aspects: [{
        from: "Sun",
        type: "trine",
        to: "Moon",
        orb: 1.2,
        summary: "The relationship has an easy emotional rhythm."
      }]
    }],
    compositeAvailable: true,
    placementRows: [{
      id: "Sun",
      glyph: "☉",
      label: "Sun",
      sign: "Aries",
      degree: 10,
      house: 1,
      retrograde: false,
      description: "The relationship leads directly."
    }],
    relationshipCompare: null,
    relationshipCompareStatus: "idle"
  }));
  assert.match(populatedCompositeHtml, /Composite placements/);
  assert.match(populatedCompositeHtml, /Sun trine Moon/);
  assert.match(populatedCompositeHtml, /The relationship has an easy emotional rhythm/);

  const emptySynastryHtml = renderToStaticMarkup(React.createElement(FriendSynastryTab, {
    contactGroups: [],
    explainer: "Where Alex's planets meet yours and what happens when they do.",
    friendName: "Alex",
    innerIsSelf: true,
    innerName: "You",
    innerSky: null,
    onOpenContact() {},
    outerSky: null
  }));
  assert.match(emptySynastryHtml, /What synastry shows/);
  assert.match(emptySynastryHtml, /Add both charts/);

  const populatedSynastryHtml = renderToStaticMarkup(React.createElement(FriendSynastryTab, {
    contactGroups: [{
      key: "gifts",
      label: "Gifts",
      contacts: [{
        id: "sun-trine-moon",
        aspect: "trine",
        orb: 1.2,
        title: "Your Sun trine Alex's Moon",
        subtitle: "Easy recognition",
        description: "You recognize each other's rhythm quickly.",
        yourPoint: { name: "Sun", glyph: "☉" },
        friendPoint: { name: "Moon", glyph: "☽" }
      }]
    }],
    explainer: "Where Alex's planets meet yours and what happens when they do.",
    friendName: "Alex",
    innerIsSelf: true,
    innerName: "You",
    innerSky: sky,
    onOpenContact() {},
    outerSky: sky
  }));
  assert.match(populatedSynastryHtml, /Your Sun trine Alex&#x27;s Moon/);
  assert.match(populatedSynastryHtml, /You recognize each other&#x27;s rhythm quickly/);
  assert.match(populatedSynastryHtml, /Easy recognition/);
  assert.doesNotMatch(populatedSynastryHtml, /Add both charts/);

  const natalTabHtml = renderToStaticMarkup(React.createElement(FriendNatalTab, {
    aspectGroups: [{
      key: "gifts",
      label: "Gifts",
      aspects: [{
        id: "Sun-trine-Moon",
        from: "Sun",
        type: "trine",
        to: "Moon",
        orb: 1.2,
        title: "Alex's Sun trine Moon",
        summary: "Feeling and purpose cooperate naturally."
      }]
    }],
    bigThreeRows: [{
      id: "Sun",
      glyph: "☉",
      label: "Sun",
      sign: "Aries",
      degree: 10,
      house: 1,
      retrograde: false
    }],
    birthTimeUnknown: false,
    emptyHouseRows: [{
      house: 2,
      glyph: "♉",
      title: "Empty 2nd House in Taurus",
      description: "Resources develop steadily.",
      ariaLabel: "Read more about Empty 2nd House in Taurus"
    }],
    friendName: "Alex",
    hasNatalChart: true,
    isEventChart: false,
    onOpenAspect() {},
    onOpenEmptyHouse() {},
    onOpenPattern() {},
    onOpenPlacement() {},
    patternItems: [],
    patternStatus: undefined,
    patternTitle: "Patterns in Alex's chart",
    placementRows: [{
      id: "Mercury",
      glyph: "☿",
      label: "Mercury",
      sign: "Taurus",
      degree: 4,
      house: 2,
      retrograde: false,
      description: "Alex thinks deliberately."
    }]
  }));
  assert.match(natalTabHtml, /Big three/);
  assert.match(natalTabHtml, /Alex&#x27;s natal placements/);
  assert.match(natalTabHtml, /Empty houses/);
  assert.match(natalTabHtml, /Empty 2nd House in Taurus/);
  assert.match(natalTabHtml, /Alex&#x27;s Sun trine Moon/);
  assert.match(natalTabHtml, /Feeling and purpose cooperate naturally/);

  const emptyTransitsHtml = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    bondTransits: [],
    dateLabel: "Today",
    friendName: "Alex",
    houseTransits: [],
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternItems: [],
    patternTimingOverrides: {},
    personalTransitGroups: []
  }));
  assert.match(emptyTransitsHtml, /No prioritized transits are active/);

  const populatedTransitsHtml = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    bondTransits: [{
      id: "bond-1",
      headline: "A shared pressure point is active",
      effectBody: "The connection feels more serious today.",
      activationBody: "Patience reveals what needs attention."
    }],
    dailyForecast: {
      headline: "An opening just appeared.",
      body: "Alex gets an answer sooner than expected and can use the opening while it is here.",
      moonContext: {
        sign: "Gemini",
        houseLabel: "Alex's 11th house",
        topic: "friends, community, and long-term hopes"
      }
    },
    dailyDoItems: ["Name the plan", "Keep it practical", "Leave room"],
    dailyDontItems: ["Force an answer", "Assume the worst", "Overpromise"],
    dateLabel: "Today",
    friendName: "Alex",
    houseTransits: [{
      id: "house-1",
      transitPlanet: "Saturn",
      title: "Saturn through Alex's 2nd house",
      durationLabel: "Long cycle",
      timingRange: "Aug 1–Oct 20",
      rowSummary: "Resources require deliberate structure.",
      termLabel: "Long-term",
      keywords: ["Money", "Values"],
      house: 2,
      houseLabel: "2nd house"
    }],
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternItems: [],
    patternTimingOverrides: {},
    personalTransitGroups: [{
      key: "short",
      label: "Short-term themes",
      transits: [{
        id: "transit-1",
        title: "Mars trine Moon",
        durationLabel: "A few days",
        rangeLabel: "Aug 1–3",
        timingLabel: "Active now",
        summary: "Emotional momentum is easier to use.",
        orb: "1°"
      }]
    }]
  }));
  assert.match(populatedTransitsHtml, /friend-profile-copy-column"><section class="daily-horoscope-summary friend-daily-forecast"/);
  assert.match(populatedTransitsHtml, /Daily forecast for Alex/);
  assert.match(populatedTransitsHtml, /Moon in Gemini/);
  assert.match(populatedTransitsHtml, /Alex&#x27;s 11th house/);
  assert.match(populatedTransitsHtml, /friends, community, and long-term hopes/);
  assert.match(populatedTransitsHtml, /An opening just appeared/);
  assert.match(populatedTransitsHtml, /Alex gets an answer sooner than expected/);
  assert.doesNotMatch(populatedTransitsHtml, /most relevant transit|friend-transit-focus/);
  assert.doesNotMatch(populatedTransitsHtml, /current weather|Start here|near-term theme|shared theme/);
  assert.match(populatedTransitsHtml, /Between you two/);
  assert.match(populatedTransitsHtml, /Saturn through Alex&#x27;s 2nd house/);
  assert.match(populatedTransitsHtml, /Where it lands/);
  assert.match(populatedTransitsHtml, /Mars trine Moon/);
  assert.match(populatedTransitsHtml, /Emotional momentum is easier to use/);
  assert.doesNotMatch(populatedTransitsHtml, /Read what this means/);
  assert.doesNotMatch(populatedTransitsHtml, /friend-transit-focus-card/);
  assert.match(populatedTransitsHtml, /Today for Alex/);
  assert.match(populatedTransitsHtml, /Name the plan/);
  assert.match(populatedTransitsHtml, /Force an answer/);
  assert.ok(
    populatedTransitsHtml.indexOf("An opening just appeared") < populatedTransitsHtml.indexOf("Name the plan"),
    "The chart-specific daily write-up should lead the friend's daily guidance."
  );

  const unknownBirthTimeTransitsHtml = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    bondTransits: [],
    dailyForecast: {
      headline: "Keep the pace simple.",
      body: "Alex can leave one decision open until there is more information.",
      moonContext: {
        sign: "Gemini",
        houseLabel: null,
        topic: null
      }
    },
    dateLabel: "Today",
    friendName: "Alex",
    houseTransits: [],
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternItems: [],
    patternTimingOverrides: {},
    personalTransitGroups: []
  }));
  assert.match(unknownBirthTimeTransitsHtml, /Moon in Gemini/);
  assert.doesNotMatch(unknownBirthTimeTransitsHtml, /house/);
  assert.ok(
    populatedTransitsHtml.indexOf("Between you two") < populatedTransitsHtml.indexOf("Mars trine Moon"),
    "Relationship context should lead the ranked short-term transit list."
  );
  assert.ok(
    populatedTransitsHtml.indexOf("Between you two") < populatedTransitsHtml.indexOf("Where it lands"),
    "Relationship context should remain distinct from the friend's life-area transits."
  );
  assert.doesNotMatch(populatedTransitsHtml, /No prioritized transits are active/);

  const socialTableRow = natalChartTableRowFromSocial({
    id: "Sun",
    glyph: "☉",
    label: "Sun",
    sign: "Aries",
    degree: 10.5,
    house: 1,
    retrograde: false
  });
  assert.equal(socialTableRow.degree, "10°30'");

  const completeRows = completeNatalChartTableRows({ ascendant: "Aries" }, [socialTableRow]);
  assert.equal(completeRows.length, 12);
  assert.equal(completeRows[0].label, "Sun");
  assert.deepEqual(
    completeRows.slice(1, 3).map((row) => ({ house: row.house, label: row.label, sign: row.sign })),
    [
      { house: 2, label: "Empty house", sign: "Taurus" },
      { house: 3, label: "Empty house", sign: "Gemini" }
    ]
  );
} finally {
  await server.close();
}

console.log("Friend placement table render tests passed.");
