#!/usr/bin/env node
//
// Voice linter for sky placement (planet-in-sign) articles.
// Mirrors scripts/lint-sky-voice.js for the placement surface. Reads:
//   - voice/banned-words.json               (meaning-level bans, also fail here)
//   - voice/banned-constructions.json       (banned contrast-reveal formulas)
//   - voice/tldr-astro/sky-placement.json   (output bans, three-beat shape, pace)
//
// An article is the three slots { hook, lived, turn }. Scores 1-3:
// fails -> 1, warns -> 2, clean -> 3. Structural checks that the spec states
// as ranges (sentence counts, pace mention) are advisory NOTES, not score
// hits, because the approved exemplars themselves vary; the judge covers taste.
//
// Usage:
//   node scripts/lint-placement-voice.js '{"hook":"...","lived":"...","turn":"..."}'
//   node scripts/lint-placement-voice.js --exemplars    (lint every embedded exemplar)

const fs = require("fs");
const path = require("path");

const voiceRoot = path.join(__dirname, "..", "voice");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const bannedWords = readJson(path.join(voiceRoot, "banned-words.json")).bannedWords || [];
const bannedConstructions = readJson(path.join(voiceRoot, "banned-constructions.json")).bannedConstructions || [];
const spec = readJson(path.join(voiceRoot, "tldr-astro", "sky-placement.json"));
const planetCycleFacts = readJson(path.join(voiceRoot, "..", "data", "modifiers", "planet-cycle-facts.json"));
const compiledPolicy = readJson(path.join(voiceRoot, "tldr-astro", "linter-policy.generated.json"));
const { findBannedConstructions } = require("./banned-construction-matcher.js");

const compiledRules = compiledPolicy.rules || [];
const compiledExistingTerms = new Set(compiledRules.flatMap((rule) => rule.mechanical?.existing_terms || []));
const compiledTaglineRule = compiledRules.find((rule) => rule.mechanical?.kind === "tagline_sentence");

