"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const defaultRegistryPath = path.join(packageRoot, "config", "daily-glance-scene-licenses-v1.json");
const llMatrixPath = path.join(packageRoot, "voice", "tldr-astro", "satori-writer", "ll-matrix-v13", "ll-matrix-v13.json");
const pairRoot = path.join(packageRoot, "data", "pairs");

const SERVING_STATUSES = new Set(["approved", "approved_reuse", "reviewed"]);
const SEMANTIC_CLASSES = Object.freeze([
  "domains",
  "roles",
  "settings",
  "objects",
  "actions",
  "behaviors",
  "consequences"
]);
const SCOPE_ROLE = Object.freeze({
  aspect: "mechanism",
  house: "arena",
  "transit-sign": "manner",
  "natal-sign": "manner"
});
const FORBIDDEN_CLASSES_BY_SCOPE = Object.freeze({
  aspect: ["domains", "roles", "settings", "objects"],
  house: ["behaviors", "consequences"],
  "transit-sign": ["domains", "roles", "settings", "objects", "consequences"],
  "natal-sign": ["domains", "roles", "settings", "objects", "consequences"]
});
const ASPECT_GRAMMAR = Object.freeze({
  conjunction: {
    id: "conjunction-saturation",
    sequence: ["observable input", "functions merge or saturate one another", "reader experiences the combined state"],
    invariant: "A scene actor may supply observable input, but the pressure must merge inside the reader rather than borrow opposition grammar."
  },
  square: {
    id: "square-self-friction",
    sequence: ["competing internal pressures become visible", "friction blocks or complicates the day", "reader makes a small adjustment"],
    invariant: "Friction remains internal to the reader's own day."
  },
  opposition: {
    id: "opposition-other-friction",
    sequence: ["another person or pole carries the reverse side", "the polarity becomes visible", "reader responds to the tension between sides"],
    invariant: "Externalization is licensed by the opposition, not merely by the presence of a scene actor."
  },
  soft: {
    id: "soft-availability",
    sequence: ["a supportive opening appears", "the two functions cooperate more readily", "use remains the reader's choice"],
    invariant: "Do not manufacture conflict merely to make the scene interesting."
  }
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function exactLlKey(context) {
  return context.kind === "aspect"
    ? `${normalized(context.transitPlanet)}|${normalized(context.aspect)}|${normalized(context.natalPoint)}`
    : null;
}

function getApprovedLlMechanism(context, matrix = readJson(llMatrixPath)) {
  const key = exactLlKey(context);
  if (!key) return null;
  const row = (matrix.rows || []).find((entry) => normalized(entry.key) === key);
  if (!row || row.ownerApproved !== true || !row.copy) return null;
  return {
    sourceId: `ll:${row.key}`,
    sourcePath: path.relative(repoRoot, llMatrixPath),
    selector: `rows[key=${row.key}]`,
    text: row.copy,
    sourceApproval: "approved",
    provenanceTier: "exact-approved-ll-aspect-or-placement"
  };
}

function getPairMechanism(context) {
  if (context.kind !== "aspect") return null;
  const transit = normalized(context.transitPlanet);
  const natal = normalized(context.natalPoint);
  const candidates = [path.join(pairRoot, `${transit}-${natal}.json`), path.join(pairRoot, `${natal}-${transit}.json`)];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) return null;
  const row = readJson(filePath);
  const selector = context.aspectGroup === "conjunction"
    ? "modern.blend"
    : context.aspectGroup === "soft"
      ? "modern.harmonious"
      : "modern.hard";
  const text = selector.split(".").reduce((value, part) => value?.[part], row);
  if (!text) return null;
  const sourceApproval = SERVING_STATUSES.has(normalized(row.status)) ? "approved" : "draft";
  return {
    sourceId: `pair:${row.id}#${selector}`,
    sourcePath: path.relative(repoRoot, filePath),
    selector,
    text,
    sourceApproval,
    provenanceTier: "approved-pair-store-and-aspect-group"
  };
}

function verifyEvidence(evidence) {
  const absolute = path.join(repoRoot, evidence.sourcePath);
  if (!fs.existsSync(absolute)) return { passed: false, reason: `Missing source ${evidence.sourcePath}` };
  const source = readJson(absolute);
  const llMatch = evidence.selector.match(/^rows\[key=(.+)\]$/u);
  if (!llMatch) return { passed: false, reason: `Unsupported evidence selector ${evidence.selector}` };
  const row = (source.rows || []).find((entry) => entry.key === llMatch[1]);
  if (!row) return { passed: false, reason: `Missing evidence row ${llMatch[1]}` };
  const evidenceMatches = evidence.match === "includes"
    ? row.copy.includes(evidence.text)
    : row.copy === evidence.text;
  if (!evidenceMatches) return { passed: false, reason: `Evidence text drifted for ${evidence.sourceId}` };
  if (evidence.sourceApproval === "approved" && row.ownerApproved !== true) {
    return { passed: false, reason: `Evidence ${evidence.sourceId} is no longer owner-approved` };
  }
  return { passed: true };
}

function verifyAuthoritySource(source) {
  if (source.authorityClass !== "owner-doctrine") {
    return { passed: false, reason: `${source.sourceId} must identify owner doctrine` };
  }
  if (!source.sourceId?.startsWith("owner-doctrine:")) {
    return { passed: false, reason: `${source.sourceId} must use the owner-doctrine source namespace` };
  }
  if (source.approval !== "approved") {
    return { passed: false, reason: `${source.sourceId} is not approved owner doctrine` };
  }
  const absolute = path.join(repoRoot, source.sourcePath);
  if (!fs.existsSync(absolute)) return { passed: false, reason: `Missing owner-doctrine source ${source.sourcePath}` };
  const text = fs.readFileSync(absolute, "utf8");
  if (!text.includes(source.verificationText)) {
    return { passed: false, reason: `Owner-doctrine verification text drifted for ${source.sourceId}` };
  }
  return { passed: true };
}

function provenanceKey(semanticClass, value) {
  return `${semanticClass}\u0000${value}`;
}

function validateScopeBoundary(license, errors) {
  const type = license.scope?.type;
  const expectedRole = SCOPE_ROLE[type];
  if (!expectedRole) {
    errors.push(`${license.licenseId} has unsupported scope type ${type}`);
    return;
  }
  for (const semanticClass of FORBIDDEN_CLASSES_BY_SCOPE[type] || []) {
    if ((license.normalizedMeaning?.[semanticClass] || []).length > 0) {
      errors.push(`${license.licenseId} cannot carry ${semanticClass}; ${type} licenses ${expectedRole}`);
    }
  }
  for (const grant of license.provenance || []) {
    if (grant.scopeRole !== expectedRole) {
      errors.push(`${license.licenseId} provenance for ${grant.semanticClass}:${grant.value} must use scopeRole ${expectedRole}`);
    }
  }
}

function validateLicenseRegistry(registry) {
  const errors = [];
  if (registry.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (registry.policy?.unknownConcreteTerm !== "block") errors.push("Pilot must use closed-vocabulary block mode");
  const authoritySources = new Map();
  for (const source of registry.authoritySources || []) {
    if (authoritySources.has(source.sourceId)) errors.push(`Duplicate authority source ${source.sourceId}`);
    authoritySources.set(source.sourceId, source);
    const verified = verifyAuthoritySource(source);
    if (!verified.passed) errors.push(verified.reason);
  }
  const ids = new Set();
  for (const license of registry.licenses || []) {
    if (!license.licenseId?.startsWith("scene-license/")) errors.push(`Invalid licenseId ${license.licenseId}`);
    if (ids.has(license.licenseId)) errors.push(`Duplicate licenseId ${license.licenseId}`);
    ids.add(license.licenseId);
    if (license.approval?.inheritsSourceApproval !== false) errors.push(`${license.licenseId} must not inherit source approval`);
    if (license.approval?.writerEligible && (!license.approval.ownerApproved || !SERVING_STATUSES.has(license.approval.status))) {
      errors.push(`${license.licenseId} cannot be writerEligible without explicit owner approval`);
    }
    if (license.approval?.renderEligible !== false) {
      errors.push(`${license.licenseId} must remain render-ineligible because a license is not reader prose`);
    }
    const evidenceById = new Map((license.evidence || []).map((entry) => [entry.sourceId, entry]));
    const evidenceIds = new Set(evidenceById.keys());
    const availableSourceIds = new Set([...evidenceIds, ...authoritySources.keys()]);
    for (const sourceId of license.sourceIds || []) {
      if (!availableSourceIds.has(sourceId)) errors.push(`${license.licenseId} lacks evidence or owner doctrine for ${sourceId}`);
    }
    for (const evidence of license.evidence || []) {
      const verified = verifyEvidence(evidence);
      if (!verified.passed) errors.push(`${license.licenseId}: ${verified.reason}`);
    }
    const provenanceByMeaning = new Map();
    for (const grant of license.provenance || []) {
      const key = provenanceKey(grant.semanticClass, grant.value);
      if (provenanceByMeaning.has(key)) errors.push(`${license.licenseId} duplicates provenance for ${grant.semanticClass}:${grant.value}`);
      provenanceByMeaning.set(key, grant);
      if (!(license.normalizedMeaning?.[grant.semanticClass] || []).includes(grant.value)) {
        errors.push(`${license.licenseId} has orphan provenance for ${grant.semanticClass}:${grant.value}`);
      }
      for (const sourceId of grant.sourceIds || []) {
        if (!availableSourceIds.has(sourceId)) {
          errors.push(`${license.licenseId} provenance for ${grant.semanticClass}:${grant.value} cites unknown source ${sourceId}`);
        }
      }
      if (grant.grantType.startsWith("normalized")) {
        const doctrineIds = (grant.sourceIds || []).filter((sourceId) => authoritySources.get(sourceId)?.authorityClass === "owner-doctrine");
        if (doctrineIds.length === 0) {
          errors.push(`${license.licenseId} normalized grant ${grant.semanticClass}:${grant.value} must cite an owner-doctrine source ID`);
        }
      }
      if (grant.grantType === "verbatim") {
        const supportingEvidence = (grant.sourceIds || []).map((sourceId) => evidenceById.get(sourceId)).filter(Boolean);
        if (!supportingEvidence.some((evidence) => normalized(evidence.text).includes(normalized(grant.value)))) {
          errors.push(`${license.licenseId} verbatim grant ${grant.semanticClass}:${grant.value} is not literal in its cited matrix evidence`);
        }
      }
    }
    for (const semanticClass of SEMANTIC_CLASSES) {
      const vocabulary = registry.closedVocabulary?.[semanticClass] || {};
      for (const value of license.normalizedMeaning?.[semanticClass] || []) {
        if (!vocabulary[value]) errors.push(`${license.licenseId} uses unregistered ${semanticClass} value ${JSON.stringify(value)}`);
        if (!provenanceByMeaning.has(provenanceKey(semanticClass, value))) {
          errors.push(`${license.licenseId} lacks value-level provenance for ${semanticClass}:${value}`);
        }
      }
    }
    validateScopeBoundary(license, errors);
  }
  return { passed: errors.length === 0, errors, licenseCount: ids.size };
}

function scopeMatches(scope, context) {
  if (scope.type === "aspect") {
    return context.kind === "aspect"
      && normalized(scope.transitPlanet) === normalized(context.transitPlanet)
      && normalized(scope.aspect) === normalized(context.aspect)
      && normalized(scope.natalPoint) === normalized(context.natalPoint);
  }
  if (scope.type === "house") {
    return context.housesReliable === true
      && (Number(scope.house) === Number(context.transitHouse) || Number(scope.house) === Number(context.natalHouse));
  }
  if (scope.type === "transit-sign") {
    return normalized(scope.transitPlanet) === normalized(context.transitPlanet)
      && normalized(scope.sign) === normalized(context.transitSign);
  }
  if (scope.type === "natal-sign") {
    return context.kind === "aspect"
      && normalized(scope.natalPoint || context.natalPoint) === normalized(context.natalPoint)
      && normalized(scope.sign) === normalized(context.natalSign);
  }
  return false;
}

function applicationRoles(license, context) {
  if (license.scope.type !== "house") return [license.scope.type];
  const roles = [];
  if (Number(license.scope.house) === Number(context.transitHouse)) roles.push("trigger-house");
  if (Number(license.scope.house) === Number(context.natalHouse)) roles.push("affected-house");
  return roles;
}

function licenseAvailable(license, mode) {
  return license.approval.ownerApproved === true
    && license.approval.writerEligible === true
    && SERVING_STATUSES.has(license.approval.status);
}

function addPermission(map, semanticClass, value, license, grant) {
  if (!map[semanticClass][value]) map[semanticClass][value] = { sourceIds: [], licenseIds: [] };
  map[semanticClass][value].sourceIds.push(...grant.sourceIds);
  map[semanticClass][value].licenseIds.push(license.licenseId);
  map[semanticClass][value].sourceIds = [...new Set(map[semanticClass][value].sourceIds)];
  map[semanticClass][value].licenseIds = [...new Set(map[semanticClass][value].licenseIds)];
}

function writerBoundary(permissions, registry, enabled) {
  const allowed = Object.fromEntries(SEMANTIC_CLASSES.map((semanticClass) => [semanticClass, Object.entries(permissions[semanticClass]).map(([value, provenance]) => ({ value, ...provenance }))]));
  const doNotInvent = Object.fromEntries(SEMANTIC_CLASSES.map((semanticClass) => [
    semanticClass,
    Object.keys(registry.closedVocabulary?.[semanticClass] || {}).filter((value) => !permissions[semanticClass][value])
  ]));
  return {
    enabled,
    instruction: enabled
      ? "Use only the licensed domains, roles, settings, objects, actions, behaviors, and consequences below. Aspect licenses mechanism, house licenses arena, and sign licenses manner. A scene actor never changes the aspect group. Do not add a concrete detail because it sounds plausible."
      : "No contextual writing is authorized. Use the approved fallback selected by the resolver.",
    allowed,
    doNotInvent,
    outputContract: {
      approvalStatus: "UNAPPROVED",
      requireSpecificityClaims: true,
      independentRenderedProseScan: true,
      unknownConcreteTerm: registry.policy.unknownConcreteTerm
    }
  };
}

function compileSceneContext(context, { mode = "production", registry = readJson(defaultRegistryPath) } = {}) {
  if (!context || !["aspect", "house"].includes(context.kind)) throw new Error("Daily Glance chart context is required.");
  if (!['production', 'review'].includes(mode)) throw new Error(`Unknown scene compiler mode ${mode}`);
  const registryValidation = validateLicenseRegistry(registry);
  if (!registryValidation.passed) throw new Error(`Scene-license registry failed validation: ${registryValidation.errors.join("; ")}`);

  const exact = getApprovedLlMechanism(context);
  const pair = exact ? null : getPairMechanism(context);
  const pairApproved = pair?.sourceApproval === "approved" ? pair : null;
  const mechanism = exact || pairApproved || null;
  const matchedLicenses = (registry.licenses || []).filter((license) => scopeMatches(license.scope, context));
  const executableLicenses = matchedLicenses.filter((license) => licenseAvailable(license, mode));
  const permissions = Object.fromEntries(SEMANTIC_CLASSES.map((semanticClass) => [semanticClass, {}]));
  for (const license of executableLicenses) {
    for (const semanticClass of SEMANTIC_CLASSES) {
      for (const value of license.normalizedMeaning?.[semanticClass] || []) {
        const grant = license.provenance.find((entry) => entry.semanticClass === semanticClass && entry.value === value);
        addPermission(permissions, semanticClass, value, license, grant);
      }
    }
  }

  const hasContextualPermissions = SEMANTIC_CLASSES.some((semanticClass) => Object.keys(permissions[semanticClass]).length > 0);
  const fallback = context.kind === "house"
    ? { selected: "approved-moon-house-card", mayUseAspectHouseFallback: false }
    : { selected: "approved-base-aspect-target-card", mayUseAspectHouseFallback: false };
  const reviewNeededLicenses = matchedLicenses.filter((license) => license.approval.status === "review_needed").map((license) => license.licenseId);
  const canGenerateContextualCandidate = Boolean((context.kind === "house" || mechanism) && hasContextualPermissions && mode === "production");
  return {
    schemaVersion: 1,
    packetType: "daily-glance-scene-context",
    mode,
    status: "UNAPPROVED",
    servingEligible: false,
    chartContext: context,
    mechanism: mechanism || {
      sourceId: null,
      text: null,
      sourceApproval: null,
      provenanceTier: "base-card-only",
      reason: pair && pair.sourceApproval !== "approved"
        ? `Pair mechanism ${pair.sourceId} is ${pair.sourceApproval}; it grants no executable scene permission.`
        : "No approved exact LL or pair-store mechanism exists."
    },
    aspectGrammar: context.kind === "aspect" ? ASPECT_GRAMMAR[context.aspectGroup] : null,
    licenses: executableLicenses.map((license) => ({
      licenseId: license.licenseId,
      applicationRoles: applicationRoles(license, context),
      sourceIds: license.sourceIds,
      approval: license.approval,
      normalizedMeaning: license.normalizedMeaning,
      provenance: license.provenance
    })),
    reviewLicenses: mode === "review" ? matchedLicenses.map((license) => ({
      licenseId: license.licenseId,
      applicationRoles: applicationRoles(license, context),
      sourceIds: license.sourceIds,
      approval: license.approval,
      normalizedMeaning: license.normalizedMeaning,
      provenance: license.provenance
    })) : [],
    permissions,
    hasContextualPermissions,
    reviewNeededLicenses,
    requiresOwnerLicenseApproval: reviewNeededLicenses.length > 0,
    canGenerateContextualCandidate,
    writerBoundary: writerBoundary(permissions, registry, canGenerateContextualCandidate),
    fallback,
    governance: {
      writerOutputStatus: "UNAPPROVED",
      servingRowsMayChange: false,
      sourceApprovalInherited: false,
      unapprovedLlExecutable: false,
      missingHouseBehavior: "remove all house-derived licenses and use the approved base aspect/target card"
    }
  };
}

function dailyGlanceKeyForContext(context) {
  if (context?.kind === "house") return `house/${context.transitHouse}`;
  if (context?.kind === "aspect") return `${context.aspectGroup}/${normalized(context.natalPoint)}`;
  return null;
}

function loadWriterSceneContextForKey(key, contextDir, { registry = readJson(defaultRegistryPath) } = {}) {
  if (!contextDir) {
    throw new Error("SCENE_CONTEXT_REQUIRED: pass --scene-context-dir with one calculation-resolved context per requested key.");
  }
  const slug = key.replace(/\//gu, "-");
  const contextPath = path.resolve(contextDir, `${slug}.context.json`);
  if (!fs.existsSync(contextPath)) {
    throw new Error(`SCENE_CONTEXT_REQUIRED: missing resolved context ${contextPath} for ${key}.`);
  }
  const context = readJson(contextPath);
  const resolvedKey = dailyGlanceKeyForContext(context);
  if (resolvedKey !== key) {
    throw new Error(`SCENE_CONTEXT_KEY_MISMATCH: ${contextPath} resolves ${resolvedKey || "no key"}, expected ${key}.`);
  }
  const packet = compileSceneContext(context, { mode: "production", registry });
  if (!packet.canGenerateContextualCandidate || !packet.writerBoundary.enabled) {
    throw new Error(`SCENE_LICENSE_APPROVAL_REQUIRED: ${key} has no explicitly owner-approved writer-eligible scene license set.`);
  }
  return { contextPath, packet };
}

function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/\s+/gu, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "giu");
}

function scanRecognizedSpecificity(text, registry) {
  const matches = [];
  for (const semanticClass of SEMANTIC_CLASSES) {
    for (const [value, terms] of Object.entries(registry.closedVocabulary?.[semanticClass] || {})) {
      for (const term of [...terms].sort((left, right) => right.length - left.length)) {
        if (termPattern(term).test(text)) matches.push({ semanticClass, value, term });
      }
    }
  }
  return matches.filter((entry, index, all) => all.findIndex((other) => other.semanticClass === entry.semanticClass && other.value === entry.value && other.term === entry.term) === index);
}

const UNKNOWN_NOUN_STOP = new Set([
  "actual", "after", "again", "and", "another", "as", "available", "be", "been", "before", "being", "but", "can", "combined", "completed", "could", "did", "different", "do", "does", "earlier", "enough", "evaluated", "every", "explains", "first", "for", "from", "had", "has", "have", "if", "in", "into", "is", "may", "might", "missing", "must", "named", "next", "no", "not", "of", "old", "on", "only", "open", "or", "other", "own", "private", "professional", "public", "same", "seems", "should", "single", "small", "so", "still", "that", "then", "their", "to", "unexplained", "vague", "was", "were", "what", "when", "while", "who", "whole", "will", "with", "without", "would", "worried", "yet", "your"
]);
const GENERIC_NOUNS = new Set([
  "answer", "attention", "change", "concern", "day", "decision", "detail", "details", "explanation", "feeling", "facts", "hour", "impression", "moment", "mood", "person", "problem", "question", "reader", "response", "situation", "state", "thing", "time", "uncertainty", "version", "way", "work"
]);

function normalizeScannerToken(value) {
  return normalized(value)
    .replace(/[’']s$/u, "")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function scanUnknownConcretePhrases(text, recognized) {
  const recognizedTokens = new Set(recognized.flatMap((entry) => normalized(entry.term)
    .split(/\s+/u)
    .map(normalizeScannerToken)
    .filter(Boolean)));
  const phrases = [];
  const pattern = /\b(?:a|an|the|this|that|your|their|one|another)\s+([\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,1})/giu;
  for (const match of text.matchAll(pattern)) {
    const words = normalized(match[1])
      .split(/\s+/u)
      .map(normalizeScannerToken)
      .filter((word) => word && !UNKNOWN_NOUN_STOP.has(word));
    // English noun phrases put their head at the end. Using the first token
    // misclassified possessors, modal auxiliaries, and adjective modifiers as
    // nouns (for example manager's, will, and unexplained).
    const head = words.at(-1) || "";
    if (!head || GENERIC_NOUNS.has(head)) continue;
    if (recognizedTokens.has(head)) continue;
    phrases.push(head);
  }
  return [...new Set(phrases)];
}

function validateSpecificityCandidate(candidate, packet, { registry = readJson(defaultRegistryPath), closedVocabulary = true } = {}) {
  const text = `${candidate.headline || ""} ${candidate.body || ""}`.trim();
  const declaredFailures = [];
  for (const claim of candidate.specificityClaims || []) {
    const permission = packet.permissions?.[claim.semanticClass]?.[claim.value];
    if (!permission) {
      declaredFailures.push({ type: "unlicensed-declared-claim", claim });
      continue;
    }
    const invalidSources = (claim.sourceIds || []).filter((sourceId) => !permission.sourceIds.includes(sourceId));
    if (!claim.sourceIds?.length || invalidSources.length) {
      declaredFailures.push({ type: "invalid-declared-provenance", claim, invalidSources });
    }
  }

  const recognized = scanRecognizedSpecificity(text, registry);
  const unsupportedRecognized = recognized.filter((entry) => !packet.permissions?.[entry.semanticClass]?.[entry.value]);
  const unknownConcretePhrases = closedVocabulary ? scanUnknownConcretePhrases(text, recognized) : [];
  const failures = [
    ...declaredFailures,
    ...unsupportedRecognized.map((entry) => ({ type: "unsupported-recognized-specificity", ...entry })),
    ...unknownConcretePhrases.map((phrase) => ({ type: "unknown-concrete-phrase", phrase }))
  ];
  return {
    schemaVersion: 1,
    passed: failures.length === 0,
    closedVocabulary,
    declaredClaimsChecked: (candidate.specificityClaims || []).length,
    recognized,
    unsupportedRecognized,
    unknownConcretePhrases,
    failures
  };
}

module.exports = {
  ASPECT_GRAMMAR,
  compileSceneContext,
  dailyGlanceKeyForContext,
  exactLlKey,
  getApprovedLlMechanism,
  getPairMechanism,
  loadWriterSceneContextForKey,
  scanRecognizedSpecificity,
  scanUnknownConcretePhrases,
  validateLicenseRegistry,
  validateSpecificityCandidate
};
