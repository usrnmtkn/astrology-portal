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
  const { SynastryWheel } = await server.ssrLoadModule("/src/components/charts/SynastryWheel.tsx");
  const outerPositions = [{
    planet: "Sun",
    glyph: "☉",
    sign: "Aries",
    signGlyph: "♈",
    degree: 10,
    house: 1,
    motion: "direct"
  }];
  const innerPositions = [{
    planet: "Moon",
    glyph: "☽",
    sign: "Libra",
    signGlyph: "♎",
    degree: 10,
    house: 7,
    motion: "direct"
  }];
  const interAspects = [{
    id: "sun-opposition-moon",
    fromLongitude: 10,
    toLongitude: 190,
    type: "opposition",
    orb: 0,
    fromPointId: "outer:Sun",
    toPointId: "inner:Moon"
  }];
  const html = renderToStaticMarkup(React.createElement(SynastryWheel, {
    outerPositions,
    innerPositions,
    interAspects,
    ascendant: "Aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270,
    innerAscendant: "Libra",
    innerAscendantLongitude: 180,
    innerMidheavenLongitude: 90,
    aspectInspector: true,
    outerLabel: "Alex",
    innerLabel: "Jordan"
  }));

  assert.match(html, /class="sky-wheel synastry-wheel/);
  assert.match(html, /aria-label="Outer chart planets"/);
  assert.match(html, /aria-label="Inner chart planets"/);
  assert.match(html, /aria-label="Inter-chart aspects"/);
  assert.match(html, /data-from-point-id="outer:Sun"/);
  assert.match(html, /data-to-point-id="inner:Moon"/);
  assert.match(html, /aria-label="Alex Sun in Aries 10°00/);
  assert.match(html, /aria-label="Jordan Moon in Libra 10°00/);
} finally {
  await server.close();
}

console.log("Synastry wheel render tests passed.");
