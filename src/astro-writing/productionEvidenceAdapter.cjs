"use strict";

const crypto = require("node:crypto");
const {
  buildPacket,
  buildMultiTargetPacket,
  loadIndex
} = require("../../packages/astro-knowledge/scripts/knowledge-resolver.js");

const ASPECT_ALIASES = Object.freeze({
  conjunct: "conjunction",
  conjunction: "conjunction",
  opposite: "opposition",
  opposition: "opposition",
  square: "square",
  trine: "trine",
  sextile: "sextile",
  quincunx: "quincunx",
  inconjunct: "quincunx",
  semisextile: "semisextile",
  nonagen: "semisextile"
});
const ASPECT_TOKEN = /-(conjunct(?:ion)?|opposite|opposition|square|trine|sextile|quincunx|inconjunct|semisextile|nonagen)-/u;
const STATIC_LEGACY_IDENTIFIERS = Object.freeze({
  "planetary-return-framework": "doc/planetary_return_framework",
  "saturn-return": "doc/saturn_return",
  "jupiter-return-cycle": "doc/jupiter_return_cycle",
  "nodal-return-cycle": "doc/nodal_return_cycle"
});
const SHADOW_FLAG = "WRITING_KERNEL_SHADOW_SURFACES";
const PRODUCTION_CONTENT_KEY_RULES = Object.freeze([
  Object.freeze({ id: "sky-daily", surface: "sky", pattern: /^sky-daily-\d{4}-\d{2}-\d{2}$/u }),
  Object.freeze({ id: "sky-season", surface: "sky", pattern: /^sky-season-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/u }),
  Object.freeze({ id: "sky-moon", surface: "sky", pattern: /^sky-moon-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/u }),
  Object.freeze({ id: "sky-aspect", surface: "sky", pattern: /^sky-aspect-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/u }),
  Object.freeze({ id: "sky-lunation", surface: "sky", pattern: /^sky-lunation-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/u }),
  Object.freeze({ id: "sky-retrograde", surface: "sky", pattern: /^sky-retrograde-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/u }),
  Object.freeze({ id: "you-transit-v3", surface: "you", pattern: /^you-transit-v3-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/u })
]);

const sha256 = (value) => crypto.createHash("sha256")
  .update(typeof value === "string" ? value : JSON.stringify(value))
  .digest("hex");

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function normalizeAspect(value) {
  return ASPECT_ALIASES[slug(value)] ?? null;
}

function canonicalBody(value) {
  const normalized = slug(value);
  const aliases = {
    asc: "ascendant",
    dsc: "descendant",
    mc: "midheaven",
    ic: "imum_coeli",
    "imum-coeli": "imum_coeli",
    "north-node": "north_node",
    "true-node": "north_node",
    "south-node": "south_node"
  };
  return aliases[normalized] ?? normalized.replaceAll("-", "_");
}

function splitAspectIdentifier(value) {
  const normalized = slug(value);
  const match = ASPECT_TOKEN.exec(normalized);
  if (!match) return null;
  const aspect = normalizeAspect(match[1]);
  const left = normalized.slice(0, match.index);
  const right = normalized.slice(match.index + match[0].length);
  if (!left || !right || !aspect) return null;
  return { left, aspect, right };
}

function stripKnownPrefix(value, prefixes) {
  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) return value.slice(prefix.length);
  }
  return value;
}

function indexIds() {
  return loadIndex().byId;
}

/**
 * Namespaces whose second segment names an astrological body or point.
 * Anything else in that slot means a matcher swallowed part of the prefix.
 */
const SUBJECT_SLOTS_BY_NAMESPACE = new Map([
  ["body", [1]],
  ["placement-sign", [1]],
  ["placement-house", [1]],
  ["house-overlay", [1]],
  ["composite-placement", [1]],
  ["composite-sign", [1]],
  ["natal-aspect", [1, 2]],
  ["synastry-aspect", [1, 2]],
  ["composite-aspect", [1, 2]],
  ["transit-aspect", [1, 2]],
  ["sky-aspect", [1, 2]]
]);

