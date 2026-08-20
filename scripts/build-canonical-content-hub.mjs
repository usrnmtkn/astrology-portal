#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  canonicalNatalAspectId,
  canonicalNatalEmptyHouseId,
  canonicalNatalPlacementHouseId,
  canonicalNatalPlacementSignId,
  normalizeCanonicalAspect,
  normalizeCanonicalBody,
  normalizeCanonicalSegment
} from "../packages/astro-knowledge/canonical-content/src/unit-id.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--write") ? "write" : null;
if (!mode || process.argv.filter((arg) => arg === "--check" || arg === "--write").length !== 1) {
  throw new Error("Usage: node scripts/build-canonical-content-hub.mjs --write|--check");
}

const paths = Object.freeze({
  rows: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
  templates: "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json",
  placementInterim: "apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json",
  dist: "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js",
  v13: "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json",
  placementHouseDirectory: "packages/astro-knowledge/data/placements/house",
  index: "packages/astro-knowledge/canonical-content/index/canonical-content-index.json",
  ownerReview: "packages/astro-knowledge/canonical-content/review/natal-wave-1-owner-decisions.json",
  report: "packages/astro-knowledge/canonical-content/review/natal-wave-1-migration-report.json"
});

const BODIES = Object.freeze([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"
]);
const SIGNS = Object.freeze([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
]);
const ASPECTS = Object.freeze(["conjunction", "sextile", "square", "trine", "opposition"]);
const MODERN_RULERS = Object.freeze({
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
  libra: "venus", scorpio: "pluto", sagittarius: "jupiter", capricorn: "saturn", aquarius: "uranus", pisces: "neptune"
});
const READER_ELIGIBLE = new Set(["approved", "approved_reuse", "reviewed"]);
const OWNER_DIRECTIVE_BASELINE_SUBSTITUTIONS = new Set([
  "fallback-hook/planet-lived/moon",
  "fallback-hook/planet-lived/pluto"
]);
const MIGRATION_TIMESTAMP = "2026-08-20T00:00:00.000Z";
const MIGRATION_ORIGIN = "post-fix shipped fallbackArchitectureV3 dist/tldr-content.js rebased onto 645f1947 with the owner-authorized resolver-precedence baseline";

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileSha256(relativePath) {
  return sha256(fs.readFileSync(absolute(relativePath)));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function serialize(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function contentHash(content) {
  return sha256(JSON.stringify(stable(content)));
}

function eligibleRowsByKey(rows, allowMissingStatus = false) {
  const grouped = new Map();
  for (const row of rows) {
    const candidates = grouped.get(row.contentKey) ?? [];
    candidates.push(row);
    grouped.set(row.contentKey, candidates);
  }
  return new Map([...grouped].flatMap(([key, candidates]) => {
    const eligible = candidates.filter((row) => (
      (allowMissingStatus && !row.review_status)
      || READER_ELIGIBLE.has(String(row.review_status ?? "").toLowerCase())
    ));
    if (eligible.length > 1) {
      throw new Error(`LEGACY_SOURCE_CONFLICT: ${key} has ${eligible.length} eligible rows; canonical authority must be resolved explicitly.`);
    }
    return eligible.length === 1 ? [[key, eligible[0]]] : [];
  }));
}

function rowText(row, perspective) {
  if (!row) return null;
  const value = perspective === "you" ? (row.body_you ?? row.body) : (row.body_they ?? row.body);
  return typeof value === "string" && value.trim() ? value : null;
}

function sourceDescriptor({ sourceId, sourcePath, locator, text, governance, approvalState, payloadSha256 = null, provenanceStatus = "VERIFIED" }) {
  return {
    sourceId,
    sourcePath,
    locator,
    sourceFileSha256: fileSha256(sourcePath),
    contentSha256: text == null ? null : sha256(text),
    payloadSha256,
    provenanceStatus,
    governance,
    approvalState
  };
}

const sourceRows = readJson(paths.rows);
const templatesFile = readJson(paths.templates);
const interim = readJson(paths.placementInterim);
const v13File = readJson(paths.v13);
const hookRows = eligibleRowsByKey(sourceRows.hookRows ?? []);
const vocabularyRows = eligibleRowsByKey([...(sourceRows.vocabularyRows ?? []), ...(interim.vocabularyRows ?? [])]);
const templateRows = eligibleRowsByKey([...(templatesFile.templates ?? []), ...(interim.templates ?? [])], true);
const allSlotRows = new Map([...hookRows, ...vocabularyRows, ...templateRows]);

const distModule = await import(`${pathToFileURL(absolute(paths.dist)).href}?sha=${fileSha256(paths.dist)}`);
const renderer = distModule.createFallbackRenderer(
  { templates: [...templatesFile.templates, ...interim.templates] },
  { hookRows: sourceRows.hookRows, vocabularyRows: [...sourceRows.vocabularyRows, ...interim.vocabularyRows] }
);
const v13Resolver = distModule.createKnowledgeMatrixV13Resolver(v13File);

const verifiedHashConvention = "sha256(JSON.stringify({ body: copy }))";
const provenanceVerification = { total: 0, verified: 0, failed: 0, unresolved: 0, convention: verifiedHashConvention, failures: [] };
for (const row of v13File.rows.filter((candidate) => candidate.runtimeFamily === "placement-sign-lived" || candidate.runtimeFamily === "placement-house-lived")) {
  provenanceVerification.total += 1;
  const calculated = sha256(JSON.stringify({ body: row.copy }));
  if (calculated === row.payloadSha256) provenanceVerification.verified += 1;
  else {
    provenanceVerification.failed += 1;
    provenanceVerification.failures.push(row.contentKey);
  }
}

const slotCandidates = new Map();
function addSlotCandidate(slotId, sourceKey, role) {
  const row = allSlotRows.get(sourceKey);
  if (!row) return null;
  const list = slotCandidates.get(slotId) ?? [];
  if (!list.some((candidate) => candidate.sourceKey === sourceKey)) {
    list.push({ sourceKey, role, row });
    slotCandidates.set(slotId, list);
  }
  return slotId;
}

function addExistingSlot(slotIds, slotId, sourceKey, role) {
  const added = addSlotCandidate(slotId, sourceKey, role);
  if (added) slotIds.push(added);
}

function sourceSlotId(sourceKey) {
  return `canonical-slot/source/${normalizeCanonicalSegment(sourceKey)}`;
}

function placementSignSlots(body, sign) {
  const slots = [];
  const introLived = `fallback-hook/planet-lived/${body}`;
  const introShort = `fallback-hook/planet-intro/${body}`;
  if (hookRows.has(introLived) || hookRows.has(introShort)) {
    addExistingSlot(slots, `canonical-slot/natal/planet-intro/${body}`, introLived, "planetIntro");
    addSlotCandidate(`canonical-slot/natal/planet-intro/${body}`, introShort, "planetIntro");
  }
  for (const [role, key] of [
    ["planetTopic", `fallback-vocab/planet-topic/${body}`],
    ["planetExcess", `fallback-vocab/planet-excess/${body}`],
    ["planetProductive", `fallback-vocab/planet-productive/${body}`],
    ["planetCore", `fallback-vocab/planet-core/${body}`],
    ["signStyle", `fallback-vocab/sign-style/${sign}`],
    ["signNeed", `fallback-vocab/sign-need/${sign}`],
    ["planetVerb", `fallback-vocab/planet-verb/${body}`],
    ["signAdverb", `fallback-vocab/sign-adverb/${sign}`],
    ["planetBest", `fallback-hook/planet-best/${body}`],
    ["placementSentences", `fallback-hook/placement-sentence/${body}/${sign}`]
  ]) addExistingSlot(slots, sourceSlotId(key), key, role);
  for (let index = 0; index < 8; index += 1) {
    const key = `fallback-vocab/placement-gerund/${body}/${sign}/${index}`;
    if (!vocabularyRows.has(key)) break;
    addExistingSlot(slots, sourceSlotId(key), key, "placementGerundText");
  }
  const templateKey = templateRows.has(`fallback-template/natal.planet-in-sign/${body}`)
    ? `fallback-template/natal.planet-in-sign/${body}`
    : (body.endsWith("node") ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
  addExistingSlot(slots, sourceSlotId(templateKey), templateKey, "template");
  return [...new Set(slots)].sort();
}

function placementHouseSlots(body, house) {
  const slots = [];
  for (const [role, key] of [
    ["houseMeaning", `fallback-hook/house-meaning/${house}`],
    ["placementHouseSentences", `fallback-hook/placement-house-sentence/${body}/${house}`],
    ["template", "fallback-template/natal.house-context"]
  ]) addExistingSlot(slots, sourceSlotId(key), key, role);
  return [...new Set(slots)].sort();
}

function aspectSlots(first, second, aspect) {
  const group = aspect === "conjunction" ? "conjunction" : ["square", "opposition"].includes(aspect) ? "hard" : "soft";
  const slots = [];
  const forwardPair = `fallback-hook/aspect-pair/${first}/${second}/${group}`;
  const reversePair = `fallback-hook/aspect-pair/${second}/${first}/${group}`;
  const pairKey = hookRows.has(forwardPair) ? forwardPair : reversePair;
  for (const [role, key] of [
    ["aspectAdj", `fallback-vocab/aspect-adj/${aspect}`],
    ["planetACore", `fallback-vocab/planet-core/${first}`],
    ["planetBCore", `fallback-vocab/planet-core/${second}`],
    ["aspectTypeLine", `fallback-hook/aspect-type/${aspect}`],
    ["aspectMotion", `fallback-vocab/aspect-motion/${aspect}`],
    ["pairSentences", pairKey],
    ["template", "fallback-template/natal.aspect"]
  ]) addExistingSlot(slots, sourceSlotId(key), key, role);
  return [...new Set(slots)].sort();
}

function exactRowForKey(contentKey) {
  const row = hookRows.get(contentKey);
  return row?.reader_only === true && row?.render_policy === "reader-only-exact-lived-v1" ? row : null;
}

function exactPlacementSign(body, sign) {
  return exactRowForKey(`fallback-hook/placement-sign-lived/${body}/${sign}`);
}

function exactPlacementHouse(body, house) {
  return exactRowForKey(`fallback-hook/placement-house-lived/${body}/${house}`);
}

function exactAspect(first, second, aspect) {
  return exactRowForKey(`fallback-hook/natal-aspect-lived/${first}/${aspect}/${second}`)
    ?? exactRowForKey(`fallback-hook/natal-aspect-lived/${second}/${aspect}/${first}`);
}

function legacyEvidence(row) {
  if (!row) return [];
  const payload = row.approval?.payloadSha256 ?? null;
  const calculated = payload ? sha256(JSON.stringify({ body: row.body })) : null;
  return [sourceDescriptor({
    sourceId: row.contentKey,
    sourcePath: paths.rows,
    locator: row.contentKey,
    text: row.body ?? row.body_you ?? "",
    governance: row.governance ?? row.approval?.approvalLevel ?? "legacy-reader-eligible",
    approvalState: row.review_status,
    payloadSha256: payload,
    provenanceStatus: payload ? (calculated === payload ? "VERIFIED" : "PROVENANCE_UNVERIFIED") : "NOT_CLAIMED"
  })];
}

function unitRecord({ unitId, kind, mode, perspectiveModes, contentByPerspective, recipeId = null, slotIds = [], exactRow = null, candidateSources = [], mechanism }) {
  const renderEligible = mode !== "gap";
  const hash = renderEligible ? contentHash(contentByPerspective) : null;
  const revisionId = renderEligible ? `${unitId}@0` : null;
  const bucket = mode === "gap"
    ? "SOURCE_GAP"
    : mode === "authored"
      ? "AUTO_MERGE_EXACT"
      : exactRow
        ? "AUTHORITY_RESOLVED"
        : "COMPOSED_ONLY";
  return {
    identity: { unitId, surface: "natal", kind, register: "natal", supportedPerspectives: ["they", "you"] },
    resolution: { mode, canonicalRevisionId: revisionId, recipeId, canonicalSlotIds: slotIds, perspectiveModes },
    content: { contentRef: hash, renderEligible, contentSha256: hash },
    mechanism,
    evidence: legacyEvidence(exactRow),
    governance: {
      authorityClass: mode === "authored"
        ? "exact-owner-approved"
        : exactRow
          ? "perspective-scoped-owner-approved-plus-deterministic-composition"
          : mode === "gap"
            ? "source-gap"
            : "deterministic-approved-composition",
      approvalState: renderEligible ? "approved" : "needs_review",
      approvalMetadata: exactRow?.approval ?? {}
    },
    lineage: {
      supersedes: [], supersededBy: [],
      legacyKeys: [...new Set([exactRow?.contentKey, ...slotIds.flatMap((slotId) => (slotCandidates.get(slotId) ?? []).map((candidate) => candidate.sourceKey))].filter(Boolean))].sort(),
      migrationOrigin: MIGRATION_ORIGIN
    },
    revisions: renderEligible ? [{
      revisionId,
      timestamp: MIGRATION_TIMESTAMP,
      actor: "canonical-content-hub-migration",
      reason: "Migration revision zero; post-fix shipped output preserved byte-for-byte.",
      provenance: legacyEvidence(exactRow),
      contentSha256: hash,
      supersedesRevisionId: null,
      contentRef: hash
    }] : [],
    candidates: [],
    reconciliation: {
      bucket,
      candidateSources,
      currentRenderedResult: { contentSha256: hash }
    }
  };
}

function renderByPerspective(render) {
  const you = render("you");
  const theyRaw = render("CANONICALNAME");
  const replaceCanonicalName = (value) => typeof value === "string" ? value.replaceAll("CANONICALNAME", "{{Name}}") : value;
  const they = {
    ...theyRaw,
    headline: replaceCanonicalName(theyRaw.headline),
    body: replaceCanonicalName(theyRaw.body),
    parts: theyRaw.parts?.map(replaceCanonicalName)
  };
  return {
    you: { headline: you.headline ?? "", body: you.body ?? "", parts: you.parts ?? [you.body ?? ""] },
    they: { headline: they.headline ?? "", body: they.body ?? "", parts: they.parts ?? [they.body ?? ""] }
  };
}

function renderOrGap(render) {
  try {
    return render();
  } catch (error) {
    if (error instanceof distModule.SourceGapError) return null;
    throw error;
  }
}

function contentByAvailablePerspective(you, theyRaw) {
  const replaceCanonicalName = (value) => typeof value === "string" ? value.replaceAll("CANONICALNAME", "{{Name}}") : value;
  return {
    ...(you ? { you: { headline: you.headline ?? "", body: you.body ?? "", parts: you.parts ?? [you.body ?? ""] } } : {}),
    ...(theyRaw ? {
      they: {
        headline: replaceCanonicalName(theyRaw.headline ?? ""),
        body: replaceCanonicalName(theyRaw.body ?? ""),
        parts: (theyRaw.parts ?? [theyRaw.body ?? ""]).map(replaceCanonicalName)
      }
    } : {})
  };
}

function renderEmptyHouseByPerspective(facts) {
  const renderForVoice = (voice) => {
    const card = renderer.renderNatalEmptyHouse({ ...facts, voice });
    const detail = renderer.renderNatalEmptyHouse({ ...facts, voice }, { includeEmptyHouseBridge: true });
    const normalize = (result) => ({ headline: result.headline ?? "", body: result.body ?? "", parts: result.parts ?? [result.body ?? ""] });
    return { ...normalize(card), variants: { card: normalize(card), detail: normalize(detail) } };
  };
  const you = renderForVoice("you");
  const theyRaw = renderForVoice("CANONICALNAME");
  const replace = (value) => typeof value === "string"
    ? value.replaceAll("CANONICALNAME", "{{Name}}")
    : Array.isArray(value)
      ? value.map(replace)
      : value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)]))
        : value;
  return { you, they: replace(theyRaw) };
}

