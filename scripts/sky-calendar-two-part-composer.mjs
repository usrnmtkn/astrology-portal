#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditSkyCalendarFrameUniqueness,
  constructionSkeleton,
  splitSentences,
} from "./sky-calendar-frame-uniqueness.mjs";
import {
  MissingRequiredRealizationError,
  requiredRealizationGap,
  selectRealizationForAspect,
} from "./sky-calendar-realization-types.mjs";
import { assertExactComponentApproval } from "./sky-calendar-component-approval.mjs";
import {
  assertSkyCalendarServingAuthorization,
  loadSkyCalendarServingAuthorization,
} from "./sky-calendar-serving-authorization.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_COMPONENT_REGISTRY = path.join(
  moduleRoot,
  "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/sky-calendar-meaning-components-v1.json",
);

const planets = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "lilith",
];
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra",
  "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];
const aspects = ["conjunction", "opposition", "square", "trine", "sextile"];
const modalities = ["cardinal", "fixed", "mutable"];
const elements = ["fire", "earth", "air", "water"];
const entryModes = [
  "concrete_situation",
  "person_and_action",
  "new_fact",
  "consequence",
  "contradiction",
  "decision_point",
];
const closingFunctions = [
  "consequence",
  "practical_distinction",
  "direct_action",
  "condition",
  "unresolved_tension",
  "question",
];

const aspectLabels = {
  conjunction: "conjunct",
  opposition: "opposite",
  square: "square",
  trine: "trine",
  sextile: "sextile",
};

export const ASPECT_ARGUMENT_SHAPES = {
  opposition: {
    sequence: ["competing_positions", "explicit_disagreement", "neither_ignored", "terms_move"],
    description: "Competing positions become explicit; neither can be ignored, so the terms between them must move.",
  },
  square: {
    sequence: ["colliding_demands", "practical_problem", "workaround_fails", "friction_point_changes"],
    description: "Two demands collide; a practical problem appears, working around it stops working, and the point of friction must change.",
  },
  conjunction: {
    sequence: ["concerns_merge", "shared_meaning", "distinction_blurs", "separate_or_integrate"],
    description: "Two concerns merge; one starts carrying the meaning of both, so they must be separated or consciously integrated.",
  },
  trine: {
    sequence: ["conditions_support", "progress_eases", "weak_assumption_hidden", "opening_with_check"],
    description: "Two conditions support the same move; progress becomes easier, but the opening still needs its practical check.",
  },
  sextile: {
    sequence: ["opening_available", "new_option", "action_required", "workable_next_step"],
    description: "An opening becomes available; a new option appears, somebody has to act, and the workable next step matters.",
  },
};

const FORECAST_BEAT_KEYS = [
  "whatMayHappen",
  "whatItTurnsInto",
  "howItBehaves",
  "whatCanMove",
];
const DETAILS_BEAT_KEYS = ["whatMayHappen", "whyItMatters", "whyItSticksOrMoves"];
const CAUSAL_SITUATION_KEYS = [
  "concreteTensionOrOpening",
  "likelyObservableEvent",
  "practicalConsequence",
  "persistenceOrMovementBehavior",
  "movableOrActionablePart",
];

const sceneDomains = {
  home_household: ["home", "household", "rent", "repair", "room", "lease"],
  commuting_transit: ["commute", "train", "bus", "traffic", "route", "travel"],
  money_bills: ["bill", "billing", "budget", "payment", "price", "fee", "money"],
  school_study: ["school", "class", "student", "course", "exam", "study"],
  healthcare: ["clinic", "doctor", "patient", "appointment", "treatment", "health"],
  shops_services: ["shop", "store", "customer", "service", "order", "refund"],
  online_media: ["online", "post", "comment", "account", "media", "platform"],
  civic_neighborhood: ["council", "policy", "neighborhood", "public", "permit", "rule"],
  family_caretaking: ["family", "child", "parent", "care", "caretaking", "relative"],
  friendship_social: ["friend", "party", "invitation", "social", "gathering", "plan"],
  paid_work: ["staff", "manager", "shift", "deadline", "office", "workplace", "job"],
};

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function normalizeSentence(value) {
  return normalizeWhitespace(value).replace(/[.!?]+$/u, "").toLowerCase();
}

