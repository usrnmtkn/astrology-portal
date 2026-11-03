#!/usr/bin/env node
import assert from "node:assert/strict";
import { skyArticleEditionFactsFromSnapshot, skyArticlePeriod } from "../api/_lib/sky-article-facts.ts";

const snapshot = {
  generatedAt: "2026-08-21T12:00:00.000Z",
  location: { label: "New York, NY", latitude: 40.7, longitude: -74, timeZone: "America/New_York" },
  ascendant: "",
  midheaven: "",
  moonPhase: "",
  dominantElement: "Air",
  aspects: [],
  positions: [{
    planet: "Pluto",
    glyph: "",
    longitude: 301,
    speed: 0.01,
    sign: "Aquarius",
    signGlyph: "",
    degree: 1,
    house: 0,
    motion: "direct",
    theme: "depth",
    transitStart: "2024-11-19T20:29:00.000Z",
    transitEnd: "2043-03-08T00:00:00.000Z"
  }]
};
const facts = skyArticleEditionFactsFromSnapshot(snapshot, "pluto");

assert.equal(facts.planet, "pluto");
assert.equal(facts.sign, "aquarius");
assert.equal(facts.entryYear, 2024);
assert.equal(facts.validFrom, "2024-11-19");
assert.equal(facts.validTo, "2043-03-07");
assert.equal(facts.slotValues.sign, "Aquarius");
assert.match(facts.slotValues.entryDate, /November 19, 2024/u);
assert.match(facts.slotValues.stayLength, /years/u);

for (const planet of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron"]) {
  for (const motion of ["direct", "retrograde"]) {
    const calculated = skyArticleEditionFactsFromSnapshot({ ...snapshot, positions: [{
      ...snapshot.positions[0], planet, motion
    }] }, planet, "ingress-essay-v2");
    assert.equal(calculated.slotValues.articleTitle, `${planet}${motion === "retrograde" ? " Rx" : ""} in Aquarius 2024`);
  }
}
for (const planet of ["Sun", "Moon", "Lilith", "North Node", "South Node"]) {
  const calculated = skyArticleEditionFactsFromSnapshot({ ...snapshot, positions: [{
    ...snapshot.positions[0], planet, motion: planet === "Sun" || planet === "Moon" ? "direct" : "retrograde"
  }] }, planet, "ingress-essay-v2");
  assert.doesNotMatch(calculated.slotValues.articleTitle, /\bRx\b/u, "Background motion does not add an Rx title.");
  if (planet === "Sun") assert.equal(calculated.slotValues.articleTitle, "Aquarius Season 2024");
}

assert.throws(
  () => skyArticleEditionFactsFromSnapshot({ ...snapshot, positions: [] }, "pluto"),
  /not present/u
);

console.log("Sky article edition facts come from the calculated sign-residency window.");

const mercury = { planet: 'Mercury', sign: 'Scorpio', motion: 'retrograde',
  transitStart: '2026-09-30T12:00:00Z', transitEnd: '2026-12-06T12:00:00Z',
  retrogradeStart: '2026-10-24T07:12:00Z', retrogradeEnd: '2026-11-13T15:53:00Z', retrogradeWindowSource: 'station' };
for (const planet of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron']) {
  const current = skyArticleEditionFactsFromSnapshot({ ...snapshot, generatedAt: '2026-10-31T12:00:00Z', positions: [{ ...mercury, planet }] }, planet, 'ingress-essay-v3', 'current');
  assert.equal(current.transitStartInstant, '2026-10-24T07:12:00.000Z');
  assert.equal(current.transitEndInstant, '2026-11-13T15:53:00.000Z');
}
for (const generatedAt of ['2026-10-25T12:00:00Z', '2026-10-31T12:00:00Z', '2026-11-10T12:00:00Z']) {
  const current = skyArticleEditionFactsFromSnapshot({ ...snapshot, generatedAt, positions: [mercury] }, 'mercury', 'ingress-essay-v3', 'current');
  assert.equal(current.transitStartInstant, '2026-10-24T07:12:00.000Z');
  assert.equal(current.transitEndInstant, '2026-11-13T15:53:00.000Z');
  assert.equal(current.validFrom, '2026-10-24'); assert.equal(current.validTo, '2026-11-13');
  assert.equal(current.slotValues.articleTitle, 'Mercury Rx in Scorpio 2026');
  assert.match(current.slotValues.when, /October 24, 2026.*November 13, 2026/);
}
const returnVisit = skyArticleEditionFactsFromSnapshot({ ...snapshot, generatedAt: '2026-10-31T12:00:00Z', positions: [{ ...mercury,
  residencyPasses: [{ entryDate: '2026-10-28T01:00:00Z', exitDate: '2026-11-20T01:00:00Z' }] }] }, 'mercury', 'ingress-essay-v3', 'current');
assert.equal(returnVisit.transitStartInstant, '2026-10-28T01:00:00.000Z', 'Coverage cannot extend into another sign.');
assert.throws(() => skyArticleEditionFactsFromSnapshot({ ...snapshot, generatedAt: '2026-10-31T12:00:00Z', positions: [{ ...mercury, retrogradeWindowSource: null }] }, 'mercury', 'ingress-essay-v3', 'current'), /stations are unavailable/);
const direct = skyArticleEditionFactsFromSnapshot({ ...snapshot, generatedAt: '2026-11-20T12:00:00Z', positions: [{ ...mercury, motion: 'direct',
  residencyStations: [{ occursAt: '2026-10-24T07:12:00Z', direction: 'retrograde' }, { occursAt: '2026-11-13T15:53:00Z', direction: 'direct' }] }] }, 'mercury', 'ingress-essay-v3', 'current');
assert.equal(direct.transitStartInstant, mercury.transitStart);
assert.equal(direct.transitEndInstant, mercury.transitEnd);
assert.equal(skyArticlePeriod(undefined), 'visit'); assert.equal(skyArticlePeriod('current'), 'current');
assert.throws(() => skyArticlePeriod('today'), /Choose/);
console.log('Current-motion article dates cover the calculated period across reference dates, return visits and stations.');
