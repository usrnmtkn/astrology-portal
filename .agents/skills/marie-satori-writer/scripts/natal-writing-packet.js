#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { buildIndex, repoRoot } = require("./build-voice-index.js");

const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const PACKET_VERSION = "natal-writer-packet-v4:astrology-support-source-v1:prior-copy-excluded-v1:registry-boundary-v2:exact-owner-evidence-v1:two-entry-points-v1:five-beat-v1:whole-passage-v1:fail-closed-v1";
const MIN_PASSAGES = 4;
const MAX_PASSAGES = 6;
const MIN_SOURCE_ROWS = 3;
const MAX_PER_SOURCE_ROW = 2;
const ACTIVE_FACT_STATUSES = new Set(["REVIEWED", "LIVE", "APPROVED", "SOURCE_BACKED"]);
const SIGNS = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
const SOFT_ASPECTS = new Set(["sextile", "trine"]);
const HARD_ASPECTS = new Set(["square", "opposition", "quincunx", "semisquare", "sesquisquare"]);
const STANDARD_PATHS = {
  mechanism: "tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER.md",
  wholePassage: "tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-WHOLE-PASSAGE-CLARIFICATION-OWNER.md",
  delineation: "tldr-astro-phrasebank/TLDR-NATAL-PLACEMENT-DELINEATION-STANDARD-OWNER.md",
  corrections: "docs/writing/OWNER_CORRECTIONS.md",
  editorial: "tldr-astro-phrasebank/TLDR-BATCH-EDITORIAL-STANDARD-V2.md",
  entryPoint: "tldr-astro-phrasebank/TLDR-VOICE-ENTRY-POINT-RULING-OWNER.md"
};
const SUPPORT_REGISTRY_PATH = path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer", "ll-matrix-v13", "ll-matrix-v13-astrology-support-v1.json");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function posix(value) {
  return String(value).replaceAll(path.sep, "/");
}