const META = /[\\^$.*+?()[\]{}|]/;
function toRegex(term) {
  if (term === "—") return /—/;
  if (META.test(term.replace(/ /g, ""))) return new RegExp(term, "i");
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

const SETTLE_RESOLVE_OBJECT = /\b(?:confusion|issue|question|matter|dispute|argument|conflict|account|debt|case|claim|terms?)\b/iu;

function firstNonResolveSettleMatch(text, pattern) {
  const value = String(text);
  for (const match of value.matchAll(new RegExp(pattern, "gi"))) {
    const before = value.slice(Math.max(0, match.index - 72), match.index);
    const after = value.slice(match.index + match[0].length, match.index + match[0].length + 48);
    const object = after.match(/^\s+(?:the\s+|this\s+|that\s+|an?\s+|one\s+)?([^.,;!?]{1,32})/u)?.[1] || "";
    if (SETTLE_RESOLVE_OBJECT.test(object)) continue;
    if (new RegExp(`${SETTLE_RESOLVE_OBJECT.source}[^.!?]{0,36}\\bto\\s*$`, "iu").test(before)) continue;
    return match;
  }
  return null;
}

const SLOTS = ["hook", "lived", "turn"];
const FACT_GATED_SLOTS = ["priorSignHandoff", "cycleLine", "concurrentEvents", "cycleLocation"];
// CHANI-modeled extended slots (2026-07-27). Optional: the 7 approved trios
// predate them, so they lint only when present. The engine always emits them.
const EXTENDED_SLOTS = ["tagline", "moves"];
const sentencesOf = (text) => (String(text).match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim());

const SIGN_MEME_SCENES = {
  libra: [
    /\bdinner[- ]plan\b/iu,
    /\b(?:restaurant|dinner)\b.{0,100}\b(?:anything|either) is fine\b/isu,
    /\b(?:friends?|group|everyone|nobody|no one)\b.{0,120}\b(?:choose|choosing|pick|picking|decide|deciding)\b.{0,60}\b(?:restaurant|dinner)\b/isu,
    /\b(?:restaurant|dinner)\b.{0,80}\b(?:choose|choosing|pick|picking|decide|deciding|compromise)\b/isu,
    /\binvitations?\b.{0,180}\b(?:calendar|dates?|days?|weeks?|weekends?|plans?|schedul(?:e|es|ed|ing)|arrang(?:e|es|ed|ing)|rearrang(?:e|es|ed|ing))\b/isu,
    /\b(?:calendar|dates?|days?|weeks?|weekends?|plans?|schedul(?:e|es|ed|ing)|arrang(?:e|es|ed|ing)|rearrang(?:e|es|ed|ing))\b.{0,180}\binvitations?\b/isu,
    /\b(?:dates?|days?|weeks?|weekends?|plans?|schedule)\b.{0,120}\b(?:anything|either|everything|it) (?:is|works?|seems?) fine\b/isu
  ],
  virgo: [/\bcolor[- ]coded spreadsheet\b/iu, /\bspreadsheet\b.{0,40}\bcolor[- ]cod(?:e|ed|ing)\b/isu],
  aries: [/\bgym\b/iu, /\bimpulsive haircut\b/iu, /\b(?:cut|cuts|cutting) (?:their|his|her) hair on impulse\b/iu],
  cancer: [/\bbubble bath\b/iu, /\bcancel(?:s|ed|led|ing)? (?:the |their |our )?plans?\b/iu],
  taurus: [/\bretail therapy\b/iu, /\b(?:shopping|retail)[- ]splurge\b/iu, /\bsplurge\b.{0,40}\b(?:shopping|retail|purchase)\b/isu],
  gemini: [/\bdouble[- ]booked calendar\b/iu, /\bcalendar\b.{0,40}\bdouble[- ]book(?:ed|ing)?\b/isu]
};

const SLOW_TRANSIT_PLANETS = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node"]);
const SINGLE_EVENING_LOGISTICS = /\b(?:dinner[- ]plan|where to eat|which restaurant|restaurant choice|quiet dinner|live music nearby|tonight['’]s plan|evening plan)\b/iu;
const MOVES_FACILITATION_TERMS = [
  "must-have", "flexible detail", "decision time", "each side", "proposal", "mutual",
  "negotiate", "negotiates", "negotiated", "negotiating", "stakeholder", "stakeholders",
  "align", "aligns", "aligned", "aligning", "alignment", "action item"
];
const NUMBER_WORDS = new Map([
  ["a", 1], ["an", 1], ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10], ["eleven", 11], ["twelve", 12],
  ["fourteen", 14], ["eighteen", 18], ["twenty", 20], ["twenty-nine", 29], ["thirty-one", 31],
  ["fifty", 50], ["eighty-four", 84], ["one hundred sixty-five", 165], ["two hundred forty-eight", 248]
]);
const DURATION_PATTERN = /\b(?:(?:about|roughly|around|approximately|up to|for)\s+)?(?:a few|two and a half|one hundred sixty-five|two hundred forty-eight|twenty-nine|thirty-one|eighty-four|eighteen|fourteen|twelve|eleven|twenty|fifty|one|two|three|four|five|six|seven|eight|nine|ten|a|an|\d+(?:\.\d+)?)(?:\s+(?:to|or)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|eighteen|twenty|twenty-nine|thirty-one|fifty|eighty-four|\d+(?:\.\d+)?))?\s+(?:days?|weeks?|months?|years?|decades?)\b/giu;
const MONTH_YEAR_PATTERN = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:18|19|20|21)\d{2}\b/gu;
const MONTH_PATTERN = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/gu;
const YEAR_PATTERN = /\b(?:18|19|20|21)\d{2}\b/gu;
const QUALITATIVE_TRANSIT_SUBPERIOD_PATTERN = /\b(?:early in (?:the |this )?(?:transit|residency|cycle)|late in (?:the |this )?(?:transit|residency|cycle)|midway through (?:the |this )?(?:transit|residency|cycle)|by mid-?year)\b/giu;
const DATE_LIKE_ORDINAL_PATTERN = /\b(?:by|on|before|after)\s+the\s+\d{1,2}(?:st|nd|rd|th)\b/giu;
const EVENT_TERMS = new Map([
  ["sun", /\bSun\b/gu], ["moon", /\bMoon\b/gu], ["mercury", /\bMercury\b/gu], ["venus", /\bVenus\b/gu],
  ["mars", /\bMars\b/gu], ["jupiter", /\bJupiter\b/gu], ["saturn", /\bSaturn\b/gu], ["uranus", /\bUranus\b/gu],
  ["neptune", /\bNeptune\b/gu], ["pluto", /\bPluto\b/gu], ["chiron", /\bChiron\b/gu],
  ["north-node", /\bNorth Node\b/gu], ["south-node", /\bSouth Node\b/gu],
  ["solar-eclipse", /\bsolar eclipse\b/giu], ["lunar-eclipse", /\blunar eclipse\b/giu],
  ["new-moon", /\bNew Moon\b/gu], ["full-moon", /\bFull Moon\b/gu]
]);

function escapedTerm(term) {
  return String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flattenFactStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenFactStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenFactStrings);
  return [];
}

