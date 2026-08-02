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
} finally {
  await server.close();
}

console.log("Friend placement table render tests passed.");
