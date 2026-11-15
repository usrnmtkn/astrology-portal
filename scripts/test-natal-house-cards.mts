import assert from "node:assert/strict";
import { emptyNatalHouseNumbers, natalHouseCardRuler } from "../apps/web/src/services/natalHouseCards.ts";
import { defaultLocation, getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";

const positions = [
  { planet: "Sun", house: 3 }, { planet: "Moon", house: 4 }, { planet: "Mercury", house: 5 },
  { planet: "Venus", house: 6 }, { planet: "Mars", house: 7 }, { planet: "Jupiter", house: 8 },
  { planet: "Saturn", house: 9 }, { planet: "Uranus", house: 10 }, { planet: "Neptune", house: 10 }, { planet: "Pluto", house: 10 },
  { planet: "Chiron", house: 12 }, { planet: "Lilith", house: 1 }, { planet: "North Node", house: 2 },
  { planet: "South Node", house: 8 }, { planet: "Ascendant", house: 1 }, { planet: "Midheaven", house: 11 }
];
assert.deepEqual(emptyNatalHouseNumbers(positions), [1, 2, 11, 12], "Points and angles do not occupy an otherwise empty house");
assert.deepEqual(emptyNatalHouseNumbers([...positions, { planet: "Sun", house: 12 }]), [1, 2, 11]);
assert.equal(natalHouseCardRuler(null, 1), null);

for (const instant of ["2026-11-04T10:00:00Z", "2026-11-04T23:00:00Z"]) {
  const sky = await getAstrodienstSky(defaultLocation, new Date(instant), { includeTransitWindows: false });
  const before = JSON.stringify(sky);
  const empty = emptyNatalHouseNumbers(sky.positions);
  assert.ok(empty.length);
  for (const house of empty) {
    const ruler = natalHouseCardRuler(sky, house)!;
    const calculated = sky.positions.find(position => position.planet === ruler.name)!;
    assert.equal(ruler.metadata, `Ruled by ${calculated.planet} in ${calculated.sign}`);
  }
  assert.deepEqual(emptyNatalHouseNumbers([...sky.positions, { planet: "Chiron", house: empty[0] }]), empty);
  assert.equal(JSON.stringify(sky), before, "Card facts never mutate the calculated chart");
}
console.log("Natal house cards: planet-only occupancy, calculated traditional ruler metadata, point-only houses and immutable Swiss snapshots passed.");
