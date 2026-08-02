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
