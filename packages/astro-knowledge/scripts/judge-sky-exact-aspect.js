#!/usr/bin/env node
"use strict";

const { editorialGate } = require("./editorial-judge-policy.js");
const { runJudgeSamples } = require("./editorial-judge-runtime.js");
const {
  ASPECT_MECHANIC,
  bodyFor,
  lintExactEntry,
  readerEligibleOwnerCorpus
} = require("./sky-exact-aspect-corpus.js");
const { OWNER_STYLE_MODELS } = require("./sky-exact-aspect-style.js");
const { judgePolicyLines: ownerWarmthJudgePolicyLines } = require("./owner-corpus-warmth-policy.js");

const RUBRIC_VERSION = "sky-exact-aspect-voice-v6-owner-warmth";
const PROMPT_VERSION = `${RUBRIC_VERSION}:prompt-v6`;

function sourceId(entry) {
  return entry.id || `sky.${entry.planetA}.${entry.aspect}.${entry.planetB}`;
}

function goldExamples(entry, count = 3) {
  const id = sourceId(entry);
  const sameAspect = readerEligibleOwnerCorpus().filter((candidate) => candidate.aspect === entry.aspect && sourceId(candidate) !== id);
  const seed = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const offset = seed % Math.max(1, sameAspect.length);
  return [...sameAspect.slice(offset), ...sameAspect.slice(0, offset)].slice(0, count);
}

function buildJudgePrompt(entry, options = {}) {
  const { pairSource = "", foundationLines = [] } = options;
  const body = bodyFor(entry);
  const localLint = lintExactEntry(entry);
  const suppliedFoundationLines = (foundationLines || []).map((line) => ({
    sourceArticleId: line.sourceArticleId,
    line: line.suppliedLine || line.originalLine
  }));
  return [
    `You are the strict editorial judge for TLDR Astro evergreen exact-aspect Current Sky source copy.`,
    `This is not a natal reading, synastry, a sign-specific live card, or a long-form Sky article.`,
    `A score of 3 means ready for owner review only. It does not authorize publication.`,
    ``,
    `SOURCE ID: ${sourceId(entry)}`,
    `PAIR KNOWLEDGE:`,
    pairSource || "The supplied draft must remain within the standard meanings of the named bodies.",
    `${String(entry.aspect || "aspect").toUpperCase()} ORIENTATION (not required wording):`,
    ASPECT_MECHANIC[entry.aspect] || "The aspect mechanic must be explicit and non-interchangeable.",
    `The owner-approved examples below are the authority for how this mechanic is expressed in reader copy. Do not require the draft to restate every clause in the abstract orientation.`,
    ``,
    `AUTHORITATIVE VOICE MODEL:`,
    ...OWNER_STYLE_MODELS.flatMap((model, index) => [`[${index + 1}] ${model.title}`, model.body, ``]),
    ``,
    `DRAFT:`,
    body,
    `SUPPLIED OWNER FOUNDATION LINES:`,
    suppliedFoundationLines.length ? JSON.stringify(suppliedFoundationLines, null, 2) : "None supplied.",
    `LOCAL CONTRACT FINDINGS:`,
    JSON.stringify(localLint.findings),
    ``,
    `Score 1, 2, or 3. A 3 must satisfy every requirement:`,
    `- It has the same lived-first pull, contemporary detail, spoken cadence, and collective intimacy as the two voice models without copying their structure.`,
    `- Clarity comes before cleverness. Every sentence makes literal sense on first read. A grammatically complete line still fails if its personification, metaphor, or compressed contrast requires decoding.`,
    `- Specifically reject lines like "An old want comes back with better timing and nowhere left to hide." The clauses sound polished but do not form one clear observation.`,
    `- It opens with a sharp recognizable tension rather than an institution, project, announcement, or invented case study.`,
    `- Its compressed example beat uses concrete fragments rather than three mini-stories.`,
    `- Both bodies or points are accurately present through active behavior, without keyword stitching or the formula "Planet brings/carries X, while Planet brings/carries Y."`,
    `- The aspect's distinctive behavior is felt in what happens. It does not say "the ${entry.aspect}," explain mechanics, or read like an astrology lesson.`,
    `- We/our/us enters naturally. The second paragraph does not open with the flat bridge "We feel the pattern/conflict/pull/mismatch."`,
    `- The ending makes one clean turn. It may be one sentence or a truth-and-catch pair, but it does not imitate "The X is real. The Y is not," add a generic maxim, or end conditionally.`,
    ...(suppliedFoundationLines.length
      ? [`- The card's turn toward the reader must trace to the supplied owner foundation lines when present. An invented permission or reassurance line in place of the supplied material scores 2; a card with no turn toward the reader at all, when foundation lines were supplied, scores 2. Verbatim or near-verbatim use of a supplied owner line is never penalized as copying - it is the owner's own writing.`]
      : []),
    `- It is quotable and immediately clear. The memorable line comes from a precise observation, not a manufactured catchphrase. At least one line is unmistakably specific to this pair; swapping the planet names would break the piece.`,
    `- The entry is direct, natural, and specific. It does not read like generic horoscope copy, a strategy brief, or a template with nouns swapped.`,
    `- It stays collective or third-person and evergreen: no second person, signs, dates, degrees, houses, natal framing, or relationship compatibility framing.`,
    `- It preserves nuance: soft aspects are not automatically good, hard aspects are not automatically bad, and the node axis is not treated as fate.`,
    `- It does not reproduce CC/SD/AC phrasing constructions from voice/banned-constructions.json. AC timing devices may be adapted structurally, but theatrical titles and dense stacked metaphor stay out. Shared astrological knowledge and terminology are never flagged: Dragon's Head/Tail, decans, dignities, cazimi, and the tradition's vocabulary are common to astrologers. Owner-verbatim text is exempt.`,
    ...ownerWarmthJudgePolicyLines(options).map((rule) => `- ${rule}`),
    `- Exactly two paragraphs, 5-10 sentences, 90-180 words. No em dash.`,
    ``,
    `Score 2 for one specific repairable weakness. Score 1 for source drift, plainly wrong aspect mechanics, a wrong surface, generic fallback prose, mechanical planet definitions, an institutional case-study voice, flat competent explanation, forced cleverness, or multiple weak sections. Do not award 3 merely because the source meaning, grammar, and shape are correct; 3 requires clear natural writing with real movement.`,
    ``,
    `Return only strict JSON. The verdict must match the score exactly: 3 = in-voice, 2 = borderline, 1 = off-voice.`,
    `{"score":1,"verdict":"off-voice","weakestField":"field name","weakest":"exact weakest sentence","why":"specific concise reason","failedChecks":["short check name"]}`
  ].join("\n");
}

