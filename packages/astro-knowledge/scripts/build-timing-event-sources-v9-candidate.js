#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { compile: compileApprovedV8 } = require("./import-timing-event-sources.js");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "review", "timing-event-sources-v7.md");
const outputPath = path.join(root, "data", "timing", "timing-event-sources-v9.json");
const checkOnly = process.argv.includes("--check");
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const fastPlanets = ["mercury", "venus", "mars"];
const reentryPlanets = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

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

function newlyApprovedSourceRecord(sections, id) {
  const section = sections.get(id);
  if (!section) throw new Error(`Missing source record ${id}`);
  return {
    id,
    statusLine: field(section, "Status", ["Fact", "Scenes", "Meaning note(?: \\(pass-neutral\\))?", "Sources"]),
    fact: field(section, "Fact", ["Scenes", "Meaning note(?: \\(pass-neutral\\))?", "Sources"]),
    scenes: field(section, "Scenes", ["Meaning note(?: \\(pass-neutral\\))?", "Sources"]),
    meaningNote: field(section, "Meaning note(?: \\(pass-neutral\\))?", ["Sources"]),
    provenance: field(section, "Sources", ["###", "##"]),
    engineStatus: "calculated_in_non_serving_candidate_feed",
    ownerApprovalStatement: "I explicitly approve the exact wording of all four V2 reader-copy cards and the exact ten V9 meaning-layer records.",
    voiceNeutral: true,
    status: "REVIEWED",
    serving: false
  };
}

function compositionSources(sourceId, planet, sign, eventFamily, additions = []) {
  const sources = [
    `review/timing-event-sources-v7.md#${sourceId}`,
    ...additions,
    `data/primitives/planets.json#${planet}`,
    `data/primitives/signs.json#${sign}`,
    "engine/ephemeris#non-serving-timing-event-candidates",
    "voice/owner-approved-model"
  ];
  if (eventFamily === "retrograde") {
    sources.splice(-3, 0, `data/modifiers/retrograde-planet-meanings.json#${planet}-retrograde`);
  }
  return sources;
}

function mapping({ readerKey, sourceId, eventFamily, planet, sign, phase = null, motion = null, passType = null, additions = [] }) {
  return {
    readerKey,
    sourceId,
    eventFamily,
    planet,
    sign,
    phase,
    motion,
    passType,
    compositionSourceIds: compositionSources(sourceId, planet, sign, eventFamily, additions),
    readerStatus: "needs_review",
    serving: false
  };
}

function applyOwnerApprovedCleanup(sourceRecords) {
  const sourceId = "src.timing.venus.retrograde-passage";
  const before = "value-and-relationship reckoning across twelve sign readings";
  const after = "value-and-relationship reassessment across twelve sign readings";
  let found = false;

  const cleaned = sourceRecords.map((record) => {
    if (record.id !== sourceId) return record;
    found = true;
    if (record.provenance.includes(after)) return record;
    if (!record.provenance.includes(before)) {
      throw new Error(`${sourceId} provenance no longer matches the owner-approved cleanup input.`);
    }
    return { ...record, provenance: record.provenance.replace(before, after) };
  });

  if (!found) throw new Error(`Missing source record ${sourceId} for the owner-approved cleanup.`);
  return cleaned;
}

function compile(markdown, approved) {
  const sections = sourceSections(markdown);
  const pendingIds = new Set();
  const pendingMappings = [];

  for (const planet of fastPlanets) {
    for (const phase of ["pre-shadow", "post-shadow"]) {
      const sourceId = `src.timing.${planet}.${phase}`;
      pendingIds.add(sourceId);
      for (const sign of signs) {
        pendingMappings.push(mapping({
          readerKey: `sky.retrograde.${planet}.${sign}.${phase.replaceAll("-", "_")}`,
          sourceId,
          eventFamily: "retrograde",
          planet,
          sign,
          phase,
          motion: "direct"
        }));
      }
    }
  }

  for (const planet of ["mercury", "venus"]) {
    const sourceId = `src.timing.${planet}.cazimi-retrograde`;
    pendingIds.add(sourceId);
    for (const sign of signs) {
      pendingMappings.push(mapping({
        readerKey: `sky.retrograde.${planet}.${sign}.cazimi_retrograde`,
        sourceId,
        eventFamily: "retrograde",
        planet,
        sign,
        phase: "cazimi",
        motion: "retrograde"
      }));
    }
  }

  pendingIds.add("src.timing.mars.sun-opposition");
  for (const sign of signs) {
    pendingMappings.push(mapping({
      readerKey: `sky.retrograde.mars.${sign}.sun_opposition`,
      sourceId: "src.timing.mars.sun-opposition",
      eventFamily: "retrograde",
      planet: "mars",
      sign,
      phase: "sun-opposition",
      motion: "retrograde"
    }));
  }

  pendingIds.add("src.timing.shared.ingress-re-entry");
  for (const planet of reentryPlanets) {
    for (const sign of signs) {
      pendingMappings.push(mapping({
        readerKey: `sky.ingress.${planet}.${sign}.re_entry`,
        sourceId: "src.timing.shared.ingress-re-entry",
        eventFamily: "ingress",
        planet,
        sign,
        passType: "re-entry",
        additions: [`review/timing-event-sources-v7.md#src.timing.${planet}.ingress`]
      }));
    }
  }

  const sourceRecords = applyOwnerApprovedCleanup([
    ...approved.sourceRecords,
    ...[...pendingIds].sort().map((id) => newlyApprovedSourceRecord(sections, id))
  ]);
  const concreteMappings = [...approved.concreteMappings, ...pendingMappings];

  return {
    id: "timing-event-sources-v9",
    kind: "timing-event-source-collection",
    sourceDocument: "review/timing-event-sources-v7.md",
    sourceDocumentSha256: crypto.createHash("sha256").update(markdown).digest("hex"),
    generatedBy: "scripts/build-timing-event-sources-v9-candidate.js",
    keyFormat: "dot-segments-with-underscore-normalized-phase",
    ownerApproval: "approved_meaning_layer_only_31_records",
    importScope: "calculated_non_serving_timing_families",
    serving: false,
    voiceNeutral: true,
    status: "REVIEWED",
    exclusions: [
      "moon-ingress-permanently-excluded",
      "direct-cazimi-meaning-records-missing",
      "reader-calendar-wiring-blocked-until-copy-approval"
    ],
    approvedSourceRecordCount: approved.sourceRecords.length,
    newlyApprovedSourceRecordCount: pendingIds.size,
    pendingSourceRecordCount: 0,
    sourceRecords,
    concreteMappings
  };
}

const markdown = fs.readFileSync(sourcePath, "utf8");
const approved = compileApprovedV8(markdown);
const compiled = `${JSON.stringify(compile(markdown, approved), null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== compiled) {
    console.error(`Timing-event V9 review candidate is stale: ${path.relative(root, outputPath)}`);
    process.exit(1);
  }
  console.log("Timing-event V9 review candidate is current.");
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, compiled);
  console.log(`Built ${path.relative(root, outputPath)}.`);
}