function numberValue(raw) {
  const normalized = String(raw).toLowerCase().trim();
  if (normalized === "a few") return null;
  if (normalized === "two and a half") return 2.5;
  if (NUMBER_WORDS.has(normalized)) return NUMBER_WORDS.get(normalized);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function durationSignature(text) {
  const match = String(text).toLowerCase().match(/(a few|two and a half|one hundred sixty-five|two hundred forty-eight|twenty-nine|thirty-one|eighty-four|eighteen|fourteen|twelve|eleven|twenty|fifty|one|two|three|four|five|six|seven|eight|nine|ten|a|an|\d+(?:\.\d+)?)(?:\s+(?:to|or)\s+(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|eighteen|twenty|twenty-nine|thirty-one|fifty|eighty-four|\d+(?:\.\d+)?))?\s+(days?|weeks?|months?|years?|decades?)/u);
  if (!match) return null;
  return {
    min: numberValue(match[1]),
    max: match[2] ? numberValue(match[2]) : numberValue(match[1]),
    vagueFew: match[1] === "a few",
    unit: match[3].replace(/s$/u, "")
  };
}

function durationDays(signature) {
  if (!signature || signature.min == null || signature.max == null) return null;
  const factor = { day: 1, week: 7, month: 30.4375, year: 365.25, decade: 3652.5 }[signature.unit];
  return factor ? { min: signature.min * factor, max: signature.max * factor } : null;
}

function factDurationRanges(text) {
  const value = String(text || "");
  const sameUnitRange = durationSignature(value);
  if (sameUnitRange && sameUnitRange.min !== sameUnitRange.max) {
    const range = durationDays(sameUnitRange);
    if (range) return [range];
  }
  const atomic = /\b(a few|two and a half|one hundred sixty-five|two hundred forty-eight|twenty-nine|thirty-one|eighty-four|eighteen|fourteen|twelve|eleven|twenty|fifty|one|two|three|four|five|six|seven|eight|nine|ten|a|an|\d+(?:\.\d+)?)\s+(days?|weeks?|months?|years?|decades?)\b/giu;
  const signatures = [...value.matchAll(atomic)].map((match) => durationDays({
    min: numberValue(match[1]),
    max: numberValue(match[1]),
    unit: match[2].toLowerCase().replace(/s$/u, "")
  })).filter(Boolean);
  if (signatures.length >= 2 && /\b(?:to|or)\b/iu.test(value)) {
    return [{ min: Math.min(signatures[0].min, signatures.at(-1).min), max: Math.max(signatures[0].max, signatures.at(-1).max) }];
  }
  return signatures;
}

function durationTracesToCycle(claim, planet) {
  const target = durationSignature(claim);
  const fact = planetCycleFacts.planets?.[planet];
  if (!target || !fact) return false;
  const fields = [fact.zodiacCircuit, fact.typicalSignStay, fact.variabilityNote].filter(Boolean);
  if (target.vagueFew) return fields.some((value) => String(value).toLowerCase().includes(target.unit));
  const targetDays = durationDays(target);
  if (!targetDays) return false;
  return fields.flatMap(factDurationRanges).some((entry) => targetDays.min >= entry.min && targetDays.max <= entry.max);
}

function reviewedResidencyRanges(planet) {
  if (!["REVIEWED", "LIVE", "APPROVED"].includes(String(planetCycleFacts.status || "").toUpperCase())) return [];
  const fact = planetCycleFacts.planets?.[planet];
  if (!fact?.typicalSignStay) return [];
  return factDurationRanges(fact.typicalSignStay);
}

function qualitativeSubperiodCapDays(claim) {
  const normalized = String(claim || "").toLowerCase().trim();
  const duration = durationSignature(normalized);
  if (duration?.vagueFew) {
    const factor = { day: 1, week: 7, month: 30.4375, year: 365.25, decade: 3652.5 }[duration.unit];
    return factor ? factor * 3 : null;
  }
  if (/\bby mid-?year\b/iu.test(normalized)) return 365.25 / 2;
  if (/\b(?:early in|late in|midway through)\b/iu.test(normalized)) return 0;
  return null;
}

function qualitativeSubperiodTracesToResidency(claim, planet) {
  const capDays = qualitativeSubperiodCapDays(claim);
  if (capDays == null) return false;
  return reviewedResidencyRanges(planet).some((range) => capDays <= range.min);
}

function isPositionalSubperiod(text, index, claim) {
  const before = text.slice(Math.max(0, index - 24), index);
  const after = text.slice(index + claim.length, index + claim.length + 48);
  return /\b(?:after|within|by)\s*$/iu.test(before)
    || /^\s+(?:in|into)(?=\s*[,.;:!?]|\s+(?:the |this )?(?:transit|residency|cycle)\b)/iu.test(after);
}

function suppliedFactContains(claim, factContext) {
  const normalizedClaim = String(claim).toLowerCase().replace(/\s+/gu, " ").trim();
  return flattenFactStrings(factContext).some((value) => String(value).toLowerCase().replace(/\s+/gu, " ").includes(normalizedClaim));
}

function sentenceAround(text, index) {
  const before = text.lastIndexOf(".", index);
  const afterCandidates = [text.indexOf(".", index), text.indexOf("!", index), text.indexOf("?", index)].filter((value) => value >= 0);
  const after = afterCandidates.length ? Math.min(...afterCandidates) : text.length;
  return text.slice(before + 1, after + 1).trim();
}

function addTemporalTraceFindings({ full, planet, factContext, findings }) {
  const withoutTokens = full.replace(/\{\{[A-Za-z][A-Za-z0-9_]*\}\}/gu, "");
  const dateClaims = [...withoutTokens.matchAll(MONTH_YEAR_PATTERN)].map((entry) => entry[0]);
  const dateYears = new Set(dateClaims.flatMap((claim) => [...claim.matchAll(YEAR_PATTERN)].map((entry) => entry[0])));
  const dateMonths = new Set(dateClaims.flatMap((claim) => [...claim.matchAll(MONTH_PATTERN)].map((entry) => entry[0].toLowerCase())));
  for (const claim of dateClaims) {
    if (suppliedFactContains(claim, factContext)) continue;
    findings.push({ severity: "fail", source: "fact-trace", term: "untraced-date", match: claim, reason: "Every month or year must trace to a supplied engine fact or a render token." });
  }
  for (const match of withoutTokens.matchAll(DATE_LIKE_ORDINAL_PATTERN)) {
    const claim = match[0];
    if (suppliedFactContains(claim, factContext)) continue;
    findings.push({ severity: "fail", source: "fact-trace", term: "untraced-date-like-subperiod", match: claim, reason: "Numeric or date-like subperiods require an explicit engine fact or render token." });
  }
  for (const match of withoutTokens.matchAll(MONTH_PATTERN)) {
    const claim = match[0];
    if (dateMonths.has(claim.toLowerCase()) || suppliedFactContains(claim, factContext)) continue;
    findings.push({ severity: "fail", source: "fact-trace", term: "untraced-month", match: claim, reason: "Every month must trace to a supplied engine fact or a render token." });
  }
  for (const match of withoutTokens.matchAll(YEAR_PATTERN)) {
    const claim = match[0];
    if (dateYears.has(claim) || suppliedFactContains(claim, factContext)) continue;
    findings.push({ severity: "fail", source: "fact-trace", term: "untraced-year", match: claim, reason: "Every year must trace to a supplied engine fact or a render token." });
  }
  for (const match of withoutTokens.matchAll(QUALITATIVE_TRANSIT_SUBPERIOD_PATTERN)) {
    const claim = match[0];
    if (qualitativeSubperiodTracesToResidency(claim, planet) || suppliedFactContains(claim, factContext)) continue;
    findings.push({ severity: "fail", source: "fact-trace", term: "untraced-subperiod", match: claim, reason: "A qualitative transit subperiod must fit inside a reviewed residency fact." });
  }
  for (const match of withoutTokens.matchAll(DURATION_PATTERN)) {
    const claim = match[0];
    const sentence = sentenceAround(withoutTokens, match.index || 0);
    const isAstrologicalDuration = /\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|North Node|South Node|planet|transit|cycle|zodiac|sign|residency|retrograde|ingress)\b/iu.test(sentence)
      || /^\s*(?:for|over|during)\b/iu.test(sentence);
    if (!isAstrologicalDuration) continue;
    if (isPositionalSubperiod(withoutTokens, match.index || 0, claim)) {
      const duration = durationSignature(claim);
      if (duration?.vagueFew && qualitativeSubperiodTracesToResidency(claim, planet)) continue;
      if (suppliedFactContains(claim, factContext)) continue;
      findings.push({ severity: "fail", source: "fact-trace", term: "untraced-subperiod", match: claim, reason: "Numeric or date-like subperiods require an explicit engine fact; qualitative subperiods must fit inside a reviewed residency." });
      continue;
    }
    if (durationTracesToCycle(claim, planet) || suppliedFactContains(claim, factContext)) continue;
    findings.push({ severity: "fail", source: "fact-trace", term: "untraced-duration", match: claim, reason: "Every duration must trace to planet-cycle-facts.json or a supplied engine fact." });
  }
}

