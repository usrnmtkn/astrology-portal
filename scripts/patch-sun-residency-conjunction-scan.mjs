#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filePath = path.join(repoRoot, "apps/web/src/services/ephemeris.ts");
let source = fs.readFileSync(filePath, "utf8");

const helperMarker = "function findSkyPlacementResidencyAspects(";
if (!source.includes(helperMarker)) {
  const insertionPoint = source.indexOf("function rankPlacementEvents(events: LunarCalendarEvent[], planet: string) {");
  if (insertionPoint < 0) throw new Error("rankPlacementEvents insertion anchor not found");

  const helper = `function findSkyPlacementResidencyAspects(\n  swe: SwissEphInstance,\n  start: Date,\n  end: Date,\n  timeZone: string,\n  planet: string\n): LunarCalendarEvent[] {\n  const planetId = skyPointPlanetId(swe, planet);\n  if (planetId === null || planet === "South Node") return [];\n\n  const otherPlanets = [\n    "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",\n    "Uranus", "Neptune", "Pluto", "Lilith"\n  ].filter((candidate) => candidate !== planet);\n  const glyphByPlanet = new Map(planets.map(([name, glyph]) => [name, glyph]));\n  const events: LunarCalendarEvent[] = [];\n\n  for (const otherPlanet of otherPlanets) {\n    const otherPlanetId = skyPointPlanetId(swe, otherPlanet);\n    if (otherPlanetId === null) continue;\n\n    for (const [aspect, degrees] of calendarAspectDefinitions) {\n      const passes = scanExactAspectPasses(\n        swe,\n        planetId,\n        otherPlanetId,\n        degrees,\n        start,\n        end,\n        0.25\n      );\n\n      for (const occursAt of passes) {\n        if (occursAt < start || occursAt > end) continue;\n        const id = \`aspect-\${planet}-\${aspect}-\${otherPlanet}-\${occursAt.toISOString()}\`\n          .toLowerCase()\n          .replace(/\\s+/g, "-");\n        if (events.some((event) => event.id === id)) continue;\n\n        events.push({\n          id,\n          type: "aspect",\n          title: \`\${planet} \${aspect} \${otherPlanet}\`,\n          startsAt: occursAt.toISOString(),\n          dateKey: localDateKey(occursAt, timeZone),\n          glyph: \`\${glyphByPlanet.get(planet) ?? ""}\${glyphByPlanet.get(otherPlanet) ?? ""}\`,\n          primary: true,\n          planets: [planet, otherPlanet],\n          aspect,\n          fromSign: exactPlanetSign(swe, planetId, occursAt),\n          toSign: exactPlanetSign(swe, otherPlanetId, occursAt)\n        });\n      }\n    }\n  }\n\n  return events.sort((first, second) => first.startsAt.localeCompare(second.startsAt));\n}\n\n`;
  source = `${source.slice(0, insertionPoint)}${helper}${source.slice(insertionPoint)}`;
}

const oldCallPattern = /eventPasses\.flatMap\(\(pass\) => findSkyAspects\(\s*swe,\s*new Date\(pass\.entryDate\),\s*new Date\(pass\.exitDate\),\s*timeZone\s*\)\)/u;
const newCall = `eventPasses.flatMap((pass) => (planet === "Sun"\n        ? findSkyPlacementResidencyAspects(\n            swe,\n            new Date(pass.entryDate),\n            new Date(pass.exitDate),\n            timeZone,\n            planet\n          )\n        : findSkyAspects(\n            swe,\n            new Date(pass.entryDate),\n            new Date(pass.exitDate),\n            timeZone\n          )))`;

if (!source.includes('planet === "Sun"\n        ? findSkyPlacementResidencyAspects(')) {
  if (!oldCallPattern.test(source)) throw new Error("getSkyPlacementTransitFacts event scan anchor not found");
  source = source.replace(oldCallPattern, newCall);
}

fs.writeFileSync(filePath, source, "utf8");
console.log("Sun residency exact-aspect scan now uses directed residual passes; Calendar findSkyAspects remains unchanged.");
