"use strict";

const { CORPUS_GRAMMAR_CHECKS, grammarFindings } = require("./corpusGrammarChecks.cjs");

const EXPLICITLY_DISCONNECTED_STOCK_COACHING = /\b(give yourself permission|you are allowed|let yourself|allow yourself|take the win|protect your energy|honor your needs)\b/iu;

function hasExplicitlyDisconnectedStockCoaching(value) {
  return EXPLICITLY_DISCONNECTED_STOCK_COACHING.test(String(value ?? ""));
}

function splitSentences(value) {
  return String(value ?? "").trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
}

function normalizedSentence(value) {
  return value.toLowerCase().replace(/\{\{name\}\}/gu, "name").replace(/\s+/gu, " ").trim();
}

const ASPECT_SENTENCE_FORMS = Object.freeze({
  conjunction: /\b(?:conjunct(?:s|ion)?|conjoin(?:s|ed|ing)?|cross(?:es|ed|ing)?)\b/iu,
  square: /\b(?:square|squares|squared|squaring)\b/iu,
  opposition: /\b(?:opposition|oppose|opposes|opposed|opposing)\b/iu,
  trine: /\b(?:trine|trines|trined|trining)\b/iu,
  sextile: /\b(?:sextile|sextiles)\b/iu,
  quincunx: /\b(?:quincunx|inconjunct)\b/iu,
  semisextile: /\b(?:semisextile|semi-sextile|nonagen)\b/iu
});

function sentenceNamesTargetFormula(target, sentence) {
  const normalized = normalizedSentence(sentence).replace(/[_-]/gu, " ");
  const transiting = String(target.transiting ?? "").replace(/[_-]/gu, " ");
  const natal = String(target.natal ?? "").replace(/[_-]/gu, " ");
  const aspectForm = ASPECT_SENTENCE_FORMS[target.aspect];
  if (!transiting || !natal || !aspectForm) return false;
  const namesTransit = new RegExp(`\\b(?:transiting\\s+)?${transiting}\\b`, "iu").test(normalized);
  const namesNatal = new RegExp(`\\b(?:natal\\s+|your\\s+|name(?:'s)?\\s+)?${natal}\\b`, "iu").test(normalized);
  return namesTransit && namesNatal && aspectForm.test(normalized);
}

function integratedOppositionMechanism(target, sentence) {
  if (target.aspect !== "opposition") return false;
  const text = normalizedSentence(sentence);
  const simultaneousSides = /\b(?:at the same time|while)\b/iu.test(text);
  const externalDemand = /\b(?:group|other|request|demand|offer|enthusiasm|company)\b/iu.test(text);
  const personalNeed = /\b(?:need|home|rest|sleep|leave|limit)\b/iu.test(text);
  return simultaneousSides && externalDemand && personalNeed;
}

function formulaSentenceFindings(target, draft) {
  const findings = [];
  for (const field of ["body_you", "body_they"]) {
    for (const sentence of splitSentences(draft?.[field])) {
      if (sentenceNamesTargetFormula(target, sentence) && !integratedOppositionMechanism(target, sentence)) {
        findings.push({ field, sentence });
      }
    }
  }
  return findings;
}

const REPEATED_EVENT_SEQUENCE = /(?:\b(?:cancel|miss|postpone)\w*\b[^.!?]*\b(?:again|twice|two|second)\b|\b(?:again|twice|two|second)\b[^.!?]*\b(?:cancel|miss|postpone)\w*\b|\bthen\s+(?:have|has)\s+to\b)/iu;
const RELATIONSHIP_CONCLUSION_ACTION = /\b(?:wonder(?:s|ed|ing)?|question(?:s|ed|ing)?|doubt(?:s|ed|ing)?|decid(?:e|es|ed|ing)|pull(?:s|ed|ing)?\s+away|stop(?:s|ped|ping)?\s+trusting)\b/iu;
const RELATIONSHIP_CONCLUSION_OBJECT = /\b(?:friendship|relationship|bond|connection)\b/iu;

function packetEvidenceSentences(evidencePacket) {
  return (evidencePacket?.evidence ?? [])
    .flatMap((record) => splitSentences(record.text));
}

function unsupportedEscalationFindings(draft, evidencePacket) {
  const evidenceSentences = packetEvidenceSentences(evidencePacket);
  const evidenceSupportsRepeatedEvent = evidenceSentences.some((sentence) => REPEATED_EVENT_SEQUENCE.test(sentence));
  const evidenceSupportsRelationshipConclusion = evidenceSentences.some((sentence) => (
    RELATIONSHIP_CONCLUSION_ACTION.test(sentence) && RELATIONSHIP_CONCLUSION_OBJECT.test(sentence)
  ));
  const findings = [];
  for (const field of ["body_you", "body_they"]) {
    for (const sentence of splitSentences(draft?.[field])) {
      if (REPEATED_EVENT_SEQUENCE.test(sentence) && !evidenceSupportsRepeatedEvent) {
        findings.push({ field, kind: "predicted-sequence", sentence });
      }
      if (RELATIONSHIP_CONCLUSION_ACTION.test(sentence)
        && RELATIONSHIP_CONCLUSION_OBJECT.test(sentence)
        && !evidenceSupportsRelationshipConclusion) {
        findings.push({ field, kind: "relationship-outcome", sentence });
      }
    }
  }
  return findings;
}