function addConcurrentEventFindings({ concurrentEvents, factContext, findings }) {
  if (!concurrentEvents) return;
  const supplied = Array.isArray(factContext?.eventsDuringTransit) ? factContext.eventsDuringTransit : [];
  if (!supplied.length) {
    findings.push({ severity: "fail", source: "fact-trace", slot: "concurrentEvents", term: "unsupplied-concurrent-event", match: concurrentEvents, reason: "Concurrent-event copy requires an engine-ranked eventsDuringTransit fact." });
    return;
  }
  const suppliedText = flattenFactStrings(supplied).join(" ").toLowerCase().replace(/[_\s]+/gu, "-");
  for (const [term, pattern] of EVENT_TERMS) {
    if (!pattern.test(concurrentEvents)) continue;
    pattern.lastIndex = 0;
    if (suppliedText.includes(term)) continue;
    findings.push({ severity: "fail", source: "fact-trace", slot: "concurrentEvents", term: "event-not-supplied", match: term, reason: "The concurrent-events paragraph names an event absent from eventsDuringTransit." });
  }
}

function compiledRuleApplies(rule) {
  const labels = [...(rule.scope?.surfaces || []), ...(rule.scope?.prohibited || [])];
  return labels.some((label) => ["sky-placement", "current-sky", "all-reader-copy", "all-editorial-copy", "all-generated-copy", "all-generated-astrology-copy", "sky-placement-tagline"].includes(label));
}

