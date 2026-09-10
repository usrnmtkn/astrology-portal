import assert from 'node:assert/strict';
import { getSkyPlacementSnapshot, getAstrodienstSky } from '../apps/web/src/services/ephemeris';
import { skyPlacementVariableFacts } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
const location = { label: 'Test', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
const degrees: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
for (const [planet, sign, date] of [['Mercury', 'Cancer', '2026-07-10'], ['Venus', 'Libra', '2026-10-30']]) {
 const sky = await getSkyPlacementSnapshot(location, planet, sign, new Date(`${date}T12:00:00Z`), true);
 const facts = sky.placementAspectFacts!;
 assert.equal(facts.planet, planet); assert.equal(facts.sign, sign);
 const position = sky.positions.find(p => p.planet === planet)!;
 assert.equal(position.motion, 'retrograde');
 assert(facts.inSign.length); assert(facts.retrograde?.length);
 const passes = position.residencyPasses ?? [{ entryDate: position.transitStart!, exitDate: position.transitEnd! }];
 for (const pass of passes) {
  const crossing = await getAstrodienstSky(location, new Date(pass.entryDate), { includeTransitWindows: false });
  const before = await getAstrodienstSky(location, new Date(Date.parse(pass.entryDate) - 300_000), { includeTransitWindows: false });
  assert.equal(pass.entryMotion, crossing.positions.find(p => p.planet === planet)!.motion, `${date}: ingress crossing motion`);
  assert.equal(pass.previousSign, before.positions.find(p => p.planet === planet)!.sign, `${date}: previous ingress sign`);
 }
 assert(facts.inSign.every(event => passes.some(pass => event.occursAt >= pass.entryDate && event.occursAt < pass.exitDate)), 'exclude gaps between sign passes');
 assert(facts.retrograde!.every(event => event.occursAt >= facts.retrogradeStart! && event.occursAt < facts.retrogradeEnd!));
 for (const [events, scope] of [[facts.inSign, 'sign'], [facts.retrograde!, 'retrograde']] as const) {
  for (const event of [events[0], events.at(-1)!]) {
   const direct = await getAstrodienstSky(location, new Date(event.occursAt));
   const first = direct.positions.find(p => p.planet === planet)!;
   const second = direct.positions.find(p => p.planet === event.otherPlanet)!;
   const separation = Math.abs(((first.longitude! - second.longitude! + 540) % 360) - 180);
   assert(Math.abs(separation - degrees[event.aspect]) < 0.001, `${date}: direct ephemeris ${event.id}`);
   if (scope === 'sign') assert.equal(first.sign, sign); else assert.equal(first.motion, 'retrograde');
  }
 }
 const filled = skyPlacementVariableFacts({ planet, sign, isRetrograde: true, aspectFacts: facts });
 assert.equal(Number(filled.aspectsInSignCount), new Set(facts.inSign.map(e => e.id)).size);
 assert(filled.retrogradeStartDate && filled.retrogradeEndDate && filled.aspectsWhileRetrograde);
 console.log(`PASS: ${planet} ${date}, ${facts.inSign.length} sign aspects, ${facts.retrograde!.length} cycle aspects, direct ephemeris verification.`);
}
