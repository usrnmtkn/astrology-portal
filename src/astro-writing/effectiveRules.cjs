"use strict";

const REGISTRY_PATH = "config/writing-effective-rules-v1.json";
const REGISTRY = require("../../config/writing-effective-rules-v1.json");
const VALID_TIERS = new Set(["blocking", "advisory", "retired"]);
const VALID_SURFACES = new Set(["all", "generic", "daily", "card", "sky-placement-page", "friends-transit", "synastry", "article"]);

function assertStringList(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`EFFECTIVE_RULE_REGISTRY_INVALID:${label}`);
  }
}

function validateEffectiveRuleRegistry(registry = REGISTRY) {
  if (!registry || registry.schemaVersion !== 1 || typeof registry.registryId !== "string") {
    throw new Error("EFFECTIVE_RULE_REGISTRY_INVALID:header");
  }
  if (!VALID_TIERS.has(registry.unknownRuleTier) || registry.unknownRuleTier === "retired") {
    throw new Error("EFFECTIVE_RULE_REGISTRY_INVALID:unknownRuleTier");
  }
  assertStringList((registry.rules || []).map((rule) => rule.id), "rules", { allowEmpty: false });
  const ids = new Set();
  for (const rule of registry.rules) {
    if (ids.has(rule.id)) throw new Error(`EFFECTIVE_RULE_REGISTRY_DUPLICATE:${rule.id}`);
    ids.add(rule.id);
    assertStringList(rule.surface, `${rule.id}.surface`, { allowEmpty: false });
    if (rule.surface.some((surface) => !VALID_SURFACES.has(surface))) {
      throw new Error(`EFFECTIVE_RULE_REGISTRY_INVALID:${rule.id}.surface`);
    }
    assertStringList(rule.supersedes, `${rule.id}.supersedes`);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(rule.introducedAt)) throw new Error(`EFFECTIVE_RULE_REGISTRY_INVALID:${rule.id}.introducedAt`);
    if (!VALID_TIERS.has(rule.tier)) throw new Error(`EFFECTIVE_RULE_REGISTRY_INVALID:${rule.id}.tier`);
    if (!rule.ownerAuthority || typeof rule.ownerAuthority.sourceId !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(rule.ownerAuthority.decisionDate)) {
      throw new Error(`EFFECTIVE_RULE_REGISTRY_INVALID:${rule.id}.ownerAuthority`);
    }
    if (/^owner[-_]chat:/iu.test(rule.ownerAuthority.sourceId)) {
      throw new Error(`EFFECTIVE_RULE_REGISTRY_UNRESOLVABLE_AUTHORITY:${rule.id}:owner-chat`);
    }
    if (typeof rule.ownerAuthority.sourcePath !== "string" || !rule.ownerAuthority.sourcePath.trim()
      || pathIsUnsafe(rule.ownerAuthority.sourcePath)) {
      throw new Error(`EFFECTIVE_RULE_REGISTRY_UNRESOLVABLE_AUTHORITY:${rule.id}:sourcePath`);
    }
    for (const field of ["findingCategories", "findingCategoryPrefixes", "enforcementIds", "enforcementIdPrefixes"]) {
      if (rule[field] !== undefined) assertStringList(rule[field], `${rule.id}.${field}`);
    }
    if (rule.prompt === true && (rule.tier === "retired" || typeof rule.promptText !== "string" || !rule.promptText.trim())) {
      throw new Error(`EFFECTIVE_RULE_REGISTRY_INVALID:${rule.id}.promptText`);
    }
  }
  for (const rule of registry.rules) {
    for (const supersededId of rule.supersedes) {
      if (!ids.has(supersededId)) throw new Error(`EFFECTIVE_RULE_REGISTRY_UNKNOWN_SUPERSESSION:${rule.id}:${supersededId}`);
    }
  }
  return registry;
}

function pathIsUnsafe(value) {
  return String(value).startsWith("/") || String(value).split(/[\\/]/u).includes("..");
}

validateEffectiveRuleRegistry();