function addCompiledFinding(findings, rule, match, slot = null) {
  findings.push({
    severity: rule.mechanical.severity || "fail",
    source: "compiled-editorial-decision",
    decisionId: rule.id,
    slot,
    term: rule.mechanical.kind,
    match,
    reason: rule.mechanical.message || rule.rule
  });
}

function applyCompiledRules({ full, tagline, findings, allowLegacyTagline = false, allowLegacyGenericPeople = false, allowLegacySecondPerson = false, allowLegacyRepeatedGenericPerson = false, allowLegacyPerformanceFraming = false }) {
  for (const rule of compiledRules) {
    if (!compiledRuleApplies(rule) || !rule.mechanical) continue;
    if (allowLegacyGenericPeople && rule.id === "CF-001") continue;
    if (allowLegacySecondPerson && rule.id === "ED-003") continue;
    if (allowLegacyRepeatedGenericPerson && rule.id === "CF-013") continue;
    if (allowLegacyPerformanceFraming && rule.id === "CF-002") continue;
    const mechanical = rule.mechanical;
    if (mechanical.kind === "tagline_sentence") {
      if (allowLegacyTagline) continue;
      if (tagline == null) continue;
      const count = tagline.split(/\s+/u).filter(Boolean).length;
      if (count < mechanical.min_words || count > mechanical.max_words) addCompiledFinding(findings, rule, tagline, "tagline");
      continue;
    }
    if (mechanical.kind === "tagline_regex") {
      if (tagline == null) continue;
      const match = tagline.match(new RegExp(mechanical.pattern, mechanical.flags || "i"));
      if (match) addCompiledFinding(findings, rule, match[0], "tagline");
      continue;
    }
    if (mechanical.kind === "regex" || mechanical.kind === "regex_with_literal_exception") {
      const flags = [...new Set(`${mechanical.flags || ""}g`)].join("");
      const pattern = new RegExp(mechanical.pattern, flags);
      let match;
      while ((match = pattern.exec(full)) !== null) {
        if (mechanical.kind === "regex_with_literal_exception" && mechanical.literal_context_pattern) {
          const context = full.slice(Math.max(0, match.index - 60), Math.min(full.length, match.index + match[0].length + 60));
          if (new RegExp(mechanical.literal_context_pattern, "i").test(context)) continue;
        }
        addCompiledFinding(findings, rule, match[0]);
      }
      continue;
    }
    if (mechanical.kind === "regex_count") {
      const flags = [...new Set(`${mechanical.flags || ""}g`)].join("");
      const matches = [...full.matchAll(new RegExp(mechanical.pattern, flags))];
      if (matches.length >= (mechanical.min_occurrences || 2)) {
        addCompiledFinding(findings, rule, `${matches.length} occurrences: ${matches.map((entry) => entry[0]).join(", ")}`);
      }
      continue;
    }
    if (mechanical.kind === "term_set") {
      for (const term of mechanical.terms || []) {
        const match = full.match(new RegExp(`\\b${escapedTerm(term)}\\b`, "i"));
        if (match) addCompiledFinding(findings, rule, match[0]);
      }
      continue;
    }
    if (mechanical.kind === "dated_communication") {
      for (const term of mechanical.terms || []) {
        const pattern = new RegExp(`\\b${escapedTerm(term)}\\b`, "i");
        const match = full.match(pattern);
        if (!match) continue;
        if (/^letters?$/iu.test(term) && mechanical.literal_context_pattern) {
          const context = full.slice(Math.max(0, match.index - 48), Math.min(full.length, match.index + match[0].length + 64));
          if (new RegExp(mechanical.literal_context_pattern, "i").test(context)) continue;
        }
        addCompiledFinding(findings, rule, match[0]);
      }
    }
  }
}