let knownSubjectCache = null;
function knownSubjects() {
  if (knownSubjectCache) return knownSubjectCache;
  knownSubjectCache = new Set();
  for (const id of indexIds().keys ? indexIds().keys() : []) {
    if (typeof id === "string" && id.startsWith("body/")) {
      const subject = id.slice("body/".length);
      knownSubjectCache.add(subject);
      knownSubjectCache.add(subject.replace(/_/gu, "-"));
    }
  }
  // "personal_planet" is a licensed generic subject in the overlay namespace,
  // not a body, so it is not derivable from body/*.
  knownSubjectCache.add("personal_planet");
  knownSubjectCache.add("personal-planet");
  return knownSubjectCache;
}

/**
 * Refuse a canonical ID whose subject slot is not a real body.
 *
 * The subject patterns are `([a-z0-9-]+)`, which matches hyphens, so a
 * near-miss can absorb its own namespace prefix or a trailing "-in" and
 * produce a confident wrong answer instead of failing:
 *
 *   synastry-venus-in-house-4  ->  house-overlay/synastry_venus_in/4
 *   sky-venus-in-taurus        ->  placement-sign/sky-venus/taurus
 *
 * Those were previously caught only because the wrong ID happened to be absent
 * from the catalog. That is luck, not a gate: had such an object existed, the
 * writer would have been handed evidence for the wrong subject silently. This
 * turns the whole class into an honest refusal.
 */
function assertParsedSubject(id, legacyId) {
  const segments = String(id).split("/");
  const subjectSlots = SUBJECT_SLOTS_BY_NAMESPACE.get(segments[0]) ?? [];
  // `find` returns undefined for a missing segment and "" for an empty one, and
  // both are falsy — so testing the found value would let `placement-sign//leo`
  // and a truncated `placement-sign` through. Test whether an offender exists,
  // not whether it is truthy.
  const offenderIndex = subjectSlots.findIndex((slot) => !knownSubjects().has(segments[slot]));
  if (offenderIndex === -1) return id;
  const unknown = segments[subjectSlots[offenderIndex]] ?? "(missing)";
  throw new Error(`PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED: '${legacyId}' parsed to '${id}', whose subject '${unknown}' is not an astrological body. The identifier shape is not recognized. No provider call is allowed.`);
}

function requireCanonicalId(id, legacyId) {
  assertParsedSubject(id, legacyId);
  if (!indexIds().has(id)) {
    throw new Error(`PRODUCTION_EVIDENCE_CANONICAL_ID_MISSING: '${legacyId}' mapped to '${id}', which is absent from the catalog. No provider call is allowed.`);
  }
  return id;
}

function aspectTarget(kind, parts, legacyId, { ordered = false } = {}) {
  const normalizedBodies = [canonicalBody(parts.left), canonicalBody(parts.right)];
  const bodies = ordered ? normalizedBodies : normalizedBodies.sort();
  return requireCanonicalId(`${kind}/${bodies[0]}/${bodies[1]}/${parts.aspect}`, legacyId);
}

