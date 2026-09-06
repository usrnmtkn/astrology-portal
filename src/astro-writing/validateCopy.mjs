import { WRITING_POLICY_DATA } from "./policyData.generated.mjs";
import { evaluateSpineQuality } from "./spineQuality.mjs";
import corpusGrammar from "./corpusGrammarChecks.cjs";
import { assertValidationProfile } from "./validationProfiles.mjs";

const { grammarFindings } = corpusGrammar;

const DEFAULT_BANNED = [
  "whether",
  "medicine",
  "inner weather",
  "landscape",
  "not a passing mood",
  "a chapter, not a",
  ...WRITING_POLICY_DATA.bannedWords,
  ...WRITING_POLICY_DATA.bannedPhrases
];

const WORD_POLICIES = WRITING_POLICY_DATA.wordPolicies ?? [];
function globalWordPolicyFindings(text) {
  const violations = [];
  const advisories = [];
  for (const entry of WORD_POLICIES) {
    if (["HARD_BAN", "WAIVED"].includes(entry.policyClass)) continue;
    const escaped = String(entry.term).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const match = String(text).match(new RegExp(`\\b${escaped}\\b`, "iu"));
    if (!match) continue;
    if (entry.contextPatterns?.length && !entry.contextPatterns.some((pattern) => new RegExp(pattern, "iu").test(text))) continue;
    if (entry.policyClass === "AI_TELL_PREVENTIVE"
      && entry.literalContextPatterns?.some((pattern) => new RegExp(pattern, "iu").test(text))) continue;
    const finding = {
      category: entry.policyClass === "AI_TELL_PREVENTIVE" ? "banned_language" : "editorial_word_policy",
      detail: entry.term,
      policyClass: entry.policyClass,
      preferredAlternatives: entry.policyClass === "REPLACEMENT_SUGGESTION" ? entry.useInstead ?? [] : undefined
    };
    if (entry.policyClass === "AI_TELL_PREVENTIVE") violations.push(finding);
    else advisories.push(finding);
  }
  return { violations, advisories };
}

const STOCK_TROPES = [
  "the dishes",
  "socks on the floor",
  "toothpaste cap",
  "forgotten anniversary",
  "toilet seat"
];

const INTERNAL_GUARD_FIELDS = new Set(["DO_NOT_ASSUME", "do_not_assume"]);

const SYNONYM_REDUNDANCY_PAIRS = Object.freeze([
  Object.freeze({ id: "visibility_being_seen", left: /\bvisibility\b/iu, right: /\bbeing seen\b/iu })
]);

const SCENE_NOUNS = Object.freeze(["meeting", "message", "decision", "answer", "plan"]);
const DEFAULT_BATCH_CONSTRUCTION_CAP = 3;
const NEGATION_PIVOT_PAGE_CAP = 1;
const NEGATION_PIVOT_SET_CAP = 3;

// Owner correction, 2026-08-14: this construction leaves the outcome inside
// an abstract description of the connection instead of naming what happens.
const VAGUE_OUTCOME_CLAUSE_PATTERNS = Object.freeze([
  Object.freeze({
    id: "shows_tells_whether_can_stay",
    pattern: /\b(?:shows|tells)(?:\s+(?:you|us|them|him|her))?\s+whether\b[^.!?\n]{0,140}\bcan\s+(?:stay|remain)\s+\w+/giu
  }),
  Object.freeze({
    id: "whether_the_connection_can",
    pattern: /\bwhether\s+the\s+connection\s+can\b/giu
  })
]);

// Owner direction, 2026-08-21: a transitive Do item must name what the
// reader should ask for. This is intentionally behavioral rather than tied to
// a content key, so the same incomplete instruction cannot reappear elsewhere.
const VAGUE_ACTION_OBJECT_PATTERNS = Object.freeze([
  Object.freeze({
    id: "ask_for_more_without_object",
    pattern: /(?:^|[.!?]\s+)ask\s+for\s+more\s*(?=$|[.!?])/giu
  })
]);

