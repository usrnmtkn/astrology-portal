#!/usr/bin/env node
"use strict";

const { editorialGate } = require("./editorial-judge-policy.js");
const { runJudgeSamples } = require("./editorial-judge-runtime.js");
const { bodyFor } = require("./sky-exact-aspect-corpus.js");
const { OWNER_STYLE_MODELS } = require("./sky-exact-aspect-style.js");

const RUBRIC_VERSION = "sky-exact-aspect-natural-english-v1";
const PROMPT_VERSION = `${RUBRIC_VERSION}:prompt-v1`;
const CHECK_IDS = new Set([
  "slogan-compression",
  "abstract-agent",
  "mixed-metaphor",
  "unclear-causality",
  "unclear-referent",
  "strategy-language",
  "unnatural-usage"
]);
const POSITIVE_LINES = [
  "A petty argument carries the weight of months of unspoken words.",
  "A quick reply in the group chat lands harder than intended.",
  "Wanting and doing are not synonyms, and the lag between them gets loud.",
  "The urge is real. The timing is not.",
  "What looks sensible on paper may not match what the body actually wants."
];
const NEGATIVE_CONTROLS = [
  {
    reject: "An old want comes back with better timing and nowhere left to hide.",
    reason: "Two polished abstractions are forced together; timing does not resolve hiding.",
    plain: "People are more willing to say what they want, and more likely to find support when they do."
  },
  {
    reject: "We may win the old fight and still lose the next chapter.",
    reason: "It compresses an argument and a life change into a slogan people would not normally say.",
    plain: "Winning the argument can still keep us stuck in the same situation."
  },
  {
    reject: "The test usually creates the distance it was meant to prevent.",
    reason: "The abstract subject hides who is testing whom and what actually happens.",
    plain: "Testing someone's affection can push them away, even when they were already showing up."
  },
  {
    reject: "The right opportunity may ask us to grow less at once and go farther.",
    reason: "The opportunity is made to speak, and grow less/go farther is compressed beyond normal usage.",
    plain: "The better option may look smaller, but it may take us where we actually want to go."
  }
];

function buildNaturalEnglishPrompt(entry) {
  return [
    `You are the final plain-English editor for TLDR Astro Current Sky copy.`,
    `Judge only whether every sentence reads like natural modern English a thoughtful person would actually write or say. Another judge handles astrology and voice.`,
    `A score of 3 means every sentence is immediately understandable aloud. Correct grammar is not enough.`,
    `This is edited voice, not literal transcription. Coherent metaphor, personification, rhythm, and a quotable line are allowed when the meaning is immediate. Do not fail a sentence merely because an abstract noun acts; fail it only when the action or causal relationship is unclear.`,
    ``,
    `FULL OWNER-APPROVED CARDS. These define natural stylized English for this product and are authoritative:`,
    ...OWNER_STYLE_MODELS.flatMap((entry, index) => [`[${index + 1}] ${entry.title}`, entry.body, ``]),
    ``,
    `PASSING OWNER LINES:`,
    ...POSITIVE_LINES.map((line) => `- ${line}`),
    ``,
    `REJECTED LINES AND PLAIN REPAIRS:`,
    ...NEGATIVE_CONTROLS.flatMap((control) => [
      `- REJECT: ${control.reject}`,
      `  WHY: ${control.reason}`,
      `  PLAIN: ${control.plain}`
    ]),
    ``,
    `FAIL OR DOWNGRADE:`,
    `- A compressed aphorism that sounds written for a quote card rather than spoken.`,
    `- Abstract nouns acting like people only when the action or causal relationship is hard to picture. Coherent owner-style metaphor is allowed.`,
    `- Two metaphors or logical frames forced into one sentence.`,
    `- A pronoun whose literal referent changes the intended meaning.`,
    `- Strategy language, vague uplift, or a sentence that needs paraphrasing before it makes sense.`,
    `- An ending made quotable by dropping necessary context.`,
    ``,
    `Allowed failed-check IDs: ${[...CHECK_IDS].join(", ")}.`,
    `For every failed check, provide exactly one evidence object whose checkId matches and whose sentence is copied verbatim from the draft.`,
    `Provide one concise rationale for the whole verdict. A score of 3 must have empty failedChecks and evidence arrays.`,
    `Score 3 only if every line is normal and immediately clear. Score 2 for one mildly written or compressed line. Score 1 if any line resembles the rejected controls or multiple lines require decoding.`,
    ``,
    `DRAFT:`,
    bodyFor(entry),
    ``,
    `Return only strict JSON:`,
    `{"score":1,"verdict":"off-voice","rationale":"one concise reason","failedChecks":["slogan-compression"],"evidence":[{"checkId":"slogan-compression","sentence":"exact sentence copied from draft"}]}`
  ].join("\n");
}