const units = [];
const contentBlobsByHash = new Map();
const mechanismWave1Map = [];
const mechanismWave2Map = [];

for (const body of BODIES) {
  for (const sign of SIGNS) {
    const unitId = canonicalNatalPlacementSignId(body, sign);
    const exactRow = exactPlacementSign(body, sign);
    const content = renderByPerspective((voice) => renderer.renderNatalPlacement({ planet: body, sign, voice }));
    const youResult = renderer.renderNatalPlacement({ planet: body, sign, voice: "you" });
    const theyResult = renderer.renderNatalPlacement({ planet: body, sign, voice: "CANONICALNAME" });
    const perspectiveModes = {
      you: exactRow && youResult.partKeys?.[0] === exactRow.contentKey ? "authored" : "composed",
      they: exactRow && theyResult.partKeys?.[0] === exactRow.contentKey ? "authored" : "composed"
    };
    const mode = Object.values(perspectiveModes).every((value) => value === "authored") ? "authored" : "composed";
    const v13 = v13Resolver.renderContentKey(`fallback-hook/placement-sign-lived/${body}/${sign}`);
    const candidateSources = [
      ...(exactRow ? [{ sourceId: exactRow.contentKey, copySha256: sha256(exactRow.body), governance: exactRow.governance ?? exactRow.approval?.approvalLevel }] : []),
      ...(v13 ? [{ sourceId: `knowledge-matrix-v13:${v13.contentKey}`, copySha256: sha256(v13.body), governance: v13.governance }] : [])
    ];
    contentBlobsByHash.set(contentHash(content), content);
    const slotIds = mode === "authored" ? [] : placementSignSlots(body, sign);
    if (exactRow && mode === "composed") addExistingSlot(slotIds, sourceSlotId(exactRow.contentKey), exactRow.contentKey, "perspectiveExact");
    units.push(unitRecord({
      unitId, kind: "placement-sign", mode, perspectiveModes, contentByPerspective: content,
      recipeId: mode === "authored" ? null : "recipe/natal/placement-sign/v1",
      slotIds: [...new Set(slotIds)].sort(), exactRow, candidateSources,
      mechanism: exactRow ? { status: "mapped", sourceId: exactRow.contentKey, evidenceRefs: exactRow.source_keys ?? [] } : { status: "missing", sourceId: null, evidenceRefs: [] }
    }));
    if (exactRow) mechanismWave1Map.push({ sourceId: exactRow.contentKey, unitId, status: "mapped" });
  }
  for (let house = 1; house <= 12; house += 1) {
    const unitId = canonicalNatalPlacementHouseId(body, house);
    const exactRow = exactPlacementHouse(body, house);
    const youResult = renderer.renderNatalPlacement({ planet: body, sign: "aries", house, voice: "you" });
    const theyResult = renderer.renderNatalPlacement({ planet: body, sign: "aries", house, voice: "CANONICALNAME" });
    const perspectiveModes = {
      you: exactRow && youResult.partKeys?.[1] === exactRow.contentKey ? "authored" : "composed",
      they: exactRow && theyResult.partKeys?.[1] === exactRow.contentKey ? "authored" : "composed"
    };
    const mode = Object.values(perspectiveModes).every((value) => value === "authored") ? "authored" : "composed";
    const housePart = (result) => ({
      headline: exactRow
        ? (result.headline ?? "")
        : (result.headline ?? "").replace(/\s+in Aries(?=\s+in the\s+\d+(?:st|nd|rd|th)\s+house$)/u, ""),
      body: result.parts?.[1] ?? "",
      parts: result.parts?.[1] ? [result.parts[1]] : []
    });
    const theyHouse = housePart(theyResult);
    theyHouse.headline = theyHouse.headline.replaceAll("CANONICALNAME", "{{Name}}");
    theyHouse.body = theyHouse.body.replaceAll("CANONICALNAME", "{{Name}}");
    theyHouse.parts = theyHouse.parts.map((part) => part.replaceAll("CANONICALNAME", "{{Name}}"));
    const byPerspective = { you: housePart(youResult), they: theyHouse };
    const v13 = v13Resolver.renderContentKey(`fallback-hook/placement-house-lived/${body}/${house}`);
    const candidateSources = [
      ...(exactRow ? [{ sourceId: exactRow.contentKey, copySha256: sha256(exactRow.body), governance: exactRow.governance ?? exactRow.approval?.approvalLevel }] : []),
      ...(v13 ? [{ sourceId: `knowledge-matrix-v13:${v13.contentKey}`, copySha256: sha256(v13.body), governance: v13.governance }] : [])
    ];
    const mechanismPath = `packages/astro-knowledge/data/placements/house/${body}-${house}.json`;
    let mechanism;
    if (fs.existsSync(absolute(mechanismPath)) && !["pluto", "chiron", "north-node", "south-node"].includes(body)) {
      const record = readJson(mechanismPath);
      mechanism = {
        status: "source-backed",
        sourceId: record.id,
        evidenceRefs: [{ path: mechanismPath, sha256: fileSha256(mechanismPath), status: record.status }]
      };
      mechanismWave2Map.push({ sourceId: mechanismPath, unitId, status: "mapped" });
    } else if (body === "lilith") {
      mechanism = { status: "SOURCE_GAP", sourceId: null, evidenceRefs: [] };
      mechanismWave2Map.push({ sourceId: null, unitId, status: "SOURCE_GAP" });
    } else {
      mechanism = { status: "missing", sourceId: null, evidenceRefs: [] };
    }
    contentBlobsByHash.set(contentHash(byPerspective), byPerspective);
    const slotIds = mode === "authored" ? [] : placementHouseSlots(body, house);
    if (exactRow && mode === "composed") addExistingSlot(slotIds, sourceSlotId(exactRow.contentKey), exactRow.contentKey, "perspectiveExact");
    units.push(unitRecord({
      unitId, kind: "placement-house", mode, perspectiveModes, contentByPerspective: byPerspective,
      recipeId: mode === "authored" ? null : "recipe/natal/placement-house/v1",
      slotIds: [...new Set(slotIds)].sort(), exactRow, candidateSources, mechanism
    }));
    if (exactRow) mechanismWave1Map.push({ sourceId: exactRow.contentKey, unitId, status: "mapped" });
  }
}