// Owner direction, 2026-08-21: on relationship surfaces, `room` may not stand
// in for the connection itself. Literal rooms and spatial `room to/for ...`
// constructions are not matched by this relationship-container pattern.
const RELATIONSHIP_ROOM_CONTAINER_PATTERNS = Object.freeze([
  Object.freeze({
    id: "relationship_quality_located_in_room",
    pattern: /\b(?:affection|bond|commitment|connection|relationship|warmth)\b[^.!?\n]{0,100}\b(?:in|inside|out\s+of)\s+the\s+room\b/giu
  }),
  Object.freeze({
    id: "room_contains_relationship_quality",
    pattern: /\b(?:in|inside|out\s+of)\s+the\s+room\b[^.!?\n]{0,100}\b(?:affection|bond|commitment|connection|relationship|warmth)\b/giu
  })
]);

// Owner ruling, 2026-08-13: these are semantic spine labels, not reusable
// reader-copy templates. A mechanical scan can identify the construction,
// but only the owner can decide that a particular line earned its place.
const SPINE_SCAFFOLD_PATTERNS = Object.freeze([
  Object.freeze({ id: "the_job_of", pattern: /\bthe job of\b/giu }),
  Object.freeze({ id: "this_is_a_period_for", pattern: /\bthis is a period for\b/giu }),
  Object.freeze({ id: "the_collective_lesson_is", pattern: /\bthe collective lesson is\b/giu })
]);

