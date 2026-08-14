import { WRITING_POLICY_DATA } from "./policyData.generated.mjs";
import { priorCopyStructuralCorrespondence } from "./authoringSource.mjs";

const DEFAULT_BANNED = [
  "whether",
  "profound",
  "medicine",
  "inner weather",
  "landscape",
  "tapestry",
  "not a passing mood",
  "a chapter, not a",
  ...WRITING_POLICY_DATA.bannedWords,
  ...WRITING_POLICY_DATA.bannedPhrases
];

const STOCK_TROPES = [
  "the dishes",
  "socks on the floor",
  "toothpaste cap",
  "forgotten anniversary",
  "toilet seat"
];

const INTERNAL_GUARD_FIELDS = new Set(["DO_NOT_ASSUME", "do_not_assume"]);

const OBSERVABLE_TERMS = Object.freeze([
  "answer", "appointment", "argument", "ask", "bill", "body", "book", "bring", "budget",
  "calendar", "call", "cancel", "card", "class", "client", "coffee", "conversation", "course",
  "coworker", "deadline", "decision", "document", "drive", "eat", "email", "flight", "food",
  "friend", "game", "hour", "invoice", "job", "meal", "meeting", "message", "money", "pay",
  "plan", "presentation", "project", "purchase", "relationship", "rematch", "reply", "schedule",
  "claim", "source",
  "send", "shift", "sign up", "sleep", "spend", "text", "time", "trip", "volunteer", "work",
  "write", "rewrite", "wash", "leave", "arrive", "finish", "delay", "move", "say", "tell",
  "check", "share", "agree", "refuse", "notice", "show"
]);

const CONCRETE_NOUNS = Object.freeze([
  "answer", "appointment", "argument", "bag", "bank", "bill", "body", "book", "budget", "bus", "calendar",
  "call", "car", "card", "chair", "class", "client", "coffee", "contract", "course", "coworker",
  "claim", "deadline", "desk", "dinner", "document", "dollar", "door", "email", "evidence", "fact", "flight", "food", "form",
  "friend", "game", "hour", "invoice", "job", "kitchen", "lamp", "meal", "meeting", "message",
  "information", "money", "office", "phone", "presentation", "project", "purchase", "receipt", "rematch", "room",
  "schedule", "source", "table", "text", "ticket", "time", "train", "trip", "vehicle", "week", "workout"
]);

const OBSERVABLE_ACTIONS = Object.freeze([
  "answer", "arrive", "ask", "book", "bring", "call", "cancel", "check", "drive", "eat", "finish",
  "leave", "look", "notice", "pay", "read", "reply", "rewrite", "say", "send", "share", "sign",
  "spend", "tell", "volunteer", "wash", "write"
]);

const PERSON_OR_OBSERVER_SUBJECTS = Object.freeze(new Set([
  "i", "you", "he", "she", "they", "we", "it", "name", "people", "person", "someone", "somebody", "anyone", "everyone",
  "nobody", "others", "observer", "observers", "listener", "listeners", "coworker", "coworkers", "colleague", "colleagues", "friend", "friends", "family", "client",
  "clients", "manager", "teacher", "teachers", "partner", "partners", "room", "group", "team", "audience"
]));

