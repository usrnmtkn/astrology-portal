"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const {
  DEFAULT_SERVING_STATUSES,
  createSceneLicenseCore,
  normalized
} = require("./scene-license-core.js");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const defaultRegistryPath = path.join(packageRoot, "config", "friends-transit-scene-licenses-v3.json");
const FRIENDS_SEMANTIC_CLASSES = Object.freeze(["domains", "manifestations", "sceneNouns", "behaviors"]);
const canonicalHouseRowsPath = path.join(
  packageRoot,
  "voice",
  "tldr-astro",
  "marie-satori-writer",
  "knowledge-matrix-v9",
  "knowledge-matrix-v9-owner-approved-rows.json"
);
const canonicalWorkbookPath = path.join(
  repoRoot,
  "tldr-astro-phrasebank",
  "TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx"
);
const canonicalV13RowsPath = path.join(
  packageRoot,
  "voice",
  "tldr-astro",
  "marie-satori-writer",
  "ll-matrix-v13",
  "ll-matrix-v13.json"
);
const canonicalV13WorkbookPath = path.join(
  repoRoot,
  "tldr-astro-phrasebank",
  "TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx"
);
const evidenceJsonCache = new Map();
const evidenceHashCache = new Map();
const SCOPE_ROLE = Object.freeze({
  aspect: "mechanism",
  "transit-house": "arena",
  "natal-house": "arena",
  "two-house-intersection": "arena",
  "transit-sign": "manner",
  "natal-sign": "manner"
});
const FORBIDDEN_CLASSES_BY_SCOPE = Object.freeze({
  aspect: ["domains", "manifestations", "sceneNouns"],
  "transit-house": [],
  "natal-house": [],
  "two-house-intersection": [],
  "transit-sign": ["domains", "manifestations", "sceneNouns"],
  "natal-sign": ["domains", "manifestations", "sceneNouns"]
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256File(filePath) {
  if (!evidenceHashCache.has(filePath)) {
    evidenceHashCache.set(filePath, crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"));
  }
  return evidenceHashCache.get(filePath);
}

function readEvidenceJson(filePath) {
  if (!evidenceJsonCache.has(filePath)) evidenceJsonCache.set(filePath, readJson(filePath));
  return evidenceJsonCache.get(filePath);
}

function resolveSelector(source, selector) {
  if (selector === "$") return source;
  return selector.split(".").filter(Boolean).reduce((value, part) => value?.[part], source);
}

function verifyEvidence(evidence) {
  const absolute = path.join(repoRoot, evidence.sourcePath);
  if (!fs.existsSync(absolute)) return { passed: false, reason: `Missing source ${evidence.sourcePath}` };
  let selected;
  try {
    const source = readEvidenceJson(absolute);
    selected = resolveSelector(source, evidence.selector);
  } catch {
    return { passed: false, reason: `Evidence source ${evidence.sourcePath} is not valid JSON` };
  }
  if (selected === undefined || selected === null) {
    return { passed: false, reason: `Missing evidence selector ${evidence.selector}` };
  }
  const houseSelector = /^house_activations\.(\d+)\.Experience$/u.exec(evidence.selector);
  if (houseSelector) {
    const row = readEvidenceJson(absolute).house_activations?.[Number(houseSelector[1])];
    const workbookAbsolute = path.join(repoRoot, evidence.sourceWorkbookPath || "");
    const expectedJsonPath = `$.house_activations[${houseSelector[1]}].Experience`;
    if (absolute !== canonicalHouseRowsPath) return { passed: false, reason: `Unexpected CC/V9 JSON source ${evidence.sourcePath}` };
    if (workbookAbsolute !== canonicalWorkbookPath) return { passed: false, reason: `Unexpected CC/V9 workbook source ${evidence.sourceWorkbookPath}` };
    if (sha256File(absolute) !== evidence.sourceJsonSha256) return { passed: false, reason: `CC/V9 JSON hash drifted for ${evidence.sourceId}` };
    if (sha256File(workbookAbsolute) !== evidence.sourceWorkbookSha256) return { passed: false, reason: `CC/V9 workbook hash drifted for ${evidence.sourceId}` };
    if (evidence.jsonPath !== expectedJsonPath || evidence.sourceField !== "Experience") {
      return { passed: false, reason: `Invalid field provenance for ${evidence.sourceId}` };
    }
    if (!row
      || Number(row.source_row) !== Number(evidence.sourceRow)
      || row.Key !== evidence.sourceKey
      || Number(row.House) !== Number(evidence.sourceHouse)
      || row.Archive !== evidence.sourceArchive
      || row["Rising sign"] !== evidence.sourceRisingSign
      || row["House source"] !== evidence.sourceHouseSource
      || row.Planet !== evidence.sourcePlanet
      || row["Transit sign"] !== evidence.sourceTransitSign
      || row.Event !== evidence.sourceEvent
      || row.Substantive !== evidence.sourceSubstantive
      || row.Governance !== evidence.sourceGovernance
      || row.Judge !== evidence.sourceJudgeLineage
      || row.Source !== evidence.sourceOriginalSource
      || row["Advice type"] !== evidence.sourceAdviceType
      || row.Substantive !== "yes"
      || row.Governance !== "owner-approved"
      || !row.Planet
      || !row["Transit sign"]
      || String(row.Experience).startsWith("[EXCLUDE FROM FALLBACK]")) {
      return { passed: false, reason: `CC/V9 row provenance is not reusable for ${evidence.sourceId}` };
    }
  }
  const v13Selector = /^rows\.(\d+)\.copy$/u.exec(evidence.selector);
  if (v13Selector) {
    const row = readEvidenceJson(absolute).rows?.[Number(v13Selector[1])];
    const workbookAbsolute = path.join(repoRoot, evidence.sourceWorkbookPath || "");
    const expectedJsonPath = `$.rows[${v13Selector[1]}].copy`;
    const houseMatch = /(?:^|\|)(\d+)(?:st|nd|rd|th) house$/u.exec(row?.key || "");
    if (absolute !== canonicalV13RowsPath) return { passed: false, reason: `Unexpected V13 JSON source ${evidence.sourcePath}` };
    if (workbookAbsolute !== canonicalV13WorkbookPath) return { passed: false, reason: `Unexpected V13 workbook source ${evidence.sourceWorkbookPath}` };
    if (sha256File(absolute) !== evidence.sourceJsonSha256) return { passed: false, reason: `V13 JSON hash drifted for ${evidence.sourceId}` };
    if (sha256File(workbookAbsolute) !== evidence.sourceWorkbookSha256) return { passed: false, reason: `V13 workbook hash drifted for ${evidence.sourceId}` };
    if (evidence.jsonPath !== expectedJsonPath || evidence.sourceField !== "Copy") return { passed: false, reason: `Invalid V13 field provenance for ${evidence.sourceId}` };
    if (!row
      || row.sheet !== "PlacementMeanings"
      || row.key !== evidence.sourceKey
      || Number(houseMatch?.[1]) !== Number(evidence.sourceHouse)
      || (row.key.includes("|") ? "planet_in_house" : "house_essay") !== evidence.sourceCategory
      || (row.planet || null) !== evidence.sourcePlanet
      || (row.position || row.key) !== evidence.sourcePosition
      || row.governance !== evidence.sourceGovernance
      || (row.ownerApproved === true) !== evidence.sourceOwnerApproved
      || evidence.sourceApprovalTransfers !== false) {
      return { passed: false, reason: `V13 row provenance is invalid for ${evidence.sourceId}` };
    }
  }
  const text = typeof selected === "string" ? selected : JSON.stringify(selected);
  const passed = evidence.match === "includes" ? text.includes(evidence.text) : text === evidence.text;
  return passed
    ? { passed: true }
    : { passed: false, reason: `Evidence text drifted for ${evidence.sourceId}` };
}

const sceneLicenseCore = createSceneLicenseCore({
  repoRoot,
  semanticClasses: FRIENDS_SEMANTIC_CLASSES,
  servingStatuses: DEFAULT_SERVING_STATUSES,
  scopeRoles: SCOPE_ROLE,
  forbiddenClassesByScope: FORBIDDEN_CLASSES_BY_SCOPE,
  verifyEvidence,
  expectedSurface: "friends-transit",
  expectedSchemaVersion: 3,
  licenseIdPrefix: "scene-license/friends-transit/",
  writerInstruction: "Use only Friends-transit contextual meanings explicitly licensed in this packet. Rulership diagnostics grant no writing permission."
});

function validateFriendsLicenseRegistry(registry) {
  const base = sceneLicenseCore.validateLicenseRegistry(registry);
  const errors = [...base.errors];
  if (registry.policy?.sourceVocabularyStatus !== "matrix-supported/source-supported-pending-owner-approval") errors.push("Friends v3 source vocabulary status is invalid");
  if (registry.policy?.sourceRowApprovalTransfers !== false) errors.push("Friends v3 source-row approval must not transfer");
  if (registry.policy?.keywordMatchGrantsPermission !== false) errors.push("Friends v3 keyword matches must not grant permission");
  if (registry.policy?.causalStructureRequired !== true) errors.push("Friends v3 must require a house causal structure");
  for (const license of registry.licenses || []) {
    if (!license.causalStructure?.requiredMeaning || license.causalStructure.keywordMatchSufficient !== false) {
      errors.push(`${license.licenseId} must carry a fail-closed causal structure`);
    }
    if (license.sourceApprovalSummary?.sourceRowApprovalTransfers !== false) {
      errors.push(`${license.licenseId} cannot inherit source-row approval`);
    }
  }
  for (const guard of registry.ambiguityGuards || []) {
    if (!guard.guardId || !guard.term || guard.keywordMatchSufficient !== false || !guard.interpretations) {
      errors.push(`Invalid semantic ambiguity guard ${guard.guardId || "missing"}`);
    }
  }
  return { passed: errors.length === 0, errors, licenseCount: base.licenseCount };
}

function validateFriendsHouseSemanticGuard(claim, registry = readJson(defaultRegistryPath)) {
  const guard = (registry.ambiguityGuards || []).find((entry) => entry.guardId === claim?.guardId);
  if (!guard) return { passed: false, reason: "UNKNOWN_SEMANTIC_GUARD" };
  const interpretation = guard.interpretations?.[Number(claim.house)];
  if (!interpretation) return { passed: false, reason: "HOUSE_INTERPRETATION_NOT_LICENSED" };
  if (!claim.role || !claim.causalStructure) return { passed: false, reason: "KEYWORD_ONLY_HOUSE_CODING" };
  if (claim.role !== interpretation.allowedRole) return { passed: false, reason: "CROSS_HOUSE_GUARD_VIOLATION" };
  if (claim.causalStructure !== interpretation.requiredCausalStructure) return { passed: false, reason: "CAUSAL_STRUCTURE_MISMATCH" };
  return { passed: true, reason: null };
}

function friendsTransitContentKey(context) {
  if (!context || context.kind !== "aspect") return null;
  const transitPlanet = normalized(context.transitPlanet);
  const aspect = normalized(context.aspect);
  const natalPoint = normalized(context.natalPoint);
  return transitPlanet && aspect && natalPoint
    ? `authored/transit-aspect/${transitPlanet}/${natalPoint}/${aspect}`
    : null;
}

function normalizedContext(context) {
  const housesReliable = context.housesReliable === true;
  return {
    ...context,
    surface: "friends-transit",
    transitHouse: housesReliable ? context.transitHouse : null,
    natalHouse: housesReliable ? context.natalHouse : null,
    angleContext: housesReliable ? (context.angleContext || null) : null,
    rulershipDiagnostics: housesReliable ? (context.rulershipDiagnostics || null) : null
  };
}

function scopeMatches(scope, context) {
  if (scope.type === "aspect") {
    return normalized(scope.transitPlanet) === normalized(context.transitPlanet)
      && normalized(scope.aspect) === normalized(context.aspect)
      && normalized(scope.natalPoint) === normalized(context.natalPoint);
  }
  if (scope.type === "transit-house") {
    return context.housesReliable === true && Number(scope.house) === Number(context.transitHouse);
  }
  if (scope.type === "natal-house") {
    return context.housesReliable === true && Number(scope.house) === Number(context.natalHouse);
  }
  if (scope.type === "two-house-intersection") {
    return context.housesReliable === true
      && Number(scope.transitHouse) === Number(context.transitHouse)
      && Number(scope.natalHouse) === Number(context.natalHouse);
  }
  if (scope.type === "transit-sign") {
    return normalized(scope.transitPlanet) === normalized(context.transitPlanet)
      && normalized(scope.sign) === normalized(context.transitSign);
  }
  if (scope.type === "natal-sign") {
    return normalized(scope.natalPoint) === normalized(context.natalPoint)
      && normalized(scope.sign) === normalized(context.natalSign);
  }
  return false;
}

function applicationRoles(license) {
  if (license.scope.type === "transit-house") return ["trigger-house"];
  if (license.scope.type === "natal-house") return ["affected-house"];
  if (license.scope.type === "two-house-intersection") return ["trigger-house", "affected-house"];
  return [license.scope.type];
}

function compileFriendsTransitSceneContext(context, {
  mode = "production",
  registry = readJson(defaultRegistryPath)
} = {}) {
  if (!context || context.kind !== "aspect" || context.calculationResolved !== true) {
    throw new Error("FRIENDS_SCENE_CONTEXT_UNRESOLVED: a calculation-resolved Friends transit aspect context is required.");
  }
  if (!['production', 'review'].includes(mode)) throw new Error(`Unknown scene compiler mode ${mode}`);
  const registryValidation = validateFriendsLicenseRegistry(registry);
  if (!registryValidation.passed) {
    throw new Error(`Friends scene-license registry failed validation: ${registryValidation.errors.join("; ")}`);
  }

  const chartContext = normalizedContext(context);
  const matchedLicenses = (registry.licenses || []).filter((license) => scopeMatches(license.scope, chartContext));
  const executableLicenses = matchedLicenses.filter((license) => sceneLicenseCore.licenseAvailable(license));
  const permissions = sceneLicenseCore.collectPermissions(executableLicenses);
  const hasContextualPermissions = sceneLicenseCore.hasContextualPermissions(permissions);
  const reviewNeededLicenses = matchedLicenses
    .filter((license) => license.approval.status === "review_needed")
    .map((license) => license.licenseId);
  const canGenerateContextualCandidate = chartContext.housesReliable === true
    && hasContextualPermissions
    && mode === "production";

  return {
    schemaVersion: 1,
    packetType: "friends-transit-scene-context",
    mode,
    status: "UNAPPROVED",
    servingEligible: false,
    contentKey: friendsTransitContentKey(chartContext),
    chartContext,
    licenses: executableLicenses.map((license) => ({
      licenseId: license.licenseId,
      applicationRoles: applicationRoles(license),
      sourceIds: license.sourceIds,
      approval: license.approval,
      normalizedMeaning: license.normalizedMeaning,
      provenance: license.provenance
    })),
    reviewLicenses: mode === "review" ? matchedLicenses : [],
    permissions,
    hasContextualPermissions,
    reviewNeededLicenses,
    requiresOwnerLicenseApproval: reviewNeededLicenses.length > 0 || !hasContextualPermissions,
    requiresReliableHouses: chartContext.housesReliable !== true,
    canGenerateContextualCandidate,
    canUseUniversalBaseFallback: true,
    writerBoundary: sceneLicenseCore.writerBoundary(permissions, registry, canGenerateContextualCandidate),
    fallback: {
      selected: canGenerateContextualCandidate ? null : "universal-exact-aspect-base",
      contextualSceneAuthorized: canGenerateContextualCandidate
    },
    diagnostics: {
      housesReliable: chartContext.housesReliable,
      rulership: chartContext.rulershipDiagnostics,
      rulershipGrantsPermissions: false
    },
    governance: {
      writerOutputStatus: "PENDING OWNER",
      servingRowsMayChange: false,
      sourceApprovalInherited: false,
      unknownTimeBehavior: "remove house, angle, and rulership context; retain universal exact-aspect base fallback"
    }
  };
}

function loadWriterSceneContextForKey(key, contextDir, { registry = readJson(defaultRegistryPath) } = {}) {
  if (!contextDir) {
    throw new Error("SCENE_CONTEXT_REQUIRED: pass --scene-context-dir with one calculation-resolved Friends context per requested key.");
  }
  const slug = key.replace(/\//gu, "-");
  const contextPath = path.resolve(contextDir, `${slug}.context.json`);
  if (!fs.existsSync(contextPath)) {
    throw new Error(`SCENE_CONTEXT_REQUIRED: missing resolved context ${contextPath} for ${key}.`);
  }
  const context = readJson(contextPath);
  const resolvedKey = friendsTransitContentKey(context);
  if (resolvedKey !== key) {
    throw new Error(`SCENE_CONTEXT_KEY_MISMATCH: ${contextPath} resolves ${resolvedKey || "no key"}, expected ${key}.`);
  }
  const packet = compileFriendsTransitSceneContext(context, { mode: "production", registry });
  if (!packet.canGenerateContextualCandidate || !packet.writerBoundary.enabled) {
    throw new Error(`SCENE_LICENSE_APPROVAL_REQUIRED: ${key} has no explicitly owner-approved Friends writer-eligible scene license set.`);
  }
  return { contextPath, packet };
}

module.exports = {
  compileFriendsTransitSceneContext,
  friendsTransitContentKey,
  loadWriterSceneContextForKey,
  normalizedContext,
  validateFriendsHouseSemanticGuard,
  validateLicenseRegistry: validateFriendsLicenseRegistry
};
