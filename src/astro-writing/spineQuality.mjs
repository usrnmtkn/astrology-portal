export const SPINE_QUALITY_VERSION = "sky-placement-article-spine-v1-2026-08-14";

export const SKY_PLACEMENT_SPINE_ELEMENTS = Object.freeze([
  "planet",
  "condition",
  "handoff",
  "thesis",
  "lived_evidence",
  "failure_mechanism",
  "strategy",
  "close"
]);

export const SLOW_MOVER_SPINE_ADDITIONS = Object.freeze([
  "era_frame",
  "recurrence",
  "older_analogs",
  "collective_lesson"
]);

export const SPINE_QUALITY_ELEMENTS = SKY_PLACEMENT_SPINE_ELEMENTS;

export function spineQualityElementsForFamily(family) {
  if (family !== "slow-mover-article") return SKY_PLACEMENT_SPINE_ELEMENTS;
  return Object.freeze([
    ...SKY_PLACEMENT_SPINE_ELEMENTS.slice(0, -1),
    ...SLOW_MOVER_SPINE_ADDITIONS,
    "close"
  ]);
}

export const SIGN_SYMBOLS = Object.freeze({
  aries: Object.freeze(["ram"]),
  taurus: Object.freeze(["bull"]),
  gemini: Object.freeze(["twins", "twin"]),
  cancer: Object.freeze(["crab"]),
  leo: Object.freeze(["lion"]),
  virgo: Object.freeze(["maiden"]),
  libra: Object.freeze(["scales", "scale"]),
  scorpio: Object.freeze(["scorpion"]),
  sagittarius: Object.freeze(["archer", "bow and arrow"]),
  capricorn: Object.freeze(["sea-goat", "sea goat", "goat"]),
  aquarius: Object.freeze(["water-bearer", "water bearer"]),
  pisces: Object.freeze(["fish"])
});

const DIGNITY_SIGNS = Object.freeze({
  sun: Object.freeze(["leo"]),
  moon: Object.freeze(["cancer"]),
  mercury: Object.freeze(["gemini", "virgo"]),
  venus: Object.freeze(["taurus", "libra"]),
  mars: Object.freeze(["aries", "scorpio"]),
  jupiter: Object.freeze(["sagittarius", "pisces"]),
  saturn: Object.freeze(["capricorn", "aquarius"]),
  uranus: Object.freeze(["aquarius"]),
  neptune: Object.freeze(["pisces"]),
  pluto: Object.freeze(["scorpio"])
});

export const SPINE_QUALITY_REQUIREMENTS = Object.freeze({
  planet: "Name what the planet governs and where it becomes visible in ordinary life, so the reader learns both what it rules and how to recognize it.",
  condition: "When the planet has dignity in the sign, state the rulership and explain how it changes the planet's directness. When the sign has a symbol, use it to interpret the mechanism.",
  handoff: "Use one opening sentence naming the prior sign and its dates and what the focus shifts from and to.",
  thesis: "Name the cultural rule or familiar assumption the transit challenges and who benefits from it.",
  lived_evidence: "Use two or three quick situations with nameable objects, decisions, costs, and follow-up work; no single situation carries the argument; include one short standalone sentence stating the whole argument.",
  failure_mechanism: "Show how the useful impulse becomes the problem through behavior the reader performs.",
  strategy: "Use short imperative sentences in sequence, each naming one action.",
  era_frame: "For a slow mover, state what the multi-year transit means at collective scale and include one line the reader can carry.",
  recurrence: "For a slow mover, state the prior transit's dates and what that period revealed.",
  older_analogs: "For a slow mover, include older analogs only when verified dates and sourced historical material advance the thesis.",
  collective_lesson: "For a slow mover, state what the transit teaches at group scale and give the reader a test they can apply.",
  close: "Use one unhedged sentence stating the consequence or condition that completes the thesis; inherited approval does not bypass this gate."
});