for (let firstIndex = 0; firstIndex < BODIES.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < BODIES.length; secondIndex += 1) {
    const first = BODIES[firstIndex];
    const second = BODIES[secondIndex];
    if (new Set([first, second]).size === 2 && [first, second].includes("north-node") && [first, second].includes("south-node")) continue;
    for (const aspect of ASPECTS) {
      const unitId = canonicalNatalAspectId(first, second, aspect);
      const exactRow = exactAspect(first, second, aspect);
      const youResult = renderOrGap(() => renderer.renderNatalAspect({ planetA: first, planetB: second, aspect, voice: "you" }));
      const theyResult = renderOrGap(() => renderer.renderNatalAspect({ planetA: first, planetB: second, aspect, voice: "CANONICALNAME" }));
      const content = contentByAvailablePerspective(youResult, theyResult);
      const perspectiveModes = {
        you: !youResult ? "gap" : exactRow && youResult.templateKey === exactRow.contentKey ? "authored" : "composed",
        they: !theyResult ? "gap" : exactRow && theyResult.templateKey === exactRow.contentKey ? "authored" : "composed"
      };
      const mode = Object.values(perspectiveModes).every((value) => value === "gap")
        ? "gap"
        : Object.values(perspectiveModes).every((value) => value === "authored")
          ? "authored"
          : "composed";
      const v13 = v13Resolver.renderNatalAspect({ planetA: first, planetB: second, aspect });
      const v13IsExact = Boolean(v13?.contentKey.startsWith("fallback-hook/natal-aspect-lived/"));
      const candidateSources = [
        ...(exactRow ? [{ sourceId: exactRow.contentKey, copySha256: sha256(exactRow.body), governance: exactRow.governance ?? exactRow.approval?.approvalLevel }] : []),
        ...(v13IsExact ? [{ sourceId: `knowledge-matrix-v13:${v13.contentKey}`, copySha256: sha256(v13.body), governance: v13.governance }] : [])
      ];
      if (mode !== "gap") contentBlobsByHash.set(contentHash(content), content);
      const slotIds = mode === "authored" ? [] : aspectSlots(first, second, aspect);
      if (exactRow && mode === "composed") addExistingSlot(slotIds, sourceSlotId(exactRow.contentKey), exactRow.contentKey, "perspectiveExact");
      units.push(unitRecord({
        unitId, kind: "aspect", mode, perspectiveModes, contentByPerspective: content,
        recipeId: mode === "authored" ? null : "recipe/natal/aspect/v1",
        slotIds: [...new Set(slotIds)].sort(), exactRow, candidateSources,
        mechanism: { status: "legacy-composition", sourceId: exactRow?.contentKey ?? null, evidenceRefs: exactRow?.source_keys ?? [] }
      }));
    }
  }
}