function normalized(value) {
  return String(value || "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function parseNaturalEnglishVerdict(raw, content = "") {
  const match = String(raw || "").match(/\{[\s\S]*\}/);
  if (!match) {
    return { score: 1, verdict: "off-voice", rationale: "Judge did not return JSON.", failedChecks: [], evidence: [], contractViolation: true, contractIssues: ["output-contract"] };
  }
  try {
    const parsed = JSON.parse(match[0]);
    const score = [1, 2, 3].includes(Number(parsed.score)) ? Number(parsed.score) : 1;
    const failedChecks = Array.isArray(parsed.failedChecks) ? parsed.failedChecks.map(String) : [];
    const evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
    const issues = [];
    const rationale = String(parsed.rationale || "").trim();
    if (!rationale || rationale.length > 320) issues.push("missing-or-nonconcise-rationale");
    if (failedChecks.some((id) => !CHECK_IDS.has(id))) issues.push("unknown-failed-check-id");
    const evidenceIds = evidence.map((item) => String(item?.checkId || ""));
    const uniqueFailed = [...new Set(failedChecks)].sort();
    const uniqueEvidence = [...new Set(evidenceIds)].sort();
    if (JSON.stringify(uniqueFailed) !== JSON.stringify(uniqueEvidence)) issues.push("evidence-ids-do-not-match-failed-checks");
    if (evidence.length !== failedChecks.length) issues.push("one-evidence-item-required-per-failed-check");
    const haystack = normalized(content);
    for (const item of evidence) {
      const sentence = normalized(item?.sentence);
      if (!sentence || !haystack.includes(sentence)) issues.push(`evidence-sentence-not-in-draft:${item?.checkId || "missing"}`);
    }
    if (score === 3 && (failedChecks.length || evidence.length)) issues.push("passing-score-contains-failure-evidence");
    if (score < 3 && (!failedChecks.length || !evidence.length)) issues.push("failing-score-missing-evidence");
    return {
      ...parsed,
      score,
      verdict: score === 3 ? "in-voice" : score === 2 ? "borderline" : "off-voice",
      rationale,
      why: rationale,
      failedChecks,
      evidence,
      weakest: evidence[0]?.sentence || "",
      contractViolation: issues.length > 0,
      contractIssues: issues
    };
  } catch {
    return { score: 1, verdict: "off-voice", rationale: "Judge returned unparseable JSON.", failedChecks: [], evidence: [], contractViolation: true, contractIssues: ["output-contract"] };
  }
}

async function judgeNaturalEnglish(entry, options = {}) {
  const content = bodyFor(entry);
  const ownerExact = OWNER_STYLE_MODELS.find((model) => normalized(model.body) === normalized(content));
  if (ownerExact) {
    return {
      score: 3,
      verdict: "in-voice",
      rationale: `Exact owner-approved style model: ${ownerExact.title}.`,
      why: `Exact owner-approved style model: ${ownerExact.title}.`,
      failedChecks: [],
      evidence: [],
      contractViolation: false,
      contractIssues: [],
      disagreement: false,
      exactApprovedGold: true,
      samples: 0,
      gate: "human-review",
      recommendation: "owner-exact-match",
      approvalSource: "owner"
    };
  }
  const result = await runJudgeSamples({
    content,
    prompt: buildNaturalEnglishPrompt(entry),
    promptVersion: PROMPT_VERSION,
    rubric: JSON.stringify({ rubricVersion: RUBRIC_VERSION, checkIds: [...CHECK_IDS], negativeControls: NEGATIVE_CONTROLS.map((control) => control.reject) }),
    rubricVersion: RUBRIC_VERSION,
    samples: options.samples,
    temperature: 0.1,
    judgeFn: options.judgeFn,
    parseVerdict: (raw) => parseNaturalEnglishVerdict(raw, content),
    calibration: Boolean(options.calibration),
    context: { surface: "sky-exact-aspect-natural-english", modelSurface: "sky-exact-aspect" }
  });
  return { ...result, ...editorialGate(result) };
}

module.exports = {
  CHECK_IDS,
  NEGATIVE_CONTROLS,
  POSITIVE_LINES,
  PROMPT_VERSION,
  RUBRIC_VERSION,
  buildNaturalEnglishPrompt,
  judgeNaturalEnglish,
  parseNaturalEnglishVerdict
};