function titleCase(value) {
  const text = normalizeWhitespace(value);
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function unitSha256(unit) {
  return sha256(JSON.stringify(canonicalJson(unit)));
}

function indexByKey(units) {
  return new Map(units.map((unit) => [unit.key, unit]));
}

function addCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedDistribution(map) {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

export function loadSkyCalendarComponentRegistry(registryPath = DEFAULT_COMPONENT_REGISTRY) {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function exactTransitLabel(input) {
  return `${titleCase(input.planetA)} in ${titleCase(input.signA)} ${aspectLabels[input.aspect]} ${titleCase(input.planetB)} in ${titleCase(input.signB)}.`;
}

function resolveHowKey(input) {
  if (!input.how) return null;
  if (input.how.type === "modality") return `sky-how/modality/${input.modalityA}/${input.modalityB}`;
  if (input.how.type === "element") return `sky-how/element/${input.elementA}/${input.elementB}`;
  throw new Error(`${input.key ?? "card"}: how.type must be modality, element, or null`);
}

function validateInputVocabulary(input) {
  const fields = [
    ["planetA", planets], ["planetB", planets], ["signA", signs], ["signB", signs],
    ["aspect", aspects], ["modalityA", modalities], ["modalityB", modalities],
    ["elementA", elements], ["elementB", elements],
  ];
  for (const [field, allowed] of fields) {
    if (!allowed.includes(input[field])) {
      throw new Error(`${input.key ?? "card"}: unsupported ${field} ${JSON.stringify(input[field])}`);
    }
  }
}

export function resolveSkyCalendarComponents(registry, input) {
  validateInputVocabulary(input);
  const signIndex = indexByKey(registry.signUnits);
  const aspectIndex = indexByKey(registry.aspectMechanisms);
  const howIndex = indexByKey([...registry.modalityUnits, ...registry.elementUnits]);
  const keys = {
    placementA: `sky-sign/${input.planetA}/${input.signA}`,
    placementB: `sky-sign/${input.planetB}/${input.signB}`,
    aspect: `sky-aspect-mechanism/${input.aspect}`,
    how: resolveHowKey(input),
  };
  const units = {
    placementA: signIndex.get(keys.placementA),
    placementB: signIndex.get(keys.placementB),
    aspect: aspectIndex.get(keys.aspect),
    ...(keys.how ? { how: howIndex.get(keys.how) } : {}),
  };
  for (const [slot, unit] of Object.entries(units)) {
    if (!unit) throw new Error(`${input.key ?? "card"}: missing ${slot} component ${keys[slot]}`);
  }
  const gaps = Object.entries(units)
    .map(([slot, unit]) => requiredRealizationGap(unit, input.aspect, slot))
    .filter(Boolean);
  if (gaps.length > 0) throw new MissingRequiredRealizationError(gaps);
  const realizationSelections = Object.fromEntries(Object.entries(units).map(([slot, unit]) => [
    slot,
    selectRealizationForAspect(unit, input.aspect, `${input.key ?? "card"}|${slot}`),
  ]));
  return { keys, units, realizationSelections };
}

function allComponentProse(units) {
  const values = [];
  for (const unit of Object.values(units)) {
    for (const [field, value] of Object.entries(unit)) {
      if (["key", "source_ids", "source_hashes", "owner_review_status"].includes(field)) continue;
      if (typeof value === "string") values.push(value);
      if (Array.isArray(value)) values.push(...value.filter((item) => typeof item === "string"));
    }
  }
  return values;
}

function assertSupportKeys(items, resolvedKeys, cardKey, label) {
  const allowed = new Set(Object.values(resolvedKeys).filter(Boolean));
  for (const item of items) {
    if (!Array.isArray(item.supportKeys) || item.supportKeys.length === 0) {
      throw new Error(`${cardKey}: ${label} must cite at least one resolved component key`);
    }
    for (const supportKey of item.supportKeys) {
      if (!allowed.has(supportKey)) {
        throw new Error(`${cardKey}: ${label} cites unresolved component ${supportKey}`);
      }
    }
  }
}

function validateCausalSituation(specification, resolved) {
  const situation = specification.causalSituation;
  for (const key of CAUSAL_SITUATION_KEYS) {
    const item = situation?.[key];
    const value = normalizeWhitespace(item?.value);
    if (!value) throw new Error(`${specification.contentKey}: causalSituation.${key} is required`);
    if (/[.!?]$/u.test(value)) {
      throw new Error(`${specification.contentKey}: causalSituation.${key} must remain a meaning phrase, not prose`);
    }
    if (value.split(/\s+/u).length > 24) {
      throw new Error(`${specification.contentKey}: causalSituation.${key} exceeds the 24-word meaning limit`);
    }
  }
  assertSupportKeys(
    CAUSAL_SITUATION_KEYS.map((key) => situation[key]),
    resolved.keys,
    specification.contentKey,
    "causal situation",
  );
}

function sentenceText(sentence, label) {
  const text = normalizeWhitespace(sentence?.text);
  if (!text) throw new Error(`${label} must contain text`);
  return /[.!?]$/u.test(text) ? text : `${text}.`;
}

function validateSentenceRealization(specification, resolved) {
  const forecast = specification.realization?.forecastSentences;
  const details = specification.realization?.detailsSentences;
  if (!Array.isArray(forecast) || forecast.length < 2 || forecast.length > 5) {
    throw new Error(`${specification.contentKey}: forecast must contain 2 to 5 sentences`);
  }
  if (!Array.isArray(details) || details.length < 2 || details.length > 4) {
    throw new Error(`${specification.contentKey}: Details explanation must contain 2 to 4 sentences after the transit label`);
  }
  assertSupportKeys(forecast, resolved.keys, specification.contentKey, "forecast sentence");
  assertSupportKeys(details, resolved.keys, specification.contentKey, "Details sentence");

  const forecastCoverage = new Map(FORECAST_BEAT_KEYS.map((beat) => [beat, []]));
  forecast.forEach((sentence, index) => {
    if (!Array.isArray(sentence.beats) || sentence.beats.length === 0) {
      throw new Error(`${specification.contentKey}: forecast sentence ${index + 1} must carry a hidden beat`);
    }
    for (const beat of sentence.beats) {
      if (!forecastCoverage.has(beat)) throw new Error(`${specification.contentKey}: unknown forecast beat ${beat}`);
      forecastCoverage.get(beat).push(index);
    }
  });
  for (const [beat, indexes] of forecastCoverage) {
    if (indexes.length === 0) throw new Error(`${specification.contentKey}: forecast is missing ${beat}`);
  }
  if (!forecast[0].beats.includes("whatMayHappen")) {
    throw new Error(`${specification.contentKey}: the event must be understandable before explanation or strategy`);
  }

  const detailsCoverage = new Map(DETAILS_BEAT_KEYS.map((beat) => [beat, []]));
  details.forEach((sentence, index) => {
    if (!Array.isArray(sentence.beats) || sentence.beats.length === 0) {
      throw new Error(`${specification.contentKey}: Details sentence ${index + 1} must carry a reader-order beat`);
    }
    for (const beat of sentence.beats) {
      if (!detailsCoverage.has(beat)) throw new Error(`${specification.contentKey}: Details may not render ${beat}`);
      detailsCoverage.get(beat).push(index);
    }
  });
  let previous = -1;
  for (const beat of DETAILS_BEAT_KEYS) {
    const indexes = detailsCoverage.get(beat);
    if (indexes.length === 0) throw new Error(`${specification.contentKey}: Details is missing ${beat}`);
    const first = indexes[0];
    if (first < previous) throw new Error(`${specification.contentKey}: Details beats are out of reader order`);
    previous = first;
  }
  return { forecastCoverage, detailsCoverage };
}

export function composeSkyCalendarTwoPartCard(
  registry,
  specification,
  {
    reviewMode = false,
    servingMode = false,
    servingAuthorization = null,
    repoRoot = moduleRoot,
  } = {},
) {
  const key = specification.contentKey;
  if (!entryModes.includes(specification.entryMode)) throw new Error(`${key}: unsupported entryMode`);
  if (!closingFunctions.includes(specification.closingFunction)) throw new Error(`${key}: unsupported closingFunction`);
  const resolved = resolveSkyCalendarComponents(registry, { ...specification.input, key });
  const approvalErrors = [];
  for (const unit of Object.values(resolved.units)) {
    try {
      assertExactComponentApproval(unit);
    } catch (error) {
      approvalErrors.push(error);
    }
  }
  const componentsApproved = approvalErrors.length === 0;
  if (!componentsApproved && !reviewMode) {
    throw new Error(`${key}: component approval is incomplete; composer fails closed (${approvalErrors[0]?.message})`);
  }
  const servingAuthorizationMetadata = servingMode
    ? {
      servingAuthorization: true,
      ...assertSkyCalendarServingAuthorization(
        registry,
        servingAuthorization ?? loadSkyCalendarServingAuthorization(),
        { repoRoot },
      ),
    }
    : false;

  validateCausalSituation(specification, resolved);
  const { forecastCoverage, detailsCoverage } = validateSentenceRealization(specification, resolved);
  const forecastSentences = specification.realization.forecastSentences.map((sentence, index) => ({
    ...sentence,
    text: sentenceText(sentence, `${key}.forecastSentences[${index}]`),
  }));
  const detailsSentences = specification.realization.detailsSentences.map((sentence, index) => ({
    ...sentence,
    text: sentenceText(sentence, `${key}.detailsSentences[${index}]`),
  }));
  const forecast = forecastSentences.map((sentence) => sentence.text).join(" ");
  const detailsTransitLabel = exactTransitLabel(specification.input);
  const details = [detailsTransitLabel, ...detailsSentences.map((sentence) => sentence.text)].join(" ");

  return {
    contentKey: key,
    status: servingMode ? "COMPOSER AUTHORIZED" : "PENDING OWNER",
    generationAllowed: servingMode,
    servingAuthorization: servingAuthorizationMetadata,
    reviewMode,
    componentApprovalComplete: componentsApproved,
    classification: specification.classification,
    entryMode: specification.entryMode,
    closingFunction: specification.closingFunction,
    argumentShape: {
      aspect: specification.input.aspect,
      ...ASPECT_ARGUMENT_SHAPES[specification.input.aspect],
    },
    causalSituation: specification.causalSituation,
    inputs: {
      placements: [
        { planet: specification.input.planetA, sign: specification.input.signA },
        { planet: specification.input.planetB, sign: specification.input.signB },
      ],
      aspect: specification.input.aspect,
      how: specification.input.how ?? null,
      componentKeys: resolved.keys,
      componentSha256: Object.fromEntries(Object.entries(resolved.units).map(([slot, unit]) => [slot, unitSha256(unit)])),
      componentStatuses: Object.fromEntries(Object.entries(resolved.units).map(([slot, unit]) => [slot, unit.owner_review_status])),
      realizationSelections: resolved.realizationSelections,
    },
    forecast,
    forecastRenderedPreview: `${normalizeWhitespace(specification.forecastLeadIn)} ${forecast}`,
    forecastSentences,
    forecastBeats: Object.fromEntries([...forecastCoverage.entries()]),
    detailsTransitLabel,
    details,
    detailsSentences,
    detailsBeats: Object.fromEntries([...detailsCoverage.entries()]),
    componentProseForGate: allComponentProse(resolved.units),
  };
}

function addDefect(defects, code, detail = {}) {
  defects.push({ code, ...detail });
}

function findSceneDomains(sentence) {
  const lowered = sentence.toLowerCase();
  return Object.entries(sceneDomains)
    .filter(([, terms]) => terms.some((term) => new RegExp(`\\b${term.replaceAll(" ", "\\s+")}s?\\b`, "u").test(lowered)))
    .map(([domain]) => domain);
}

function auditSceneMenus(text, defects) {
  for (const sentence of splitSentences(text)) {
    const domains = findSceneDomains(sentence);
    const listLike = /;|,\s+(?:or|and)\s+/iu.test(sentence) || (sentence.match(/,/gu)?.length ?? 0) >= 2;
    const sceneVerb = /\b(?:stretches|moves|changes|cancels|closes|opens|delays|arrives|leaves|calls|posts|charges|refuses|approves|rejects|revises|gets revised|is revised)\b/iu;
    const actedSegments = sentence.split(/[,;]|\b(?:and|or)\b/iu).filter((segment) => sceneVerb.test(segment)).length;
    if (listLike && new Set(domains).size >= 2 && actedSegments >= 2) {
      addDefect(defects, "alternative_scene_menu", { sentence, domains: [...new Set(domains)] });
    }
  }
}

function auditRegister(card, defects) {
  const forecast = card.forecast;
  const allText = `${card.forecast} ${card.details}`;
  const forbiddenForecast = [...planets, ...signs, ...aspects, ...modalities, ...elements, "transit", "orb"];
  for (const term of forbiddenForecast) {
    if (new RegExp(`\\b${term}\\b`, "iu").test(forecast)) {
      addDefect(defects, "forecast_contains_astrology_vocabulary", { term });
    }
  }
  const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu;
  const forecastSentenceTexts = Array.isArray(card.forecastSentences)
    ? card.forecastSentences.map((sentence) => sentence.text)
    : splitSentences(card.forecast);
  const whatCanMoveIndexes = new Set(card.forecastBeats?.whatCanMove ?? []);
  forecastSentenceTexts.forEach((sentence, index) => {
    if (secondPerson.test(sentence) && !whatCanMoveIndexes.has(index)) {
      addDefect(defects, "second_person_outside_direct_guidance", { surface: "forecast", sentence, index });
    }
  });
  if (secondPerson.test(card.details)) {
    addDefect(defects, "second_person_outside_direct_guidance", { surface: "details" });
  }
  if (/\b(?:tend(?:s)?\s+to|usually|always|typically|by nature)\b/iu.test(allText)) addDefect(defects, "standing_pattern_register");
  if (/\b(?:you should|should try|remember to|give yourself permission|allow yourself)\b/iu.test(allText)) addDefect(defects, "generic_coaching_register");
  if (/steady/iu.test(allText)) addDefect(defects, "banned_word_steady");
  if (/—/u.test(allText)) addDefect(defects, "em_dash");
  if (!/^[\x00-\x7F]*$/u.test(allText)) addDefect(defects, "non_ascii");
  if (!/^[a-z]/u.test(forecast)) addDefect(defects, "forecast_storage_boundary_not_lowercase");
}

function auditNaturalLanguage(card, defects) {
  const allText = `${card.forecast} ${card.details}`;
  if (/\bpeople\b/iu.test(allText)) addDefect(defects, "generic_people");
  if (/\bcapacity\b/iu.test(allText)) addDefect(defects, "vague_capacity");
  if (/\bmaterial(?:s)?\b/iu.test(allText)) addDefect(defects, "vague_material");
  if (/\b(?:the option|the plan|the agreement) (?:wants|refuses|decides|moves on its own|asks|believes)\b/iu.test(allText)) {
    addDefect(defects, "personified_abstraction");
  }
  if (/\b(?:secretly|deep down|really wants|believe cannot be replaced|afraid to)\b/iu.test(allText)) {
    addDefect(defects, "invented_motive");
  }
  if (/\b(?:situation|condition|dynamic|pressure) (?:may|can|becomes|creates|causes)\b/iu.test(card.forecast)) {
    addDefect(defects, "abstract_subject_where_actor_available");
  }
  const modalCounts = Object.fromEntries(["may", "might", "could", "can", "likely"].map((modal) => [
    modal,
    (card.forecast.match(new RegExp(`\\b${modal}\\b`, "giu")) ?? []).length,
  ]));
  const repeatedModal = Object.entries(modalCounts).find(([, count]) => count > 2);
  if (repeatedModal) addDefect(defects, "repeated_modal_hedging", { modal: repeatedModal[0], count: repeatedModal[1], cap: 2 });
  if (/;\s*expressed through\b|\b(?:planet function|sign expression|movement bias)\b/iu.test(allText)) {
    addDefect(defects, "component_stitching_language");
  }
}

function auditAstrologyExplanation(card, defects) {
  const detailsWithoutLabel = splitSentences(card.details).slice(1).join(" ");
  if (/\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith)\b[^.!?]{0,45}\b(?:refuses|decides|wants|argues|insists|invites|rewards|punishes|teaches)\b/u.test(detailsWithoutLabel)) {
    addDefect(defects, "planet_narrated_as_character");
  }
  if (/\bThe (?:conjunction|opposition|square|trine|sextile) (?:opens|turns|places)\b/u.test(detailsWithoutLabel)) {
    addDefect(defects, "detachable_aspect_formula");
  }
}

function significantWords(value) {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "because", "both", "but", "by", "can", "for", "from", "has", "in", "is", "it", "its", "may", "of", "on", "or", "that", "the", "their", "them", "this", "to", "while", "with"]);
  return new Set(normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9' ]/gu, " ").split(/\s+/u).filter((word) => word.length > 2 && !stop.has(word)));
}

function similarity(left, right) {
  const a = significantWords(left);
  const b = significantWords(right);
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function auditDetails(card, defects) {
  const sentences = splitSentences(card.details);
  if (sentences[0] !== card.detailsTransitLabel) addDefect(defects, "details_transit_label_not_first");
  if (splitSentences(card.forecast).length < 2 || splitSentences(card.forecast).length > 5) {
    addDefect(defects, "forecast_sentence_count", { expected: "2-5", actual: splitSentences(card.forecast).length });
  }
  if (sentences.length < 3 || sentences.length > 5) {
    addDefect(defects, "details_sentence_count", { expected: "label plus 2-4", actual: sentences.length });
  }
  if (Object.hasOwn(card.detailsBeats, "whatCanMove")) addDefect(defects, "details_repeats_forecast_conclusion");
  for (const forecastSentence of splitSentences(card.forecast)) {
    for (const detailsSentence of sentences.slice(1)) {
      if (similarity(forecastSentence, detailsSentence) >= 0.9) {
        addDefect(defects, "details_paraphrases_forecast", { forecastSentence, detailsSentence });
      }
    }
  }
  const why = card.detailsSentences.find((sentence) => sentence.beats.includes("whyItMatters"))?.text ?? "";
  for (const value of [card.inputs.placements[0].planet, card.inputs.placements[0].sign, card.inputs.placements[1].planet, card.inputs.placements[1].sign]) {
    if (!new RegExp(`\\b${value}\\b`, "iu").test(why)) addDefect(defects, "details_missing_placement_mechanism", { value });
  }
  const behavior = card.detailsSentences.find((sentence) => sentence.beats.includes("whyItSticksOrMoves"))?.text ?? "";
  const aspectWords = [card.inputs.aspect, aspectLabels[card.inputs.aspect]].filter(Boolean).join("|");
  if (!new RegExp(`\\b(?:${aspectWords})\\b`, "iu").test(behavior)) {
    addDefect(defects, "details_missing_aspect_mechanism");
  }
}

function wordList(value) {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "because", "both", "but", "by", "can", "for", "from", "has", "in", "is", "it", "its", "may", "of", "on", "or", "that", "the", "their", "them", "this", "to", "while", "with"]);
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9' ]/gu, " ").split(/\s+/u).filter((word) => word.length > 2 && !stop.has(word));
}

