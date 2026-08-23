import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.join(here, "../voice/tldr-astro/lunation-horoscope-templates-v1.json");
const CONTRACT = JSON.parse(fs.readFileSync(contractPath, "utf8"));

const SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const OPPOSITE = {
  aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn",
  leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus",
  sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo"
};
const TRADITIONAL_RULER = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon",
  leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars",
  sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter"
};
const ASPECTS = new Set(["conjunction", "sextile", "square", "trine", "opposition", "quincunx"]);
const OUTER_PLANETS = new Set(["uranus", "neptune", "pluto"]);
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export class LunationSourceGapError extends Error {
  constructor(message) {
    super(`SOURCE_GAP: ${message}`);
    this.name = "LunationSourceGapError";
  }
}

export class LunationGovernanceError extends Error {
  constructor(message) {
    super(`GOVERNANCE_BLOCK: ${message}`);
    this.name = "LunationGovernanceError";
  }
}

function sourceGap(message) {
  throw new LunationSourceGapError(message);
}

function normalizedSign(value, label) {
  if (typeof value !== "string" || !SIGNS.includes(value.toLowerCase())) sourceGap(`${label} must be a zodiac sign`);
  return value.toLowerCase();
}

function validHouse(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > 12) sourceGap(`${label} must be an integer from 1 to 12`);
  return value;
}

function validExactAt(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    sourceGap(`${label} must be an ISO date-time with an explicit timezone`);
  }
  if (!Number.isFinite(Date.parse(value))) sourceGap(`${label} is not a valid date-time`);
  return value;
}

function calendarDateParts(exactAt, label) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T/u.exec(exactAt);
  if (!match) sourceGap(`${label} must begin with a calendar date`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!MONTH_NAMES[month - 1] || day < 1 || day > 31) sourceGap(`${label} has an invalid calendar date`);
  return { year, month, day };
}

export function formatMatchingNewMoonDateLabel(matchingNewMoonExactAt, fullMoonExactAt) {
  const matching = calendarDateParts(validExactAt(matchingNewMoonExactAt, "matchingNewMoon.exactAt"), "matchingNewMoon.exactAt");
  const full = calendarDateParts(validExactAt(fullMoonExactAt, "exactAt"), "exactAt");
  const monthDay = `${MONTH_NAMES[matching.month - 1]} ${matching.day}`;
  return matching.year === full.year ? monthDay : `${monthDay}, ${matching.year}`;
}

function validateDomains(value) {
  if (!Array.isArray(value) || value.length < 2 || value.some((item) => typeof item !== "string" || !item.trim())) {
    sourceGap("houseDomains must contain at least two concrete domains");
  }
  return value.map((item) => item.trim());
}

function validateRuler(ruler, eventSign) {
  if (!ruler || typeof ruler !== "object") sourceGap("ruler fact is required");
  const body = typeof ruler.body === "string" ? ruler.body.toLowerCase() : "";
  if (body !== TRADITIONAL_RULER[eventSign]) sourceGap(`ruler for ${eventSign} must be ${TRADITIONAL_RULER[eventSign]}`);
  return {
    body,
    sign: normalizedSign(ruler.sign, "ruler.sign"),
    house: validHouse(ruler.house, "ruler.house"),
    retrograde: Boolean(ruler.retrograde)
  };
}

function validateAspects(aspects, complete) {
  if (complete !== true) sourceGap("aspectsComplete must be true before drafting");
  if (!Array.isArray(aspects)) sourceGap("aspects must be an array");
  return aspects.map((entry, index) => {
    if (!entry || typeof entry !== "object") sourceGap(`aspects[${index}] must be an object`);
    const body = typeof entry.body === "string" ? entry.body.toLowerCase() : "";
    const aspect = typeof entry.aspect === "string" ? entry.aspect.toLowerCase() : "";
    if (!body) sourceGap(`aspects[${index}].body is required`);
    if (!ASPECTS.has(aspect)) sourceGap(`aspects[${index}].aspect is not supported`);
    return {
      body,
      aspect,
      exactAt: validExactAt(entry.exactAt, `aspects[${index}].exactAt`),
      bodySign: normalizedSign(entry.bodySign, `aspects[${index}].bodySign`),
      bodyHouse: validHouse(entry.bodyHouse, `aspects[${index}].bodyHouse`),
      lunationHouse: validHouse(entry.lunationHouse, `aspects[${index}].lunationHouse`)
    };
  });
}

