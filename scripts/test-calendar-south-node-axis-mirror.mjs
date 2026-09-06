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

const southNodeRuntimeFiles = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json") && name.includes("south-node"));
assert.deepEqual(
  southNodeRuntimeFiles,
  [],
  "South Node must not have duplicate exact Calendar runtime records while the node axis is canonicalized to North Node.",
);

const expectedNorthNodeFiles = new Set();
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
      `${body} ${southAspect} South Node must collapse to one canonical node-axis editorial event.`,
    );

    const [kept] = canonicalNodeContacts;
    assert.ok(
      [kept.from, kept.to].includes("North Node"),
      `${body} ${southAspect} South Node must canonicalize to the North Node-keyed event.`,
    );
    assert.ok(
      ![kept.from, kept.to].includes("South Node"),
      `${body} ${southAspect} South Node leaked through node-axis deduplication.`,
    );
    assert.equal(
      kept.type,
      northAspect,
      `${body} ${southAspect} South Node must canonicalize to ${body} ${northAspect} North Node.`,
    );

    const runtimeFile = `${slug(body)}-${northAspect}-north-node.json`;
    const runtimePath = path.join(transitDirectory, runtimeFile);
    assert.ok(
      fs.existsSync(runtimePath),
      `${body} ${southAspect} South Node is missing canonical runtime coverage at ${runtimeFile}.`,
    );

    const record = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
    assert.equal(record.id, runtimeFile.replace(/\.json$/u, ""));
    assert.equal(record.transiting, slug(body));
    assert.equal(record.aspect, northAspect);
    assert.equal(record.other, "north-node");
    assert.ok(
      ["APPROVED", "LIVE"].includes(record.status),
      `${runtimeFile} is not reader-eligible.`,
    );
    assert.ok(
      typeof record.readerCopy?.body === "string" && record.readerCopy.body.trim(),
      `${runtimeFile} has no exact reader body.`,
    );

    expectedNorthNodeFiles.add(runtimeFile);
    verifiedSouthNodeGeometries += 1;
  }
}

assert.equal(verifiedSouthNodeGeometries, 60, "Expected exactly 60 major South Node geometries.");
assert.equal(expectedNorthNodeFiles.size, 60, "Expected 60 unique canonical North Node runtime records.");

console.log("South Node Calendar axis mirror contract passed", {
  southNodeGeometries: verifiedSouthNodeGeometries,
  canonicalNorthNodeRecords: expectedNorthNodeFiles.size,
  duplicateSouthNodeRuntimeRecords: southNodeRuntimeFiles.length,
});