function relative(value) {
  return posix(path.relative(repoRoot, value));
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function normalizeAspect(value) {
  const aspect = normalize(value);
  if (aspect === "conjunct") return "conjunction";
  if (aspect === "inconjunct") return "quincunx";
  return aspect;
}

function houseNumber(value) {
  const match = String(value || "").trim().toLowerCase().match(/^(1[0-2]|[1-9])(?:st|nd|rd|th)(?:[ -]house)?$/u);
  return match ? Number(match[1]) : 0;
}

function aspectFamily(value) {
  const aspect = normalizeAspect(value);
  if (SOFT_ASPECTS.has(aspect)) return "soft";
  if (HARD_ASPECTS.has(aspect)) return "hard";
  if (aspect === "conjunction") return "conjunction";
  return "other";
}

function normalizeSurface(surface) {
  const value = normalize(surface);
  if (value === "natal") return "natal-aspect";
  if (value === "natal-aspect" || value === "natal-placement") return value;
  throw new Error(`Unsupported natal packet surface: ${surface}`);
}

function parseNatalTarget(surface, key) {
  const normalizedSurface = normalizeSurface(surface);
  const rawKey = String(key || "").trim();
  const parts = rawKey.split("|").map((part) => part.trim());
  if (normalizedSurface === "natal-aspect") {
    if (parts.length !== 3 || parts.some((part) => !part)) {
      return { surface: normalizedSurface, key: rawKey, supported: false, reason: "unsupported-key-shape" };
    }
    const planetA = normalize(parts[0]);
    const aspect = normalizeAspect(parts[1]);
    const planetB = normalize(parts[2]);
    return {
      surface: normalizedSurface,
      key: `${planetA}|${aspect}|${planetB}`,
      sourceKey: rawKey,
      supported: true,
      planetA,
      aspect,
      planetB,
      aspectFamily: aspectFamily(aspect)
    };
  }
  if (parts.length !== 2 || parts.some((part) => !part)) {
    return { surface: normalizedSurface, key: rawKey, supported: false, reason: "unsupported-key-shape" };
  }
  const planet = normalize(parts[0]);
  const sign = normalize(parts[1]);
  const house = houseNumber(parts[1]);
  if (!SIGNS.has(sign) && !house) {
    return { surface: normalizedSurface, key: rawKey, supported: false, reason: "unsupported-placement-position" };
  }
  return {
    surface: normalizedSurface,
    key: house ? `${planet}|${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} house` : `${planet}|${sign}`,
    sourceKey: rawKey,
    supported: true,
    planet,
    placementType: house ? "house" : "sign",
    placementValue: house ? String(house) : sign
  };
}

function registryCandidates(target) {
  if (target.surface === "natal-aspect") {
    const exact = `${target.planetA}-${target.aspect}-${target.planetB}.json`;
    const reverse = `${target.planetB}-${target.aspect}-${target.planetA}.json`;
    return [
      path.join(packageRoot, "data", "aspects", exact),
      path.join(packageRoot, "data", "aspects", reverse),
      path.join(packageRoot, "data", "insights", "natal-aspects", exact),
      path.join(packageRoot, "data", "insights", "natal-aspects", reverse),
      path.join(packageRoot, "data", "points", "aspects", "natal", exact),
      path.join(packageRoot, "data", "points", "aspects", "natal", reverse)
    ];
  }
  const filename = `${target.planet}-${target.placementValue}.json`;
  return [
    path.join(packageRoot, "data", "placements", target.placementType, filename),
    path.join(packageRoot, "data", "points", "placements", target.placementType, filename)
  ];
}

function loadNatalFactBoundary(target) {
  if (!target.supported) return { ok: false, reason: target.reason };
  const sourcePath = registryCandidates(target).find((candidate) => fs.existsSync(candidate));
  if (!sourcePath) return { ok: false, reason: "missing-registry-row" };
  const bytes = fs.readFileSync(sourcePath);
  const row = JSON.parse(bytes);
  const status = String(row.status || "").trim().toUpperCase();
  if (!ACTIVE_FACT_STATUSES.has(status)) {
    return { ok: false, reason: "unverified-registry-row", sourcePath: relative(sourcePath), status };
  }
  if (target.surface === "natal-aspect") {
    const factor = Array.isArray(row.sourceFactors)
      ? row.sourceFactors.find((item) => item?.type === "natal-aspect")
      : null;
    const actualPair = [normalize(factor?.planetA), normalize(factor?.planetB)].sort().join("|");
    const wantedPair = [target.planetA, target.planetB].sort().join("|");
    if (!factor || actualPair !== wantedPair || normalizeAspect(factor.aspect) !== target.aspect) {
      return { ok: false, reason: "registry-identity-mismatch", sourcePath: relative(sourcePath), status };
    }
    return {
      ok: true,
      sourcePath: relative(sourcePath),
      sourceSha256: sha256(bytes),
      status,
      registryKind: row.kind || "natal-aspect",
      identity: { planetA: target.planetA, aspect: target.aspect, planetB: target.planetB },
      usageBoundary: "Identity and active-status boundary only. Registry prose is excluded from the writer context."
    };
  }
  const actualPlanet = normalize(row.planet || row.point);
  const actualValue = target.placementType === "house" ? String(row.key ?? row.house ?? "") : normalize(row.key || row.sign);
  if (actualPlanet !== target.planet || actualValue !== target.placementValue) {
    return { ok: false, reason: "registry-identity-mismatch", sourcePath: relative(sourcePath), status };
  }
  return {
    ok: true,
    sourcePath: relative(sourcePath),
    sourceSha256: sha256(bytes),
    status,
    registryKind: row.kind || target.placementType,
    identity: { planet: target.planet, placementType: target.placementType, placementValue: target.placementValue },
    usageBoundary: "Identity and active-status boundary only. Registry prose is excluded from the writer context."
  };
}

function loadAstrologySupportRegistry() {
  if (!fs.existsSync(SUPPORT_REGISTRY_PATH)) {
    throw new Error(`Missing AstrologySupport registry: ${relative(SUPPORT_REGISTRY_PATH)}. Run scripts/build-ll-v13-astrology-support-registry.mjs.`);
  }
  return JSON.parse(fs.readFileSync(SUPPORT_REGISTRY_PATH, "utf8"));
}

function supportSheetFor(target) {
  if (target.surface === "natal-aspect") return "AspectMeanings";
  return ["north-node", "south-node", "part-of-fortune"].includes(target.planet)
    ? "NodesPhasesFortune"
    : "PlacementMeanings";
}

function loadAstrologySupport(target, supportRegistry = loadAstrologySupportRegistry()) {
  if (!target.supported) return { ok: false, reason: target.reason };
  const preferredSheet = supportSheetFor(target);
  const exactRows = supportRegistry.rows.filter((entry) => entry.key === target.sourceKey);
  const row = exactRows.find((entry) => entry.sheet === preferredSheet) || (exactRows.length === 1 ? exactRows[0] : null);
  const sheet = row?.sheet || preferredSheet;
  if (!row) return { ok: false, reason: "missing-astrology-support", sheet, key: target.key };
  if (!String(row.astrologySupport || "").trim()) return { ok: false, reason: "blank-astrology-support", sheet, key: target.key };
  return {
    ok: true,
    rowKey: target.key,
    sheet,
    workbookRow: row.workbookRow,
    astrologySupport: row.astrologySupport,
    astrologySupportSha256: row.astrologySupportSha256,
    sourcePath: supportRegistry.sourceWorkbook,
    sourceSha256: supportRegistry.sourceWorkbookSha256,
    sourceConstraints: [
      "AstrologySupport is the sole target-mechanism source.",
      "Registry data supplies target identity and active-status boundaries only; its prose is unavailable.",
      "Existing, prior, current, and revised candidate prose is unavailable to the writer.",
      "Keep possibility as possibility and do not invent biography, childhood, trauma, relationships, work, health, or life status.",
      target.surface === "natal-aspect"
        ? "Preserve the aspect mechanism and both planetary roles; do not substitute a generic aspect description."
        : "Preserve the planet or point role and the exact sign or house context; do not substitute natural-zodiac equivalence."
    ]
  };
}

function metadataFromEntry(entry) {
  const governedKey = String(entry.governedKey || "");
  const parts = governedKey.split("|");
  if (entry.surface === "natal-aspect" && parts.length === 3) {
    return {
      planetA: normalize(entry.planetA || parts[0]),
      aspect: normalizeAspect(entry.aspect || parts[1]),
      planetB: normalize(entry.planetB || parts[2])
    };
  }
  if (entry.surface === "natal-placement" && parts.length === 2) {
    const value = entry.placementValue || parts[1];
    const house = houseNumber(value);
    return {
      planet: normalize(entry.planet || parts[0]),
      placementType: entry.placementType || (house ? "house" : SIGNS.has(normalize(value)) ? "sign" : ""),
      placementValue: house ? String(house) : normalize(value)
    };
  }
  return {};
}

function sourceRowId(entry) {
  return [entry.sourcePath || "unknown", entry.workbookSourceRow || entry.sourceId].join("#");
}

function aspectAffinity(target, entry) {
  const meta = metadataFromEntry(entry);
  if (!meta.planetA || !meta.aspect || !meta.planetB) return null;
  const targetPair = [target.planetA, target.planetB].sort().join("|");
  const entryPair = [meta.planetA, meta.planetB].sort().join("|");
  if (targetPair === entryPair) return { rank: 0, label: "same-planet-pair" };
  if (aspectFamily(meta.aspect) === target.aspectFamily && target.aspectFamily !== "other") return { rank: 1, label: `same-${target.aspectFamily}-aspect-family` };
  if ([meta.planetA, meta.planetB].some((planet) => planet === target.planetA || planet === target.planetB)) return { rank: 2, label: "same-planet-any-aspect" };
  return { rank: 3, label: "adjacent-owner-approved-natal-aspect" };
}

function placementAffinity(target, entry) {
  const meta = metadataFromEntry(entry);
  if (!meta.planet || !meta.placementType || !meta.placementValue) return null;
  if (meta.planet === target.planet && meta.placementType === target.placementType && meta.placementValue === target.placementValue) {
    return { rank: 0, label: "same-placement" };
  }
  if (meta.planet === target.planet && meta.placementType === target.placementType) return { rank: 1, label: "same-planet-same-placement-family" };
  if (meta.planet === target.planet) return { rank: 2, label: "same-planet" };
  if (meta.placementType === target.placementType && meta.placementValue === target.placementValue) return { rank: 3, label: "same-sign-or-house" };
  return { rank: 4, label: "adjacent-owner-approved-natal-placement" };
}

function selectOwnerPassages(target, indexEntries) {
  const ranked = indexEntries
    .filter((entry) => entry.surface === target.surface)
    .filter((entry) => entry.authorityClass === "exact_owner_approved")
    .filter((entry) => entry.ownerApproved === true && entry.useAsPositiveVoiceEvidence === true)
    .filter((entry) => typeof entry.text === "string" && entry.text.trim())
    .map((entry) => ({ entry, affinity: target.surface === "natal-aspect" ? aspectAffinity(target, entry) : placementAffinity(target, entry) }))
    .filter((item) => item.affinity)
    .sort((left, right) => left.affinity.rank - right.affinity.rank || sourceRowId(left.entry).localeCompare(sourceRowId(right.entry)) || left.entry.sourceId.localeCompare(right.entry.sourceId));

  const selected = [];
  const bySource = new Map();
  for (const item of ranked) {
    const rowId = sourceRowId(item.entry);
    if ((bySource.get(rowId) || 0) >= MAX_PER_SOURCE_ROW) continue;
    selected.push({
      sourceId: item.entry.sourceId,
      sourceRowId: rowId,
      sourcePath: item.entry.sourcePath,
      workbookSourceRow: item.entry.workbookSourceRow || null,
      governedKey: item.entry.governedKey || null,
      sourceSha256: item.entry.sourceSha256,
      authorityClass: item.entry.authorityClass,
      affinity: item.affinity,
      text: item.entry.text
    });
    bySource.set(rowId, (bySource.get(rowId) || 0) + 1);
    if (selected.length === MAX_PASSAGES) break;
  }
  return selected;
}

function loadStandards() {
  const documents = Object.fromEntries(Object.entries(STANDARD_PATHS).map(([id, sourcePath]) => {
    const absolute = path.join(repoRoot, sourcePath);
    if (!fs.existsSync(absolute)) throw new Error(`Missing natal writing standard: ${sourcePath}`);
    const text = fs.readFileSync(absolute, "utf8");
    return [id, { sourcePath, sourceSha256: sha256(text), text }];
  }));
  return {
    fiveBeats: [
      "Mechanism to role: explain what the planet or point does here without trait naming.",
      "Evidence proves mechanism: show observable behavior or a recognizable lived moment.",
      "Consequence over time: show what repeatedly happens because of that mechanism.",
      "Complication after strength: establish the useful capacity before naming its cost.",
      "Tone: direct, adult, specific, generous, and free of personality-label conclusions."
    ],
    documents
  };
}

function promptBlockFor(packet) {
  const beats = packet.standards.fiveBeats.map((beat, index) => `${index + 1}. ${beat}`).join("\n");
  const documents = Object.entries(packet.standards.documents)
    .map(([id, document]) => `\n\n${id.toUpperCase()} (${document.sourcePath})\n${document.text.trim()}`)
    .join("");
  return `NATAL WRITING EVIDENCE CONTRACT\nGeneration is allowed only because this packet contains AstrologySupport for the exact row plus four to six exact owner-approved passages from at least three source rows. AstrologySupport is the sole target-mechanism source. Use owner passages as writing-operation evidence, never as target facts. Registry prose and all existing candidate prose are excluded from this packet by construction. Do not add facts absent from AstrologySupport.\n\nTWO INDEPENDENT AUTHORING TASKS\nAuthor self from the mechanism at the reader's own entry point. Author friend separately from the same mechanism at the observer's entry point. Never derive either passage from the other. Do not expose unobservable interior states in friend voice and do not coach the reader about the friend.\n\nAUTHORING ORDER\nExtract an internal mechanism sentence that is never shipped; find the human situation; enter through a scene; show the consequence; add perspective last; delete astrology-summary prose.\n\nFIVE-BEAT CONSTRAINTS\n${beats}${documents}`;
}

function buildNatalWritingPacket({ surface, key, indexEntries, factBoundaryLoader = loadNatalFactBoundary, supportRegistry }) {
  const target = parseNatalTarget(surface, key);
  const factBoundary = factBoundaryLoader(target);
  const authoringSource = loadAstrologySupport(target, supportRegistry);
  const standards = loadStandards();
  const ownerPassages = target.supported ? selectOwnerPassages(target, indexEntries || buildIndex().entries) : [];
  const distinctSourceRows = new Set(ownerPassages.map((entry) => entry.sourceRowId)).size;
  const evidenceCompliant = ownerPassages.length >= MIN_PASSAGES && ownerPassages.length <= MAX_PASSAGES && distinctSourceRows >= MIN_SOURCE_ROWS;
  const generationAllowed = target.supported && factBoundary.ok === true && authoringSource.ok === true && evidenceCompliant;
  const reasons = [];
  if (!target.supported) reasons.push(target.reason);
  if (target.supported && !factBoundary.ok) reasons.push(factBoundary.reason);
  if (target.supported && !authoringSource.ok) reasons.push(authoringSource.reason);
  if (ownerPassages.length < MIN_PASSAGES) reasons.push("fewer-than-four-owner-passages");
  if (distinctSourceRows < MIN_SOURCE_ROWS) reasons.push("fewer-than-three-distinct-source-rows");
  const packet = {
    schemaVersion: 1,
    packetVersion: PACKET_VERSION,
    packetType: "natal-writing-packet",
    status: generationAllowed ? "ready" : "insufficient-evidence",
    generationAllowed,
    target,
    factBoundary,
    authoringSource,
    evidencePolicy: {
      authorityClass: "exact_owner_approved",
      minimumPassages: MIN_PASSAGES,
      maximumPassages: MAX_PASSAGES,
      minimumDistinctSourceRows: MIN_SOURCE_ROWS,
      maximumPassagesPerSourceRow: MAX_PER_SOURCE_ROW,
      ranking: target.surface === "natal-aspect"
        ? ["same planet pair", "same soft/hard aspect family", "same planet with any aspect", "adjacent"]
        : ["same placement", "same planet and placement family", "same planet", "same sign or house", "adjacent"]
    },
    evidenceSummary: {
      qualifyingPassages: ownerPassages.length,
      distinctSourceRows,
      reasons
    },
    ownerPassages,
    standards,
    governance: {
      approvalEffect: "none",
      reviewGatedCandidateOnly: true,
      autoPublish: false,
      writerPromotion: false,
      personContract: {
        self: "reader-own-experience",
        friend: "observer-in-the-room",
        friendDerivedFromSelf: false
      }
    }
  };
  packet.promptBlock = promptBlockFor(packet);
  return packet;
}

function assertNatalGenerationAllowed(packet) {
  if (!packet?.generationAllowed) {
    const reasons = packet?.evidenceSummary?.reasons?.join(", ") || "unknown";
    throw new Error(`INSUFFICIENT_NATAL_WRITER_EVIDENCE: ${reasons}`);
  }
}

function renderNatalModelInput(packet, { task = "Write the requested natal delineation.", inputText, voice = "self" } = {}) {
  assertNatalGenerationAllowed(packet);
  if (inputText != null && String(inputText).trim()) {
    throw new Error("PRIOR_COPY_FORBIDDEN: natal authoring packets cannot accept existing candidate prose.");
  }
  if (!new Set(["self", "friend"]).has(voice)) throw new Error(`UNSUPPORTED_NATAL_VOICE: ${voice}`);
  const evidence = packet.ownerPassages.map((entry, index) => [
    `OWNER PASSAGE ${index + 1}`,
    `Source row: ${entry.sourceRowId}`,
    `Affinity: ${entry.affinity.label}`,
    entry.text
  ].join("\n")).join("\n\n");
  const registryIdentity = {
    sourcePath: packet.factBoundary.sourcePath,
    sourceSha256: packet.factBoundary.sourceSha256,
    status: packet.factBoundary.status,
    registryKind: packet.factBoundary.registryKind,
    identity: packet.factBoundary.identity,
    usageBoundary: packet.factBoundary.usageBoundary
  };
  const personTask = voice === "self"
    ? "SELF ENTRY POINT: speak to the reader and enter through the reader's own experience."
    : "FRIEND ENTRY POINT: speak about Name from what people in the room can observe. Author independently; do not reuse the self passage's sentence structure, assert private interior states, or coach the reader.";
  return `${packet.promptBlock}\n\nAUTHORING SOURCE\n${JSON.stringify(packet.authoringSource, null, 2)}\n\nREGISTRY IDENTITY BOUNDARY\n${JSON.stringify(registryIdentity, null, 2)}\n\nVOICE TASK\n${personTask}\n\nEXACT TASK\n${task}\n\n${evidence}\n`;
}

module.exports = {
  ACTIVE_FACT_STATUSES,
  MAX_PASSAGES,
  MAX_PER_SOURCE_ROW,
  MIN_PASSAGES,
  MIN_SOURCE_ROWS,
  PACKET_VERSION,
  SUPPORT_REGISTRY_PATH,
  STANDARD_PATHS,
  aspectFamily,
  assertNatalGenerationAllowed,
  buildNatalWritingPacket,
  houseNumber,
  loadNatalFactBoundary,
  loadAstrologySupport,
  loadAstrologySupportRegistry,
  normalizeAspect,
  normalizeSurface,
  parseNatalTarget,
  promptBlockFor,
  renderNatalModelInput,
  selectOwnerPassages
};