function validateOuterPlanets(entries, complete) {
  if (complete !== true) sourceGap("outerPlanetPlacementsComplete must be true before drafting");
  if (!Array.isArray(entries)) sourceGap("outerPlanetPlacements must be an array");
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== "object") sourceGap(`outerPlanetPlacements[${index}] must be an object`);
    const body = typeof entry.body === "string" ? entry.body.toLowerCase() : "";
    if (!OUTER_PLANETS.has(body)) sourceGap(`outerPlanetPlacements[${index}].body must be Uranus, Neptune, or Pluto`);
    return {
      body,
      sign: normalizedSign(entry.sign, `outerPlanetPlacements[${index}].sign`),
      house: validHouse(entry.house, `outerPlanetPlacements[${index}].house`),
      active: entry.active !== false
    };
  });
}

function validateEventGeometry(eventType, eventSign, moonHouse, facts) {
  if (eventType === "full-moon" || eventType === "eclipse-lunar") {
    const sunSign = normalizedSign(facts.sunSign, "sunSign");
    const sunHouse = validHouse(facts.sunHouse, "sunHouse");
    const oppositeHouse = ((moonHouse + 5) % 12) + 1;
    if (sunSign !== OPPOSITE[eventSign]) sourceGap(`${eventType} Sun sign must oppose the Moon sign`);
    if (sunHouse !== oppositeHouse) sourceGap(`${eventType} Sun house must oppose the Moon house`);
    return { sunSign, sunHouse };
  }

  if (facts.sunSign != null && normalizedSign(facts.sunSign, "sunSign") !== eventSign) {
    sourceGap(`${eventType} Sun and Moon must share a sign`);
  }
  if (facts.sunHouse != null && validHouse(facts.sunHouse, "sunHouse") !== moonHouse) {
    sourceGap(`${eventType} Sun and Moon must share a house`);
  }
  return { sunSign: eventSign, sunHouse: moonHouse };
}