function transitTargets(parts, legacyIdentifier, { exactAllowed = true } = {}) {
  const exact = `transit-aspect/${canonicalBody(parts.left)}/${canonicalBody(parts.right)}/${parts.aspect}`;
  if (exactAllowed && indexIds().has(exact)) {
    return {
      canonicalIds: [assertParsedSubject(exact, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "transit-to-natal-exact"
    };
  }
  const canonicalIds = [
    requireCanonicalId(`body/${canonicalBody(parts.left)}`, legacyIdentifier),
    requireCanonicalId(`aspect/${parts.aspect}`, legacyIdentifier),
    requireCanonicalId(`body/${canonicalBody(parts.right)}`, legacyIdentifier)
  ];
  return {
    canonicalIds,
    targetUsages: canonicalIds.map(() => "mechanism-reference"),
    mappingBasis: "transit-to-natal-composed-mechanism"
  };
}

function mapLegacyIdentifier(legacyIdentifier, context = {}) {
  const [rawBase] = String(legacyIdentifier ?? "").trim().split("#", 1);
  const base = slug(rawBase);
  if (!base) throw new Error("PRODUCTION_EVIDENCE_IDENTIFIER_EMPTY: no provider call is allowed.");

  const namespaceMismatch = (
    (base.startsWith("sky-") && context.surface !== "sky")
    || (base.startsWith("natal-") && context.evidenceSurface !== "you-natal")
    || (base.startsWith("composite-") && context.surface !== "composite")
    || (base.startsWith("synastry-") && !["synastry", "relationship"].includes(context.surface))
  );
  if (namespaceMismatch) {
    throw new Error(`PRODUCTION_EVIDENCE_SURFACE_MISMATCH: '${legacyIdentifier}' is not valid for '${context.surface ?? "undefined"}'. No provider call is allowed.`);
  }

  if (STATIC_LEGACY_IDENTIFIERS[base]) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(STATIC_LEGACY_IDENTIFIERS[base], legacyIdentifier)],
      targetUsages: ["mechanism-reference"],
      mappingBasis: "static-legacy-identifier"
    };
  }

  const canonicalCandidate = rawBase.replace(/^canonical:/u, "");
  if (canonicalCandidate.includes("/") && indexIds().has(canonicalCandidate)) {
    return {
      legacyIdentifier,
      canonicalIds: [canonicalCandidate],
      targetUsages: ["primary"],
      mappingBasis: "already-canonical"
    };
  }

  const skyBodyMatch = /^sky-body-([a-z0-9-]+)$/u.exec(base);
  if (skyBodyMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`body/${canonicalBody(skyBodyMatch[1])}`, legacyIdentifier)],
      targetUsages: ["mechanism-reference"],
      mappingBasis: "current-sky-body-mechanism"
    };
  }

  const skyPlacementMatch = /^sky-placement-([a-z0-9-]+)-([a-z]+)$/u.exec(base);
  if (skyPlacementMatch) {
    const body = canonicalBody(skyPlacementMatch[1]);
    const sign = skyPlacementMatch[2];
    const canonicalId = `placement-sign/${body}/${sign}`;
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(canonicalId, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "current-sky-placement"
    };
  }

  const skyRetrogradeMatch = /^sky-retrograde-([a-z0-9-]+)$/u.exec(base);
  if (skyRetrogradeMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`body/${canonicalBody(skyRetrogradeMatch[1])}`, legacyIdentifier)],
      targetUsages: ["mechanism-reference"],
      mappingBasis: "current-sky-retrograde-body"
    };
  }

  const skyLunationMatch = /^sky-lunation-(new-moon|full-moon)-([a-z]+)$/u.exec(base);
  if (skyLunationMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`lunation/${skyLunationMatch[1]}/${skyLunationMatch[2]}`, legacyIdentifier)],
      targetUsages: ["mechanism-reference"],
      mappingBasis: "current-sky-lunation"
    };
  }

  // The app's established content key is `sky-<body>-in-<sign>`, while newer
  // packet construction emits `sky-placement-<body>-<sign>`. Both describe
  // the same collective placement and must resolve to the same catalog object.
  const skyNaturalPlacementMatch = /^sky-([a-z0-9-]+?)-in-([a-z]+)$/u.exec(base);
  if (skyNaturalPlacementMatch) {
    const body = canonicalBody(skyNaturalPlacementMatch[1]);
    const sign = skyNaturalPlacementMatch[2];
    const canonicalId = `placement-sign/${body}/${sign}`;
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(canonicalId, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "current-sky-natural-placement"
    };
  }

  if (base.startsWith("sky-")) {
    const parts = splitAspectIdentifier(stripKnownPrefix(base, ["sky-aspect-", "sky-"]));
    if (parts) {
      const exactBodies = [canonicalBody(parts.left), canonicalBody(parts.right)].sort();
      const exact = `sky-aspect/${exactBodies[0]}/${exactBodies[1]}/${parts.aspect}`;
      if (indexIds().has(exact)) {
        return {
          legacyIdentifier,
          canonicalIds: [assertParsedSubject(exact, legacyIdentifier)],
          targetUsages: ["mechanism-reference"],
          mappingBasis: "current-sky-exact-object"
        };
      }
      const ids = [
        requireCanonicalId(`body/${canonicalBody(parts.left)}`, legacyIdentifier),
        requireCanonicalId(`aspect/${parts.aspect}`, legacyIdentifier),
        requireCanonicalId(`body/${canonicalBody(parts.right)}`, legacyIdentifier)
      ];
      return {
        legacyIdentifier,
        canonicalIds: ids,
        targetUsages: ids.map(() => "mechanism-reference"),
        mappingBasis: "current-sky-ordered-body-aspect-body"
      };
    }
  }

  const transitParts = splitAspectIdentifier(stripKnownPrefix(base, ["transit-natal-", "you-transit-v3-"]));
  if (transitParts && (base.startsWith("transit-natal-") || context.evidenceSurface === "you-transit")) {
    const mapped = transitTargets(transitParts, legacyIdentifier, {
      exactAllowed: context.evidenceSurface === "you-transit"
    });
    return {
      legacyIdentifier,
      ...mapped
    };
  }

  const natalParts = splitAspectIdentifier(stripKnownPrefix(base, ["natal-"]));
  if (natalParts && (base.startsWith("natal-") || context.evidenceSurface === "you-natal")) {
    return {
      legacyIdentifier,
      canonicalIds: [aspectTarget("natal-aspect", natalParts, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "natal-aspect"
    };
  }

  const synastryParts = splitAspectIdentifier(stripKnownPrefix(base, ["synastry-", "relationship-"]));
  if (synastryParts && ["synastry", "relationship"].includes(context.surface)) {
    return {
      legacyIdentifier,
      canonicalIds: [aspectTarget("synastry-aspect", synastryParts, legacyIdentifier, { ordered: true })],
      targetUsages: ["primary"],
      mappingBasis: "directed-synastry-aspect"
    };
  }

  const compositeParts = splitAspectIdentifier(stripKnownPrefix(base, ["composite-"]));
  const contextualCompositeParts = compositeParts
    || (context.surface === "composite" ? splitAspectIdentifier(base) : null);
  if (contextualCompositeParts && context.surface === "composite") {
    return {
      legacyIdentifier,
      canonicalIds: [aspectTarget("composite-aspect", contextualCompositeParts, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "composite-aspect"
    };
  }

  const compositePlacementMatch = /^composite-([a-z0-9-]+?)-(?:in-)?house-?([1-9]|1[0-2])$/u.exec(base);
  if (compositePlacementMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`composite-placement/${compositePlacementMatch[1]}/${compositePlacementMatch[2]}`, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "composite-placement-house"
    };
  }

  // Both word orders are emitted in production and mean the same thing:
  //   synastry-venus-in-4-house      api/admin/prepopulate-content.ts:439
  //   synastry-venus-in-house-4      services/.../synastry.py:171
  // Only the first was recognized. The second fell through to the looser
  // placement-house matcher below, whose greedy subject group swallowed
  // "synastry-venus-in" and produced house-overlay/synastry_venus_in/4 while
  // the correct house-overlay/venus/4 sat in the catalog unused.
  // The subject group is lazy so it cannot absorb the "-in" separator.
  const overlayMatch = /^(?:synastry|relationship)-([a-z0-9-]+?)-in-(?:([1-9]|1[0-2])-?house|house-?([1-9]|1[0-2]))$/u.exec(base);
  if (overlayMatch) {
    const house = overlayMatch[2] ?? overlayMatch[3];
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`house-overlay/${overlayMatch[1]}/${house}`, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "synastry-house-overlay"
    };
  }


  // Composite sign records have their own relationship-surface identity. Do
  // not borrow the natal/sky placement-sign object across surfaces.
  const compositeNaturalPlacementMatch = /^composite-([a-z0-9-]+?)-in-([a-z]+)$/u.exec(base);
  if (compositeNaturalPlacementMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`composite-sign/${canonicalBody(compositeNaturalPlacementMatch[1])}/${compositeNaturalPlacementMatch[2]}`, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "composite-sign-placement"
    };
  }

  const placementMatch = /^(?:natal-)?([a-z0-9-]+?)-in-([a-z]+)$/u.exec(base);
  if (placementMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`placement-sign/${placementMatch[1]}/${placementMatch[2]}`, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "natal-placement-sign"
    };
  }

  const genericHouseMatch = /^(?:personal-planet-)?house-?([1-9]|1[0-2])$/u.exec(base);
  if (genericHouseMatch) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`house/${genericHouseMatch[1]}`, legacyIdentifier)],
      targetUsages: ["mechanism-reference"],
      mappingBasis: "generic-house-mechanism"
    };
  }

  // Lazy subject group. Greedy, it consumed the "-in" separator, so
  // "natal-sun-in-house9" became placement-house/sun_in/9 rather than
  // placement-house/sun/9, which exists.
  const placementHouseMatch = /^(?:natal-)?([a-z0-9-]+?)-(?:in-)?house-?([1-9]|1[0-2])$/u.exec(base);
  if (placementHouseMatch) {
    const point = canonicalBody(placementHouseMatch[1]);
    const house = placementHouseMatch[2];
    const contextualId = context.surface === "composite"
      ? `composite-placement/${point}/${house}`
      : ["synastry", "relationship"].includes(context.surface)
        ? `house-overlay/${point}/${house}`
        : `placement-house/${point}/${house}`;
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(contextualId, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "contextual-placement-house"
    };
  }

  const compactHouseMatch = /^([a-z0-9-]+)-([1-9]|1[0-2])$/u.exec(base);
  if (compactHouseMatch && ["you-natal", "sky"].includes(context.evidenceSurface)) {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`placement-house/${canonicalBody(compactHouseMatch[1])}/${compactHouseMatch[2]}`, legacyIdentifier)],
      targetUsages: ["primary"],
      mappingBasis: "compact-natal-placement-house"
    };
  }

  const relationshipTopicMatch = /^(?:friends|relationship)-(?:circle|timing)-([a-z0-9-]+)$/u.exec(base);
  if (relationshipTopicMatch && context.surface === "relationship") {
    return {
      legacyIdentifier,
      canonicalIds: [requireCanonicalId(`body/${canonicalBody(relationshipTopicMatch[1])}`, legacyIdentifier)],
      targetUsages: ["mechanism-reference"],
      mappingBasis: "relationship-topic-body-mechanism"
    };
  }

  throw new Error(`PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED: '${legacyIdentifier}'. No provider call is allowed.`);
}