function deterministicChecks(target, draft, priorCandidates = [], options = {}) {
  const checks = { target: target.contentKey, passed: true, findings: [] };
  const fail = (id, detail) => {
    checks.passed = false;
    checks.findings.push({ id, passed: false, detail });
  };
  const pass = (id, detail = null) => checks.findings.push({ id, passed: true, detail });
  const expectedShape = ["body_they", "body_you", "sceneAnchor"];
  const actualShape = Object.keys(draft ?? {}).sort();
  JSON.stringify(actualShape) === JSON.stringify(expectedShape) ? pass("exact-output-shape") : fail("exact-output-shape", actualShape);
  if (typeof draft.sceneAnchor !== "string" || draft.sceneAnchor.trim().split(/\s+/u).length < 2 || draft.sceneAnchor.trim().split(/\s+/u).length > 8) {
    fail("scene-anchor-length", draft.sceneAnchor);
  } else pass("scene-anchor-length");
  for (const field of ["body_you", "body_they"]) {
    const text = draft[field] ?? "";
    const count = splitSentences(text).length;
    count >= 4 && count <= 6 ? pass(`${field}-sentence-count`, count) : fail(`${field}-sentence-count`, count);
    /^[\x00-\x7F]*$/u.test(text) ? pass(`${field}-ascii`) : fail(`${field}-ascii`, "non-ASCII character found");
    /[—–]/u.test(text) ? fail(`${field}-dash-ban`, "em dash or en dash found") : pass(`${field}-dash-ban`);
    /\bsteady\b/iu.test(text) ? fail(`${field}-steady-ban`, "steady found") : pass(`${field}-steady-ban`);
    /\b(you tend to|you always|you usually|usually|generally|this is who you are)\b/iu.test(text)
      ? fail(`${field}-temporary-register`, "standing-pattern language found")
      : pass(`${field}-temporary-register`);
    hasExplicitlyDisconnectedStockCoaching(text)
      ? fail(`${field}-coaching-ban`, "explicitly disconnected stock coaching or permission language found")
      : pass(`${field}-coaching-ban`);
  }
  for (const check of CORPUS_GRAMMAR_CHECKS) {
    const findings = ["body_you", "body_they"].flatMap((field) => grammarFindings(draft?.[field])
      .filter((finding) => finding.check === check.id)
      .map((finding) => ({ field, ...finding })));
    findings.length
      ? fail(`grammar-${check.id}`, findings)
      : pass(`grammar-${check.id}`);
  }
  !draft.body_you?.includes("{{Name}}") ? pass("body-you-direction") : fail("body-you-direction", "body_you contains {{Name}}");
  draft.body_they?.includes("{{Name}}") ? pass("body-they-direction") : fail("body-they-direction", "body_they must contain {{Name}}");

  const formulaFindings = formulaSentenceFindings(target, draft);
  formulaFindings.length
    ? fail("detachable-aspect-formula", formulaFindings)
    : pass("detachable-aspect-formula");
  const escalationFindings = unsupportedEscalationFindings(draft, options.evidencePacket);
  escalationFindings.length
    ? fail("unsupported-predicted-escalation", escalationFindings)
    : pass("unsupported-predicted-escalation");

  const sentencesByVariant = Object.fromEntries(["body_you", "body_they"].map((field) => [
    field,
    splitSentences(draft[field]).map(normalizedSentence)
  ]));
  const repeatedInside = Object.entries(sentencesByVariant).flatMap(([field, sentences]) => sentences
    .filter((sentence, index) => sentences.indexOf(sentence) !== index)
    .map((sentence) => ({ field, sentence })));
  repeatedInside.length === 0
    ? pass("sentence-uniqueness-within-each-variant")
    : fail("sentence-uniqueness-within-each-variant", repeatedInside);
  const currentSentences = [...new Set([...sentencesByVariant.body_you, ...sentencesByVariant.body_they])];
  const priorSentences = new Set(priorCandidates.flatMap((candidate) => [
    ...splitSentences(candidate.draft.body_you),
    ...splitSentences(candidate.draft.body_they)
  ]).map(normalizedSentence));
  const repeatedAcross = currentSentences.filter((sentence) => priorSentences.has(sentence));
  repeatedAcross.length === 0 ? pass("sentence-uniqueness-across-provider-batch") : fail("sentence-uniqueness-across-provider-batch", repeatedAcross);
  const samePair = priorCandidates.filter((candidate) => candidate.target.transiting === target.transiting && candidate.target.natal === target.natal);
  const sceneCollision = samePair.find((candidate) => candidate.draft.sceneAnchor.trim().toLowerCase() === draft.sceneAnchor.trim().toLowerCase());
  sceneCollision ? fail("aspect-specific-scene-anchor", `repeats ${sceneCollision.target.aspect}: ${draft.sceneAnchor}`) : pass("aspect-specific-scene-anchor");
  return checks;
}

module.exports = {
  deterministicChecks,
  formulaSentenceFindings,
  hasExplicitlyDisconnectedStockCoaching,
  unsupportedEscalationFindings
};