function containment(componentText, sentence) {
  const component = new Set(wordList(componentText));
  if (component.size === 0) return 0;
  const produced = new Set(wordList(sentence));
  const shared = [...component].filter((word) => produced.has(word)).length;
  return shared / component.size;
}

function longestSharedRun(componentText, sentence) {
  const left = wordList(componentText);
  const right = wordList(sentence);
  let best = 0;
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      let run = 0;
      while (i + run < left.length && j + run < right.length && left[i + run] === right[j + run]) run += 1;
      if (run > best) best = run;
    }
  }
  return best;
}

export const NEAR_VERBATIM_CONTAINMENT_THRESHOLD = 0.5;
export const NEAR_VERBATIM_RUN_THRESHOLD = 5;
export const NEAR_VERBATIM_MIN_COMPONENT_WORDS = 6;
export const NEAR_VERBATIM_SUPPORTING_RUN = 0;

function auditComponentEmission(card, defects) {
  const components = new Set(card.componentProseForGate.map(normalizeSentence).filter((value) => value.length >= 12));
  const componentTexts = card.componentProseForGate.filter((value) => wordList(value).length >= 4);
  for (const [surface, text] of [["forecast", card.forecast], ["details", card.details]]) {
    for (const sentence of splitSentences(text)) {
      if (components.has(normalizeSentence(sentence))) addDefect(defects, "verbatim_component_sentence", { surface, sentence });
      for (const componentText of componentTexts) {
        const share = containment(componentText, sentence);
        const run = longestSharedRun(componentText, sentence);
        const componentWords = wordList(componentText).length;
        const pastedRun = run >= NEAR_VERBATIM_RUN_THRESHOLD;
        const reassembled = share >= NEAR_VERBATIM_CONTAINMENT_THRESHOLD
          && componentWords >= NEAR_VERBATIM_MIN_COMPONENT_WORDS
          && run >= NEAR_VERBATIM_SUPPORTING_RUN;
        if (pastedRun || reassembled) {
          addDefect(defects, "near_verbatim_component_sentence", {
            surface,
            sentence,
            component: componentText,
            containment: Number(share.toFixed(3)),
            longestSharedRun: run,
          });
        }
      }
    }
  }
}

