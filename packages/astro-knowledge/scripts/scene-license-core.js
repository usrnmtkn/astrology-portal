"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_SEMANTIC_CLASSES = Object.freeze([
  "domains",
  "roles",
  "settings",
  "objects",
  "actions",
  "behaviors",
  "consequences"
]);
const DEFAULT_SERVING_STATUSES = Object.freeze(["approved", "approved_reuse", "reviewed"]);

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function provenanceKey(semanticClass, value) {
  return `${semanticClass}\u0000${value}`;
}

function createSceneLicenseCore({
  repoRoot,
  semanticClasses = DEFAULT_SEMANTIC_CLASSES,
  servingStatuses = DEFAULT_SERVING_STATUSES,
  scopeRoles,
  forbiddenClassesByScope,
  verifyEvidence,
  expectedSurface = null,
  expectedSchemaVersion = 1,
  licenseIdPrefix = "scene-license/",
  writerInstruction = "Use only the licensed contextual meaning below.",
  fallbackInstruction = "No contextual writing is authorized. Use the approved fallback selected by the resolver."
}) {
  if (!repoRoot) throw new Error("scene-license core requires repoRoot");
  if (!scopeRoles) throw new Error("scene-license core requires scopeRoles");
  if (!forbiddenClassesByScope) throw new Error("scene-license core requires forbiddenClassesByScope");
  if (typeof verifyEvidence !== "function") throw new Error("scene-license core requires verifyEvidence");

  const serving = new Set(servingStatuses);

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

  function validateScopeBoundary(license, errors) {
    const type = license.scope?.type;
    const expectedRole = scopeRoles[type];
    if (!expectedRole) {
      errors.push(`${license.licenseId} has unsupported scope type ${type}`);
      return;
    }
    for (const semanticClass of forbiddenClassesByScope[type] || []) {
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
    if (registry.schemaVersion !== expectedSchemaVersion) errors.push(`schemaVersion must be ${expectedSchemaVersion}`);
    if (expectedSurface && registry.surface !== expectedSurface) {
      errors.push(`Registry surface must be ${expectedSurface}; found ${registry.surface || "missing"}`);
    }
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
      if (!license.licenseId?.startsWith(licenseIdPrefix)) {
        errors.push(`Invalid licenseId ${license.licenseId}; expected prefix ${licenseIdPrefix}`);
      }
      if (ids.has(license.licenseId)) errors.push(`Duplicate licenseId ${license.licenseId}`);
      ids.add(license.licenseId);
      if (license.approval?.inheritsSourceApproval !== false) errors.push(`${license.licenseId} must not inherit source approval`);
      if (license.approval?.writerEligible && (!license.approval.ownerApproved || !serving.has(license.approval.status))) {
        errors.push(`${license.licenseId} cannot be writerEligible without explicit owner approval`);
      }
      if (license.approval?.renderEligible !== false) {
        errors.push(`${license.licenseId} must remain render-ineligible because a license is not reader prose`);
      }
      const evidenceById = new Map((license.evidence || []).map((entry) => [entry.sourceId, entry]));
      const availableSourceIds = new Set([...evidenceById.keys(), ...authoritySources.keys()]);
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
      for (const semanticClass of semanticClasses) {
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

  function licenseAvailable(license) {
    return license.approval.ownerApproved === true
      && license.approval.writerEligible === true
      && serving.has(license.approval.status);
  }

  function emptyPermissions() {
    return Object.fromEntries(semanticClasses.map((semanticClass) => [semanticClass, {}]));
  }

  function collectPermissions(licenses) {
    const permissions = emptyPermissions();
    for (const license of licenses) {
      for (const semanticClass of semanticClasses) {
        for (const value of license.normalizedMeaning?.[semanticClass] || []) {
          const grant = license.provenance.find((entry) => entry.semanticClass === semanticClass && entry.value === value);
          if (!permissions[semanticClass][value]) permissions[semanticClass][value] = { sourceIds: [], licenseIds: [] };
          permissions[semanticClass][value].sourceIds.push(...grant.sourceIds);
          permissions[semanticClass][value].licenseIds.push(license.licenseId);
          permissions[semanticClass][value].sourceIds = [...new Set(permissions[semanticClass][value].sourceIds)];
          permissions[semanticClass][value].licenseIds = [...new Set(permissions[semanticClass][value].licenseIds)];
        }
      }
    }
    return permissions;
  }

  function hasContextualPermissions(permissions) {
    return semanticClasses.some((semanticClass) => Object.keys(permissions[semanticClass]).length > 0);
  }

  function writerBoundary(permissions, registry, enabled) {
    const allowed = Object.fromEntries(semanticClasses.map((semanticClass) => [
      semanticClass,
      Object.entries(permissions[semanticClass]).map(([value, provenance]) => ({ value, ...provenance }))
    ]));
    const doNotInvent = Object.fromEntries(semanticClasses.map((semanticClass) => [
      semanticClass,
      Object.keys(registry.closedVocabulary?.[semanticClass] || {}).filter((value) => !permissions[semanticClass][value])
    ]));
    return {
      enabled,
      instruction: enabled ? writerInstruction : fallbackInstruction,
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

  function termPattern(term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/\s+/gu, "\\s+");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "giu");
  }

  function scanRecognizedSpecificity(text, registry) {
    const matches = [];
    for (const semanticClass of semanticClasses) {
      for (const [value, terms] of Object.entries(registry.closedVocabulary?.[semanticClass] || {})) {
        for (const term of [...terms].sort((left, right) => right.length - left.length)) {
          if (termPattern(term).test(text)) matches.push({ semanticClass, value, term });
        }
      }
    }
    return matches.filter((entry, index, all) => all.findIndex((other) => other.semanticClass === entry.semanticClass && other.value === entry.value && other.term === entry.term) === index);
  }

  const unknownNounStop = new Set([
    "actual", "after", "again", "and", "another", "as", "available", "be", "been", "before", "being", "but", "can", "combined", "completed", "could", "did", "different", "do", "does", "earlier", "enough", "evaluated", "every", "explains", "first", "for", "from", "had", "has", "have", "if", "in", "into", "is", "may", "might", "missing", "must", "named", "next", "no", "not", "of", "old", "on", "only", "open", "or", "other", "own", "private", "professional", "public", "same", "seems", "should", "single", "small", "so", "still", "that", "then", "their", "to", "unexplained", "vague", "was", "were", "what", "when", "while", "who", "whole", "will", "with", "without", "would", "worried", "yet", "your"
  ]);
  const genericNouns = new Set([
    "answer", "attention", "change", "concern", "day", "decision", "detail", "details", "explanation", "feeling", "facts", "hour", "impression", "moment", "mood", "person", "problem", "question", "reader", "response", "situation", "state", "thing", "time", "uncertainty", "version", "way", "work"
  ]);

  function normalizeScannerToken(value) {
    return normalized(value).replace(/[’']s$/u, "").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  }

  function scanUnknownConcretePhrases(text, recognized) {
    const recognizedTokens = new Set(recognized.flatMap((entry) => normalized(entry.term)
      .split(/\s+/u)
      .map(normalizeScannerToken)
      .filter(Boolean)));
    const phrases = [];
    const pattern = /\b(?:a|an|the|this|that|your|their|one|another)\s+([\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,1})/giu;
    for (const match of text.matchAll(pattern)) {
      const words = normalized(match[1]).split(/\s+/u).map(normalizeScannerToken).filter((word) => word && !unknownNounStop.has(word));
      const head = words.at(-1) || "";
      if (!head || genericNouns.has(head) || recognizedTokens.has(head)) continue;
      phrases.push(head);
    }
    return [...new Set(phrases)];
  }

  function validateSpecificityCandidate(candidate, packet, { registry, closedVocabulary = true } = {}) {
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

  return {
    collectPermissions,
    emptyPermissions,
    hasContextualPermissions,
    licenseAvailable,
    scanRecognizedSpecificity,
    scanUnknownConcretePhrases,
    validateLicenseRegistry,
    validateSpecificityCandidate,
    writerBoundary
  };
}

module.exports = {
  DEFAULT_SEMANTIC_CLASSES,
  DEFAULT_SERVING_STATUSES,
  createSceneLicenseCore,
  normalized
};