function evidenceSurfaceForInput(input) {
  const event = slug(input?.eventType || input?.facts?.type);
  if (input?.surface === "sky") return "sky";
  if (input?.surface === "you" && event.includes("transit")) return "you-transit";
  if (["you", "natal"].includes(input?.surface) && event.includes("natal")) return "you-natal";
  if (["synastry", "composite", "relationship"].includes(input?.surface)) return "friends-synastry";
  throw new Error(`PRODUCTION_EVIDENCE_SURFACE_UNMAPPED: '${input?.surface ?? "undefined"}/${input?.eventType ?? "undefined"}'. No provider call is allowed.`);
}

function skyIdentifiersFromFacts(facts = {}) {
  const candidates = [
    ...(Array.isArray(facts.topAspects) ? facts.topAspects : []),
    ...(Array.isArray(facts.supportingAspects) ? facts.supportingAspects : []),
    ...(Array.isArray(facts.currentSky?.topAspects) ? facts.currentSky.topAspects : []),
    ...(facts.aspect && typeof facts.aspect === "object" ? [facts.aspect] : [])
  ];
  return candidates.map((aspect) => {
    const from = slug(aspect?.from || aspect?.planetA || aspect?.body1);
    const type = normalizeAspect(aspect?.type || aspect?.aspect);
    const to = slug(aspect?.to || aspect?.planetB || aspect?.body2);
    return from && type && to ? `sky-${from}-${type}-${to}` : null;
  }).filter(Boolean);
}