function auditBaselineUniqueness(card, baselineSentenceSet, defects) {
  for (const [surface, text] of [["forecast", card.forecast], ["details", card.details]]) {
    for (const sentence of splitSentences(text)) {
      if (baselineSentenceSet.has(normalizeSentence(sentence))) addDefect(defects, "sentence_matches_live_corpus", { surface, sentence });
    }
  }
}

function frameCounts(texts, { details = false } = {}) {
  const counts = new Map();
  for (const text of texts) {
    const sentences = splitSentences(text);
    const opener = details && sentences.length > 1 ? sentences[1] : sentences[0];
    if (!opener) continue;
    addCount(counts, constructionSkeleton(opener));
  }
  return counts;
}

export function classifySkyCalendarOpener(text) {
  const opener = splitSentences(text)[0] ?? "";
  if (/^Someone\s+(?:asks|controls|names|shows|brings|sets|puts|takes|finds|notices|realizes)\b/iu.test(opener)) return "someone_direct_action";
  if (/^Someone may\b/iu.test(opener)) return "someone_may";
  if (/^One new\b[^.!?]*\bcan\b/iu.test(opener)) return "new_fact_can";
  if (/^(?:A|An|The)\b[^.!?]*\bmay\b/iu.test(opener)) return "determiner_noun_may";
  if (/^(?:A|An|The)\b[^.!?]*\bcan\b/iu.test(opener)) return "determiner_noun_can";
  if (/^(?:A|An|The)\b/iu.test(opener)) return "determiner_direct_statement";
  if (/^(?:If|When|Once|Because)\b/iu.test(opener)) return "consequence_first";
  if (/^(?:But|Yet|Although)\b/iu.test(opener)) return "contrast";
  if (/^(?:Put|Go|Test|Name|Write|Check|Separate|Compare|Ask)\b/u.test(opener)) return "imperative";
  if (/\bmay\b/iu.test(opener)) return "x_may_y";
  return "direct_statement";
}

