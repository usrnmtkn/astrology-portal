import {
  DAILY_GLANCE_PERSON_SLOT_KEYS,
  fillDailyGlancePersonSlots,
  lintDailyGlanceFriendVoice
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs";

const MUSTACHE_TOKEN = /\{\{([#/^]?)([A-Za-z][A-Za-z0-9_.]*|\.)\}\}/gu;

export function extractTemplateSlots(text) {
  const slots = new Set();
  const matched = [];
  for (const match of String(text ?? "").matchAll(MUSTACHE_TOKEN)) {
    matched.push(match[0]);
    if (match[2] !== ".") slots.add(match[2]);
  }
  let residue = String(text ?? "");
  for (const token of matched) residue = residue.replace(token, "");
  if (residue.includes("{{") || residue.includes("}}")) {
    throw new Error("PROMOTION_MALFORMED_TEMPLATE_SLOT: template braces must contain a supported slot name.");
  }
  return [...slots].sort();
}

function fixtureSlots(pronouns) {
  const shared = {
    personName: "Avery Example",
    personNamePossessive: "Avery Example's",
    personPreferredName: "Avery",
    personPreferredNamePossessive: "Avery's"
  };
  if (pronouns === "she/her") return {
    ...shared,
    personSubject: "she", personSubjectCapitalized: "She",
    personObject: "her", personObjectCapitalized: "Her",
    personPossessiveAdjective: "her", personPossessiveAdjectiveCapitalized: "Her",
    personPossessivePronoun: "hers", personPossessivePronounCapitalized: "Hers",
    personReflexive: "herself", personReflexiveCapitalized: "Herself",
    personBePresent: "is", personBePast: "was", personHavePresent: "has", personVerbSuffix: "s"
  };
  if (pronouns === "he/him") return {
    ...shared,
    personSubject: "he", personSubjectCapitalized: "He",
    personObject: "him", personObjectCapitalized: "Him",
    personPossessiveAdjective: "his", personPossessiveAdjectiveCapitalized: "His",
    personPossessivePronoun: "his", personPossessivePronounCapitalized: "His",
    personReflexive: "himself", personReflexiveCapitalized: "Himself",
    personBePresent: "is", personBePast: "was", personHavePresent: "has", personVerbSuffix: "s"
  };
  return {
    ...shared,
    personSubject: "they", personSubjectCapitalized: "They",
    personObject: "them", personObjectCapitalized: "Them",
    personPossessiveAdjective: "their", personPossessiveAdjectiveCapitalized: "Their",
    personPossessivePronoun: "theirs", personPossessivePronounCapitalized: "Theirs",
    personReflexive: "themselves", personReflexiveCapitalized: "Themselves",
    personBePresent: "are", personBePast: "were", personHavePresent: "have", personVerbSuffix: ""
  };
}

function renderedGrammarFindings(text) {
  const patterns = [
    ["singular subject with plural auxiliary", /\b(?:she|he)\s+(?:are|were|have)\b/giu],
    ["they with singular auxiliary", /\bthey\s+(?:is|was|has|does)\b/giu],
    ["object pronoun used as subject", /\b(?:her|him|them)\s+(?:is|are|was|were|has|have|can|may|will|would|could|should)\b/giu]
  ];
  return patterns.flatMap(([id, pattern]) => [...text.matchAll(pattern)].map((match) => ({ id, match: match[0] })));
}

export function buildTemplateSlotPreflight({ beforeText, afterText, contentKey, textField, slotContract = null, familySupportedSlots = null }) {
  const beforeSlots = extractTemplateSlots(beforeText);
  const afterSlots = extractTemplateSlots(afterText);
  const dailyFriendField = /^fallback-hook\/daily-(?:headline|body)\//u.test(String(contentKey))
    && textField === "body_they";
  const allowedSlots = new Set(slotContract?.allowedSlots ?? (
    dailyFriendField
      ? [...new Set([...beforeSlots, ...DAILY_GLANCE_PERSON_SLOT_KEYS])]
      : beforeSlots
  ));
  const requiredSlots = new Set(slotContract?.requiredSlots ?? beforeSlots);
  const supportedSlots = new Set(familySupportedSlots ?? (
    dailyFriendField ? DAILY_GLANCE_PERSON_SLOT_KEYS : beforeSlots
  ));
  const addedSlots = afterSlots.filter((slot) => !beforeSlots.includes(slot));
  const removedSlots = beforeSlots.filter((slot) => !afterSlots.includes(slot));
  const unsupportedSlots = afterSlots.filter((slot) => !allowedSlots.has(slot));
  const missingRequiredSlots = [...requiredSlots].filter((slot) => !afterSlots.includes(slot));
  const unsupportedByFamily = [...allowedSlots].filter((slot) => !supportedSlots.has(slot));
  if (unsupportedByFamily.length > 0) {
    throw new Error(`PROMOTION_SLOT_NOT_SUPPORTED_BY_FAMILY_CONTRACT: ${unsupportedByFamily.join(", ")}`);
  }
  if (unsupportedSlots.length > 0) {
    throw new Error(`PROMOTION_UNSUPPORTED_TEMPLATE_SLOT: ${unsupportedSlots.join(", ")}`);
  }
  if (missingRequiredSlots.length > 0) {
    throw new Error(`PROMOTION_REQUIRED_TEMPLATE_SLOT_REMOVED: ${missingRequiredSlots.join(", ")}`);
  }

  const renderPersonFixtures = slotContract?.renderPersonFixtures === true || dailyFriendField;
  const fixtures = [];
  if (renderPersonFixtures) {
    const lintFindings = lintDailyGlanceFriendVoice(afterText);
    if (lintFindings.length > 0) {
      throw new Error(`PROMOTION_FRIEND_VOICE_LINT_FAILED: ${lintFindings.map((finding) => `${finding.id}:${finding.match}`).join(" | ")}`);
    }
    for (const profile of ["she/her", "he/him", "they/them"]) {
      const rendered = fillDailyGlancePersonSlots(afterText, fixtureSlots(profile));
      if (/\{\{|\}\}/u.test(rendered)) throw new Error(`PROMOTION_UNRESOLVED_PERSON_SLOT: ${profile}`);
      const grammarFindings = renderedGrammarFindings(rendered);
      if (grammarFindings.length > 0) {
        throw new Error(`PROMOTION_PERSON_FIXTURE_GRAMMAR_FAILED: ${profile}: ${grammarFindings.map((finding) => finding.match).join(", ")}`);
      }
      fixtures.push({ profile, rendered, grammarFindings: [] });
    }
  }

  return {
    beforeSlots,
    afterSlots,
    addedSlots,
    removedSlots,
    allowedSlots: [...allowedSlots].sort(),
    requiredSlots: [...requiredSlots].sort(),
    familySupportedSlots: [...supportedSlots].sort(),
    renderPersonFixtures,
    fixtures,
    passed: true
  };
}