const ABSTRACT_PLANET_NOUNS = Object.freeze([
  "relationship", "relationships", "creativity", "attraction", "value", "values",
  "communication", "information", "thinking", "identity", "confidence", "visibility",
  "growth", "opportunity", "belief", "responsibility", "time", "limits", "power",
  "transformation", "dreams", "spirituality", "emotion", "emotions", "drive"
]);
const CONCRETE_APPEARANCE_WORDS = Object.freeze([
  "deadline", "bill", "hours", "money", "work", "shift", "message", "appointment",
  "payment", "form", "schedule", "cost", "meeting", "project", "answer", "choice"
]);
const IMPERATIVE_STARTS = Object.freeze([
  "ask", "answer", "build", "check", "choose", "close", "decide", "document", "end",
  "fix", "fund", "give", "keep", "leave", "let", "look", "make", "name", "notice",
  "pay", "pick", "record", "say", "share", "split", "state", "stop", "train", "write"
]);
const BEHAVIOR_VERBS = Object.freeze([
  "agree", "answer", "ask", "carry", "change", "choose", "cover", "decide", "do",
  "give", "handle", "keep", "offer", "pay", "postpone", "reduce", "send", "take",
  "wait", "work"
]);

function sentenceList(text) {
  return String(text ?? "").split(/(?<=[.!?])\s+|\n+/u).map((value) => value.trim()).filter(Boolean);
}

