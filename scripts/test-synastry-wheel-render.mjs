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
  const props = {
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
  };
  const render = (overrides = {}) => renderToStaticMarkup(React.createElement(SynastryWheel, { ...props, ...overrides }));
  const html = render();

  function houses(markup, ring) {
    const group = markup.match(new RegExp(`<g[^>]*class="[^"]*synastry-${ring}-house-labels[^\"]*"[^>]*>([\\s\\S]*?)</g>`));
    return [...(group?.[1] ?? "").matchAll(/<text[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*>(\d+)<\/text>/g)]
      .map(([, x, y, house]) => ({ x: Number(x), y: Number(y), house: Number(house) }));
  }
  const outerHouses = houses(html, "outer"), innerHouses = houses(html, "inner");
  for (const [ring, labels, radius] of [["outer", outerHouses, 110], ["inner", innerHouses, 78]]) {
    assert.deepEqual(labels.map(label => label.house), Array.from({ length: 12 }, (_, index) => index + 1), `${ring} chart has its own complete house ring`);
    for (const label of labels) assert.ok(Math.abs(Math.hypot(label.x - 300, label.y - 300) - radius) < 0.001);
  }
  // Aries and Libra rise in different signs. Their first houses belong on
  // opposite sides of the common zodiac, not at the same angle in each ring.
  assert.ok(outerHouses[0].x < 300 && outerHouses[0].y > 300);
  assert.ok(innerHouses[0].x > 300 && innerHouses[0].y < 300);
  const movedInner = houses(render({ innerAscendantLongitude: 270 }), "inner");
  assert.ok(movedInner[0].x < 300 && movedInner[0].y < 300, "Inner houses follow the calculated longitude even if a stale sign label was supplied");
  assert.deepEqual(houses(render({ innerAscendantLongitude: 270 }), "outer"), outerHouses);
  {
    const outerOnly = render({ innerAscendantLongitude: undefined, innerMidheavenLongitude: undefined });
    assert.equal(houses(outerOnly, "outer").length, 12);
    assert.equal(houses(outerOnly, "inner").length, 0, "An inner sign name alone cannot establish time-dependent houses");
    const innerOnly = render({ ascendantLongitude: undefined, midheavenLongitude: undefined });
    assert.equal(houses(innerOnly, "outer").length, 0);
    assert.equal(houses(innerOnly, "inner").length, 12);
    const untimed = render({ ascendantLongitude: undefined, innerAscendantLongitude: undefined });
    assert.equal(houses(untimed, "outer").length + houses(untimed, "inner").length, 0);
  }

  assert.match(html, /class="(?=[^"]*\bsky-wheel\b)(?=[^"]*\bsynastry-wheel\b)[^"]*"/);
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
