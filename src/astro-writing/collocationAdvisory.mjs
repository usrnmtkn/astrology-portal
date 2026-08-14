import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const createPosTagger = require("wink-pos-tagger");
const tagger = createPosTagger();

const LINKING_VERBS = new Set(["be", "become", "feel", "get", "grow", "look", "remain", "seem", "sound", "stay", "turn"]);
const EXCLUDED_VERBS = new Set(["be", "can", "could", "do", "have", "may", "might", "must", "shall", "should", "will", "would"]);
const SKIPPABLE_BETWEEN_SUBJECT_AND_VERB = new Set(["DT", "MD", "PDT", "POS", "PRP$", "RB", "RBR", "RBS", "TO", "WDT", "WP", "WP$", "WRB"]);
const SKIPPABLE_BEFORE_OBJECT = new Set(["DT", "JJ", "JJR", "JJS", "PDT", "POS", "PRP$", "RB", "RBR", "RBS"]);

const isNoun = (token) => /^NN/iu.test(token?.pos ?? "");
const isVerb = (token) => /^VB/iu.test(token?.pos ?? "");
const isAdjective = (token) => /^JJ/iu.test(token?.pos ?? "");
const lemma = (token) => String(token?.lemma ?? token?.normal ?? token?.value ?? "").toLowerCase();
const adjectiveForm = (token) => String(token?.normal ?? token?.value ?? "").toLowerCase();

function sentences(text) {
  return String(text ?? "")
    .replace(/\{\{[^}]+\}\}/gu, "token")
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function pairKey(type, modifier, noun) {
  return `${type}|${modifier}|${noun}`;
}

function recordPair(records, { type, modifier, noun, relation, sentence }) {
  if (!modifier || !noun || modifier === noun) return;
  const key = pairKey(type, modifier, noun);
  if (records.has(key)) return;
  records.set(key, { key, type, modifier, noun, relation, sentence });
}

function nearestSubject(tokens, verbIndex) {
  for (let index = verbIndex - 1; index >= 0 && verbIndex - index <= 6; index -= 1) {
    const token = tokens[index];
    if (isNoun(token)) {
      const prior = tokens.slice(Math.max(0, index - 2), index);
      const hasNounFrame = prior.some((item) => ["DT", "PDT", "POS", "PRP$"].includes(item.pos));
      const isSentenceInitialProperNoun = token.pos.startsWith("NNP") && index === 0;
      if (hasNounFrame || isSentenceInitialProperNoun) return token;
      continue;
    }
    if (SKIPPABLE_BETWEEN_SUBJECT_AND_VERB.has(token.pos)) continue;
    if ([",", ";", ":", ".", "CC", "IN"].includes(token.pos)) break;
  }
  return null;
}

function nearestObject(tokens, verbIndex) {
  for (let index = verbIndex + 1; index < tokens.length && index - verbIndex <= 6; index += 1) {
    const token = tokens[index];
    if (isNoun(token)) return token;
    if (SKIPPABLE_BEFORE_OBJECT.has(token.pos)) continue;
    if ([",", ";", ":", ".", "CC", "IN", "TO"].includes(token.pos) || isVerb(token)) break;
  }
  return null;
}

function predicateSubject(tokens, adjectiveIndex) {
  let linkingVerbIndex = -1;
  for (let index = adjectiveIndex - 1; index >= 0 && adjectiveIndex - index <= 5; index -= 1) {
    const token = tokens[index];
    if (isVerb(token) && LINKING_VERBS.has(lemma(token))) {
      linkingVerbIndex = index;
      break;
    }
    if ([",", ";", ":", ".", "CC"].includes(token.pos)) break;
  }
  return linkingVerbIndex >= 0 ? nearestSubject(tokens, linkingVerbIndex) : null;
}

