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

const aspectLabels = {
  conjunction: "conjunct",
  opposition: "opposite",
  square: "square",
  trine: "trine",
  sextile: "sextile",
};

const FORECAST_BEAT_KEYS = [
  "whatMayHappen",
  "whatItTurnsInto",
  "howItBehaves",
  "whatCanMove",
];
const DETAILS_BEAT_KEYS = [
  "whatMayHappen",
  "whyItMatters",
  "whyItSticksOrMoves",
  "whatCanMove",
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

export function loadSkyCalendarComponentRegistry(registryPath = DEFAULT_COMPONENT_REGISTRY) {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function exactTransitLabel(input) {
  return `${titleCase(input.planetA)} in ${titleCase(input.signA)} ${aspectLabels[input.aspect]} ${titleCase(input.planetB)} in ${titleCase(input.signB)}.`;
}

function resolveHowKey(input) {
  if (input.how?.type === "modality") {
    return `sky-how/modality/${input.modalityA}/${input.modalityB}`;
  }
  if (input.how?.type === "element") {
    return `sky-how/element/${input.elementA}/${input.elementB}`;
  }
  throw new Error(`${input.key ?? "card"}: how.type must be modality or element`);
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
    how: howIndex.get(keys.how),
  };
  for (const [slot, unit] of Object.entries(units)) {
    if (!unit) throw new Error(`${input.key ?? "card"}: missing ${slot} component ${keys[slot]}`);
  }
  return { keys, units };
}

function checkBeatObject(beats, keys, label) {
  for (const key of keys) {
    if (!normalizeWhitespace(beats?.[key]?.text)) {
      throw new Error(`${label}.${key} must contain text`);
    }
    if (!Array.isArray(beats[key].supportKeys) || beats[key].supportKeys.length === 0) {
      throw new Error(`${label}.${key} must cite at least one resolved component key`);
    }
  }
}

function beatText(beats, key) {
  const value = normalizeWhitespace(beats[key].text);
  return /[.!?]$/u.test(value) ? value : `${value}.`;
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

function assertSupportKeys(realization, resolvedKeys, cardKey) {
  const allowed = new Set(Object.values(resolvedKeys));
  for (const [surface, beatKeys] of [["forecast", FORECAST_BEAT_KEYS], ["details", DETAILS_BEAT_KEYS]]) {
    for (const beat of beatKeys) {
      for (const supportKey of realization[surface][beat].supportKeys) {
        if (!allowed.has(supportKey)) {
          throw new Error(`${cardKey}: ${surface}.${beat} cites unresolved component ${supportKey}`);
        }
      }
    }
  }
}

export function composeSkyCalendarTwoPartCard(registry, specification, { reviewMode = false } = {}) {
  const key = specification.contentKey;
  const resolved = resolveSkyCalendarComponents(registry, { ...specification.input, key });
  const statuses = Object.values(resolved.units).map((unit) => unit.owner_review_status);
  const componentsApproved = statuses.every((status) => status === "OWNER APPROVED");
  if (!componentsApproved && !reviewMode) {
    throw new Error(`${key}: component approval is incomplete; composer fails closed`);
  }

  checkBeatObject(specification.realization?.forecast, FORECAST_BEAT_KEYS, `${key}.forecast`);
  checkBeatObject(specification.realization?.details, DETAILS_BEAT_KEYS, `${key}.details`);
  assertSupportKeys(specification.realization, resolved.keys, key);

  const forecastBeats = Object.fromEntries(FORECAST_BEAT_KEYS.map((beat) => [
    beat,
    beatText(specification.realization.forecast, beat),
  ]));
  const detailsBeats = Object.fromEntries(DETAILS_BEAT_KEYS.map((beat) => [
    beat,
    beatText(specification.realization.details, beat),
  ]));
  const forecast = FORECAST_BEAT_KEYS.map((beat) => forecastBeats[beat]).join(" ");
  const detailsTransitLabel = exactTransitLabel(specification.input);
  const details = [
    detailsTransitLabel,
    ...DETAILS_BEAT_KEYS.map((beat) => detailsBeats[beat]),
  ].join(" ");

  return {
    contentKey: key,
    status: "PENDING OWNER",
    generationAllowed: false,
    reviewMode,
    componentApprovalComplete: componentsApproved,
    classification: specification.classification,
    inputs: {
      placements: [
        { planet: specification.input.planetA, sign: specification.input.signA },
        { planet: specification.input.planetB, sign: specification.input.signB },
      ],
      aspect: specification.input.aspect,
      how: specification.input.how,
      componentKeys: resolved.keys,
      componentSha256: Object.fromEntries(Object.entries(resolved.units).map(([slot, unit]) => [slot, unitSha256(unit)])),
      componentStatuses: Object.fromEntries(Object.entries(resolved.units).map(([slot, unit]) => [slot, unit.owner_review_status])),
    },
    forecast,
    forecastRenderedPreview: `${normalizeWhitespace(specification.forecastLeadIn)} ${forecast}`,
    forecastBeats,
    detailsTransitLabel,
    details,
    detailsBeats,
    supportTrace: {
      forecast: Object.fromEntries(FORECAST_BEAT_KEYS.map((beat) => [beat, specification.realization.forecast[beat].supportKeys])),
      details: Object.fromEntries(DETAILS_BEAT_KEYS.map((beat) => [beat, specification.realization.details[beat].supportKeys])),
    },
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
    if (listLike && new Set(domains).size >= 2) {
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
  if (/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(allText)) {
    addDefect(defects, "second_person_register");
  }
  if (/\b(?:tend(?:s)?\s+to|usually|always|typically|by nature)\b/iu.test(allText)) {
    addDefect(defects, "standing_pattern_register");
  }
  if (/\b(?:you should|should try|remember to|give yourself permission|allow yourself)\b/iu.test(allText)) {
    addDefect(defects, "coaching_register");
  }
  if (/steady/iu.test(allText)) addDefect(defects, "banned_word_steady");
  if (/—/u.test(allText)) addDefect(defects, "em_dash");
  if (!/^[\x00-\x7F]*$/u.test(allText)) addDefect(defects, "non_ascii");
  if (!/^[a-z]/u.test(forecast)) addDefect(defects, "forecast_storage_boundary_not_lowercase");
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

function auditDetails(card, defects) {
  const sentences = splitSentences(card.details);
  if (sentences[0] !== card.detailsTransitLabel) {
    addDefect(defects, "details_transit_label_not_first");
  }
  if (sentences.length !== 5) {
    addDefect(defects, "details_reader_order_sentence_count", { expected: 5, actual: sentences.length });
  }
  if (splitSentences(card.forecast).length !== 4) {
    addDefect(defects, "forecast_reader_order_sentence_count", { expected: 4, actual: splitSentences(card.forecast).length });
  }
  if (!/^(?:What can (?:move|change)|The part that can (?:move|change)|Movement remains possible|The workable change|A change remains possible)/u.test(card.forecastBeats.whatCanMove)) {
    addDefect(defects, "forecast_ending_does_not_state_movement");
  }
  if (!/^(?:What can (?:move|change)|The part that can (?:move|change)|Movement remains possible|The workable change|A change remains possible)/u.test(card.detailsBeats.whatCanMove)) {
    addDefect(defects, "details_ending_does_not_state_movement");
  }
}

function auditComponentEmission(card, defects) {
  const components = new Set(card.componentProseForGate.map(normalizeSentence).filter((value) => value.length >= 12));
  for (const [surface, text] of [["forecast", card.forecast], ["details", card.details]]) {
    for (const sentence of splitSentences(text)) {
      if (components.has(normalizeSentence(sentence))) {
        addDefect(defects, "verbatim_component_sentence", { surface, sentence });
      }
    }
  }
}

function auditBaselineUniqueness(card, baselineSentenceSet, defects) {
  for (const [surface, text] of [["forecast", card.forecast], ["details", card.details]]) {
    for (const sentence of splitSentences(text)) {
      if (baselineSentenceSet.has(normalizeSentence(sentence))) {
        addDefect(defects, "sentence_matches_live_corpus", { surface, sentence });
      }
    }
  }
}

function frameCounts(texts, { details = false } = {}) {
  const counts = new Map();
  for (const text of texts) {
    const sentences = splitSentences(text);
    const opener = details && sentences.length > 1 ? sentences[1] : sentences[0];
    if (!opener) continue;
    const skeleton = constructionSkeleton(opener);
    counts.set(skeleton, (counts.get(skeleton) ?? 0) + 1);
  }
  return counts;
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
  const baselineSentenceSet = new Set(
    baselineBodies.flatMap((entry) => splitSentences(entry.body)).map(normalizeSentence),
  );
  const baselineForecastFrames = frameCounts(baselineBodies.map((entry) => entry.body));
  const cardReports = cards.map((card) => {
    const defects = [];
    auditRegister(card, defects);
    auditAstrologyExplanation(card, defects);
    auditDetails(card, defects);
    auditComponentEmission(card, defects);
    auditBaselineUniqueness(card, baselineSentenceSet, defects);
    auditSceneMenus(card.forecast, defects);
    auditSceneMenus(card.details, defects);
    const frame = constructionSkeleton(splitSentences(card.forecast)[0]);
    const projectedFrameUses = (baselineForecastFrames.get(frame) ?? 0) + 1;
    if (projectedFrameUses > frameCap) {
      addDefect(defects, "forecast_opener_frame_cap_against_live_corpus", { frame, frameCap, projectedFrameUses });
    }
    return {
      contentKey: card.contentKey,
      constructionPass: defects.length === 0,
      servingEligible: card.componentApprovalComplete && defects.length === 0,
      expectedGovernanceBlock: card.componentApprovalComplete ? null : "components_pending_owner",
      defects,
    };
  });

  const frameReport = auditSkyCalendarFrameUniqueness(cards, {
    cap: frameCap,
    componentValues: cards.flatMap((card) => card.componentProseForGate),
  });
  const frameDefectsByKey = new Map();
  for (const defect of frameReport.defects) {
    const keys = new Set(
      (defect.occurrences ?? []).map((occurrence) => occurrence.key).filter(Boolean),
    );
    for (const key of keys) {
      if (!frameDefectsByKey.has(key)) frameDefectsByKey.set(key, []);
      frameDefectsByKey.get(key).push(defect);
    }
  }
  for (const report of cardReports) {
    const defects = frameDefectsByKey.get(report.contentKey) ?? [];
    report.defects.push(...defects);
    report.constructionPass = report.defects.length === 0;
    report.servingEligible = report.constructionPass && report.expectedGovernanceBlock === null;
  }

  return {
    pass: cardReports.every((report) => report.constructionPass),
    servingEligible: cardReports.every((report) => report.servingEligible),
    cardCount: cards.length,
    baselineBodyCount: baselineBodies.length,
    frameCap,
    frameDistribution: frameReport.frames,
    cardReports,
  };
}
