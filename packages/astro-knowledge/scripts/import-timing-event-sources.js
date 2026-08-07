#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "review", "timing-event-sources-v7.md");
const outputPath = path.join(root, "review", "timing-event-sources-v8-approved-snapshot.json");
const checkOnly = process.argv.includes("--check");

const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];

const fastPlanets = ["mercury", "venus", "mars"];
const slowBodies = ["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"];
const ingressBodies = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function normalized(value) {
  return value.replace(/\s+/g, " ").trim();
}

function field(section, label, nextLabels) {
  const start = new RegExp(`(?:^|\\n)${label}:\\s*`).exec(section);
  if (!start) return "";

  const valueStart = start.index + start[0].length;
  const remainder = section.slice(valueStart);
  const nextIndexes = nextLabels
    .map((nextLabel) => new RegExp(`\\n${nextLabel}:\\s*`).exec(remainder)?.index)
    .filter((index) => Number.isInteger(index));
  const valueEnd = nextIndexes.length > 0 ? Math.min(...nextIndexes) : remainder.length;
  return normalized(remainder.slice(0, valueEnd));
}

function sourceSections(markdown) {
  const matches = [...markdown.matchAll(/^### (src\.timing\.[^\s]+)\s*$/gm)];
  return new Map(matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    return [match[1], markdown.slice(start, end).trim()];
  }));
}

function sourceRecord(sections, id) {
  const section = sections.get(id);
  if (!section) throw new Error(`Missing source record ${id}`);

  return {
    id,
    statusLine: field(section, "Status", ["Fact", "Scenes", "Meaning note(?: \\(pass-neutral\\))?", "Sources"])
      .replace("engine_event yes for Jupiter-Pluto; Chiron scheduled next engine pass", "engine_event yes for Jupiter-Pluto and Chiron")
      .replace("engine_event yes (daily passage) for Jupiter-Pluto; Chiron scheduled next engine pass", "engine_event yes (daily passage) for Jupiter-Pluto and Chiron"),
    fact: field(section, "Fact", ["Scenes", "Meaning note(?: \\(pass-neutral\\))?", "Sources"]),
    scenes: field(section, "Scenes", ["Meaning note(?: \\(pass-neutral\\))?", "Sources"]),
    meaningNote: field(section, "Meaning note(?: \\(pass-neutral\\))?", ["Sources"]),
    provenance: field(section, "Sources", ["###", "##"]),
    voiceNeutral: true,
    status: "REVIEWED",
    serving: false
  };
}

function compositionSources(sourceId, planet, sign, eventFamily) {
  const sources = [
    `review/timing-event-sources-v7.md#${sourceId}`,
    `data/primitives/signs.json#${sign}`,
    "engine/ephemeris#event-facts",
    "voice/owner-approved-model"
  ];

  if (planet === "chiron") {
    sources.splice(1, 0, "data/modifiers/chiron-life-cycle.json", "data/modifiers/point-metadata.json#chiron");
  } else if (["uranus", "neptune", "pluto"].includes(planet)) {
    sources.splice(1, 0, `data/planetary/${planet}.json`);
  } else {
    sources.splice(1, 0, `data/primitives/planets.json#${planet}`);
  }

  if (eventFamily !== "ingress") {
    sources.splice(-2, 0, `data/modifiers/retrograde-planet-meanings.json#${planet}-retrograde`);
  }

  return sources;
}

function mapping({ readerKey, sourceId, eventFamily, planet, sign, phase = null, motion = null }) {
  return {
    readerKey,
    sourceId,
    eventFamily,
    planet,
    sign,
    phase,
    motion,
    passType: null,
    compositionSourceIds: compositionSources(sourceId, planet, sign, eventFamily),
    readerStatus: "needs_review",
    serving: false
  };
}

function compile(markdown) {
  const sections = sourceSections(markdown);
  const selectedSourceIds = new Set();
  const concreteMappings = [];

  for (const planet of fastPlanets) {
    for (const phase of ["station-retrograde", "retrograde-passage", "station-direct"]) {
      const sourceId = `src.timing.${planet}.${phase}`;
      selectedSourceIds.add(sourceId);
      for (const sign of signs) {
        if (phase === "retrograde-passage") {
          concreteMappings.push(mapping({
            readerKey: `sky.retrograde.${planet}.${sign}.retrograde_passage`,
            sourceId,
            eventFamily: "retrograde",
            planet,
            sign,
            phase: "retrograde-passage",
            motion: "retrograde"
          }));
        } else {
          const motion = phase === "station-retrograde" ? "retrograde" : "direct";
          concreteMappings.push(mapping({
            readerKey: `sky.station.${planet}.${sign}.${motion}`,
            sourceId,
            eventFamily: "station",
            planet,
            sign,
            phase,
            motion
          }));
        }
      }
    }
  }

  for (const phase of ["station-retrograde", "retrograde-passage", "station-direct"]) {
    const sourceId = `src.timing.outer.${phase}`;
    selectedSourceIds.add(sourceId);
    for (const planet of slowBodies) {
      for (const sign of signs) {
        if (phase === "retrograde-passage") {
          concreteMappings.push(mapping({
            readerKey: `sky.retrograde.${planet}.${sign}.retrograde_passage`,
            sourceId,
            eventFamily: "retrograde",
            planet,
            sign,
            phase: "retrograde-passage",
            motion: "retrograde"
          }));
        } else {
          const motion = phase === "station-retrograde" ? "retrograde" : "direct";
          concreteMappings.push(mapping({
            readerKey: `sky.station.${planet}.${sign}.${motion}`,
            sourceId,
            eventFamily: "station",
            planet,
            sign,
            phase,
            motion
          }));
        }
      }
    }
  }

  for (const planet of ingressBodies) {
    const sourceId = `src.timing.${planet}.ingress`;
    selectedSourceIds.add(sourceId);
    for (const sign of signs) {
      concreteMappings.push(mapping({
        readerKey: `sky.ingress.${planet}.${sign}`,
        sourceId,
        eventFamily: "ingress",
        planet,
        sign
      }));
    }
  }

  const sourceRecords = [...selectedSourceIds].sort().map((id) => sourceRecord(sections, id));

  return {
    id: "timing-event-sources-v8-candidate",
    kind: "timing-event-source-collection",
    sourceDocument: "review/timing-event-sources-v7.md",
    sourceDocumentSha256: crypto.createHash("sha256").update(markdown).digest("hex"),
    generatedBy: "scripts/import-timing-event-sources.js",
    keyFormat: "dot-segments-with-underscore-normalized-phase",
    ownerApproval: "approved_meaning_layer_only",
    importScope: "currently-emitted-stations-active-passages-and-pass-neutral-ingresses",
    serving: false,
    voiceNeutral: true,
    status: "REVIEWED",
    exclusions: [
      "moon-ingress-permanently-excluded",
      "pre-shadow-not-emitted",
      "post-shadow-not-emitted",
      "cazimi-named-event-not-emitted",
      "mars-sun-opposition-not-emitted",
      "ingress-pass-types-not-calculated"
    ],
    sourceRecords,
    concreteMappings
  };
}

function main() {
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const compiled = `${JSON.stringify(compile(markdown), null, 2)}\n`;

  if (checkOnly) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== compiled) {
      console.error(`Timing-event source import is stale: ${path.relative(root, outputPath)}`);
      process.exit(1);
    }
    console.log("Timing-event source import is current.");
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, compiled);
    console.log(`Imported ${compiled.length} bytes to ${path.relative(root, outputPath)}.`);
  }
}

module.exports = { compile };

if (require.main === module) main();