function wordCount(text) {
  return (String(text ?? "").match(/[A-Za-z0-9'’{{}]+/gu) ?? []).length;
}

function asElement(value) {
  if (typeof value === "string") return { text: value };
  return { ...(value ?? {}), text: String(value?.text ?? "") };
}

function includesAny(text, values) {
  const normalized = String(text ?? "").toLowerCase();
  return values.some((value) => normalized.includes(value));
}

function abstractPlanetListOnly(text, planet) {
  const relevant = sentenceList(text).filter((sentence) => new RegExp(`\\b${String(planet ?? "")}\\b`, "iu").test(sentence));
  if (!relevant.length) return true;
  return relevant.every((sentence) => {
    if (!/\b(?:governs?|rules?|describes?|concerns?|covers?)\b/iu.test(sentence)) return false;
    const abstractCount = ABSTRACT_PLANET_NOUNS.filter((noun) => new RegExp(`\\b${noun}\\b`, "iu").test(sentence)).length;
    return abstractCount >= 3 && /,/u.test(sentence) && !includesAny(sentence, CONCRETE_APPEARANCE_WORDS);
  });
}

function imperativeCount(text) {
  return sentenceList(text).filter((sentence) => {
    const first = sentence.toLowerCase().match(/^["“'‘(]*([a-z]+)/u)?.[1];
    return first && IMPERATIVE_STARTS.includes(first);
  }).length;
}

function behaviorPresent(text) {
  const verbs = BEHAVIOR_VERBS.join("|");
  return new RegExp(`\\b(?:you|someone|the person|they)\\b[^.!?]{0,100}\\b(?:${verbs})(?:s|ed|ing)?\\b`, "iu").test(text);
}

function beneficiaryPresent(text) {
  return /\b(?:cheaper|benefits?|profits?|saves?|gets? to|at (?:someone|another person|the reader)['’]s expense)\b/iu.test(text)
    || /\bwhile\b[^.!?]{0,120}\b(?:person|side|someone)\b[^.!?]{0,80}\b(?:takes|absorbs|carries|keeps|pays)\b/iu.test(text);
}

function culturalRulePresent(text) {
  return /\b(?:taught|expected|supposed|called|mistake|rule|standard|normal|reliable|easy agreement|fair agreement|keeping the agreement easy)\b/iu.test(text);
}

function handoffShiftPresent(text) {
  const hasPrior = /\b(?:after moving through|moved through|prior sign|previous sign|from \{\{priorSign\}\})\b/iu.test(text);
  const hasShift = /\b(?:changes?|shifts?|turns?|moves? from|rather than|instead of|now asks?|changes the question)\b/iu.test(text);
  return hasPrior && hasShift;
}

function dignityRequired(planet, sign) {
  return (DIGNITY_SIGNS[String(planet ?? "").toLowerCase()] ?? []).includes(String(sign ?? "").toLowerCase());
}

function dignityConsequencePresent(text, planet, sign) {
  if (!dignityRequired(planet, sign)) return true;
  return /\b(?:rules?|at home|domicile)\b[^.!?]{0,120}\b(?:so|which|therefore|means?|sharpens?|makes?|lets?|allows?)\b/iu.test(text);
}

function symbolPresent(text, sign) {
  const symbols = SIGN_SYMBOLS[String(sign ?? "").toLowerCase()] ?? [];
  return symbols.length === 0 || includesAny(text, symbols);
}

function livedEvidenceReasons(element) {
  const reasons = [];
  const text = element.text;
  const paragraphs = text.split(/\n\s*\n/u).map((value) => value.trim()).filter(Boolean);
  const scenarioCount = Number.isInteger(element.scenarioCount) ? element.scenarioCount : paragraphs.length;
  if (scenarioCount < 2 || scenarioCount > 3) reasons.push(`expected two or three quick situations; detected ${scenarioCount}`);
  if ((element.scenarioParagraphSpans ?? []).some((count) => count > 1)) reasons.push("one scenario spans more than one paragraph");
  const pullQuoteCandidates = sentenceList(text).filter((sentence) => wordCount(sentence) < 20 && wordCount(sentence) >= 4);
  if (!pullQuoteCandidates.length) reasons.push("no standalone sentence under 20 words in the lived section");
  const concreteGroups = {
    object: ["bill", "card", "draft", "form", "message", "receipt", "schedule", "project", "appointment", "payment"],
    decision: ["choice", "decision", "answer", "preference", "agreement", "plan"],
    cost: ["cost", "money", "hours", "time", "payment", "bill", "work"],
    follow_up: ["follow-up", "revision", "correction", "reminder", "update", "handoff", "documentation"]
  };
  for (const [group, terms] of Object.entries(concreteGroups)) {
    if (!includesAny(text, terms)) reasons.push(`lived evidence does not name a ${group.replace("_", "-")}`);
  }
  return reasons;
}

function renderedCopyText(copy) {
  if (typeof copy === "string") return copy;
  return [copy?.opening, copy?.tension, copy?.renderedTension, copy?.development, copy?.close]
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n");
}

export function deriveArticleSpineElements(copy, family) {
  if (!copy || typeof copy !== "object") return {};
  if (copy.spine_quality_evidence && typeof copy.spine_quality_evidence === "object") return copy.spine_quality_evidence;
  if (family !== "fast-mover-article" && family !== "slow-mover-article") return {};
  return {
    planet: copy.opening ?? "",
    condition: copy.opening ?? "",
    handoff: copy.opening ?? "",
    thesis: copy.tension ?? "",
    lived_evidence: copy.development ?? "",
    failure_mechanism: [copy.tension, copy.development].filter(Boolean).join(" "),
    strategy: copy.development ?? "",
    close: copy.close ?? ""
  };
}

export function evaluateSpineQuality({
  copy,
  family,
  plan = {},
  spineElements = null,
  inheritedElements = [],
  conditionalLayers = {}
} = {}) {
  const elements = spineElements ?? deriveArticleSpineElements(copy, family);
  const qualityElements = spineQualityElementsForFamily(family);
  const normalized = Object.fromEntries(qualityElements.map((element) => [element, asElement(elements[element])]));
  const failures = [];
  const add = (element, reason) => failures.push({
    category: "spine_quality",
    element,
    reason,
    requirement: SPINE_QUALITY_REQUIREMENTS[element],
    advisory: true,
    automaticRewrite: false,
    ownerReviewRequired: true,
    inheritedElement: inheritedElements.includes(element)
  });

  if (copy?.spine_quality_evidence && spineElements == null) {
    const rendered = renderedCopyText(copy);
    for (const element of qualityElements) {
      const excerpt = normalized[element].text.trim();
      if (excerpt && !rendered.includes(excerpt)) add(element, "reported quality evidence is not byte-identical to rendered reader copy");
    }
  }

  if (!normalized.planet.text.trim()) add("planet", "planet element is missing");
  else if (abstractPlanetListOnly(normalized.planet.text, plan.object)) add("planet", "planet element is only a comma-separated list of abstract domains");

  if (!normalized.condition.text.trim()) add("condition", "condition element is missing");
  else {
    if (!dignityConsequencePresent(normalized.condition.text, plan.object, plan.sign)) add("condition", "dignity is named without explaining its consequence");
    if (!symbolPresent(normalized.condition.text, plan.sign)) add("condition", `recorded ${plan.sign} symbol is absent`);
  }

  if (!normalized.handoff.text.trim()) add("handoff", "handoff element is missing");
  else if (!handoffShiftPresent(normalized.handoff.text)) add("handoff", "prior-sign dates appear without naming what changes now");

  if (!normalized.thesis.text.trim()) add("thesis", "thesis element is missing");
  else {
    if (!culturalRulePresent(normalized.thesis.text)) add("thesis", "the challenged cultural rule is not named");
    if (!beneficiaryPresent(normalized.thesis.text)) add("thesis", "the person or system benefiting from the rule is not named");
  }

  if (!normalized.lived_evidence.text.trim()) add("lived_evidence", "lived-evidence element is missing");
  else for (const reason of livedEvidenceReasons(normalized.lived_evidence)) add("lived_evidence", reason);

  if (!normalized.failure_mechanism.text.trim()) add("failure_mechanism", "failure-mechanism element is missing");
  else if (!behaviorPresent(normalized.failure_mechanism.text)) add("failure_mechanism", "the useful skill becoming the problem is not stated as performed behavior");

  if (!normalized.strategy.text.trim()) add("strategy", "strategy element is missing");
  else {
    const count = imperativeCount(normalized.strategy.text);
    if (count < 2) add("strategy", `strategy has ${count} imperative sentences; at least two are required`);
  }

  if (family === "slow-mover-article") {
    if (!normalized.era_frame.text.trim()) add("era_frame", "slow-mover era frame is missing");
    else {
      if (!/\b(?:collective|group|public|institution|company|family|community|system|society|culture|authority|hierarchy|rules|budgets|we)\b/iu.test(normalized.era_frame.text)) {
        add("era_frame", "era frame does not name the collective scale");
      }
      if (!sentenceList(normalized.era_frame.text).some((sentence) => wordCount(sentence) < 20 && wordCount(sentence) >= 4)) {
        add("era_frame", "era frame has no short line the reader can carry");
      }
    }

    if (!normalized.recurrence.text.trim()) add("recurrence", "slow-mover recurrence is missing");
    else {
      if (!/(?:\b(?:18|19|20)\d{2}\b|\{\{previousResidencyEntryDateWithYear\}\})/u.test(normalized.recurrence.text)) {
        add("recurrence", "recurrence does not include the prior transit dates");
      }
      if (!/\b(?:revealed?|showed?|exposed?|made .{0,50} visible|discovered?|demonstrated?)\b/iu.test(normalized.recurrence.text)) {
        add("recurrence", "recurrence does not state what the prior period revealed");
      }
    }

    const olderAnalogsRequired = conditionalLayers.older_analogs === true;
    const verifiedOlderAnalogSourceIds = [
      ...(Array.isArray(conditionalLayers.olderAnalogSourceIds) ? conditionalLayers.olderAnalogSourceIds : []),
      ...(Array.isArray(normalized.older_analogs.verifiedSourceIds) ? normalized.older_analogs.verifiedSourceIds : [])
    ].filter(Boolean);
    if (olderAnalogsRequired && !normalized.older_analogs.text.trim()) add("older_analogs", "verified older analogs exist but the layer is missing");
    if (normalized.older_analogs.text.trim()) {
      if (!/(?:\b(?:18|19|20)\d{2}\b)/u.test(normalized.older_analogs.text)) add("older_analogs", "older analogs do not include verified years");
      if (verifiedOlderAnalogSourceIds.length === 0) add("older_analogs", "older analogs do not record a verified source");
    }

    if (!normalized.collective_lesson.text.trim()) add("collective_lesson", "slow-mover collective lesson is missing");
    else {
      if (!/\b(?:collective|group|public|institution|company|family|community|system|society|culture|we)\b/iu.test(normalized.collective_lesson.text)) {
        add("collective_lesson", "collective lesson does not name the group scale");
      }
      if (!/\b(?:test|what happens when|ask|check|look at|measure|if)\b/iu.test(normalized.collective_lesson.text)) {
        add("collective_lesson", "collective lesson does not give the reader a test to apply");
      }
    }
  }

  if (!normalized.close.text.trim()) add("close", "close element is missing");
  else {
    const finalSentence = sentenceList(normalized.close.text).at(-1) ?? "";
    if (/\b(?:may|might|can|could)\b/iu.test(finalSentence)) add("close", "final sentence uses a hedging modal");
    if (/^(?:before|until|through)\b/iu.test(finalSentence) || /\{\{exitDate\}\}/u.test(finalSentence)) add("close", "final sentence is date-bound instead of landing on the consequence");
  }

  const failedElements = [...new Set(failures.map((failure) => failure.element))];
  const status = failedElements.length > 0 ? "spine-quality-incomplete" : "spine-quality-complete";
  return {
    version: SPINE_QUALITY_VERSION,
    family,
    status,
    complete: failedElements.length === 0,
    failedElementCount: failedElements.length,
    failedElements,
    failures,
    elements: normalized
  };
}