for (let house = 1; house <= 12; house += 1) {
  for (const sign of SIGNS) {
    const ruler = MODERN_RULERS[sign];
    for (let rulerHouse = 1; rulerHouse <= 12; rulerHouse += 1) {
      if (rulerHouse === house) continue;
      const unitId = canonicalNatalEmptyHouseId(house, sign, ruler, rulerHouse);
      const facts = { house, sign, primaryRuler: ruler, rulerHouse, rulerSystem: "modern" };
      const content = renderEmptyHouseByPerspective(facts);
      const sample = renderer.renderNatalEmptyHouse({ ...facts, voice: "you" });
      const detailSample = renderer.renderNatalEmptyHouse({ ...facts, voice: "you" }, { includeEmptyHouseBridge: true });
      const slotIds = [];
      for (const sourceKey of [...new Set([...(sample.sourceKeys ?? []), ...(detailSample.sourceKeys ?? [])])]) addExistingSlot(slotIds, sourceSlotId(sourceKey), sourceKey, "emptyHousePart");
      contentBlobsByHash.set(contentHash(content), content);
      units.push(unitRecord({
        unitId, kind: "empty-house", mode: "composed", perspectiveModes: { you: "composed", they: "composed" }, contentByPerspective: content,
        recipeId: "recipe/natal/empty-house-modern-v14", slotIds: [...new Set(slotIds)].sort(),
        candidateSources: [], mechanism: { status: "source-backed-v14", sourceId: sample.templateKey, evidenceRefs: sample.sourceKeys ?? [] }
      }));
    }
  }
}