// { hook, lived, turn, tagline?, moves?, planet?, sign?, allowLegacySecondPerson?, allowLegacyGenericPeople? }
// -> { score, fails, warns, findings, notes }
function lintArticle(article) {
  const findings = [];
  const notes = [];
  const slots = {};
  for (const slot of SLOTS) slots[slot] = String(article?.[slot] ?? "").trim();
  const tagline = article?.tagline != null ? String(article.tagline).trim() : null;
  const close = article?.close != null ? String(article.close).trim() : null;
  const moves = Array.isArray(article?.moves) ? article.moves.map((m) => String(m).trim()).filter(Boolean) : null;
  const factGated = Object.fromEntries(FACT_GATED_SLOTS.map((slot) => [slot, String(article?.[slot] ?? "").trim()]));
  const full = [
    ...SLOTS.map((s) => slots[s]),
    close ?? "",
    tagline ?? "",
    ...(moves ?? []),
    ...FACT_GATED_SLOTS.map((slot) => factGated[slot])
  ].filter(Boolean).join("\n\n");
  const centralScene = SLOTS.map((slot) => slots[slot]).filter(Boolean).join("\n\n");
  const planet = article?.planet ? String(article.planet).toLowerCase() : null;
  const sign = article?.sign ? String(article.sign).toLowerCase() : null;

  // Current Sky is collective. Historical originals live in a separate fixture
  // file and never enter this active linter path. Transit-to-natal copy belongs
  // to a different surface and linter.
  if (!article?.allowLegacySecondPerson) {
    const secondPerson = full.match(/\b(?:you|your|yours|yourself|yourselves|you(?:'|’)?re|you(?:'|’)?ve|you(?:'|’)?ll|you(?:'|’)?d)\b/i);
    if (secondPerson) {
      findings.push({
        severity: "fail",
        source: "current-sky-person",
        term: "second-person",
        match: secondPerson[0],
        reason: "Current Sky placement copy is collective; second person belongs to transit-to-natal copy"
      });
    }
  }

  // -- missing slots are hard fails: the renderer needs all three.
  for (const slot of SLOTS) {
    if (!slots[slot]) {
      findings.push({ severity: "fail", source: "shape", slot, term: "missing-slot", reason: `the ${slot} slot is empty` });
    }
  }

  // -- reader boundary: no dates/degrees (the computed aspect line owns timing
  //    facts), no editorial metadata leaking into copy.
  const boundary = [
    { term: "degree/orb mechanics", pattern: /\b(?:orb|degrees?)\b|°/i, reason: "degrees and orb mechanics never appear in the article body" },
    { term: "editorial metadata", pattern: /\b(?:provenance|linter|lint score|editorial status|draft status|review queue)\b/i, reason: "reader copy must not expose editorial state" }
  ];
  for (const check of boundary) {
    const m = full.match(check.pattern);
    if (m) findings.push({ severity: "fail", source: "reader-boundary", term: check.term, match: m[0], reason: check.reason });
  }
  if (!article?.allowLegacyUntracedTiming) {
    addTemporalTraceFindings({ full, planet, factContext: article?.factContext || {}, findings });
  }
  addConcurrentEventFindings({ concurrentEvents: factGated.concurrentEvents, factContext: article?.factContext || {}, findings });

  const appositivePlanetDefinition = full.match(/\b(?:the )?(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|North Node|South Node)\s*,\s*the planet of\b[^.!?]*/iu);
  if (appositivePlanetDefinition) findings.push({
    severity: "fail",
    source: "banned-constructions",
    term: "appositive-planet-definition",
    match: appositivePlanetDefinition[0],
    reason: "Use the planet's name and show its function; do not attach a CC-style planet epithet."
  });

  for (const name of spec.excludedStructures?.culturalHistory?.knownCelebrityNamesForMechanicalCheck || []) {
    const match = full.match(new RegExp(`\\b${escapedTerm(name)}\\b`, "iu"));
    if (match) findings.push({
      severity: "fail",
      source: "excluded-cultural-history",
      term: "celebrity-reference",
      match: match[0],
      reason: "Celebrity and pop-culture examples are excluded from Sky Placement history and cycle copy."
    });
  }

  // -- meaning-level banned words are fails in output too
  for (const b of bannedWords) {
    const term = typeof b === "string" ? b : b.term;
    if (!term) continue;
    const m = full.match(toRegex(term));
    if (m) findings.push({ severity: "fail", source: "banned-words", term, match: m[0] });
  }

  findings.push(...findBannedConstructions(full, bannedConstructions));

  applyCompiledRules({
    full,
    tagline,
    findings,
    allowLegacyTagline: article?.allowLegacyTagline === true,
    allowLegacyGenericPeople: article?.allowLegacyGenericPeople === true,
    allowLegacySecondPerson: article?.allowLegacySecondPerson === true,
    allowLegacyRepeatedGenericPerson: article?.allowLegacyRepeatedGenericPerson === true,
    allowLegacyPerformanceFraming: article?.allowLegacyPerformanceFraming === true
  });

  // OV-039: named sign memes are deterministic only when the matching sign is
  // supplied. ED-022 governs the central hook/lived/turn sequence, not isolated
  // practical moves. Novel sign cliches and broader transit-scale judgment
  // remain in Terra's lane.
  for (const pattern of SIGN_MEME_SCENES[sign] || []) {
    const match = centralScene.match(pattern);
    if (!match) continue;
    findings.push({
      severity: "fail",
      source: "sign-conditional-meme-scene",
      decisionId: "ED-022",
      term: `${sign}-stock-scene`,
      match: match[0],
      reason: "This is a stock sign scene rather than a sequence derived from this placement at this transit's scale."
    });
    break;
  }
  if (planet && SLOW_TRANSIT_PLANETS.has(planet)) {
    const match = centralScene.match(SINGLE_EVENING_LOGISTICS);
    if (match) findings.push({
      severity: "fail",
      source: "transit-scale",
      decisionId: "ED-022",
      term: "single-evening-logistics",
      match: match[0],
      reason: `${planet} moves too slowly for one evening's logistics to carry the article's stakes.`
    });
  }

  // Moves are deliberately checked in isolation. These terms can be literal
  // elsewhere, but in a moves list they turn ordinary action into a workshop.
  if (moves !== null) {
    const movesText = moves.join("\n");
    for (const term of MOVES_FACILITATION_TERMS) {
      const match = movesText.match(new RegExp(`\\b${escapedTerm(term)}\\b`, "iu"));
      if (!match) continue;
      findings.push({
        severity: "fail",
        source: "moves-facilitation-register",
        decisionId: "ED-023",
        slot: "moves",
        term,
        match: match[0],
        reason: "Moves must sound like an ordinary action, not facilitation or project-management instructions."
      });
    }
  }

  // Known first-read natural-English failures are deterministic. Broader
  // personification families remain judge territory; only reviewed literals
  // and their narrow grammatical variants belong here.
  for (const pattern of spec.severityRules?.firstReadNaturalEnglish?.mechanicalFailPatterns || []) {
    const m = full.match(new RegExp(pattern, "i"));
    if (m) {
      findings.push({
        severity: "fail",
        source: "first-read-natural-english",
        term: "opaque-personification",
        match: m[0],
        reason: "central phrasing does not make literal sense on the first read"
      });
    }
  }

  // -- surface bans from sky-placement.json
  for (const b of spec.outputBans.fail) {
    if (compiledExistingTerms.has(b.term)) continue;
    if (article?.allowLegacySecondPerson && b.term === "\\bperform(ance|ing|s|ed)?\\b") continue;
    if (article?.allowLegacyGenericPeople && b.term === "\\bpeople\\b") continue;
    const m = full.match(toRegex(b.term));
    if (m) findings.push({ severity: "fail", source: "sky-placement", term: b.term, match: m[0], reason: b.reason });
  }
  for (const b of spec.outputBans.warn) {
    let m = full.match(toRegex(b.term));
    if (m && b.term === "\\bsettl(e|es|ing)\\b(?! for)") {
      m = firstNonResolveSettleMatch(full, b.term);
    }
    if (m && b.term === "\\bletters?\\b") {
      const context = full.slice(Math.max(0, m.index - 24), Math.min(full.length, m.index + m[0].length + 32));
      if (/\b(?:paper|physical|mailed|handwritten) letters?\b|\bletters?\s+(?:arriv(?:e|es|ed)|(?:come|comes|came))\s+(?:by|in) (?:the )?(?:mail|post)\b/i.test(context)) continue;
    }
    if (m) findings.push({ severity: "warn", source: "sky-placement", term: b.term, match: m[0], reason: b.reason });
  }

  // -- conditional bans (term allowed only if a qualifier appears before it)
  for (const c of spec.conditionalBans || []) {
    if (compiledExistingTerms.has(c.term)) continue;
    const m = full.match(toRegex(c.term));
    if (m) {
      const before = full.slice(0, m.index).toLowerCase();
      const ok = (c.requiresBefore || []).some((w) => new RegExp(`\\b${w}\\b`, "i").test(before));
      if (!ok) findings.push({ severity: "fail", source: "sky-placement", term: c.term, match: m[0], reason: c.reason });
    }
  }

  // -- kumbaya closer: the turn must end on bite, not a blessing.
  const turnSentences = sentencesOf(slots.turn);
  const lastLine = turnSentences[turnSentences.length - 1] || "";
  if (/^(may (you|we|this)|go (gently|softly)|be (gentle|kind) (with|to) yourself|remember( that)? you are)/i.test(lastLine.trim())) {
    findings.push({ severity: "fail", source: "shape", term: "blessing-close", match: lastLine, reason: "no sign-off blessing; end on the line with the most bite" });
  }

  // -- extended slots (only when present)
  if (tagline !== null) {
    if (!compiledTaglineRule) {
      const tagWords = tagline.split(/\s+/).filter(Boolean).length;
      if (tagWords < 2 || tagWords > 5) {
        findings.push({ severity: "fail", source: "shape", slot: "tagline", term: "tagline-length", match: tagline, reason: "tagline is 2-5 words" });
      }
      if (/[.!?]$/.test(tagline)) {
        findings.push({ severity: "warn", source: "shape", slot: "tagline", term: "tagline-period", match: tagline, reason: "no terminal punctuation on the tagline" });
      }
    }
  }
  if (moves !== null) {
    if (moves.length < 2 || moves.length > 3) {
      findings.push({ severity: "fail", source: "shape", slot: "moves", term: "moves-count", match: `${moves.length} moves`, reason: "2-3 moves, each one sentence" });
    }
    for (const m of moves) {
      if (sentencesOf(m).length > 1 || m.split(/\s+/).filter(Boolean).length > 32) {
        findings.push({ severity: "warn", source: "shape", slot: "moves", term: "move-length", match: m.slice(0, 60), reason: "each move is one short, doable sentence" });
      }
    }
  }

  // -- structural advisories (spec ranges; exemplars set the tolerance)
  const hookS = sentencesOf(slots.hook);
  const livedS = sentencesOf(slots.lived);
  if (hookS.length < 2) {
    findings.push({
      severity: "fail",
      source: "shape",
      slot: "hook",
      term: "missing-meaning-after-quote",
      match: slots.hook,
      reason: "hook sentence 1 renders as a standalone quote; at least one sentence must remain for the planet-plus-sign meaning paragraph"
    });
  }
  if (hookS.length > 4) notes.push(`hook is ${hookS.length} sentences; spec says 2-4`);
  if (livedS.length < 2 || livedS.length > 4) notes.push(`lived is ${livedS.length} sentences; spec says 2-4`);
  if (turnSentences.length < 2 || turnSentences.length > 5) notes.push(`turn is ${turnSentences.length} sentences; spec says 2-5 with one close`);
  const hookWords = slots.hook.split(/\s+/).filter(Boolean).length;
  if (hookWords > 70) notes.push(`hook is long (${hookWords} words); the hook is the sendable line, not a paragraph`);
  if (lastLine.split(/\s+/).filter(Boolean).length > 22) notes.push("closer is long; end on a shorter line with bite");

  // Cycle pace is engine-owned and renders under the date range. Prose may carry
  // duration when it adds meaning, but absence is no longer an article warning.

  // stacked ending: 3+ short sentences piled at the close of the turn
  let closeRun = 0;
  for (let i = turnSentences.length - 1; i >= 0; i--) {
    if (turnSentences[i].split(/\s+/).filter(Boolean).length <= 11) closeRun++;
    else break;
  }
  if (closeRun >= 3) {
    findings.push({ severity: "warn", source: "shape", term: "stacked-ending", match: `${closeRun} short closing sentences`, reason: "land one truth with bite, not a pile of aphorisms" });
  }

  const fails = findings.filter((f) => f.severity === "fail").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  let score = 3;
  if (warns >= 1) score = 2;
  if (fails >= 1) score = 1;
  return { score, fails, warns, findings, notes };
}