function identifiersForInput(input) {
  const explicit = Array.isArray(input?.knowledgeIds)
    ? input.knowledgeIds.map(String).map((value) => value.trim()).filter(Boolean)
    : [];
  if (input?.surface === "sky") {
    const fromAspects = skyIdentifiersFromFacts(input.facts);
    const facts = input.facts ?? {};
    const event = slug(input.eventType || facts.type);
    const primary = [];
    if (event === "retrograde") {
      const body = slug(facts.position?.planet || facts.retrograde?.planet || facts.planet);
      if (body) primary.push(`sky-body-${body}`);
    }
    if (event.includes("season")) {
      const sign = slug(facts.sun?.sign);
      if (sign) primary.push(`sky-placement-sun-${sign}`);
    }
    if (event.includes("lunar-cycle")) {
      const sign = slug(facts.moon?.sign);
      if (sign) primary.push(`sky-placement-moon-${sign}`);
    }
    const moonEventName = slug(facts.moonEvent?.name || event);
    const moonEventSign = slug(facts.moonEvent?.sign || facts.sign);
    if (["new-moon", "full-moon"].includes(moonEventName) && moonEventSign) {
      primary.push(`sky-lunation-${moonEventName}-${moonEventSign}`);
    }
    if (event.includes("daily")) {
      if (facts.sun?.sign) primary.push(`sky-placement-sun-${slug(facts.sun.sign)}`);
      if (facts.moon?.sign) primary.push(`sky-placement-moon-${slug(facts.moon.sign)}`);
    }
    return [...new Set([...primary, ...explicit, ...fromAspects])];
  }
  return explicit;
}