units.sort((a, b) => a.identity.unitId.localeCompare(b.identity.unitId));

const slots = [...slotCandidates].map(([slotId, candidates]) => {
  const directiveApproved = candidates.find(({ sourceKey }) => OWNER_DIRECTIVE_BASELINE_SUBSTITUTIONS.has(sourceKey));
  const exactOwnerApproved = candidates.find(({ row }) => row.approval?.approvalLevel === "exact_owner_approved");
  const selected = directiveApproved ?? exactOwnerApproved ?? candidates[0];
  const distinctValues = new Set(candidates.map(({ row }) => contentHash({
    you: rowText(row, "you"),
    they: rowText(row, "they")
  })));
  const reconciliationBucket = distinctValues.size <= 1 ? "AUTO_MERGE_EXACT" : (directiveApproved || exactOwnerApproved) ? "AUTHORITY_RESOLVED" : "OWNER_DECISION_REQUIRED";
  return {
    slotId,
    authoritySourceKey: selected.sourceKey,
    authorityClass: directiveApproved ? "owner-directive-approved-baseline-substitution" : exactOwnerApproved ? "exact-owner-approved" : "reader-eligible-single-authority",
    reconciliationBucket,
    values: { you: rowText(selected.row, "you"), they: rowText(selected.row, "they") },
    candidates: candidates.map(({ sourceKey, row }) => ({
      sourceKey,
      reviewStatus: row.review_status ?? null,
      approvalLevel: row.approval?.approvalLevel ?? null,
      valueSha256: contentHash({ you: rowText(row, "you"), they: rowText(row, "they") })
    }))
  };
}).sort((a, b) => a.slotId.localeCompare(b.slotId));