export function compileLunationHoroscopePacket(facts, options = {}) {
  if (!facts || typeof facts !== "object") sourceGap("lunation facts object is required");
  const eventType = typeof facts.eventType === "string" ? facts.eventType.toLowerCase() : "";
  const template = CONTRACT.eventTemplates[eventType];
  if (!template) sourceGap(`eventType must be one of ${Object.keys(CONTRACT.eventTemplates).join(", ")}`);

  const exactAt = validExactAt(facts.exactAt, "exactAt");
  if (typeof facts.degree !== "number" || !Number.isFinite(facts.degree) || facts.degree < 0 || facts.degree >= 30) {
    sourceGap("degree must be a number from 0 up to but not including 30");
  }
  const eventSign = normalizedSign(facts.eventSign, "eventSign");
  const risingSign = normalizedSign(facts.risingSign, "risingSign");
  const moonHouse = validHouse(facts.moonHouse, "moonHouse");
  const houseDomains = validateDomains(facts.houseDomains);
  const geometry = validateEventGeometry(eventType, eventSign, moonHouse, facts);
  const ruler = validateRuler(facts.ruler, eventSign);
  const aspects = validateAspects(facts.aspects, facts.aspectsComplete);
  const outerPlanetPlacements = validateOuterPlanets(facts.outerPlanetPlacements, facts.outerPlanetPlacementsComplete);

  let matchingNewMoon = null;
  if (eventType === "full-moon" && facts.matchingNewMoon == null) {
    sourceGap("matchingNewMoon is required for full-moon write-ups");
  }
  if (facts.matchingNewMoon != null) {
    if (eventType !== "full-moon" && eventType !== "eclipse-lunar") sourceGap("matchingNewMoon applies only to Full Moons and lunar eclipses");
    const matchingExactAt = validExactAt(facts.matchingNewMoon.exactAt, "matchingNewMoon.exactAt");
    const matchingSign = normalizedSign(facts.matchingNewMoon.sign, "matchingNewMoon.sign");
    if (matchingSign !== eventSign) sourceGap("matchingNewMoon.sign must match the Full Moon sign");
    if (Date.parse(matchingExactAt) >= Date.parse(exactAt)) sourceGap("matchingNewMoon.exactAt must precede the Full Moon");
    const dateLabel = formatMatchingNewMoonDateLabel(matchingExactAt, exactAt);
    matchingNewMoon = {
      exactAt: matchingExactAt,
      sign: matchingSign,
      dateLabel,
      includeYear: calendarDateParts(matchingExactAt, "matchingNewMoon.exactAt").year
        !== calendarDateParts(exactAt, "exactAt").year,
      anchor: CONTRACT.sharedSpine
        .find((item) => item.id === "matching_new_moon_anchor")
        ?.template
        .replace("{{matchingNewMoonSign}}", matchingSign.replace(/^./u, (character) => character.toUpperCase()))
        .replace("{{matchingNewMoonDate}}", dateLabel)
    };
  }

  const unresolvedQuestions = CONTRACT.openQuestions
    .filter((question) => question.status === "unresolved" && question.appliesTo.includes(eventType))
    .map(({ id, question }) => ({ id, question }));

  if (options.forGeneration === true) {
    if (!CONTRACT.generationAuthorized) {
      throw new LunationGovernanceError(`${CONTRACT.contractId} is not approved for generation`);
    }
    if (unresolvedQuestions.length) {
      throw new LunationGovernanceError(`owner rulings are unresolved: ${unresolvedQuestions.map((item) => item.id).join(", ")}`);
    }
  }

  const aspectAttribution = aspects.map((aspect, index) => ({
    sentenceId: `aspect-${index + 1}`,
    fact: aspect,
    rule: "One sentence only; name the body and aspect in this sentence."
  }));

  return {
    packetType: "lunation-horoscope-calibration-v1",
    contract: {
      id: CONTRACT.contractId,
      version: CONTRACT.version,
      editorialStatus: CONTRACT.editorialStatus,
      runtimeEligible: CONTRACT.runtimeEligible,
      generationAuthorized: CONTRACT.generationAuthorized,
      servingAuthorized: CONTRACT.servingAuthorized
    },
    governance: {
      mode: options.forGeneration === true ? "generation" : "calibration",
      unresolvedQuestions,
      generationBlocked: !CONTRACT.generationAuthorized || unresolvedQuestions.length > 0
    },
    event: {
      eventType,
      exactAt,
      degree: facts.degree,
      eventSign,
      sunSign: geometry.sunSign,
      risingSign,
      moonHouse,
      sunHouse: geometry.sunHouse,
      houseDomains,
      ruler,
      matchingNewMoon,
      aspects,
      outerPlanetPlacements
    },
    writingPlan: {
      sharedSpine: CONTRACT.sharedSpine,
      movements: template.movements,
      temperature: template.temperature,
      axisNamingAllowed: template.axisNamingAllowed,
      revealBeat: template.revealBeat,
      collapseFirst: template.collapseFirst,
      sixMonthArc: template.sixMonthArc,
      lunarCycleArc: template.lunarCycleArc ?? false,
      arcPolicy: template.arcPolicy,
      closePolicy: template.closePolicy,
      desireTestPolicy: template.desireTestPolicy ?? null,
      eventAgencyPolicy: template.eventAgencyPolicy ?? null,
      readerChoiceImplied: template.readerChoiceImplied ?? null,
      aspectAttribution,
      matchingNewMoonClaimAllowed: Boolean(matchingNewMoon),
      matchingNewMoonAnchorRequired: eventType === "full-moon",
      matchingNewMoonAnchorTemplate: eventType === "full-moon"
        ? CONTRACT.sharedSpine.find((item) => item.id === "matching_new_moon_anchor")?.template ?? null
        : null
    },
    outputContract: {
      register: CONTRACT.register,
      readerCopyIncluded: false,
      instruction: "Use only the supplied facts. If a fact is absent, omit its sentence. Return one horoscope only after owner calibration authorizes generation."
    }
  };
}

function cli() {
  const args = process.argv.slice(2);
  const inputFlag = args.indexOf("--input");
  if (inputFlag === -1 || !args[inputFlag + 1]) {
    console.error("Usage: node compile-lunation-horoscope-packet.mjs --input facts.json [--for-generation]");
    process.exitCode = 2;
    return;
  }
  const input = JSON.parse(fs.readFileSync(path.resolve(args[inputFlag + 1]), "utf8"));
  const packet = compileLunationHoroscopePacket(input, { forGeneration: args.includes("--for-generation") });
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
