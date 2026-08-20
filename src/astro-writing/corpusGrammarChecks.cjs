"use strict";

/**
 * Shared owner-reported grammar defects.
 *
 * Corpus lint and generated-draft validation must use this one definition so
 * a construction cannot pass the writer gate after being banned in evidence.
 */
const CORPUS_GRAMMAR_CHECKS = Object.freeze([
  Object.freeze({
    id: "pronoun-object-case",
    owner: "QA findings #4",
    // "for they hold..." is the conjunction sense of "for" and is correct,
    // so require that no verb follows.
    pattern: /\b(to|with|at|about|from|between|toward|towards|against)\s+they\b(?!\s+(?:hold|have|are|were|can|will|do|did|would|could|should)\b)/giu,
    message: 'subject pronoun in an object slot; "they" should be "them"'
  }),
  Object.freeze({
    id: "split-verb-glued-list",
    owner: "QA findings #6",
    pattern: /\b(?:takes?|make[s]?|treats?|holds?)\s+(?:you\s+)?(?:take\s+)?(?:seriously|clearly|carefully|more sensitive|more aware)\s+(?!to\b|of\b|about\b|that\b|when\b|how\b)[a-z]/giu,
    message: "verb complement stranded before its object list; give the verb its object"
  }),
  Object.freeze({
    id: "dangling-participle",
    owner: "QA findings #5",
    pattern: /(?:^|\.\s+)(?:Putting|Making|Giving|Taking|Bringing|Turning|Holding|Naming)\s+[^.]{15,80},\s+(?!which|who)[a-z]+\s+(?:is|are|was|were|can|may|will)\b/gu,
    message: "sentence opens on a bare participle with no subject"
  }),
  Object.freeze({
    id: "meets-seam",
    owner: "QA findings #3",
    pattern: /\b(?:function|confidence|direction|attention|energy|need|mind)\s+meets\s+the\b/giu,
    message: 'the banned "{funcA} meets {funcB}" join'
  }),
  Object.freeze({
    id: "compound-subject-singular-verb",
    owner: "QA findings #5",
    pattern: /\b\w+\s+and\s+\w+\s+(?:where|that|which)[^.]{0,60}\btends\b/giu,
    message: "compound subject with a singular verb"
  })
]);

function grammarFindings(value) {
  const text = String(value ?? "");
  const findings = [];
  for (const check of CORPUS_GRAMMAR_CHECKS) {
    check.pattern.lastIndex = 0;
    let match;
    while ((match = check.pattern.exec(text)) !== null) {
      findings.push({
        check: check.id,
        owner: check.owner,
        message: check.message,
        index: match.index,
        match: match[0]
      });
      if (!check.pattern.global) break;
    }
  }
  return findings;
}

module.exports = { CORPUS_GRAMMAR_CHECKS, grammarFindings };