function bareAbstractSubject(sentence) {
  const words = String(sentence || "").match(/[A-Za-z']+/gu) || [];
  if (words.length < 2) return null;
  const lowered = words.map((word) => word.toLowerCase());
  if (["a", "an", "the", "this", "that", "these", "those", "your", "their", "our", "my"].includes(lowered[0])) return null;
  if (PERSON_OR_OBSERVER_SUBJECTS.has(lowered[0]) || CONCRETE_NOUNS.includes(lowered[0])) return null;
  let verbIndex = 1;
  if (lowered[1] === "and" && lowered.length >= 4) verbIndex = 3;
  if (["often", "usually", "naturally", "easily", "quickly", "readily"].includes(lowered[verbIndex])) verbIndex += 1;
  const verb = lowered[verbIndex];
  const predicate = lowered.slice(verbIndex, verbIndex + 3);
  const coordinatedQuality = lowered[1] === "and" && ["face", "faces", "support", "supports", "cooperate", "cooperates", "move", "moves"].includes(verb);
  const qualityActs = (["arrive", "arrives"].includes(verb) && /ing$/u.test(lowered[0]))
    || (["move", "moves"].includes(verb) && /ity$/u.test(lowered[0]));
  const causativeIt = ["make", "makes"].includes(verb) && predicate[1] === "it" && predicate[2] === "easy";
  const continuingAction = ["keep", "keeps"].includes(verb) && /ing$/u.test(predicate[1] || "");
  const modalEffect = verb === "can" && ["speed", "accelerate", "drive"].includes(predicate[1]);
  if (!coordinatedQuality && !qualityActs && !causativeIt && !continuingAction && !modalEffect) return null;
  const subject = words.slice(0, verbIndex).join(" ");
  if (subject.split(" ").some((word) => PERSON_OR_OBSERVER_SUBJECTS.has(word.toLowerCase()) || CONCRETE_NOUNS.includes(word.toLowerCase()))) return null;
  return subject;
}

const THERAPY_CLUSTER_TERMS = Object.freeze([
  "empathy", "trauma", "nurturing", "healing", "growth", "potential", "energy", "journey"
]);

const ARCHETYPE_TERMS = Object.freeze([
  "warrior", "warriors", "athlete", "athletes", "rocket fuel", "chariot", "chariots", "blade",
  "blades", "underworld", "catharsis", "death and rebirth", "mysteries of life", "superpower"
]);

const THERAPY_SUMMARY_TERMS = Object.freeze([
  "empathy", "suffering", "trauma", "nurturing", "healing", "fertile potential", "growth",
  "deep bonds", "emotional entanglements", "intuition", "leap of faith", "work ethic"
]);

const GENERIC_ASTROLOGY_SUMMARY_PATTERNS = Object.freeze([
  /\bin this karmic framework\b/iu,
  /\b(?:philosophical|spiritual) lesson\b/iu,
  /\bpast lives?\b/iu,
  /\b(?:the|this) (?:gift|advantage|lesson|deeper path) is\b/iu
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

function hasBanned(text, phrase) {
  const value = String(phrase).toLowerCase();
  if (/^[a-z0-9'-]+$/u.test(value)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "iu").test(text);
  }
  return text.includes(value);
}

export function validateCopy(copy, {
  family = "sky-placement",
  register = "collective",
  plan = null,
  banned = DEFAULT_BANNED,
  expectedPlaceholders = [],
  requiredFields = [],
  protectedOwnerLines = [],
  ownerCorrections = [],
  priorCopy = null
} = {}) {
  const text = copyText(copy);
  const normalized = text.toLowerCase();
  const unprotectedText = protectedOwnerLines.reduce(
    (value, line) => value.split(String(line)).join(" "),
    text
  );
  const unprotectedNormalized = unprotectedText.toLowerCase();
  const violations = [];
  for (const detail of internalGuardLeaks(text, plan)) {
    violations.push({ category: "shared_ban", detail });
  }
  if (text.includes("—")) violations.push({ category: "em_dash", detail: "Em dash is forbidden." });
  for (const phrase of banned) {
    if (hasBanned(unprotectedNormalized, phrase)) violations.push({ category: "banned_language", detail: String(phrase) });
  }
  for (const trope of STOCK_TROPES) {
    if (normalized.includes(trope)) violations.push({ category: "stock_trope", detail: trope });
  }
  if (register === "collective" && /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)) {
    violations.push({ category: "register_consistency", detail: "Collective copy contains second person." });
  }
  if (register === "second_person" && !/\b(?:you|your|yours|yourself)\b/iu.test(text)) {
    violations.push({ category: "register_consistency", detail: "House-core copy requires second person." });
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
  for (const correction of ownerCorrections) {
    if (correction?.bad && text.includes(correction.bad)) {
      violations.push({ category: correction.category, detail: correction.rule ?? correction.why ?? correction.bad });
    }
  }
  const authorFromMechanism = Boolean(plan?.astrology_support ?? plan?.astrologySupport);
  if (authorFromMechanism) {
    const proseSegments = typeof copy === "string"
      ? [copy]
      : Object.entries(copy ?? {})
        .filter(([field, value]) => !INTERNAL_GUARD_FIELDS.has(field) && typeof value === "string")
        .map(([, value]) => value.trim())
        .filter(Boolean);
    const firstSentence = proseSegments[0]?.split(/(?<=[.!?])\s+/u)[0] ?? "";
    const abstractOpeningSubject = bareAbstractSubject(firstSentence);
    const abstractOpening = Boolean(abstractOpeningSubject);
    if (abstractOpening) {
      violations.push({ category: "abstract_noun_subject", detail: `Opening sentence begins from an abstract quality: ${firstSentence}` });
    }
    const traitEntry = proseSegments.find((segment) => /^(?:your (?:creativity|empathy|competitive streak|intuition|work ethic|faith|talent|ability|capacity)\b|your [^.!?]{0,80}\b(?:gives?|allows?|helps?|makes?) you\b|you (?:crave\b|value\b|possess\b|embody\b|radiate\b|have (?:faith|a (?:talent|gift|capacity|tendency|knack))\b|are (?:creative|empathetic|intuitive|competitive)\b)|moments of catharsis\b)/iu.test(segment)) || (abstractOpening ? proseSegments[0] : null);
    if (traitEntry) {
      violations.push({ category: "trait_entry", detail: `Trait-first opening: ${traitEntry.split(/[.!?]/u)[0]}` });
    }
    const hasObservableTerm = OBSERVABLE_TERMS.some((term) => hasBanned(normalized, term));
    const concreteMatches = CONCRETE_NOUNS.filter((term) => hasBanned(normalized, term));
    if (!concreteMatches.length) {
      violations.push({ category: "zero_concrete_nouns", detail: "No concrete noun from the observable set appears in the passage." });
    }
    if (!hasObservableTerm || !concreteMatches.length) {
      violations.push({ category: "photograph_test", detail: "No clause names an action, situation, exchange, object, time, place, or consequence that could be photographed or overheard." });
    }
    if (traitEntry && !hasObservableTerm) {
      violations.push({ category: "astrology_summary", detail: "Trait-first abstract description substitutes for a lived mechanism and consequence." });
    }
    const archetypeMatches = ARCHETYPE_TERMS.filter((term) => hasBanned(normalized, term));
    if (archetypeMatches.length >= 2 || archetypeMatches.some((term) => ["rocket fuel", "underworld", "death and rebirth"].includes(term))) {
      violations.push({ category: "archetype_soup", detail: archetypeMatches.join(", ") });
    }
    const therapyMatches = THERAPY_SUMMARY_TERMS.filter((term) => hasBanned(normalized, term));
    if (therapyMatches.length >= 2 && !hasObservableTerm) {
      violations.push({ category: "astrology_summary", detail: `Abstract or therapy-register summary without lived action: ${therapyMatches.join(", ")}` });
    }
    const sentences = proseSegments.flatMap((segment) => segment.split(/(?<=[.!?])\s+/u)).map((sentence) => sentence.trim()).filter(Boolean);
    for (const sentence of sentences) {
      if (bareAbstractSubject(sentence)) {
        violations.push({ category: "abstract_subject_grammar", detail: `Abstract quality acts as the grammatical subject: ${sentence}` });
      }
      if (/\bhere\b/iu.test(sentence)) {
        violations.push({ category: "chart_deixis", detail: `Deictic "here" points at the chart instead of a lived situation: ${sentence}` });
      }
    }
    for (const sentence of sentences) {
      if (!GENERIC_ASTROLOGY_SUMMARY_PATTERNS.some((pattern) => pattern.test(sentence))) continue;
      violations.push({ category: "astrology_summary", detail: `Generic astrology-summary sentence: ${sentence}` });
      violations.push({ category: "whole_passage_sentence_role", detail: `Sentence does not advance the lived scene, state a specific consequence, or provide necessary astrology-to-life perspective: ${sentence}` });
    }
    for (const paragraph of proseSegments.flatMap((segment) => segment.split(/\n\s*\n/gu)).filter(Boolean)) {
      const normalizedParagraph = paragraph.toLowerCase();
      const cluster = THERAPY_CLUSTER_TERMS.filter((term) => hasBanned(normalizedParagraph, term));
      const hasAction = OBSERVABLE_ACTIONS.some((term) => hasBanned(normalizedParagraph, term));
      if (cluster.length >= 2 && !hasAction) {
        violations.push({ category: "therapy_register_cluster", detail: `Therapy-register cluster without observable action: ${cluster.join(", ")}` });
      }
    }
  }
  const priorMatch = priorCopyStructuralCorrespondence(text, priorCopy);
  if (priorMatch.matched) {
    violations.push({ category: "paraphrase_of_prior", detail: `${priorMatch.reason} (${priorMatch.score.toFixed(3)})` });
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
  return { passed: violations.length === 0, violations };
}

export {
  ARCHETYPE_TERMS,
  CONCRETE_NOUNS,
  DEFAULT_BANNED,
  HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS,
  HOUSE_BLEED_NOUNS,
  GENERIC_ASTROLOGY_SUMMARY_PATTERNS,
  OBSERVABLE_TERMS,
  OBSERVABLE_ACTIONS,
  STOCK_TROPES,
  THERAPY_CLUSTER_TERMS,
  THERAPY_SUMMARY_TERMS
};