function mapProductionContentKey(input, canonicalIds) {
  const contentKey = String(input?.contentKey ?? "").trim().toLowerCase();
  if (!contentKey) {
    throw new Error("PRODUCTION_CONTENT_KEY_MISSING: no provider call is allowed.");
  }
  const rule = PRODUCTION_CONTENT_KEY_RULES.find((candidate) => (
    candidate.surface === input.surface && candidate.pattern.test(contentKey)
  ));
  if (rule) {
    if (!canonicalIds.length) {
      throw new Error(`PRODUCTION_CONTENT_KEY_EVIDENCE_MISSING: '${input.contentKey}' matched '${rule.id}' but resolved no canonical targets. No provider call is allowed.`);
    }
    return {
      contentKey: input.contentKey,
      ruleId: rule.id,
      canonicalIds: [...canonicalIds],
      mappingBasis: "enumerated-production-content-key-rule"
    };
  }
  if (canonicalIds.length) {
    return {
      contentKey: input.contentKey,
      ruleId: "externally-supplied-explicit-identifiers",
      canonicalIds: [...canonicalIds],
      mappingBasis: "explicit-identifiers-required"
    };
  }
  throw new Error(`PRODUCTION_CONTENT_KEY_UNMAPPED: '${input.contentKey}'. No provider call is allowed.`);
}

function shadowSurfaces(env = process.env) {
  const value = String(env[SHADOW_FLAG] ?? "").trim().toLowerCase();
  if (!value) return new Set();
  if (["1", "true", "all"].includes(value)) return new Set(["sky", "you", "natal", "synastry", "composite", "relationship", "year_ahead"]);
  return new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean));
}

function productionEvidenceShadowEnabled(input, env = process.env) {
  return shadowSurfaces(env).has(String(input?.surface ?? "").toLowerCase());
}

