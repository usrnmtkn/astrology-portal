#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  readRegistry,
  resolveCandidateRelease
} = require("./editorial-model-registry.js");
const {
  generateForSurface,
  generationConfig,
  judgeConfig
} = require("./generate-sky-aspect-cards.js");
const { judgeExactAspect } = require("./judge-sky-exact-aspect.js");
const { judgeNaturalEnglish, NEGATIVE_CONTROLS } = require("./judge-sky-natural-english.js");
const { buildOwnerVocabularyPrompt } = require("./owner-vocabulary-prompt.js");
const { policy: ownerWarmthPolicy } = require("./owner-corpus-warmth-policy.js");
const {
  OWNER_STYLE_MODELS,
  VENUS_SQUARE_LILITH_MODEL,
  VENUS_SQUARE_MARS_MODEL,
  buildSkyExactAspectVocabularyPrompt
} = require("./sky-exact-aspect-style.js");
const {
  ASPECT_MECHANIC,
  bodyFor,
  lintExactEntry,
  missingTargets,
  readerEligibleOwnerCorpus
} = require("./sky-exact-aspect-corpus.js");
const {
  annotateCandidateWithWarmth,
  buildAspectWarmthHarvest,
  foundationPromptBlock,
  lintAspectWarmthUsage,
  warmthFlagIds
} = require("./aspect-corpus-warmth-harvest.js");

const SURFACE = "sky-exact-aspect";
const GENERATION_LANE = `generation:${SURFACE}`;
const JUDGE_LANE = `judge:${SURFACE}`;
const DEFAULT_OUT = path.join(__dirname, "..", "out", "sky-exact-aspect-drafts");

