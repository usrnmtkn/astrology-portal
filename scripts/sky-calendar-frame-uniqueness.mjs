#!/usr/bin/env node

import fs from "node:fs";

export const DEFAULT_FRAME_CAP = 4;

const functionWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "both", "but",
  "by", "can", "coming", "does", "either", "for", "from", "gets", "has",
  "have", "if", "in", "into", "is", "it", "its", "likely", "may", "more",
  "neither", "not", "of", "on", "once", "or", "rather", "same", "so", "somebody",
  "someone", "than", "that", "the", "their", "them", "then", "there", "these",
  "this", "those", "through", "to", "under", "until", "when", "while", "who",
  "will", "with", "without", "what", "which", "why",
]);

const forecastBeatKeys = [
  "whatMayHappen",
  "whatItTurnsInto",
  "howItBehaves",
  "whatCanMove",
];

const detailsBeatKeys = [
  "whatMayHappen",
  "whyItMatters",
  "whyItSticksOrMoves",
];

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}
export function splitSentences(value) {
  return normalizeWhitespace(value)
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function removeDateLeadIn(value) {
  return value.replace(
    /^on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+[a-z]+\s+\d{1,2},?\s*/iu,
    "",
  );
}

export function constructionSkeleton(value, tokenLimit = 14) {
  const tokens = removeDateLeadIn(normalizeWhitespace(value).toLowerCase())
    .replace(/[^a-z0-9' ]+/gu, " ")
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, tokenLimit)
    .map((token) => functionWords.has(token) ? token : "*");
  return tokens.join(" ").replace(/(?:\*\s+){2,}/gu, "* ").trim();
}

function addOccurrence(map, key, occurrence) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(occurrence);
}

function cardKey(card, index) {
  return String(card.contentKey ?? card.key ?? `card-${index + 1}`);
}

function verifyBeats(card, key, field, requiredBeatKeys, defects) {
  const beats = card[field];
  if (!beats || typeof beats !== "object") {
    defects.push({ code: "missing_beat_metadata", key, field });
    return;
  }
  for (const beat of requiredBeatKeys) {
    const value = beats[beat];
    const present = Array.isArray(value) ? value.length > 0 : Boolean(normalizeWhitespace(value));
    if (!present) {
      defects.push({ code: "missing_required_beat", key, field, beat });
    }
  }
}

export function auditSkyCalendarFrameUniqueness(cards, {
  cap = DEFAULT_FRAME_CAP,
  componentValues = [],
  requireBeatMetadata = true,
} = {}) {
  if (!Array.isArray(cards)) throw new TypeError("cards must be an array");
  const exactSentences = new Map();
  const forecastOpeners = new Map();
  const detailsOpeners = new Map();
  const connectives = new Map();
  const defects = [];

  cards.forEach((card, index) => {
    const key = cardKey(card, index);
    const forecast = normalizeWhitespace(card.forecast ?? card.forecastBody);
    const details = normalizeWhitespace(card.details ?? card.detailsBody);
    if (!forecast) defects.push({ code: "missing_forecast", key });
    if (!details) defects.push({ code: "missing_details", key });
    if (requireBeatMetadata) {
      verifyBeats(card, key, "forecastBeats", forecastBeatKeys, defects);
      verifyBeats(card, key, "detailsBeats", detailsBeatKeys, defects);
    }

    for (const [surface, text] of [["forecast", forecast], ["details", details]]) {
      const allSentences = splitSentences(text);
      const transitLabel = normalizeWhitespace(card.detailsTransitLabel).toLowerCase();
      const sentences = surface === "details" && transitLabel && allSentences[0]?.toLowerCase() === transitLabel
        ? allSentences.slice(1)
        : allSentences;
      if (sentences.length === 0) continue;
      addOccurrence(
        surface === "forecast" ? forecastOpeners : detailsOpeners,
        constructionSkeleton(sentences[0]),
        { key, surface, sentence: sentences[0] },
      );
      sentences.forEach((sentence, sentenceIndex) => {
        addOccurrence(exactSentences, normalizeWhitespace(sentence).toLowerCase(), {
          key,
          surface,
          sentenceIndex,
          sentence,
        });
        if (sentenceIndex > 0) {
          addOccurrence(connectives, constructionSkeleton(sentence, 8), {
            key,
            surface,
            sentenceIndex,
            sentence,
          });
        }
      });
      if (surface === "details" && sentences !== allSentences && allSentences[0]) {
        addOccurrence(exactSentences, normalizeWhitespace(allSentences[0]).toLowerCase(), {
          key,
          surface,
          sentenceIndex: -1,
          sentence: allSentences[0],
          structuralLabel: true,
        });
      }
    }
  });

  for (const [sentence, occurrences] of exactSentences) {
    if (occurrences.length > 1) defects.push({ code: "duplicate_sentence", sentence, occurrences });
  }
  for (const [frame, occurrences] of forecastOpeners) {
    if (occurrences.length > cap) defects.push({ code: "forecast_opener_frame_cap", frame, cap, occurrences });
  }
  for (const [frame, occurrences] of detailsOpeners) {
    if (occurrences.length > cap) defects.push({ code: "details_opener_frame_cap", frame, cap, occurrences });
  }
  for (const [frame, occurrences] of connectives) {
    if (occurrences.length > cap) defects.push({ code: "connective_frame_cap", frame, cap, occurrences });
  }

  const normalizedComponents = componentValues
    .map((value) => normalizeWhitespace(value).toLowerCase())
    .filter((value) => value.length >= 20);
  if (normalizedComponents.length > 0) {
    for (const [sentence, occurrences] of exactSentences) {
      if (normalizedComponents.includes(sentence)) {
        defects.push({ code: "verbatim_component_sentence", sentence, occurrences });
      }
    }
  }

  return {
    pass: defects.length === 0,
    cap,
    cardCount: cards.length,
    defects,
    frames: {
      exactSentences: exactSentences.size,
      forecastOpeners: forecastOpeners.size,
      detailsOpeners: detailsOpeners.size,
      connectives: connectives.size,
    },
  };
}

function valueAfter(args, flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2);
  const input = valueAfter(args, "--input");
  if (!input) {
    console.error("Usage: node scripts/sky-calendar-frame-uniqueness.mjs --input <cards.json> [--cap 4]");
    process.exit(2);
  }
  const payload = JSON.parse(fs.readFileSync(input, "utf8"));
  const cards = Array.isArray(payload) ? payload : payload.cards;
  const result = auditSkyCalendarFrameUniqueness(cards, {
    cap: Number(valueAfter(args, "--cap", DEFAULT_FRAME_CAP)),
    componentValues: payload.componentValues ?? [],
    requireBeatMetadata: !args.includes("--skip-beat-metadata"),
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exit(1);
}