function mapProductionInput(input) {
  const evidenceSurface = evidenceSurfaceForInput(input);
  const legacyIdentifiers = identifiersForInput(input);
  if (!legacyIdentifiers.length) {
    throw new Error(`PRODUCTION_EVIDENCE_IDENTIFIERS_MISSING: '${input?.contentKey ?? "unknown"}'. No provider call is allowed.`);
  }
  const mappings = legacyIdentifiers.map((id) => mapLegacyIdentifier(id, {
    surface: input.surface,
    eventType: input.eventType,
    evidenceSurface
  }));
  const canonicalIds = [];
  const targetUsages = [];
  for (const mapping of mappings) {
    mapping.canonicalIds.forEach((id, index) => {
      if (canonicalIds.includes(id)) return;
      canonicalIds.push(id);
      targetUsages.push(mapping.targetUsages[index]);
    });
  }
  const contentKeyMapping = mapProductionContentKey(input, canonicalIds);
  return { evidenceSurface, legacyIdentifiers, mappings, canonicalIds, targetUsages, contentKeyMapping };
}

function buildProductionEvidenceShadow(input, env = process.env) {
  if (!productionEvidenceShadowEnabled(input, env)) return null;
  const { mapped, packet } = buildProductionCatalogEvidence(input);
  const shadow = {
    schemaVersion: 1,
    mode: "shadow-existing-prompt-only",
    contentKeySha256: sha256(String(input.contentKey ?? "")),
    legacyEvidenceSha256: sha256({
      facts: input.facts ?? {},
      knowledgeIds: input.knowledgeIds ?? [],
      sourceSnapshot: input.sourceSnapshot ?? {},
      voiceNotes: input.voiceNotes ?? ""
    }),
    evidenceSurface: mapped.evidenceSurface,
    legacyIdentifiers: mapped.legacyIdentifiers,
    contentKeyMapping: mapped.contentKeyMapping,
    mappings: mapped.mappings,
    canonicalIds: mapped.canonicalIds,
    indexSha256: packet.indexSha256,
    packetSha256: packet.packetSha256,
    recordsIncluded: packet.totals.recordsIncluded,
    evidenceChars: packet.totals.chars,
    governedPromptUsed: false,
    servingChanged: false
  };
  console.info("WRITING_KERNEL_SHADOW", JSON.stringify(shadow));
  return Object.freeze(shadow);
}

function buildProductionCatalogEvidence(input) {
  const mapped = mapProductionInput(input);
  const options = {
    surface: mapped.evidenceSurface,
    register: input.mode === "article" || input.mode === "report" ? "article" : "card",
    targetUsages: mapped.targetUsages
  };
  const packet = mapped.canonicalIds.length === 1
    ? buildPacket(mapped.canonicalIds[0], {
        surface: options.surface,
        register: options.register,
        targetUsage: mapped.targetUsages[0]
      })
    : buildMultiTargetPacket(mapped.canonicalIds, options);
  return { mapped, packet };
}

function recordLegacyPromptShadow(shadow, prompt) {
  if (!shadow) return null;
  const record = {
    contentKeySha256: shadow.contentKeySha256,
    legacyPromptSha256: sha256(String(prompt)),
    governedPacketSha256: shadow.packetSha256,
    governedPromptUsed: false
  };
  console.info("WRITING_KERNEL_SHADOW_PROMPT", JSON.stringify(record));
  return record;
}

module.exports = {
  SHADOW_FLAG,
  STATIC_LEGACY_IDENTIFIERS,
  PRODUCTION_CONTENT_KEY_RULES,
  normalizeAspect,
  canonicalBody,
  splitAspectIdentifier,
  mapLegacyIdentifier,
  evidenceSurfaceForInput,
  identifiersForInput,
  mapProductionContentKey,
  mapProductionInput,
  buildProductionCatalogEvidence,
  productionEvidenceShadowEnabled,
  buildProductionEvidenceShadow,
  recordLegacyPromptShadow
};