function parseArgs(argv) {
  const options = { concurrency: 4, repairs: 1, limit: 0, ids: [], out: DEFAULT_OUT };
  for (const token of argv) {
    if (token === "--plan") options.plan = true;
    else if (token === "--authorize-live") options.authorizeLive = true;
    else if (token === "--force") options.force = true;
    else if (token.startsWith("--concurrency=")) options.concurrency = Number(token.slice(14));
    else if (token.startsWith("--repairs=")) options.repairs = Number(token.slice(10));
    else if (token.startsWith("--limit=")) options.limit = Number(token.slice(8));
    else if (token.startsWith("--per-batch=")) options.perBatch = Number(token.slice(12));
    else if (token.startsWith("--id=")) options.ids.push(token.slice(5));
    else if (token.startsWith("--batch=")) options.batch = token.slice(8);
    else if (token.startsWith("--out=")) options.out = path.resolve(token.slice(6));
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error("--concurrency must be a positive integer.");
  if (!Number.isInteger(options.repairs) || options.repairs < 0) throw new Error("--repairs must be zero or a positive integer.");
  if (options.perBatch !== undefined && (!Number.isInteger(options.perBatch) || options.perBatch < 1)) throw new Error("--per-batch must be a positive integer.");
  return options;
}

function plainBriefPrompt(target) {
  return [
    `Create a literal meaning brief for ${target.title}. This is planning material, not reader copy.`,
    `Use only the pair knowledge and exact aspect behavior below.`,
    ``,
    `PAIR KNOWLEDGE:`,
    target.sourceText,
    ``,
    `EXACT ASPECT BEHAVIOR:`,
    ASPECT_MECHANIC[target.aspect],
    ``,
    `Return strict JSON with exactly these keys:`,
    `{`,
    `  "tension": "one plain sentence describing the ordinary human situation",`,
    `  "examples": ["three concrete short examples", "with no metaphors", "and no astrology jargon"],`,
    `  "pairBehavior": "one plain sentence stating what each body or point contributes",`,
    `  "aspectBehavior": "one plain sentence stating how this exact aspect changes what happens",`,
    `  "consequence": "one plain sentence stating the observable result"`,
    `}`,
    ``,
    `Use normal English. Do not be clever, lyrical, quotable, motivational, or dramatic. Do not personify an abstraction.`,
    `No you/your, signs, dates, degrees, natal framing, advice, slogans, or extra keys.`
  ].join("\n");
}

function writerPrompt(target, feedback = "", { avoidScenes = [], brief = null } = {}) {
  const warmthHarvest = target.warmthHarvest || buildAspectWarmthHarvest(target, { surface: SURFACE, format: "full-card" });
  if (!warmthHarvest.generationAllowed) {
    throw new Error(`${target.id}: aspect warmth harvest failed closed (${warmthFlagIds(warmthHarvest.flags)}).`);
  }
  const harvestMode = warmthHarvest.harvest_mode;
  const harvestRule = ownerWarmthPolicy.modes[harvestMode] || ownerWarmthPolicy.modes.not_supplied;
  return [
    `Write one evergreen exact-aspect Current Sky source entry for ${target.title}.`,
    `This must read like the owner-authored Venus square Mars card below: lived first, collective, modern, rhythmic, and specific.`,
    `This is reusable collective-sky copy. It is not a natal reading, synastry, a placement card, or a sign-specific live card. Signs will be supplied by a higher-priority live layer, so do not invent them.`,
    `Use only the pair knowledge and exact aspect mechanic below. Do not invent astrological doctrine.`,
    `The result is a needs_review draft and cannot publish without owner approval.`,
    `OWNER-CORPUS WARMTH HARVEST: harvest_mode=${harvestMode}. ${harvestRule.writerRule}`,
    ``,
    `PAIR KNOWLEDGE:`,
    target.sourceText,
    ``,
    `EXACT ASPECT MECHANIC:`,
    ASPECT_MECHANIC[target.aspect],
    ``,
    `LITERAL MEANING BRIEF. Preserve these facts and relationships. Improve the prose without replacing the meaning with a slogan:`,
    JSON.stringify(brief || {}, null, 2),
    ``,
    foundationPromptBlock(warmthHarvest),
    ``,
    `Return strict JSON with exactly these keys:`,
    `{`,
    `  "body": "the complete two-paragraph reader copy, with a blank line encoded as \\n\\n",`,
    `  "collectiveLeadEligible": false`,
    `}`,
    ``,
    `VOICE MODELS. These are the authority for lived detail, collective intimacy, and clear interpretive movement. Notice that they do not share one rigid sentence pattern. Do not copy their nouns, syntax, or closing formula:`,
    ...OWNER_STYLE_MODELS.flatMap((entry, index) => [`[${index + 1}] ${entry.title}`, entry.body, ``]),
    buildOwnerVocabularyPrompt({ surface: SURFACE }),
    buildSkyExactAspectVocabularyPrompt(),
    ``,
    `SHAPE:`,
    `- Exactly two paragraphs, 5-10 sentences total, 90-180 words. Vary sentence length and pressure; do not assign one sentence to each rubric item.`,
    `- Keep multi-clause sentences under control, especially in paragraph two. Prefer sharp, direct observations when several clauses begin to slow the rhythm.`,
    `- Open on a clear tension with immediate human stakes. It may be a scene, a choice, a contradiction, or a consequence, but not an institution, announcement, case study, astrology definition, or compressed riddle.`,
    `- Name ${target.title} naturally somewhere in the first paragraph. Do not always put it in sentence two, introduce it with "Under," say "the ${target.aspect}," or explain it as a textbook mechanic.`,
    `- Use a compressed beat of concrete modern details where it strengthens the writing. It can be a three-fragment list, one precise scene, or details braided through the paragraph. Do not manufacture three mini-stories to satisfy a template.`,
    `- Let the body reveal how the two forces behave through active verbs and consequences. Never use the formula "Planet brings/carries/supplies X, while Planet brings/carries/supplies Y."`,
    `- Use we/our/us naturally, but do not default to "We feel the pattern/conflict/pull/mismatch" as the second-paragraph transition.`,
    `- Keep a stable observational distance inside each scene beat. Do not jump rapidly between we/us and generic third-person actors unless the shift is necessary and unmistakable.`,
    ...(target.aspect === "quincunx"
      ? [`- QUINCUNX GEOMETRY: Center the awkward aftermath, repeated practical revisions, and negotiation that never resolves cleanly. Do not frame it as a direct opposition, explosive square, or single dramatic break.`]
      : []),
    `- End on one clean turn. It may be one sentence or a truth-and-catch pair. Do not imitate "The X is real. The Y is not," add a generic maxim before the close, or end with an If sentence.`,
    ...(warmthHarvest.harvest_mode === "matched"
      ? [`- The warmth beat is exactly one sentence after the shadow or cost is named, as the final or penultimate sentence. Never add a second warmth beat or a second conclusion.`]
      : [`- No owner warmth line was found. Do not invent a permission, reassurance, benediction, or turn-toward-the-reader sentence.`]),
    `- Clarity comes before cleverness. Every sentence must make literal sense on the first read. Metaphor is optional; never force two metaphors into one line or make an abstraction perform an action that is hard to picture.`,
    `- REJECT THIS KIND OF LINE: "An old want comes back with better timing and nowhere left to hide." It is grammatical but unclear: timing cannot solve hiding, and the personified want has no concrete action. State what people want, expect, say, choose, or receive instead.`,
    `- Make it quotable and make it immediately clear. A quotable line comes from a precise observation, not strained cleverness. Do not force every ending into an aphorism.`,
    `- Use these owner-corrected before/after controls as literal guidance:`,
    ...NEGATIVE_CONTROLS.flatMap((control) => [`  REJECT: ${control.reject}`, `  WRITE THIS PLAINLY: ${control.plain}`]),
    `- The prose still needs movement: active verbs, a change in pressure, and details specific to this pair. If the planet names could be swapped without changing the body, the draft fails.`,
    ``,
    `RULES:`,
    `- Direct, natural, specific language in the owner's Current Sky tone. Every sentence should sound spoken.`,
    `- Use collective we/our/us. Never use you or your.`,
    `- No signs, dates, degrees, houses, natal language, friends, or compatibility framing.`,
    `- No em dash, markdown, headings, labels, or extra keys.`,
    `- No mystical coaching, generic horoscope language, inflated drama, corporate filler, or therapeutic commands.`,
    `- Do not default to a memo, meeting, manager, policy, team, announcement, hearing, committee, program, museum, festival, theater, organization, or group chat.`,
    ...(avoidScenes.length
      ? [
          `- OTHER ASPECTS FOR THIS SAME PAIR ALREADY USE THE SCENES BELOW. Choose a materially different setting, event, actors, and consequence. Do not paraphrase them:`,
          ...avoidScenes.map((scene) => `  - ${scene}`)
        ]
      : []),
    `- Soft aspects are not automatically good. Hard aspects are not automatically bad. Node contacts are not fate.`,
    `- Preserve the exact aspect distinction. A quincunx is repeated adjustment between functions that do not naturally coordinate; it is not a softer square.`,
    `- Show that distinction through the lived pattern. Do not use abstract orientation phrases such as "solve different problems at once," "neither can fully absorb the other," or "requiring repeated adjustments."`,
    ...(feedback ? [``, `JUDGE AND CONTRACT FEEDBACK TO FIX:`, feedback, `Rewrite the full entry from scratch.`] : [])
  ].join("\n");
}

function extractJson(raw) {
  const text = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Writer did not return JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

function normalizeBrief(value) {
  const examples = Array.isArray(value.examples) ? value.examples.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (examples.length !== 3) throw new Error(`Meaning brief must contain exactly three examples; found ${examples.length}.`);
  const brief = {
    tension: String(value.tension || "").trim(),
    examples,
    pairBehavior: String(value.pairBehavior || "").trim(),
    aspectBehavior: String(value.aspectBehavior || "").trim(),
    consequence: String(value.consequence || "").trim()
  };
  for (const [field, content] of Object.entries(brief)) {
    if ((Array.isArray(content) ? content.join(" ") : content).length < 8) throw new Error(`Meaning brief field '${field}' is missing or too short.`);
  }
  return brief;
}

function normalizeDraft(target, value) {
  return {
    id: target.id,
    planetA: target.a,
    planetB: target.b,
    aspect: target.aspect,
    title: target.title,
    body: String(value.body || "").trim().replace(/\s*—\s*/g, " - ").replace(/\n\s*\n+/g, "\n\n"),
    collectiveLeadEligible: value.collectiveLeadEligible === true
  };
}

function feedbackFor(lint, judge, naturalness) {
  return [
    lint.fails ? `Mechanical failures: ${lint.findings.map((finding) => `${finding.field}: ${finding.reason}`).join("; ")}.` : "",
    judge?.why ? `Judge: ${judge.why}` : "",
    judge?.weakest ? `Weakest sentence: ${judge.weakest}` : "",
    naturalness?.why ? `Plain-English judge: ${naturalness.why}` : "",
    naturalness?.weakest ? `Unnatural sentence: ${naturalness.weakest}` : "",
    ...(naturalness?.evidence || []).map((item) => `Plain-English failure ${item.checkId}: ${item.sentence}`)
  ].filter(Boolean).join(" ");
}

async function generateOne(target, options, releases, avoidScenes = []) {
  if (!target.warmthHarvest?.generationAllowed) {
    throw new Error(`${target.id}: aspect warmth harvest must pass before any generation call.`);
  }
  const harvestMode = target.warmthHarvest.harvest_mode;
  let draft;
  let lint;
  let judge;
  let naturalness;
  let brief;
  let lastError = "";
  for (let attempt = 1; attempt <= options.repairs + 1; attempt += 1) {
    try {
      if (!brief) {
        const rawBrief = await generateForSurface(plainBriefPrompt(target), SURFACE);
        brief = normalizeBrief(extractJson(rawBrief));
      }
      const raw = await generateForSurface(
        writerPrompt(target, attempt > 1 ? feedbackFor(lint, judge, naturalness) : "", { avoidScenes, brief }),
        SURFACE
      );
      draft = normalizeDraft(target, extractJson(raw));
      const exactLint = lintExactEntry(draft);
      const warmthLint = lintAspectWarmthUsage(draft.body, target.warmthHarvest);
      lint = {
        score: exactLint.fails + warmthLint.fails ? 1 : 3,
        fails: exactLint.fails + warmthLint.fails,
        findings: [...exactLint.findings, ...warmthLint.findings],
        warmth: warmthLint
      };
      judge = await judgeExactAspect(draft, {
        pairSource: target.sourceText,
        samples: 1,
        foundationLines: target.warmthHarvest.ownerFoundationLines,
        harvest_mode: harvestMode
      });
      naturalness = await judgeNaturalEnglish(draft, { samples: 1 });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      draft = normalizeDraft(target, {});
      lint = {
        score: 1,
        fails: 1,
        findings: [{ severity: "fail", field: "modelOutput", reason: lastError }]
      };
      judge = {
        score: 1,
        verdict: "off-voice",
        weakestField: "modelOutput",
        why: lastError,
        gate: "regenerate"
      };
      naturalness = {
        score: 1,
        verdict: "off-voice",
        why: lastError,
        contractViolation: true,
        contractIssues: ["generation-or-judge-error"],
        gate: "human-review"
      };
      if (attempt <= options.repairs) continue;
    }
    if (lint.fails === 0 && judge.score === 3 && naturalness.score === 3 && !naturalness.contractViolation && !naturalness.disagreement) {
      return makeRecord(target, draft, lint, judge, naturalness, brief, attempt, releases);
    }
  }
  return makeRecord(target, draft, lint, judge, naturalness, brief, options.repairs + 1, releases);
}

function makeRecord(target, draft, lint, judge, naturalness, brief, attempts, releases) {
  const evidenceProblem = Boolean(naturalness?.contractViolation || naturalness?.disagreement);
  const passed = lint.fails === 0 && judge.score === 3 && naturalness?.score === 3 && !evidenceProblem;
  const annotatedDraft = annotateCandidateWithWarmth(draft, target.warmthHarvest);
  const harvestMode = target.warmthHarvest.harvest_mode;
  const editorialFlags = target.warmthHarvest.flags || [];
  return {
    schemaVersion: 1,
    status: "needs_review",
    serving: false,
    generatedAt: new Date().toISOString(),
    id: target.id,
    batch: target.batch,
    source: {
      pairKey: target.pairKey,
      path: target.sourcePath,
      status: target.sourceStatus
    },
    writer: releases.generation,
    judgeModel: releases.judge,
    attempts,
    meaningBrief: brief || null,
    warmthHarvest: target.warmthHarvest,
    harvest_mode: target.warmthHarvest.harvest_mode,
    ...(annotatedDraft.warmthSource ? {
      warmthSource: annotatedDraft.warmthSource,
      evidenceClass: "owner-corpus-derived"
    } : {}),
    draft: annotatedDraft,
    lint,
    judge,
    naturalnessJudge: naturalness,
    ownerCorpusWarmth: {
      harvest_mode: harvestMode,
      sourceIds: (target.warmthHarvest.ownerFoundationLines || []).map((line) => line.sourceArticleId),
      editorial_flags: editorialFlags
    },
    reviewGate: passed ? "owner-review" : evidenceProblem ? "human-review-evidence" : "editorial-repair"
  };
}

function openingFor(draft) {
  return String(draft?.body || draft?.humanMoment || "").split(/(?<=[.!?])\s+/)[0].trim();
}

function configureCandidates(generationRelease, judgeRelease) {
  const previous = {};
  const values = {
    EDITORIAL_GENERATION_CANDIDATE_RELEASE_ID: generationRelease.releaseId,
    EDITORIAL_JUDGE_CANDIDATE_RELEASE_ID: judgeRelease.releaseId,
    OPENAI_GENERATION_MODEL: generationRelease.model,
    OPENAI_GENERATION_REASONING_EFFORT: generationRelease.reasoningEffort || "none",
    OPENAI_JUDGE_MODEL: judgeRelease.model,
    OPENAI_JUDGE_REASONING_EFFORT: judgeRelease.reasoningEffort || "none",
    TLDR_ALLOW_LIVE_LLM_GENERATION_CALIBRATION: "1",
    TLDR_ALLOW_LIVE_LLM_JUDGE: "1",
    TLDR_ALLOW_LIVE_LLM_CALIBRATION: "1"
  };
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
}

async function pool(items, concurrency, fn, onResult) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const result = await fn(items[index]);
      await onResult(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

function selectTargets(options) {
  let targets = missingTargets();
  if (options.batch) targets = targets.filter((target) => target.batch === options.batch);
  if (options.ids.length) targets = targets.filter((target) => options.ids.includes(target.id));
  if (options.perBatch > 0) {
    const counts = new Map();
    targets = targets.filter((target) => {
      const count = counts.get(target.batch) || 0;
      if (count >= options.perBatch) return false;
      counts.set(target.batch, count + 1);
      return true;
    });
  }
  if (options.limit > 0) targets = targets.slice(0, options.limit);
  return targets;
}

function loadRecords(outDir) {
  if (!fs.existsSync(outDir)) return [];
  return fs.readdirSync(outDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8")));
}

function writeSummary(outDir, targets, releases) {
  const records = loadRecords(outDir).sort((a, b) => a.id.localeCompare(b.id));
  const summary = {
    schemaVersion: 1,
    status: "needs_review",
    serving: false,
    generatedAt: new Date().toISOString(),
    targetCount: targets.length,
    recordCount: records.length,
    writer: releases.generation,
    judge: releases.judge,
    byBatch: records.reduce((counts, record) => {
      counts[record.batch] = (counts[record.batch] || 0) + 1;
      return counts;
    }, {}),
    byGate: records.reduce((counts, record) => {
      counts[record.reviewGate] = (counts[record.reviewGate] || 0) + 1;
      return counts;
    }, {}),
    entries: records.map((record) => ({
      id: record.id,
      batch: record.batch,
      reviewGate: record.reviewGate,
      judgeScore: record.judge?.score,
      naturalnessScore: record.naturalnessJudge?.score,
      naturalnessEvidenceValid: !record.naturalnessJudge?.contractViolation,
      attempts: record.attempts
    }))
  };
  writeJsonAtomic(path.join(outDir, "_summary.json"), summary);
  writeJsonAtomic(path.join(outDir, "_corpus.json"), {
    status: "needs_review",
    serving: false,
    entries: Object.fromEntries(records.map((record) => [record.id, record.draft]))
  });
  return summary;
}

async function run(options) {
  const registry = readRegistry();
  const generationRelease = resolveCandidateRelease({ role: "generation", surface: SURFACE, releaseId: registry.lanes[GENERATION_LANE].candidate.releaseId, registry });
  const judgeRelease = resolveCandidateRelease({ role: "judge", surface: SURFACE, releaseId: registry.lanes[JUDGE_LANE].candidate.releaseId, registry });
  const selectedTargets = selectTargets(options);
  const targets = selectedTargets.map((target) => ({
    ...target,
    warmthHarvest: buildAspectWarmthHarvest(target, { surface: SURFACE, format: "full-card" })
  }));
  const editorialRequired = targets.filter((target) => !target.warmthHarvest.generationAllowed);
  const plan = {
    surface: SURFACE,
    generationRelease: generationRelease.releaseId,
    judgeRelease: judgeRelease.releaseId,
    model: generationRelease.model,
    targets: targets.length,
    harvestReady: targets.length - editorialRequired.length,
    editorialRequired: editorialRequired.map((target) => ({ id: target.id, flags: target.warmthHarvest.flags })),
    minimumLiveCalls: targets.length * 4,
    maximumLiveCallsWithRepairs: targets.length * (1 + (3 * (options.repairs + 1))),
    output: options.out,
    serving: false
  };
  if (options.plan) return plan;
  if (!options.authorizeLive) throw new Error("Use --plan or explicitly pass --authorize-live.");
  if (editorialRequired.length) {
    throw new Error(`Aspect warmth harvest failed closed for ${editorialRequired.length} target(s): ${editorialRequired.map((target) => `${target.id} (${warmthFlagIds(target.warmthHarvest.flags)})`).join("; ")}`);
  }
  fs.mkdirSync(options.out, { recursive: true });
  const restore = configureCandidates(generationRelease, judgeRelease);
  const releases = {
    generation: { releaseId: generationRelease.releaseId, provider: generationRelease.provider, model: generationRelease.model, reasoningEffort: generationRelease.reasoningEffort || null },
    judge: { releaseId: judgeRelease.releaseId, provider: judgeRelease.provider, model: judgeRelease.model, reasoningEffort: judgeRelease.reasoningEffort || null }
  };
  try {
    const generationResolved = generationConfig(SURFACE);
    const judgeResolved = judgeConfig(SURFACE);
    if (generationResolved.releaseId !== generationRelease.releaseId || judgeResolved.releaseId !== judgeRelease.releaseId) {
      throw new Error("Exact-aspect runtime did not resolve both staged Sol candidates.");
    }
    const targetIds = new Set(targets.map((target) => target.id));
    const existing = loadRecords(options.out);
    const pending = targets.filter((target) => options.force || !fs.existsSync(path.join(options.out, `${target.id}.json`)));
    const groups = [...pending.reduce((map, target) => {
      if (!map.has(target.pairKey)) map.set(target.pairKey, []);
      map.get(target.pairKey).push(target);
      return map;
    }, new Map()).values()];
    let completed = 0;
    await pool(groups, options.concurrency, async (group) => {
      const pairKey = group[0].pairKey;
      const avoidScenes = existing
        .filter((record) => record.source?.pairKey === pairKey && !(options.force && targetIds.has(record.id)))
        .map((record) => openingFor(record.draft))
        .filter(Boolean);
      const records = [];
      for (const target of group) {
        const record = await generateOne(target, options, releases, avoidScenes);
        records.push(record);
        if (openingFor(record.draft)) avoidScenes.push(openingFor(record.draft));
      }
      return records;
    }, async (records) => {
      for (const record of records) {
        writeJsonAtomic(path.join(options.out, `${record.id}.json`), record);
        completed += 1;
        process.stderr.write(`${completed}/${pending.length} ${record.id} -> ${record.reviewGate} (judge ${record.judge?.score})\n`);
      }
    });
    return writeSummary(options.out, targets, releases);
  } finally {
    restore();
  }
}

async function main() {
  const result = await run(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = { VENUS_SQUARE_LILITH_MODEL, VENUS_SQUARE_MARS_MODEL, parseArgs, plainBriefPrompt, run, writerPrompt };
