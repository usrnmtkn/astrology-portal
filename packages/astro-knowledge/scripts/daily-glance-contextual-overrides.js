"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const defaultRegistryPath = path.join(
  packageRoot,
  "config",
  "daily-glance-contextual-overrides-v1.json"
);
const ELIGIBLE_STATUSES = new Set(["approved", "approved_reuse", "reviewed"]);
const CONTEXT_FIELDS = Object.freeze([
  "transitSign",
  "transitHouse",
  "natalSign",
  "natalHouse"
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedContentId(value) {
  return normalized(value).replace(/\s+/gu, "-");
}

function baseKeyForContext(context) {
  if (context?.kind !== "aspect") return null;
  return `${normalized(context.aspectGroup)}/${normalizedContentId(context.natalPoint)}`;
}

function selectorKey(entry) {
  return JSON.stringify({
    baseKey: normalized(entry.baseKey),
    when: Object.fromEntries(
      CONTEXT_FIELDS
        .filter((field) => entry.when?.[field] !== undefined)
        .map((field) => [field, typeof entry.when[field] === "string"
          ? normalized(entry.when[field])
          : entry.when[field]])
    )
  });
}

function approvalAllowsServing(entry) {
  return entry.approval?.ownerApproved === true
    && entry.approval?.exactWordingQuoted === true
    && entry.approval?.renderEligible === true
    && ELIGIBLE_STATUSES.has(normalized(entry.approval?.status))
    && typeof entry.approval?.approvalSource === "string"
    && entry.approval.approvalSource.trim().length > 0;
}

function validateDailyGlanceContextualOverrideRegistry(
  registry = readJson(defaultRegistryPath)
) {
  const errors = [];
  if (registry.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (registry.policy?.referenceOnly !== true) {
    errors.push("Contextual overrides must remain reference-only");
  }
  if (typeof registry.policy?.servingEnabled !== "boolean") {
    errors.push("policy.servingEnabled must be boolean");
  }
  const expectedPrecedence = [
    "two-house-intersection",
    "natal-house",
    "transit-house",
    "sign-specificity",
    "approved-base-card"
  ];
  if (JSON.stringify(registry.policy?.precedence) !== JSON.stringify(expectedPrecedence)) {
    errors.push("Contextual override precedence drifted");
  }

  const ids = new Set();
  const selectors = new Set();
  for (const entry of registry.overrides || []) {
    if (!entry.overrideId?.startsWith("daily-glance-context/")) {
      errors.push(`Invalid overrideId ${entry.overrideId}`);
    }
    if (ids.has(entry.overrideId)) errors.push(`Duplicate overrideId ${entry.overrideId}`);
    ids.add(entry.overrideId);

    if (!/^(conjunction|square|opposition|soft)\/[a-z0-9-]+$/u.test(entry.baseKey || "")) {
      errors.push(`${entry.overrideId} has invalid baseKey ${entry.baseKey}`);
    }
    const whenFields = CONTEXT_FIELDS.filter((field) => entry.when?.[field] !== undefined);
    if (whenFields.length === 0) errors.push(`${entry.overrideId} must declare contextual predicates`);
    for (const field of ["transitHouse", "natalHouse"]) {
      const value = entry.when?.[field];
      if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 12)) {
        errors.push(`${entry.overrideId} has invalid ${field} ${value}`);
      }
    }

    const signature = selectorKey(entry);
    if (selectors.has(signature)) errors.push(`${entry.overrideId} duplicates contextual selector ${signature}`);
    selectors.add(signature);

    if (!entry.headlineRef?.startsWith("fallback-hook/daily-headline/contextual/")) {
      errors.push(`${entry.overrideId} has invalid headlineRef`);
    }
    if (!entry.bodyRef?.startsWith("fallback-hook/daily-body/contextual/")) {
      errors.push(`${entry.overrideId} has invalid bodyRef`);
    }
    for (const forbidden of ["headline", "body", "text", "body_you", "body_they"]) {
      if (Object.hasOwn(entry, forbidden)) {
        errors.push(`${entry.overrideId} embeds ${forbidden}; overrides must reference canonical rows`);
      }
    }
    if (entry.approval?.renderEligible === true && !approvalAllowsServing(entry)) {
      errors.push(`${entry.overrideId} cannot render without quoted exact owner approval`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    overrideCount: ids.size,
    servingEnabled: registry.policy?.servingEnabled === true
  };
}

function validateDailyGlanceContextualOverrideReferences(registry, rows) {
  const errors = [];
  const rowMap = rows instanceof Map
    ? rows
    : new Map((rows || []).map((row) => [row.contentKey, row]));
  for (const entry of registry.overrides || []) {
    for (const [field, expectedRole] of [
      ["headlineRef", "fallback_hook"],
      ["bodyRef", "fallback_hook"]
    ]) {
      const contentKey = entry[field];
      const row = rowMap.get(contentKey);
      if (!row) {
        errors.push(`${entry.overrideId} references missing row ${contentKey}`);
        continue;
      }
      if (row.content_role !== expectedRole) {
        errors.push(`${entry.overrideId} reference ${contentKey} must be ${expectedRole}`);
      }
      if (approvalAllowsServing(entry) && !ELIGIBLE_STATUSES.has(normalized(row.review_status))) {
        errors.push(`${entry.overrideId} cannot serve review-gated row ${contentKey}`);
      }
    }
  }
  return { passed: errors.length === 0, errors };
}

function matchesContext(entry, context) {
  if (normalized(entry.baseKey) !== baseKeyForContext(context)) return false;
  if (context.housesReliable !== true && (
    entry.when.transitHouse !== undefined || entry.when.natalHouse !== undefined
  )) return false;

  return CONTEXT_FIELDS.every((field) => {
    const expected = entry.when?.[field];
    if (expected === undefined) return true;
    const actual = context[field];
    return typeof expected === "string"
      ? normalized(actual) === normalized(expected)
      : Number(actual) === Number(expected);
  });
}

function precedenceRank(entry) {
  const hasTransitHouse = entry.when.transitHouse !== undefined;
  const hasNatalHouse = entry.when.natalHouse !== undefined;
  const houseTier = hasTransitHouse && hasNatalHouse
    ? 3
    : hasNatalHouse
      ? 2
      : hasTransitHouse
        ? 1
        : 0;
  const signSpecificity = Number(entry.when.transitSign !== undefined)
    + Number(entry.when.natalSign !== undefined);
  const predicateCount = CONTEXT_FIELDS.filter((field) => entry.when[field] !== undefined).length;
  return [houseTier, signSpecificity, predicateCount];
}

function compareRank(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return right[index] - left[index];
  }
  return 0;
}

function resolveDailyGlanceContextualOverride(
  context,
  {
    mode = "serving",
    registry = readJson(defaultRegistryPath)
  } = {}
) {
  if (!context || context.kind !== "aspect") {
    return { baseKey: baseKeyForContext(context), selected: null, fallback: "approved-base-card" };
  }
  if (!["review", "serving"].includes(mode)) throw new Error(`Unknown contextual override mode ${mode}`);
  const validation = validateDailyGlanceContextualOverrideRegistry(registry);
  if (!validation.passed) {
    throw new Error(`Contextual override registry failed validation: ${validation.errors.join("; ")}`);
  }

  const candidates = (registry.overrides || [])
    .filter((entry) => matchesContext(entry, context))
    .filter((entry) => mode === "review" || (
      registry.policy.servingEnabled === true && approvalAllowsServing(entry)
    ))
    .map((entry) => ({ entry, rank: precedenceRank(entry) }))
    .sort((left, right) => compareRank(left.rank, right.rank));

  if (candidates.length > 1 && compareRank(candidates[0].rank, candidates[1].rank) === 0) {
    throw new Error(
      `AMBIGUOUS_CONTEXTUAL_OVERRIDE: ${candidates[0].entry.overrideId} and ${candidates[1].entry.overrideId}`
    );
  }

  return {
    baseKey: baseKeyForContext(context),
    selected: candidates[0]?.entry || null,
    fallback: "approved-base-card"
  };
}

module.exports = {
  approvalAllowsServing,
  baseKeyForContext,
  matchesContext,
  precedenceRank,
  resolveDailyGlanceContextualOverride,
  validateDailyGlanceContextualOverrideReferences,
  validateDailyGlanceContextualOverrideRegistry
};