export function extractCollocations(text) {
  const records = new Map();
  for (const sentence of sentences(text)) {
    const tokens = tagger.tagSentence(sentence);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (isAdjective(token)) {
        const next = tokens[index + 1];
        if (isNoun(next)) {
          recordPair(records, {
            type: "adjective_noun",
            modifier: adjectiveForm(token),
            noun: lemma(next),
            relation: "attributive",
            sentence
          });
        }
        const subject = predicateSubject(tokens, index);
        if (subject) {
          recordPair(records, {
            type: "adjective_noun",
            modifier: adjectiveForm(token),
            noun: lemma(subject),
            relation: "predicate",
            sentence
          });
        }
      }
      if (isVerb(token) && !EXCLUDED_VERBS.has(lemma(token))) {
        const subject = nearestSubject(tokens, index);
        if (subject) {
          recordPair(records, {
            type: "verb_noun",
            modifier: lemma(token),
            noun: lemma(subject),
            relation: "subject",
            sentence
          });
        }
        const object = nearestObject(tokens, index);
        if (object) {
          recordPair(records, {
            type: "verb_noun",
            modifier: lemma(token),
            noun: lemma(object),
            relation: "object",
            sentence
          });
        }
      }
    }
  }
  return [...records.values()];
}

export function buildCollocationTable(records) {
  const pairs = new Map();
  const sourcePairs = new Map();
  const modifierSources = new Map();
  const nounSources = new Map();
  let sentenceCount = 0;
  let collocationOccurrences = 0;
  for (const record of records) {
    sentenceCount += sentences(record.text).length;
    const extracted = extractCollocations(record.text);
    sourcePairs.set(record.sourceKey, extracted);
    collocationOccurrences += extracted.length;
    for (const pair of extracted) {
      const modifierKey = `${pair.type}|${pair.modifier}`;
      const modifierSet = modifierSources.get(modifierKey) ?? new Set();
      modifierSet.add(record.sourceKey);
      modifierSources.set(modifierKey, modifierSet);
      const nounSet = nounSources.get(pair.noun) ?? new Set();
      nounSet.add(record.sourceKey);
      nounSources.set(pair.noun, nounSet);
      const current = pairs.get(pair.key) ?? {
        type: pair.type,
        modifier: pair.modifier,
        noun: pair.noun,
        occurrences: 0,
        sources: new Set(),
        examples: []
      };
      current.occurrences += 1;
      current.sources.add(record.sourceKey);
      if (current.examples.length < 3) current.examples.push({ sourceKey: record.sourceKey, sentence: pair.sentence });
      pairs.set(pair.key, current);
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    counts: {
      sources: records.length,
      sentences: sentenceCount,
      collocationOccurrences,
      uniquePairs: pairs.size
    },
    pairs,
    sourcePairs,
    modifierSources,
    nounSources
  };
}

export function serializeCollocationTable(table, sourceSummary = {}) {
  return {
    schemaVersion: table.schemaVersion,
    generatedAt: table.generatedAt,
    governance: {
      status: "experimental-advisory-only",
      blocking: false,
      revises: false,
      stages: false,
      serves: false,
      activation: "held-for-owner-review-after-false-positive-measurement"
    },
    sourceSummary,
    counts: table.counts,
    vocabulary: {
      modifiers: Object.fromEntries([...table.modifierSources].sort(([left], [right]) => left.localeCompare(right)).map(([key, sources]) => [key, sources.size])),
      nouns: Object.fromEntries([...table.nounSources].sort(([left], [right]) => left.localeCompare(right)).map(([key, sources]) => [key, sources.size]))
    },
    pairs: Object.fromEntries([...table.pairs].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [key, [
      value.occurrences,
      value.sources.size
    ]]))
  };
}

