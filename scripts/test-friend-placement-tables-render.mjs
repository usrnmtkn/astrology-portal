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
  const { CompatibilityTab } = await server.ssrLoadModule("/src/features/friends/CompatibilityTab.tsx");
  const { FriendProfileForecast } = await server.ssrLoadModule("/src/features/friends/FriendProfileForecast.tsx");
  const passage = "First approved sentence. The complete saved ending stays intact.";
  const forecastHtml = renderToStaticMarkup(React.createElement(FriendProfileForecast, {
    eyebrow: "Between you", body: passage, ariaLabel: "Synthetic forecast"
  }));
  assert.ok(forecastHtml.replace(/<[^>]+>/gu, "").endsWith(passage), "The overview splits the CMS passage without dropping or duplicating text.");
  const compatibilityCard = {
    id: "synthetic-sun", planet: "Sun", glyph: "☉", comparisonLabel: "You", youSign: "Aries", friendName: "Alex", friendSign: "Leo",
    goDeeper: { glyph: "☉", match: "", body: passage, function: "", yourLine: "", theirLine: "", sameSign: false, sameSignLine: "", verdict: "", relationship: "sign-pair" }
  };
  const compatibilityProps = { cards: [compatibilityCard], friendName: "Alex", dynamics: [], onOpenCard() {} };
  const headlineGap = renderToStaticMarkup(React.createElement(CompatibilityTab, compatibilityProps));
  assert.doesNotMatch(headlineGap, /<h3/);
  assert.match(headlineGap, /Sun · Fire signs/);
  assert.match(headlineGap, /Read Sun/);
  const withHeadline = renderToStaticMarkup(React.createElement(CompatibilityTab, {...compatibilityProps, cards: [{...compatibilityCard, headline: "Saved CMS headline"}]}));
  assert.match(withHeadline, /<h3>Saved CMS headline<\/h3>/);
  assert.ok(withHeadline.replace(/<[^>]+>/gu, "").includes(passage));
  const { FriendCompositeTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendCompositeTab.tsx"
  );
  const { FriendSynastryTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendSynastryTab.tsx"
  );
  const renderCompatibility = (daily) => renderToStaticMarkup(React.createElement(CompatibilityTab, {
    cards: [], dynamics: [], friendName: "Fixture Friend", daily
  }));
  const overviewHtml = renderCompatibility({
    opening: "Complete opening.", body: "Complete opening. Complete supporting passage. Final sentence.", dateLabel: "Mon, Nov 16"
  });
  assert.match(overviewHtml, /Between you · Mon, Nov 16<\/span><p[^>]*>Complete opening\.<\/p><p[^>]*> Complete supporting passage\. Final sentence\.<\/p>/);
  assert.ok(overviewHtml.indexOf("Complete opening.") < overviewHtml.indexOf("Planet by planet"));
  for (const daily of [
    { body: "Complete unsplit passage.", dateLabel: "Mon, Nov 16" },
    { opening: "Mismatched opening.", body: "Complete unsplit passage.", dateLabel: "Mon, Nov 16" },
    { opening: "Complete unsplit passage.", body: "Complete unsplit passage.", dateLabel: "Mon, Nov 16" }
  ]) {
    const html = renderCompatibility(daily);
    assert.match(html, /<p[^>]*>Complete unsplit passage\.<\/p>/);
    assert.doesNotMatch(html, /friend-profile-overview__body/);
  }
  const completeOpeningHtml = renderCompatibility({ opening: "Complete first sentence. Full opening ending.", body: "Complete first sentence. Full opening ending. Supporting passage.", dateLabel: "Mon, Nov 16" });
  assert.match(completeOpeningHtml, /friend-profile-overview__headline">Complete first sentence\. Full opening ending\.<\/p>/);
  assert.match(completeOpeningHtml, /friend-profile-overview__body"> Supporting passage\.<\/p>/);
  assert.doesNotMatch(renderCompatibility(null), /compatibility-overview|Between you/);
  const { FriendNatalTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendNatalTab.tsx"
  );
  const { FriendTransitsTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendTransitsTab.tsx"
  );
  const { buildFriendTransitsBrief } = await server.ssrLoadModule(
    "/src/features/friends/friendTransitsBrief.ts"
  );
  const FriendTransitsFixture = (props) => React.createElement(FriendTransitsTab, {
    brief: buildFriendTransitsBrief({ dailyForecast: null, dailyDoItems: [], dailyDontItems: [], ...props }),
    onOpenBondTransit: props.onOpenBondTransit,
    onOpenHouseTransit: props.onOpenHouseTransit,
    onOpenPersonalTransit: props.onOpenPersonalTransit,
    patternTimingOverrides: props.patternTimingOverrides
  });
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
  assert.match(profileChartRailHtml, /aria-label="Alex natal chart wheel"/);
  assert.match(profileChartRailHtml, /aria-label="Open full natal chart"/);
  assert.doesNotMatch(profileChartRailHtml, /natal-chart-data-table|natal-chart-view-toggle/);

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
  assert.match(populatedCompositeHtml, /Composite planets/);
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
  // Established #742 card/header contract: subtitle/pills belong in articles,
  // while the card keeps its title, complete description, action and orb.
  assert.doesNotMatch(populatedSynastryHtml, /aspect-row-subtitle|Easy recognition/);
  assert.match(populatedSynastryHtml, /<button[^>]*aria-label="Open full entry for Your Sun trine Alex&#x27;s Moon"/,
    "The synastry card retains its labeled action for opening the full entry.");
  assert.match(populatedSynastryHtml, /<span class="card-read-more card-read-more--icon [^"]*" aria-hidden="true"><svg[^>]*class="[^"]*lucide-chevron-right/,
    "The synastry card uses the shared decorative chevron cue.");
  assert.match(populatedSynastryHtml, /aria-label="1° orb"/);
  assert.doesNotMatch(populatedSynastryHtml, /Add both charts/);

  const natalTabHtml = renderToStaticMarkup(React.createElement(FriendNatalTab, {
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
    isNatalChartRepairing: false,
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
  assert.match(natalTabHtml, /<h2[^>]*>Big Three<\/h2>/);
  assert.match(natalTabHtml, /aria-label="Planets"/);
  assert.match(natalTabHtml, /Empty houses/);
  assert.match(natalTabHtml, />2nd House in Taurus<\/span>/);
  assert.doesNotMatch(natalTabHtml, /aspect-row-button|aspect-row-static/,
    "The natal placement surface must not reintroduce the removed top-level aspect list.");
  assert.match(natalTabHtml, /Alex thinks deliberately/,
    "The natal placement surface retains its placement interpretation.");

  const repairingNatalTabHtml = renderToStaticMarkup(React.createElement(FriendNatalTab, {
    bigThreeRows: [],
    birthTimeUnknown: false,
    emptyHouseRows: [],
    friendName: "Alex",
    hasNatalChart: false,
    isEventChart: false,
    isNatalChartRepairing: true,
    onOpenEmptyHouse() {},
    onOpenPattern() {},
    onOpenPlacement() {},
    patternItems: [],
    patternStatus: undefined,
    patternTitle: "Patterns in Alex's chart",
    placementRows: []
  }));
  assert.match(repairingNatalTabHtml, /aria-label="Completing Alex&#x27;s natal chart"/);
  assert.match(repairingNatalTabHtml, /aria-busy="true"/);
  assert.doesNotMatch(repairingNatalTabHtml, /Big Three|Traditional planets|Empty houses/);

  const emptyTransitsHtml = renderToStaticMarkup(React.createElement(FriendTransitsFixture, {
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

  const populatedTransitsHtml = renderToStaticMarkup(React.createElement(FriendTransitsFixture, {
    bondTransits: [{
      id: "bond-1",
      detailAvailable: true,
      headline: "A shared pressure point is active",
      effectBody: "The connection feels more serious today.",
      activationBody: "Patience reveals what needs attention."
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
      houseLabel: "2nd house",
      detailAvailable: true
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
        orb: "1°",
        detailAvailable: true,
        evidence: {
          transitPlanet: "Mars", aspect: "trine", natalPoint: "Moon",
          natalSign: "Aries", timingBonuses: [],
          contentKeys: ["transit-natal-mars-trine-moon"]
        }
      }]
    }]
  }));
  assert.match(populatedTransitsHtml, /friend-profile-copy-column"><div class="friend-profile-intro"><section class="friend-profile-overview friend-daily-forecast"/);
  assert.match(populatedTransitsHtml, /Daily forecast for Alex/);
  assert.match(populatedTransitsHtml, /An opening just appeared/);
  assert.match(populatedTransitsHtml, /Alex gets an answer sooner than expected/);
  assert.doesNotMatch(populatedTransitsHtml, /daily-horoscope-summary__moon-tags/,
    "Daily Moon context tags remain hidden under the current reader contract.");
  assert.doesNotMatch(populatedTransitsHtml, /most relevant transit|friend-transit-focus/);
  assert.doesNotMatch(populatedTransitsHtml, /current weather|Start here|near-term theme|shared theme/);
  assert.match(populatedTransitsHtml, /Between you two/);
  assert.match(populatedTransitsHtml, /Saturn through Alex&#x27;s 2nd house/);
  assert.match(populatedTransitsHtml, /Where it lands/);
  assert.match(populatedTransitsHtml, /Mars trine Moon/);
  assert.match(populatedTransitsHtml, /Emotional momentum is easier to use/);
  assert.match(populatedTransitsHtml, /Active now · 1°/, "Short-term timing and orb have a single fixed slot.");
  const durationOnlyHtml = renderToStaticMarkup(React.createElement(FriendTransitsFixture, {
    personalTransitGroups: [{ key: "long", label: "Long-term themes", transits: [{
      id: "stationary-transit", title: "Uranus trine Mars", durationLabel: "3Y3M",
      rangeLabel: "3Y3M", timingLabel: "3Y3M", summary: "Saved interpretation.",
      orb: "1°", detailAvailable: true,
      evidence: { transitPlanet: "Uranus", aspect: "trine", natalPoint: "Mars",
        natalSign: "Aries", timingBonuses: [], contentKeys: ["transit-natal-uranus-trine-mars"] }
    }] }],
    houseTransits: [], patternItems: [], bondTransits: [],
    onOpenPersonalTransit() {}
  }));
  const visibleTiming = durationOnlyHtml.match(/updates-aspect-row__meta-line[^>]*>(.*?)<\/span><p/s)?.[1];
  assert.ok(visibleTiming, "Stationary timing is rendered.");
  assert.equal((visibleTiming.match(/3Y3M/g) ?? []).length, 1,
    "The established card/header contract keeps the sole visible timing estimate.");
  assert.doesNotMatch(durationOnlyHtml, /class="[^"]*planet-placement-row__duration/,
    "Duration pills remain in article headers rather than repeating on cards.");
  assert.doesNotMatch(populatedTransitsHtml, /Read what this means/);
  assert.doesNotMatch(populatedTransitsHtml, /friend-transit-focus-card/);
  assert.match(populatedTransitsHtml, /Today for Alex · Today/);
  assert.match(populatedTransitsHtml, /Name the plan/);
  assert.match(populatedTransitsHtml, /Force an answer/);
  assert.ok(
    populatedTransitsHtml.indexOf("An opening just appeared") < populatedTransitsHtml.indexOf("Name the plan"),
    "The chart-specific daily write-up should lead the friend's daily guidance."
  );

  const unknownBirthTimeTransitsHtml = renderToStaticMarkup(React.createElement(FriendTransitsFixture, {
    bondTransits: [],
    dailyForecast: {
      headline: "Keep the pace simple.",
      body: "Alex can leave one decision open until there is more information.",
      moonContext: {
        sign: "Sagittarius",
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
  assert.doesNotMatch(unknownBirthTimeTransitsHtml, /daily-horoscope-summary__moon-tags/);
  assert.doesNotMatch(unknownBirthTimeTransitsHtml, /7th house|Partnership|One-to-one relationships/);

  assert.ok(
    populatedTransitsHtml.indexOf("Mars trine Moon") < populatedTransitsHtml.indexOf("Between you two"),
    "The approved short-term section leads the additional relationship context."
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