function articleTextForBatch(entry) {
  const article = entry?.article || entry || {};
  return [
    article.opening,
    article.hook,
    article.tension,
    article.lived,
    article.development,
    article.turn,
    article.close,
    ...(article.try_this || article.moves || [])
  ].filter(Boolean).join("\n");
}

function lintBatchRepetition(entries) {
  const policy = spec.batchRepetitionPolicy?.groupChat;
  const occurrences = (entries || []).flatMap((entry, index) => [...articleTextForBatch(entry).matchAll(/\bgroup chat\b/giu)].map((match) => ({
    index,
    id: entry?.id || entry?.runId || (entry?.target?.planet && entry?.target?.sign ? `${entry.target.planet}-${entry.target.sign}` : `article-${index + 1}`),
    match: match[0]
  })));
  const max = Number(policy?.maxOccurrencesPerBatch ?? 1);
  const findings = occurrences.length > max ? [{
    severity: policy?.severityWhenExceeded || "fail",
    source: "batch-repetition",
    term: policy?.term || "group chat",
    match: `${occurrences.length} occurrences across ${new Set(occurrences.map((entry) => entry.index)).size} articles`,
    reason: policy?.reason || "At most one group chat occurrence is allowed per batch.",
    occurrences
  }] : [];
  return {
    passed: findings.length === 0,
    maxOccurrences: max,
    occurrenceCount: occurrences.length,
    occurrences,
    findings
  };
}