// Each matched span counts once even when a construction matches more than
// one member of the family (for example, "the problem is not ... It is ...").
const NEGATION_PIVOT_PATTERNS = Object.freeze([
  Object.freeze({
    id: "x_is_not_y_it_is_z",
    pattern: /(?:\b(?:is|are|was|were)\s+not\b|\b(?:isn['’]t|aren['’]t|wasn['’]t|weren['’]t)\b)[^.!?\n]{1,180}[.!?]\s*(?:it|this|that|they|we|you|he|she)(?:\s+(?:is|are|was|were)\b|['’](?:s|re)\b)/giu
  }),
  Object.freeze({ id: "problem_is_not", pattern: /\bthe problem (?:is not|isn['’]t)\b/giu }),
  Object.freeze({ id: "x_is_not_the_problem", pattern: /\b(?:is not|isn['’]t) the problem\b/giu }),
  Object.freeze({ id: "not_x_but_y", pattern: /\bnot\b[^.!?\n]{1,100}\bbut\b/giu })
]);

const HOUSE_BLEED_NOUNS = Object.freeze({
  aries: ["appearance", "body image", "first impression", "identity", "self-presentation"],
  taurus: ["salary", "income", "budget", "bank", "wealth"],
  gemini: ["sibling", "neighborhood", "short trip", "school commute", "local travel"],
  cancer: ["mother", "parent", "household", "childhood", "ancestry"],
  leo: ["children", "dating", "gambling", "hobby", "romance"],
  virgo: ["coworker", "office", "diet", "diagnosis", "workplace"],
  libra: ["partner", "couple", "dating", "marriage", "spouse"],
  scorpio: ["debt", "inheritance", "tax", "shared finances", "loan"],
  sagittarius: ["teacher", "education", "publication", "institution", "university", "legal"],
  capricorn: ["career", "promotion", "boss", "title", "corporate"],
  aquarius: ["friend group", "community", "organization", "committee", "network"],
  pisces: ["retreat", "isolation", "hidden enemy", "institution", "hospital"]
});

// Owner rule: one life-domain example may be legitimate. House bleed begins
// when a cluster of associated-house nouns starts defining the sign.
const HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS = 4;

function copyText(copy) {
  if (typeof copy === "string") return copy;
  return Object.entries(copy ?? {})
    .filter(([field]) => !INTERNAL_GUARD_FIELDS.has(field))
    .flatMap(([, value]) => (
      typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((item) => typeof item === "string") : []
    )).join("\n");
}

function normalizedGuard(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
}

function internalGuardLeaks(text, plan) {
  const normalized = normalizedGuard(text);
  const findings = [];
  if (/\bdo[ -]?not[ _-]?assume\b/iu.test(text)) findings.push("DO NOT ASSUME label appeared in reader copy.");
  if (/\b(?:this|the) (?:transit|aspect|placement) (?:does not|doesn't) necessarily mean\b/iu.test(text)) {
    findings.push("An internal guard became a reader-facing disclaimer.");
  }
  const guards = [...new Set([
    ...(Array.isArray(plan?.do_not_assume) ? plan.do_not_assume : []),
    ...(Array.isArray(plan?.DO_NOT_ASSUME) ? plan.DO_NOT_ASSUME : [])
  ].map(normalizedGuard).filter(Boolean))];
  for (const guard of guards) {
    if (normalized.includes(guard)) findings.push(`Internal guard text leaked: ${guard}`);
  }
  return [...new Set(findings)];
}

function placeholders(value) {
  return [...String(value ?? "").matchAll(/\{\{([\w.]+)\}\}/gu)].map((match) => match[1]).sort();
}

function sentences(text) {
  return String(text ?? "").split(/(?<=[.!?])\s+|\n+/u).map((sentence) => sentence.trim()).filter(Boolean);
}

function synonymRedundancy(text) {
  const findings = [];
  for (const sentence of sentences(text)) {
    for (const pair of SYNONYM_REDUNDANCY_PAIRS) {
      if (pair.left.test(sentence) && pair.right.test(sentence)) {
        findings.push({ category: "synonym_redundancy", detail: pair.id, text: sentence });
      }
    }
  }
  return findings;
}

function patternOccurrences(text, patterns) {
  const raw = [];
  for (const { id, pattern } of patterns) {
    pattern.lastIndex = 0;
    for (const match of String(text ?? "").matchAll(pattern)) {
      raw.push({
        id,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  }
  raw.sort((left, right) => left.start - right.start || right.end - left.end);
  const deduplicated = [];
  for (const occurrence of raw) {
    const overlapping = deduplicated.find((kept) => occurrence.start < kept.end && occurrence.end > kept.start);
    if (!overlapping) deduplicated.push(occurrence);
  }
  return deduplicated;
}

function negationPivotOccurrences(text) {
  return patternOccurrences(text, NEGATION_PIVOT_PATTERNS);
}

function spineScaffoldOccurrences(text) {
  return patternOccurrences(text, SPINE_SCAFFOLD_PATTERNS);
}

function vocabularyHints(text, ownerCorpusVocabulary) {
  if (!(ownerCorpusVocabulary instanceof Set) || ownerCorpusVocabulary.size === 0) return [];
  const tokens = [...new Set(String(text).toLowerCase().match(/[a-z][a-z'-]{3,}/gu) ?? [])];
  const outside = tokens.filter((token) => !ownerCorpusVocabulary.has(token));
  return outside.length ? [{
    category: "vocabulary_outside_corpus",
    detail: outside.join(", "),
    advisory: true
  }] : [];
}

function allowsSecondPerson({ family, surface }) {
  return surface === "sky-placement-page" || family === "house-horoscope-core";
}

function isRelationshipFamily(family) {
  return /(?:synastry|compatibility|relationship|bond|pair-daily)/iu.test(String(family ?? ""));
}

function sentenceUnits(value) {
  return String(value ?? "")
    .match(/[^.!?]+(?:[.!?]+|$)/gu)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
}

function containsSecondPerson(value) {
  return /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(String(value ?? ""));
}

function hasBanned(text, phrase) {
  const value = String(phrase).toLowerCase();
  if (/^[a-z0-9'-]+$/u.test(value)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "iu").test(text);
  }
  return text.includes(value);
}

export function validateCopy(copy, {
  validationProfile = null,
  family = "sky-placement",
  register = "collective",
  surface = "card",
  plan = null,
  banned = DEFAULT_BANNED,
  expectedPlaceholders = [],
  requiredFields = [],
  protectedOwnerLines = [],
  reservedNegationPivots = 0,
  literalEvidenceRequirements = null,
  ownerCorrections = [],
  ownerCorpusVocabulary = null,
  spineElements = null,
  inheritedSpineElements = [],
  spineQualityConditionalLayers = {}
} = {}) {
  const profile = validationProfile == null
    ? { id: "legacy", baseRules: [], surfaceRules: [] }
    : assertValidationProfile(validationProfile);
  const text = copyText(copy);
  const normalized = text.toLowerCase();
  const unprotectedText = protectedOwnerLines.reduce(
    (value, line) => value.split(String(line)).join(" "),
    text
  );
  const unprotectedNormalized = unprotectedText.toLowerCase();
  const violations = [];
  const advisories = [];
  for (const finding of grammarFindings(text)) {
    violations.push({
      category: `grammar_${finding.check}`,
      detail: `${finding.message}: ${finding.match}`
    });
  }
  for (const detail of internalGuardLeaks(text, plan)) {
    violations.push({ category: "shared_ban", detail });
  }
  if (text.includes("—")) violations.push({ category: "em_dash", detail: "Em dash is forbidden." });
  if (text.includes("–")) violations.push({ category: "en_dash", detail: "En dash is forbidden." });
  if (!/^[\x00-\x7F]*$/u.test(text)) violations.push({ category: "ascii_only", detail: "Generated copy must contain ASCII characters only." });
  for (const phrase of banned) {
    if (hasBanned(unprotectedNormalized, phrase)) violations.push({ category: "banned_language", detail: String(phrase) });
  }
  const wordPolicy = globalWordPolicyFindings(unprotectedText);
  violations.push(...wordPolicy.violations);
  advisories.push(...wordPolicy.advisories);
  for (const trope of STOCK_TROPES) {
    if (normalized.includes(trope)) violations.push({ category: "stock_trope", detail: trope });
  }
  const vagueOutcomeClauses = patternOccurrences(text, VAGUE_OUTCOME_CLAUSE_PATTERNS);
  for (const occurrence of vagueOutcomeClauses) {
    violations.push({
      category: "vague_outcome_clause",
      detail: occurrence.id,
      text: occurrence.text
    });
  }
  const vagueActionObjects = patternOccurrences(text, VAGUE_ACTION_OBJECT_PATTERNS);
  for (const occurrence of vagueActionObjects) {
    violations.push({
      category: "vague_action_object",
      detail: occurrence.id,
      text: occurrence.text
    });
  }
  if (isRelationshipFamily(family)) {
    const relationshipRoomContainers = patternOccurrences(text, RELATIONSHIP_ROOM_CONTAINER_PATTERNS);
    for (const occurrence of relationshipRoomContainers) {
      violations.push({
        category: "relationship_container_metaphor",
        detail: occurrence.id,
        text: occurrence.text
      });
    }
  }
  if (register === "collective" && !allowsSecondPerson({ family, surface }) && /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)) {
    violations.push({ category: "register_consistency", detail: "Collective copy contains second person." });
  }
  if (register === "collective_with_second_person_close") {
    const sentenceList = sentenceUnits(text);
    const closeStartsAt = Math.max(0, sentenceList.length - 2);
    const bodyViolation = sentenceList.slice(0, closeStartsAt).find(containsSecondPerson);
    if (bodyViolation) {
      violations.push({
        category: "register_consistency",
        detail: "Collective placement copy contains second person before the final truth-and-catch pair."
      });
    }
  }
  if (register === "third_person" && family !== "friend-transit-reading" && /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)) {
    violations.push({ category: "register_consistency", detail: "Third-person copy contains second person." });
  }
  if (register === "second_person" && family === "house-horoscope-core" && !/\b(?:you|your|yours|yourself)\b/iu.test(text)) {
    violations.push({ category: "register_consistency", detail: "House-core copy requires second person." });
  }
  if (surface === "sky-placement-page"
    && (register === "second_person" || ["fast-mover-article", "slow-mover-article"].includes(family))
    && !/\b(?:you|your|yours|yourself)\b/iu.test(text)) {
    violations.push({ category: "register_consistency", detail: "Sky-placement page requires direct address." });
  }
  if (surface === "sky-placement-page" && ["fast-mover-article", "slow-mover-article"].includes(family)
    && /\b(?:in this article|(?:on )?this page|this write-up|as (?:I|we) write|the reader (?:can|will|should))\b/iu.test(text)) {
    violations.push({ category: "fourth_wall", detail: "Sky-placement article comments on the page or its writing." });
  }
  if (typeof copy === "object" && copy) {
    for (const field of requiredFields) {
      if (typeof copy[field] !== "string" || !copy[field].trim()) violations.push({ category: "required_fields", detail: field });
    }
  }
  const actualPlaceholders = placeholders(text);
  const expected = [...expectedPlaceholders].sort();
  if (JSON.stringify(actualPlaceholders) !== JSON.stringify(expected)) {
    violations.push({ category: "placeholder_integrity", detail: `expected ${expected.join(",")}; got ${actualPlaceholders.join(",")}` });
  }
  for (const line of protectedOwnerLines) {
    if (!text.includes(line)) violations.push({ category: "owner_line_integrity", detail: line });
  }
  if (literalEvidenceRequirements) {
    const field = literalEvidenceRequirements.field;
    const fieldText = typeof copy?.[field] === "string" ? copy[field] : "";
    const fieldNormalized = fieldText.toLowerCase();
    for (const phrase of literalEvidenceRequirements.forbiddenAbstractPlaceholders ?? []) {
      if (fieldNormalized.includes(String(phrase).toLowerCase())) {
        violations.push({ category: "literal_evidence_requirements", detail: `abstract placeholder in ${field}: ${phrase}` });
      }
    }
    for (const [concept, terms] of Object.entries(literalEvidenceRequirements.requiredConceptTerms ?? {})) {
      const found = terms.some((term) => hasBanned(fieldNormalized, term));
      if (!found) violations.push({ category: "literal_evidence_requirements", detail: `${field} does not name the actual ${concept}` });
    }
  }
  for (const correction of ownerCorrections) {
    const badText = correction?.bad ?? correction?.before;
    if (badText && text.includes(badText)) {
      violations.push({ category: correction.category, detail: correction.rule ?? correction.why ?? correction.owner_reason ?? badText });
    }
  }
  if (plan?.house == null) {
    const matches = (HOUSE_BLEED_NOUNS[plan?.sign] ?? []).filter((noun) => normalized.includes(noun));
    if (matches.length >= HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS) {
      violations.push({ category: "sign_house_separation", detail: matches.join(", ") });
    }
  }
  if (family.includes("placement") && /\b(?:will definitely|is guaranteed to)\b/iu.test(text)) {
    violations.push({ category: "astrology_integrity", detail: "Placement copy predicts an event instead of a recurring pattern." });
  }
  if (profile.surfaceRules.includes("daily-engine-hidden")
    && /\b(?:transit(?:ing)?|natal|conjunction|opposition|square|trine|sextile|quincunx|inconjunct|semi-?sextile|\d+(?:st|nd|rd|th) house)\b/iu.test(text)) {
    violations.push({ category: "daily_engine_hidden", detail: "Daily copy exposed engine terminology." });
  }
  if (profile.surfaceRules.includes("daily-outcome-ceiling")
    && /\b(?:will|is going to)\b[^.!?]{0,60}\b(?:work out|resolve|succeed|heal|improve|happen)\b/iu.test(text)) {
    violations.push({ category: "daily_outcome_ceiling", detail: "Daily copy promised an unsupported outcome." });
  }
  if (profile.surfaceRules.includes("synastry-outcome-ceiling")
    && /\bwill\b[^.!?]{0,60}\b(?:leave|stay|marry|separate|break up|end the (?:bond|friendship|relationship))\b/iu.test(text)) {
    violations.push({ category: "synastry_outcome_ceiling", detail: "Synastry copy predicted a relationship outcome." });
  }
  if (profile.surfaceRules.includes("synastry-fate-ban")
    && /\b(?:soulmates?|twin flames?|meant to be|destined (?:for|to be with))\b/iu.test(text)) {
    violations.push({ category: "synastry_fate_ban", detail: "Synastry copy used deterministic fate language." });
  }
  if (profile.surfaceRules.includes("article-meta-scaffolding-ban")
    && /\b(?:in this article|this article will|as an ai|here(?:'s| is) what (?:you need to know|we will cover))\b/iu.test(text)) {
    violations.push({ category: "article_meta_scaffolding", detail: "Article copy exposed generic composition scaffolding." });
  }
  if (profile.surfaceRules.includes("temporary-transit-register")
    && /\b(?:you tend to|you always|you usually|usually|generally|this is who you are)\b/iu.test(text)) {
    violations.push({ category: "temporary_transit_register", detail: "Friends transit copy used standing-pattern language." });
  }
  if (profile.surfaceRules.includes("disconnected-stock-coaching")
    && /\b(?:give yourself permission|you are allowed|let yourself|allow yourself|take the win|protect your energy|honor your needs)\b/iu.test(text)) {
    violations.push({ category: "disconnected_stock_coaching", detail: "Friends transit copy used disconnected stock coaching." });
  }
  if (profile.surfaceRules.includes("friends-variant-direction") && typeof copy === "object" && copy) {
    if (typeof copy.body_you === "string" && copy.body_you.includes("{{Name}}")) {
      violations.push({ category: "friends_variant_direction", detail: "body_you must not contain {{Name}}." });
    }
    if (typeof copy.body_they === "string" && !copy.body_they.includes("{{Name}}")) {
      violations.push({ category: "friends_variant_direction", detail: "body_they must contain {{Name}}." });
    }
  }
  const negationPivotOccurrencesDetected = negationPivotOccurrences(text);
  const normalizedReservedNegationPivots = Number.isInteger(reservedNegationPivots) && reservedNegationPivots >= 0
    ? reservedNegationPivots
    : 0;
  const negationPivotCount = negationPivotOccurrencesDetected.length + normalizedReservedNegationPivots;
  if (negationPivotCount > NEGATION_PIVOT_PAGE_CAP) {
    violations.push({
      category: "negation_pivot_cap",
      detail: `page has ${negationPivotCount}; cap is ${NEGATION_PIVOT_PAGE_CAP}`,
      count: negationPivotCount,
      cap: NEGATION_PIVOT_PAGE_CAP,
      reserved: normalizedReservedNegationPivots,
      occurrences: negationPivotOccurrencesDetected
    });
  }
  const spineScaffolds = spineScaffoldOccurrences(text);
  for (const occurrence of spineScaffolds) {
    const placementArticle = ["fast-mover-article", "slow-mover-article"].includes(family);
    const finding = {
      category: placementArticle ? "structural_spine_vocabulary" : "spine_scaffold_grammar",
      detail: occurrence.id,
      text: occurrence.text,
      advisory: !placementArticle,
      ownerReviewRequired: true
    };
    if (placementArticle) violations.push(finding);
    else advisories.push(finding);
  }
  advisories.push(...synonymRedundancy(text));
  advisories.push(...vocabularyHints(text, ownerCorpusVocabulary));
  const spineQuality = ["fast-mover-article", "slow-mover-article"].includes(family)
    ? evaluateSpineQuality({
        copy,
        family,
        plan,
        spineElements,
        inheritedElements: inheritedSpineElements,
        conditionalLayers: spineQualityConditionalLayers
      })
    : null;
  if (spineQuality) advisories.push(...spineQuality.failures);
  return {
    passed: violations.length === 0,
    completionStatus: spineQuality?.status === "spine-quality-incomplete" ? "spine-quality-incomplete" : "complete",
    violations,
    advisories,
    spineQuality,
    validationProfile: profile.id,
    rulesRun: [...profile.baseRules, ...profile.surfaceRules],
    counts: {
      negationPivots: negationPivotCount,
      negationPivotsDetected: negationPivotOccurrencesDetected.length,
      negationPivotsReserved: normalizedReservedNegationPivots,
      spineScaffolds: spineScaffolds.length,
      vagueOutcomeClauses: vagueOutcomeClauses.length,
      failedSpineQualityElements: spineQuality?.failedElementCount ?? 0
    }
  };
}

function openingSyntax(text) {
  const opening = sentences(text)[0] ?? "";
  return opening
    .replace(/\{\{[^}]+\}\}/gu, "{{token}}")
    .toLowerCase()
    .match(/^[a-z{][\w{}'-]*(?:\s+[a-z{][\w{}'-]*){0,3}/u)?.[0] ?? "";
}

const ANCHOR_PATTERNS = Object.freeze([
  Object.freeze({ id: "from_entry_date", pattern: /^from \{\{entrydate\}\}/iu }),
  Object.freeze({ id: "until_exit_date", pattern: /^until \{\{exitdate\}\}/iu }),
  Object.freeze({ id: "you_may", pattern: /^you may\b/iu }),
  Object.freeze({ id: "bringing_more_attention", pattern: /\bbringing more attention\b/iu }),
  Object.freeze({ id: "putting_more_attention", pattern: /\bputting more attention\b/iu })
]);

export function validateCopyBatch(copies, {
  constructionCap = DEFAULT_BATCH_CONSTRUCTION_CAP,
  sceneNounCap = DEFAULT_BATCH_CONSTRUCTION_CAP,
  negationPivotSetCap = NEGATION_PIVOT_SET_CAP
} = {}) {
  const items = copies.map((copy, index) => ({ index, text: copyText(copy) }));
  const violations = [];
  const advisories = [];
  for (const noun of SCENE_NOUNS) {
    const indices = items.filter(({ text }) => new RegExp(`\\b${noun}s?\\b`, "iu").test(text)).map(({ index }) => index);
    if (indices.length > sceneNounCap) advisories.push({ category: "scene_noun_frequency", detail: noun, count: indices.length, indices });
  }
  const syntaxes = new Map();
  for (const item of items) {
    const syntax = openingSyntax(item.text);
    if (!syntax) continue;
    const list = syntaxes.get(syntax) ?? [];
    list.push(item.index);
    syntaxes.set(syntax, list);
  }
  for (const [syntax, indices] of syntaxes) {
    if (indices.length > constructionCap) advisories.push({ category: "opening_syntax_repetition", detail: syntax, count: indices.length, indices });
  }
  for (const anchor of ANCHOR_PATTERNS) {
    const indices = items.filter(({ text }) => anchor.pattern.test(text)).map(({ index }) => index);
    if (indices.length > constructionCap) advisories.push({ category: "anchor_construction_repetition", detail: anchor.id, count: indices.length, indices });
  }
  const negationPivotsByPage = items.map(({ index, text }) => ({
    index,
    count: negationPivotOccurrences(text).length
  }));
  const negationPivots = negationPivotsByPage.reduce((total, item) => total + item.count, 0);
  for (const item of negationPivotsByPage.filter(({ count }) => count > NEGATION_PIVOT_PAGE_CAP)) {
    violations.push({
      category: "negation_pivot_page_cap",
      detail: `item ${item.index} has ${item.count}; cap is ${NEGATION_PIVOT_PAGE_CAP}`,
      index: item.index,
      count: item.count,
      cap: NEGATION_PIVOT_PAGE_CAP
    });
  }
  if (negationPivots > negationPivotSetCap) {
    violations.push({
      category: "negation_pivot_set_cap",
      detail: `set has ${negationPivots}; cap is ${negationPivotSetCap}`,
      count: negationPivots,
      cap: negationPivotSetCap,
      perPage: negationPivotsByPage
    });
  }
  for (const scaffold of SPINE_SCAFFOLD_PATTERNS) {
    const indices = items.filter(({ text }) => {
      scaffold.pattern.lastIndex = 0;
      return scaffold.pattern.test(text);
    }).map(({ index }) => index);
    if (indices.length > 1) {
      advisories.push({
        category: "spine_scaffold_repetition",
        detail: scaffold.id,
        count: indices.length,
        indices,
        advisory: true,
        ownerReviewRequired: true
      });
    }
  }
  return {
    passed: violations.length === 0,
    violations,
    advisories,
    counts: {
      negationPivots,
      negationPivotsByPage,
      negationPivotSetCap
    }
  };
}

export {
  ANCHOR_PATTERNS,
  DEFAULT_BANNED,
  DEFAULT_BATCH_CONSTRUCTION_CAP,
  HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS,
  HOUSE_BLEED_NOUNS,
  NEGATION_PIVOT_PAGE_CAP,
  NEGATION_PIVOT_PATTERNS,
  NEGATION_PIVOT_SET_CAP,
  SCENE_NOUNS,
  SPINE_SCAFFOLD_PATTERNS,
  STOCK_TROPES,
  SYNONYM_REDUNDANCY_PAIRS
};
