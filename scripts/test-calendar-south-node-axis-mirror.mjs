#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateSkyAspects,
  canonicalizeNodeAxisAspects,
} from "../packages/astro-knowledge/engine/sky-aspects/browser.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transitDirectory = path.join(repoRoot, "packages/astro-knowledge/data/transits");

const counterpartBodies = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
];

const mirrorCases = [
  { southAspect: "conjunction", northAspect: "opposition", bodyLongitude: 0 },
  { southAspect: "sextile", northAspect: "trine", bodyLongitude: 60 },
  { southAspect: "square", northAspect: "square", bodyLongitude: 90 },
  { southAspect: "trine", northAspect: "sextile", bodyLongitude: 120 },
  { southAspect: "opposition", northAspect: "conjunction", bodyLongitude: 180 },
];

function slug(value) {
  return value.toLowerCase().replaceAll(" ", "-");
}

const expectedNorthNodeFiles = new Set();
const expectedSouthNodeFiles = new Set();
let verifiedSouthNodeGeometries = 0;

for (const body of counterpartBodies) {
  for (const { southAspect, northAspect, bodyLongitude } of mirrorCases) {
    const raw = calculateSkyAspects([
      { planet: body, longitude: bodyLongitude, speed: 0 },
      { planet: "North Node", longitude: 180, speed: 0 },
      { planet: "South Node", longitude: 0, speed: 0 },
    ]);

    const rawNodeContacts = raw.filter(({ from, to }) => (
      [from, to].includes(body)
      && ([from, to].includes("North Node") || [from, to].includes("South Node"))
    ));

    assert.equal(
      rawNodeContacts.length,
      2,
      `${body} ${southAspect} South Node must have both geometric node-axis contacts before canonicalization.`,
    );
    assert.ok(
      rawNodeContacts.some(({ from, to, type }) => (
        [from, to].includes("South Node") && type === southAspect
      )),
      `${body} ${southAspect} South Node geometry was not calculated.`,
    );
    assert.ok(
      rawNodeContacts.some(({ from, to, type }) => (
        [from, to].includes("North Node") && type === northAspect
      )),
      `${body} ${southAspect} South Node did not produce the expected North Node ${northAspect} mirror.`,
    );

    const canonical = canonicalizeNodeAxisAspects(raw);
    const canonicalNodeContacts = canonical.filter(({ from, to }) => (
      [from, to].includes(body)
      && ([from, to].includes("North Node") || [from, to].includes("South Node"))
    ));

    assert.equal(
      canonicalNodeContacts.length,
      1,
      `${body} ${southAspect} South Node must collapse to one canonical node-axis astronomical event.`,
    );

    const [kept] = canonicalNodeContacts;
    assert.ok(
      [kept.from, kept.to].includes("North Node"),
      `${body} ${southAspect} South Node must canonicalize to the North Node-keyed event.`,
    );
    assert.ok(
      ![kept.from, kept.to].includes("South Node"),
      `${body} ${southAspect} South Node leaked through node-axis event deduplication.`,
    );
    assert.equal(
      kept.type,
      northAspect,
      `${body} ${southAspect} South Node must canonicalize to ${body} ${northAspect} North Node.`,
    );

    const northRuntimeFile = `${slug(body)}-${northAspect}-north-node.json`;
    const northRuntimePath = path.join(transitDirectory, northRuntimeFile);
    assert.ok(
      fs.existsSync(northRuntimePath),
      `${body} ${southAspect} South Node is missing canonical North Node runtime coverage at ${northRuntimeFile}.`,
    );
    const northRecord = JSON.parse(fs.readFileSync(northRuntimePath, "utf8"));
    assert.equal(northRecord.other, "north-node");
    assert.equal(northRecord.aspect, northAspect);
    assert.equal(northRecord.status, "LIVE");
    assert.ok(typeof northRecord.readerCopy?.body === "string" && northRecord.readerCopy.body.trim());

    const southRuntimeFile = `${slug(body)}-${southAspect}-south-node.json`;
    const southRuntimePath = path.join(transitDirectory, southRuntimeFile);
    assert.ok(
      fs.existsSync(southRuntimePath),
      `${body} ${southAspect} South Node is missing its pole-specific editorial source at ${southRuntimeFile}.`,
    );
    const southRecord = JSON.parse(fs.readFileSync(southRuntimePath, "utf8"));
    assert.equal(southRecord.id, southRuntimeFile.replace(/\.json$/u, ""));
    assert.equal(southRecord.transiting, slug(body));
    assert.equal(southRecord.aspect, southAspect);
    assert.equal(southRecord.other, "south-node");
    assert.equal(southRecord.status, "LIVE");
    assert.ok(typeof southRecord.readerCopy?.body === "string" && southRecord.readerCopy.body.trim());
    assert.match(southRecord.readerCopy.body, /\bSouth Node\b/u);
    assert.doesNotMatch(southRecord.readerCopy.body, /\bNorth Node\b/u);
    assert.notEqual(
      southRecord.readerCopy.body,
      northRecord.readerCopy.body,
      `${body} ${southAspect}: South Node copy must remain pole-specific rather than reuse North Node prose.`,
    );

    expectedNorthNodeFiles.add(northRuntimeFile);
    expectedSouthNodeFiles.add(southRuntimeFile);
    verifiedSouthNodeGeometries += 1;
  }
}

const actualSouthNodeFiles = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith("-south-node.json"))
  .sort();

assert.equal(verifiedSouthNodeGeometries, 60, "Expected exactly 60 major South Node geometries.");
assert.equal(expectedNorthNodeFiles.size, 60, "Expected 60 unique canonical North Node runtime records.");
assert.equal(expectedSouthNodeFiles.size, 60, "Expected 60 unique pole-specific South Node runtime content records.");
assert.deepEqual(
  actualSouthNodeFiles,
  [...expectedSouthNodeFiles].sort(),
  "South Node runtime content must contain exactly the 60 owner-approved pole-specific major-aspect records.",
);

console.log("South Node Calendar axis contract passed", {
  southNodeGeometries: verifiedSouthNodeGeometries,
  canonicalAstronomicalEventsPerGeometry: 1,
  canonicalNorthNodeRecords: expectedNorthNodeFiles.size,
  poleSpecificSouthNodeContentRecords: expectedSouthNodeFiles.size,
});
