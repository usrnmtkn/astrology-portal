#!/usr/bin/env node
import assert from "node:assert/strict";
import { skyArticleEditionFactsFromSnapshot } from "../api/_lib/sky-article-facts.ts";

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

assert.throws(
  () => skyArticleEditionFactsFromSnapshot({ ...snapshot, positions: [] }, "pluto"),
  /not present/u
);

console.log("Sky article edition facts come from the calculated sign-residency window.");