export function novelCollocationAdvisories(text, table) {
  const knownPairs = table?.pairs ?? {};
  const knownModifiers = table?.vocabulary?.modifiers ?? {};
  const knownNouns = table?.vocabulary?.nouns ?? {};
  return extractCollocations(text)
    .filter((pair) => (
      !Object.hasOwn(knownPairs, pair.key)
      && Object.hasOwn(knownModifiers, `${pair.type}|${pair.modifier}`)
      && Object.hasOwn(knownNouns, pair.noun)
    ))
    .map((pair) => ({
      category: "novel_collocation",
      detail: `${pair.modifier} + ${pair.noun}`,
      pairKey: pair.key,
      pairType: pair.type,
      relation: pair.relation,
      modifier: pair.modifier,
      noun: pair.noun,
      text: pair.sentence,
      advisory: true,
      blocking: false,
      ownerReviewPriorityOnly: true
    }));
}

export function leaveOneSourceOutFalsePositiveReport(records, table) {
  const bySourceType = new Map();
  const flaggedPairs = [];
  let sourcesFlagged = 0;
  let sentencesEvaluated = 0;
  let sentencesFlagged = 0;
  let pairOccurrencesEvaluated = 0;
  let pairOccurrencesFlagged = 0;
  for (const record of records) {
    const extracted = table.sourcePairs.get(record.sourceKey) ?? [];
    const novel = extracted.filter((pair) => {
      const pairSources = table.pairs.get(pair.key)?.sources ?? new Set();
      const modifierSources = table.modifierSources.get(`${pair.type}|${pair.modifier}`) ?? new Set();
      const nounSources = table.nounSources.get(pair.noun) ?? new Set();
      return pairSources.size === 1 && modifierSources.size > 1 && nounSources.size > 1;
    });
    pairOccurrencesEvaluated += extracted.length;
    pairOccurrencesFlagged += novel.length;
    const sourceSentences = sentences(record.text);
    const flaggedSentenceTexts = new Set(novel.map((pair) => pair.sentence));
    sentencesEvaluated += sourceSentences.length;
    sentencesFlagged += flaggedSentenceTexts.size;
    if (novel.length) sourcesFlagged += 1;
    const bucket = bySourceType.get(record.sourceType) ?? {
      sources: 0,
      sourcesFlagged: 0,
      sentences: 0,
      sentencesFlagged: 0,
      pairs: 0,
      pairsFlagged: 0
    };
    bucket.sources += 1;
    bucket.sourcesFlagged += novel.length ? 1 : 0;
    bucket.sentences += sourceSentences.length;
    bucket.sentencesFlagged += flaggedSentenceTexts.size;
    bucket.pairs += extracted.length;
    bucket.pairsFlagged += novel.length;
    bySourceType.set(record.sourceType, bucket);
    for (const pair of novel) {
      flaggedPairs.push({ sourceKey: record.sourceKey, sourceType: record.sourceType, ...pair });
    }
  }
  const rate = (numerator, denominator) => denominator ? numerator / denominator : 0;
  return {
    method: "leave-one-source-out",
    interpretation: "Every flag on owner-approved held-out copy is counted as a false positive.",
    totals: {
      sourcesEvaluated: records.length,
      sourcesFlagged,
      sourceFalsePositiveRate: rate(sourcesFlagged, records.length),
      sentencesEvaluated,
      sentencesFlagged,
      sentenceFalsePositiveRate: rate(sentencesFlagged, sentencesEvaluated),
      pairOccurrencesEvaluated,
      pairOccurrencesFlagged,
      pairFalsePositiveRate: rate(pairOccurrencesFlagged, pairOccurrencesEvaluated)
    },
    bySourceType: Object.fromEntries([...bySourceType].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [key, {
      ...value,
      sourceFalsePositiveRate: rate(value.sourcesFlagged, value.sources),
      sentenceFalsePositiveRate: rate(value.sentencesFlagged, value.sentences),
      pairFalsePositiveRate: rate(value.pairsFlagged, value.pairs)
    }])),
    sampleFalsePositives: flaggedPairs.slice(0, 100)
  };
}