export function classifySkyCalendarClosing(text) {
  const sentences = splitSentences(text);
  const last = sentences.at(-1) ?? "";
  const previous = sentences.at(-2) ?? "";
  if (/\?$/.test(last)) return "question";
  if (/^(?:Put|Go|Test|Name|Write|Check|Separate|Compare|Ask)\b/u.test(last)) return "direct_action";
  if (/^If\b/iu.test(last)) return "consequence";
  if (/\b(?:works|clears|changes|moves|gets clearer) once\b|\bonly when\b/iu.test(last)) return "condition";
  if (/^What can (?:move|change) is\b/iu.test(last)) return "practical_distinction";
  if (/^(?:The useful question|The distinction|What matters is|It is which)\b/iu.test(previous) || /^(?:The useful question|The distinction|What matters is|It is which)\b/iu.test(last)) return "practical_distinction";
  return "unresolved_tension";
}

function extractColonListSignature(text) {
  return splitSentences(text)
    .filter((sentence) => /:\s*[^,]+,\s*[^,]+,\s*(?:and|or)\s+[^.]+/iu.test(sentence))
    .map((sentence) => normalizeSentence(sentence.slice(sentence.indexOf(":") + 1)));
}

function auditClosingAndShape(card, defects) {
  const openerFamily = classifySkyCalendarOpener(card.forecast);
  const closingFamily = classifySkyCalendarClosing(card.forecast);
  if (closingFamily !== card.closingFunction) {
    addDefect(defects, "closing_function_mismatch", { declared: card.closingFunction, detected: closingFamily });
  }
  const forecastLists = extractColonListSignature(card.forecast);
  const detailsLists = extractColonListSignature(card.details);
  for (const signature of forecastLists) {
    if (detailsLists.includes(signature)) addDefect(defects, "details_repeats_forecast_closing_list", { signature });
  }
  return { openerFamily, closingFamily };
}

