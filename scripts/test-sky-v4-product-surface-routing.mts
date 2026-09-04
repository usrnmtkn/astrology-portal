import assert from "node:assert/strict";
import fs from "node:fs";
import {
  skyV4Hemisphere,
  skyV4LunationContexts,
  skyV4LunationRoute,
  skyV4NodeAxis,
  skyV4PlacementContexts,
  skyV4StationSupported
} from "../apps/web/src/features/sky/skyV4ProductSurface.ts";
import { calendarSkyV4LunationContentKey } from "../apps/web/src/features/calendar/calendarContentKeys.ts";

const positions = [
  { planet: "Venus", sign: "Aries", motion: "retrograde" },
  { planet: "Mercury", sign: "Aries", motion: "retrograde" },
  { planet: "Neptune", sign: "Pisces", motion: "direct" },
  { planet: "North Node", sign: "Aries", motion: "retrograde" },
  { planet: "South Node", sign: "Libra", motion: "retrograde" }
] as any[];

assert.equal(skyV4Hemisphere(40.7), "northern");
assert.equal(skyV4Hemisphere(-33.9), "southern");
assert.equal(skyV4Hemisphere(0), "neutral");
assert.deepEqual(skyV4NodeAxis(positions), { northSign: "Aries", southSign: "Libra" });

const placementContexts = skyV4PlacementContexts({
  position: positions[0],
  positions,
  generatedAt: "2025-03-29T12:00:00Z",
  moonEvent: {
    name: "New Moon",
    sign: "Aries",
    occursAt: "2025-03-29T10:00:00Z",
    days: 0,
    eclipseType: "solar"
  }
});
assert.ok(placementContexts.some((context) => context.contextKind === "co-present-motion" && context.contextBodyOrEvent === "Mercury"));
assert.ok(placementContexts.some((context) => context.contextKind === "eclipse" && context.contextBodyOrEvent === "Solar Eclipse"));

const stationPosition = {
  planet: "Lilith",
  sign: "Sagittarius",
  residencyStations: [{ occursAt: "2026-12-30T08:00:00Z", direction: "direct" }]
} as any;
assert.equal(skyV4StationSupported(stationPosition, "2026-12-30T18:00:00Z"), true);
assert.equal(skyV4StationSupported(stationPosition, "2026-12-29T18:00:00Z"), false);
assert.equal(skyV4StationSupported({
  ...stationPosition,
  residencyStations: [{ occursAt: "2026-12-31T01:00:00Z", direction: "direct" }]
}, "2026-12-30T18:00:00Z", "America/New_York"), true);

const newMoon = {
  id: "new-moon-pisces",
  type: "lunation",
  title: "New Moon in Pisces",
  startsAt: "2026-02-17T12:00:00Z",
  dateKey: "2026-02-17",
  glyph: "●",
  primary: true,
  sign: "Pisces"
} as const;
assert.equal(calendarSkyV4LunationContentKey(newMoon), "sky-lunation/new-moon/pisces");
assert.deepEqual(skyV4LunationRoute(newMoon, positions), { route: "new-moon", sign: "Pisces" });
assert.ok(skyV4LunationContexts(newMoon, positions).some((context) => (
  context.contextBodyOrEvent === "Neptune" && context.contextSign === "Pisces"
)));

const exactEclipse = {
  ...newMoon,
  id: "solar-eclipse-aries",
  title: "Solar Eclipse in Aries",
  sign: "Aries",
  dateKey: "2025-03-29",
  eclipseType: "solar" as const
};
assert.equal(calendarSkyV4LunationContentKey(exactEclipse), "sky-lunation/solar-eclipse/2025-03-29-aries");
assert.deepEqual(skyV4LunationRoute(exactEclipse, positions), {
  route: "eclipse",
  exactEventKey: "sky-lunation/solar-eclipse/2025-03-29-aries",
  eclipseType: "solar-eclipse",
  eclipseSign: "Aries",
  nodeRelation: "north-node"
});

const app = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
assert.match(app, /event\.type === "lunation"[\s\S]{0,120}currentSkyV4LunationDetailArticle/u);
assert.match(app, /sections:\s*displayArticleSections\.length > 0[\s\S]{0,120}\?\s*\[\.\.\.displayArticleSections,\s*\.\.\.relatedAspectSections\][\s\S]{0,80}:\s*relatedAspectSections/u);
assert.match(app, /grouping: "event"/u);
assert.match(app, /skyV4PlacementContexts/u);
assert.match(app, /skyV4StationSupported/u);
assert.match(app, /skyV4Hemisphere/u);

console.log("SKY V4 product-surface routing: PASS (placement contexts, seasonal hemisphere, exact-day Lilith station, node axis, Calendar lunation/eclipse keys, canonical detail composition, governed aspects)");