module.exports = { FACT_GATED_SLOTS, lintArticle, lintBatchRepetition, SLOTS, EXTENDED_SLOTS };

if (require.main === module) {
  const arg = process.argv.slice(2).join(" ");
  if (arg === "--exemplars") {
    let bad = 0;
    for (const e of spec.exemplars) {
      const r = lintArticle({ tagline: e.tagline, hook: e.hook, lived: e.lived, turn: e.turn, moves: e.moves, planet: e.planet, sign: e.sign, allowLegacyGenericPeople: true, allowLegacyTagline: true });
      if (r.fails || r.warns) bad++;
      const flag = r.score === 3 ? "OK " : "!! ";
      console.log(`${flag} score ${r.score} (fails ${r.fails}, warns ${r.warns})  ${e.sourceId}${r.notes.length ? "  [" + r.notes.join("; ") + "]" : ""}`);
      for (const f of r.findings) console.log(`      ${f.severity}: ${f.term} ${f.match ? `"${f.match}"` : ""}`);
    }
    process.exit(bad ? 1 : 0);
  } else if (arg) {
    let article;
    try { article = JSON.parse(arg); } catch { console.error("pass a JSON article {hook, lived, turn} or --exemplars"); process.exit(1); }
    console.log(JSON.stringify(lintArticle(article), null, 2));
  } else {
    console.error('usage: lint-placement-voice.js \'{"hook":"...","lived":"...","turn":"..."}\' | --exemplars');
    process.exit(1);
  }
}