export function loadLiveSkyReaderBodies(root = moduleRoot) {
  const directory = path.join(root, "packages/astro-knowledge/data/transits");
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")))
    .filter((record) => record.status === "LIVE" && normalizeWhitespace(record.readerCopy?.body))
    .map((record) => ({ key: record.id, body: normalizeWhitespace(record.readerCopy.body) }));
}

export function auditSkyCalendarTwoPartCards(cards, {
  baselineBodies = [],
  frameCap = 4,
} = {}) {
  const baselineSentenceSet = new Set(baselineBodies.flatMap((entry) => splitSentences(entry.body)).map(normalizeSentence));
  const baselineForecastFrames = frameCounts(baselineBodies.map((entry) => entry.body));
  const openerFamilies = new Map();
  const closingFamilies = new Map();
  const entryModeCounts = new Map();
  const colonListSignatures = new Map();
  const moveTemplateFamilies = new Map();

  const cardReports = cards.map((card) => {
    const defects = [];
    auditRegister(card, defects);
    auditNaturalLanguage(card, defects);
    auditAstrologyExplanation(card, defects);
    auditDetails(card, defects);
    auditComponentEmission(card, defects);
    auditBaselineUniqueness(card, baselineSentenceSet, defects);
    auditSceneMenus(card.forecast, defects);
    auditSceneMenus(card.details, defects);
    const { openerFamily, closingFamily } = auditClosingAndShape(card, defects);
    addCount(openerFamilies, openerFamily);
    addCount(closingFamilies, closingFamily);
    addCount(entryModeCounts, card.entryMode);
    if (/\bWhat can (?:move|change) is\b/iu.test(card.forecast)) addCount(moveTemplateFamilies, "what_can_move_or_change_is");
    for (const signature of extractColonListSignature(card.forecast)) addCount(colonListSignatures, signature);

    const frame = constructionSkeleton(splitSentences(card.forecast)[0]);
    const projectedFrameUses = (baselineForecastFrames.get(frame) ?? 0) + 1;
    if (projectedFrameUses > frameCap) {
      addDefect(defects, "forecast_opener_frame_cap_against_live_corpus", { frame, frameCap, projectedFrameUses });
    }
    const machineAuthorized = (
      card.status === "COMPOSER AUTHORIZED"
      && card.generationAllowed === true
      && card.servingAuthorization?.servingAuthorization === true
    );
    const exactCardApproved = card.status === "OWNER APPROVED" && card.generationAllowed === true;
    const expectedGovernanceBlock = !card.componentApprovalComplete
      ? "components_pending_owner"
      : (!machineAuthorized && !exactCardApproved ? "card_pending_owner" : null);
    return {
      contentKey: card.contentKey,
      openerFamily,
      closingFamily,
      entryMode: card.entryMode,
      constructionPass: defects.length === 0,
      servingEligible: expectedGovernanceBlock === null && defects.length === 0,
      expectedGovernanceBlock,
      defects,
    };
  });

  const batchShapeCap = cards.length >= 8 ? Math.floor(cards.length * 0.25) : cards.length === 6 ? 2 : Math.max(1, Math.ceil(cards.length * 0.34));
  const batchDefects = [];
  for (const [familyName, counts] of [["opener_family", openerFamilies], ["closing_family", closingFamilies], ["entry_mode", entryModeCounts]]) {
    for (const [family, count] of counts) {
      if (count > batchShapeCap) batchDefects.push({ code: `${familyName}_batch_cap`, family, count, cap: batchShapeCap });
    }
  }
  for (const [signature, count] of colonListSignatures) {
    if (count > 1) batchDefects.push({ code: "repeated_colon_three_item_list", signature, count, cap: 1 });
  }
  for (const [family, count] of moveTemplateFamilies) {
    if (count > batchShapeCap) batchDefects.push({ code: "what_can_move_sentence_template_batch_cap", family, count, cap: batchShapeCap });
  }

  const frameReport = auditSkyCalendarFrameUniqueness(cards, {
    cap: frameCap,
    componentValues: cards.flatMap((card) => card.componentProseForGate),
  });
  const frameDefectsByKey = new Map();
  for (const defect of frameReport.defects) {
    const keys = new Set((defect.occurrences ?? []).map((occurrence) => occurrence.key).filter(Boolean));
    for (const key of keys) {
      if (!frameDefectsByKey.has(key)) frameDefectsByKey.set(key, []);
      frameDefectsByKey.get(key).push(defect);
    }
  }
  for (const report of cardReports) {
    report.defects.push(...(frameDefectsByKey.get(report.contentKey) ?? []));
    report.constructionPass = report.defects.length === 0;
    report.servingEligible = report.constructionPass && report.expectedGovernanceBlock === null;
  }

  return {
    pass: batchDefects.length === 0 && cardReports.every((report) => report.constructionPass),
    servingEligible: batchDefects.length === 0 && cardReports.every((report) => report.servingEligible),
    cardCount: cards.length,
    baselineBodyCount: baselineBodies.length,
    frameCap,
    batchShapeCap,
    batchDefects,
    shapeDistribution: {
      openerFamilies: sortedDistribution(openerFamilies),
      closingFamilies: sortedDistribution(closingFamilies),
      entryModes: sortedDistribution(entryModeCounts),
      colonThreeItemLists: sortedDistribution(colonListSignatures),
      moveTemplates: sortedDistribution(moveTemplateFamilies),
    },
    frameDistribution: frameReport.frames,
    cardReports,
  };
}