const ownerDecisions = [
  ...units.filter((unit) => unit.reconciliation.bucket === "OWNER_DECISION_REQUIRED").map((unit) => ({ type: "unit", id: unit.identity.unitId, candidates: unit.reconciliation.candidateSources, currentRenderedResult: contentBlobsByHash.get(unit.content.contentRef), reason: "Differing legitimate candidates have no verified governance rule that permits an automatic choice." })),
  ...slots.filter((slot) => slot.reconciliationBucket === "OWNER_DECISION_REQUIRED").map((slot) => ({ type: "slot", id: slot.slotId, candidates: slot.candidates, currentRenderedResult: slot.values, reason: "Differing legitimate slot candidates have no verified governance rule that permits an automatic choice." }))
];
const mappedWave1Sources = new Set(mechanismWave1Map.map((entry) => entry.sourceId));
const wave1NotInUnitUniverse = v13File.rows
  .filter((row) => ["placement-sign-lived", "placement-house-lived"].includes(row.runtimeFamily))
  .filter((row) => !mappedWave1Sources.has(row.contentKey))
  .map((row) => row.contentKey)
  .sort();

const counts = {
  total: units.length,
  byKind: Object.fromEntries(["placement-sign", "placement-house", "aspect", "empty-house"].map((kind) => [kind, units.filter((unit) => unit.identity.kind === kind).length])),
  byMode: Object.fromEntries(["authored", "composed", "gap"].map((resolutionMode) => [resolutionMode, units.filter((unit) => unit.resolution.mode === resolutionMode).length])),
  byPerspectiveMode: Object.fromEntries(["you", "they"].map((perspective) => [
    perspective,
    Object.fromEntries(["authored", "composed", "gap"].map((resolutionMode) => [
      resolutionMode,
      units.filter((unit) => unit.resolution.perspectiveModes[perspective] === resolutionMode).length
    ]))
  ])),
  byBucket: Object.fromEntries(["AUTO_MERGE_EXACT", "AUTO_MERGE_NORMALIZED", "AUTHORITY_RESOLVED", "OWNER_DECISION_REQUIRED", "SINGLE_SOURCE", "COMPOSED_ONLY", "SOURCE_GAP"].map((bucket) => [bucket, units.filter((unit) => unit.reconciliation.bucket === bucket).length]))
};