function parseVerdict(raw) {
  const match = String(raw || "").match(/\{[\s\S]*\}/);
  if (!match) return { score: 1, verdict: "off-voice", why: "judge did not return JSON", failedChecks: ["output-contract"] };
  try {
    const parsed = JSON.parse(match[0]);
    const score = [1, 2, 3].includes(Number(parsed.score)) ? Number(parsed.score) : 1;
    return {
      ...parsed,
      score,
      verdict: score === 3 ? "in-voice" : score === 2 ? "borderline" : "off-voice",
      failedChecks: Array.isArray(parsed.failedChecks) ? parsed.failedChecks : []
    };
  } catch {
    return { score: 1, verdict: "off-voice", why: "judge returned unparseable JSON", failedChecks: ["output-contract"] };
  }
}

async function judgeExactAspect(entry, options = {}) {
  const prompt = buildJudgePrompt(entry, options);
  const result = await runJudgeSamples({
    content: bodyFor(entry),
    prompt,
    promptVersion: PROMPT_VERSION,
    rubric: JSON.stringify({ rubricVersion: RUBRIC_VERSION, voiceModel: "owner-authored Venus square Mars" }),
    rubricVersion: RUBRIC_VERSION,
    samples: options.samples,
    temperature: 0.1,
    judgeFn: options.judgeFn,
    parseVerdict,
    calibration: Boolean(options.calibration),
    context: {
      surface: "sky-exact-aspect",
      modelSurface: "sky-exact-aspect",
      sourceId: sourceId(entry),
      aspect: entry.aspect || ""
    }
  });
  return { ...result, ...editorialGate(result) };
}

module.exports = {
  PROMPT_VERSION,
  RUBRIC_VERSION,
  buildJudgePrompt,
  goldExamples,
  judgeExactAspect,
  parseVerdict
};