function normalizeWritingSurface({ surface = "generic", family = "" } = {}) {
  const normalizedSurface = String(surface || "generic").toLowerCase();
  const normalizedFamily = String(family || "").toLowerCase();
  if (normalizedSurface === "daily" || normalizedFamily === "daily") return "daily";
  if (normalizedSurface === "sky-placement-page") return "sky-placement-page";
  if (normalizedSurface === "sky-placement" || normalizedSurface === "card") return "card";
  if (normalizedSurface === "shared-only") return "generic";
  if (normalizedSurface === "friends-transit" || normalizedFamily === "friends-transit") return "friends-transit";
  if (normalizedSurface === "synastry" || normalizedFamily.includes("synastry")) return "synastry";
  if (normalizedSurface === "article" || normalizedFamily.includes("article")) return "article";
  if (normalizedSurface === "card" || /(?:card|transit|placement|compatibility)/u.test(normalizedFamily)) return "card";
  return "generic";
}

function effectiveRulesForSurface(input = {}) {
  const surface = typeof input === "string" ? normalizeWritingSurface({ surface: input }) : normalizeWritingSurface(input);
  const applicable = REGISTRY.rules.filter((rule) => rule.surface.includes("all") || rule.surface.includes(surface));
  const superseded = new Set(applicable.filter((rule) => rule.tier !== "retired").flatMap((rule) => rule.supersedes));
  return applicable.filter((rule) => rule.tier !== "retired" && !superseded.has(rule.id));
}

function matchingRuleTiers(value, surface, exactField, prefixField) {
  return effectiveRulesForSurface(surface)
    .filter((rule) => (rule[exactField] || []).includes(value)
      || (rule[prefixField] || []).some((prefix) => String(value).startsWith(prefix)))
    .map((rule) => ({ id: rule.id, tier: rule.tier }));
}

function uniqueTier(matches, value, kind) {
  const tiers = [...new Set(matches.map((match) => match.tier))];
  if (tiers.length > 1) throw new Error(`EFFECTIVE_RULE_TIER_CONFLICT:${kind}:${value}:${matches.map((match) => `${match.id}=${match.tier}`).join(",")}`);
  return tiers[0] || REGISTRY.unknownRuleTier;
}

function tierForEnforcementId(ruleId, input = {}) {
  const surface = typeof input === "string" ? normalizeWritingSurface({ surface: input }) : normalizeWritingSurface(input);
  return uniqueTier(matchingRuleTiers(ruleId, surface, "enforcementIds", "enforcementIdPrefixes"), ruleId, "enforcement");
}

function tierForFindingCategory(category, input = {}) {
  const surface = typeof input === "string" ? normalizeWritingSurface({ surface: input }) : normalizeWritingSurface(input);
  return uniqueTier(matchingRuleTiers(category, surface, "findingCategories", "findingCategoryPrefixes"), category, "finding");
}

function renderEffectiveRulesForPrompt(input = {}) {
  const surface = normalizeWritingSurface(input);
  const rules = effectiveRulesForSurface(surface).filter((rule) => rule.prompt === true);
  const blocking = rules.filter((rule) => rule.tier === "blocking");
  const advisory = rules.filter((rule) => rule.tier === "advisory");
  const render = (entries) => entries.map((rule) => `- ${rule.id}: ${rule.promptText}`).join("\n");
  return [
    `# Effective TLDR Astro writing rules (${REGISTRY.registryId})`,
    `Surface: ${surface}`,
    "",
    "## Blocking mechanical boundaries",
    render(blocking),
    "",
    "## Editorial guidance (reported to the owner; never a model quality verdict)",
    render(advisory),
    "",
    "Generated wording remains needs_review. Only the owner can approve exact prose."
  ].join("\n");
}

module.exports = {
  EFFECTIVE_RULE_REGISTRY: REGISTRY,
  EFFECTIVE_RULE_REGISTRY_PATH: REGISTRY_PATH,
  effectiveRulesForSurface,
  normalizeWritingSurface,
  renderEffectiveRulesForPrompt,
  tierForEnforcementId,
  tierForFindingCategory,
  validateEffectiveRuleRegistry
};