const sourceFiles = [paths.rows, paths.templates, paths.placementInterim, paths.dist, paths.v13].map((sourcePath) => ({ path: sourcePath, sha256: fileSha256(sourcePath) }));
const sourceManifest = {
  schema: "tldr-astro-canonical-content-source-manifest/v1",
  version: "global-foundation-natal-wave-1",
  migrationTimestamp: MIGRATION_TIMESTAMP,
  sourceFiles,
  provenanceVerification,
  mechanismMappings: { wave1: mechanismWave1Map, wave2: mechanismWave2Map }
};
const index = {
  schema: "tldr-astro-canonical-content-index/v1",
  version: sourceManifest.version,
  sourceStoreSha256: sha256(serialize(sourceManifest)),
  sourceManifest,
  counts,
  contentBlobs: [...contentBlobsByHash].map(([contentSha256, byPerspective]) => ({ contentSha256, byPerspective })).sort((a, b) => a.contentSha256.localeCompare(b.contentSha256)),
  slots,
  units
};
const report = {
  schema: "tldr-astro-canonical-content-migration-report/v1",
  version: sourceManifest.version,
  counts,
  compositionSlots: {
    total: slots.length,
    conflicts: ownerDecisions.filter((decision) => decision.type === "slot").length,
    authorityResolved: slots.filter((slot) => slot.reconciliationBucket === "AUTHORITY_RESOLVED").length,
    authorityResolvedSlotIds: slots.filter((slot) => slot.reconciliationBucket === "AUTHORITY_RESOLVED").map((slot) => slot.slotId)
  },
  provenanceVerification,
  preservedBaselineSubstitutions: [
    {
      sourceKey: "fallback-hook/planet-lived/moon",
      substitution: "what unsettles you -> what puts you on edge",
      authority: "owner-approved in the Phase-1 implementation directive",
      legacyPayloadHashStatus: "STALE_AFTER_OWNER_APPROVED_SUBSTITUTION",
      legacyPayloadHashUsedToAutoResolve: false
    },
    {
      sourceKey: "fallback-hook/planet-lived/pluto",
      substitution: "the old leverage is gone -> the old advantage is gone",
      authority: "owner-approved in the Phase-1 implementation directive",
      legacyPayloadHashStatus: "STALE_AFTER_OWNER_APPROVED_SUBSTITUTION",
      legacyPayloadHashUsedToAutoResolve: false
    }
  ],
  ownerDecisionRequired: ownerDecisions.length,
  mechanisms: {
    wave1: { expected: 111, mapped: mechanismWave1Map.filter((entry) => entry.status === "mapped").length, notInUnitUniverse: wave1NotInUnitUniverse.length, notInUnitUniverseSourceIds: wave1NotInUnitUniverse, conflicting: 0, pendingReview: 0, missing: 0 },
    wave2: { expected: 120, mapped: mechanismWave2Map.filter((entry) => entry.status === "mapped").length, sourceGaps: mechanismWave2Map.filter((entry) => entry.status === "SOURCE_GAP").length, mappedBodies: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"], sourceGapBody: "lilith", conflicting: 0, pendingReview: 0, missing: 0 }
  },
  parity: { exactParity: units.length, intentionalAuthorityCorrection: 0, unresolvedOwnerDecision: ownerDecisions.filter((decision) => decision.type === "unit").length, bugs: 0 },
  resolverAuthorities: [
    { authority: "createFallbackRenderer", migration: "post-fix shipped output becomes revision zero; future adapter reads canonical units" },
    { authority: "createKnowledgeMatrixV13Resolver", migration: "its exact owner-approved rows are provenance candidates inside canonical units; it is not an independent future precedence path" },
    { authority: "createKnowledgeMatrixV9Resolver", migration: "inventoried; no Wave-1 natal API, so it contributes no natal unit authority" }
  ],
  preservedEditorialFlags: [{ sourceKey: "fallback-hook/planet-lived/moon", terms: ["settles", "comfort"], action: "preserved byte-for-byte; later editorial review only" }]
};

const outputs = new Map([
  [paths.index, serialize(index)],
  [paths.ownerReview, serialize({ schema: "tldr-astro-canonical-content-owner-decisions/v1", version: sourceManifest.version, count: ownerDecisions.length, decisions: ownerDecisions })],
  [paths.report, serialize(report)]
]);

if (mode === "write") {
  for (const [relativePath, body] of outputs) fs.writeFileSync(absolute(relativePath), body);
  console.log(`Canonical content hub written: ${counts.total} units, ${slots.length} slots, ${ownerDecisions.length} owner decisions.`);
} else {
  const drift = [];
  for (const [relativePath, expected] of outputs) {
    const current = fs.existsSync(absolute(relativePath)) ? fs.readFileSync(absolute(relativePath), "utf8") : null;
    if (current !== expected) drift.push(relativePath);
  }
  if (drift.length) {
    throw new Error(`Canonical content hub drift: ${drift.join(", ")}`);
  }
  console.log(`Canonical content hub check clean: ${counts.total} units, ${slots.length} slots, ${ownerDecisions.length} owner decisions.`);
}
