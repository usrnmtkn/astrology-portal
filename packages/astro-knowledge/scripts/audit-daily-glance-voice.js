"use strict";

// Serving-copy self-audit. GR-003/DG-P1: findings and candidates are advisory;
// this script never mutates content rows or review_status values.
const fs = require("fs");
const path = require("path");
const {
  calibrationReportPath,
  judgeCandidate,
  judgeOperatingMode,
  JUDGE_MODEL,
  JUDGE_REASONING_EFFORT,
  RUBRIC_VERSION
} = require("./judge-daily-glance.js");
const {
  buildPacket,
  estimateCost,
  lintOutput,
  lintTextAgainstBans,
  loadLocalEnv,
  normalizeUsage,
  outputText,
  packetLint,
  parseOutput,
  readJson: readConfig,
  renderModelInput
} = require("./daily-glance-writer-runtime.js");
const { callOpenAIResponses } = require("../../../src/astro-writing/openAIResponses.cjs");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const dateKey = new Date().toISOString().slice(0, 10);
const sourceRowsPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
const auditMarkdownPath = path.join(packageRoot, "review", `daily-glance-voice-audit-${dateKey}.md`);
const auditJsonPath = path.join(packageRoot, "review", `daily-glance-voice-audit-${dateKey}.json`);
const dodontMarkdownPath = path.join(packageRoot, "review", `dodont-seed-inventory-${dateKey}.md`);
const candidateDir = path.join(packageRoot, "review", `daily-glance-voice-audit-${dateKey}-candidates`);
const candidateConfigPath = path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-batch-3-self-audit-v1.json");
const TARGET_CUES = Object.freeze({
  sun: "identity|role|public|private|recognition|approve|present|composure",
  moon: "mood|feeling|need|rest|care|schedule|comfort",
  mercury: "say|message|text|explain|word|conversation|answer",
  venus: "want|like|care|affection|comfort|relationship|pleasure",
  mars: "anger|angry|act|react|fight|urge|defens|irritat",
  jupiter: "more|extra|promise|overcommit|overdo|opportunity|enough",
  saturn: "responsib|duty|limit|deadline|work|pressure|finish",
  uranus: "change|routine|sudden|unexpected|restless|trapped|different",
  neptune: "mood|sensitive|absorb|imagination|dream|unclear|escape",
  pluto: "control|power|intense|withhold|push|compulsion|resent",
  chiron: "care|help|hurt|ache|sore|sensitive|wound|tend",
  "north-node": "new|unfamiliar|next|growth|practice|choose|awkward",
  "south-node": "old|familiar|habit|return|release|retreat|automatic",
  lilith: "want|desire|appetite|instinct|shame|permission|restless"
});
const GROUPS = Object.freeze({
  conjunction: {
    register: "saturation",
    guidance: "Let the target meaning saturate the mood; name one observable behavior and its immediate cost.",
    variant: "blend",
    fact: "the two meanings fuse and intensify; the target's whole theme saturates the mood of the day.",
    exemplar: "conjunction-moon",
    groupCue: "strong|quick|immediate|fills|whole|takes up|hard to ignore|all at once"
  },
  square: {
    register: "self-friction",
    guidance: "Keep the friction inside the reader's own response and build toward one adjustment.",
    variant: "hard",
    fact: "friction that builds toward an adjustment; malefic-leaning; the friction is internal to the person's own day (self-friction register per DG-R2).",
    exemplar: "square-chiron",
    groupCue: "yourself|inside|conflict|friction|before|urge|resent|adjust"
  },
  opposition: {
    register: "other-friction",
    guidance: "Bring the target meaning into view through another person; keep the friction relational and daily-scale.",
    variant: "hard",
    fact: "the other side comes fully into view; awareness- and relationship-oriented; friction arrives through another person (other-friction register).",
    exemplar: "opposition-chiron",
    groupCue: "someone|they|them|partner|friend|coworker|other person|loved one"
  },
  soft: {
    register: "mild-ease",
    guidance: "Offer a modest opening for the target meaning; describe availability, never a promised result.",
    variant: "harmonious",
    fact: "a supportive opening is offered, not automatic",
    exemplar: "soft-lilith",
    groupCue: "easier|ease|available|support|less effort|less resistance|room|opening"
  }
});
const HOUSE_TOPICS = Object.freeze({
  1: "self, body, identity, first impressions",
  2: "money, possessions, resources, values",
  3: "communication, siblings, short trips, local environment",
  4: "home, family, roots, private life",
  5: "creativity, romance, children, play, self-expression",
  6: "work, daily routine, service, health",
  7: "partnership, one-to-one others",
  8: "shared resources, intimacy, transformation",
  9: "beliefs, higher education, travel, philosophy",
  10: "career, public role, reputation, authority",
  11: "friendships, groups, hopes, community",
  12: "solitude, hidden things, retreat, the unconscious"
});
const MACHINE_ERA_PATTERNS = Object.freeze([
  { id: "machine-era-vocabulary", pattern: /\b(?:delve|navigate|journey|tapestry|realm|unlock|leverage|synergy|transformative)\w*\b/iu },
  { id: "machine-era-coaching", pattern: /\b(?:invites? you to|serves? as|a reminder to|lean into|show up|make space for|create space for)\b/iu },
  { id: "machine-era-balance", pattern: /\b(?:both [^.!?]{1,60} and [^.!?]{1,60}|not only [^.!?]{1,60} but also)\b/iu },
  { id: "machine-era-em-dash", pattern: /—/u }
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function latestCalibrationReportPath() {
  if (fs.existsSync(calibrationReportPath)) return calibrationReportPath;
  const reports = fs.readdirSync(path.join(packageRoot, "review"))
    .filter((name) => /^daily-glance-judge-calibration-report-terra-\d{4}-\d{2}-\d{2}\.json$/u.test(name))
    .sort();
  if (!reports.length) throw new Error("Run Terra calibration first; no dated Terra calibration report exists.");
  return path.join(packageRoot, "review", reports.at(-1));
}

function writeFile(filePath, value) {
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`);
}

function markdown(value) {
  return String(value ?? "").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

function emptyUsage() {
  return { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 };
}

function addUsage(left, right = {}) {
  return Object.fromEntries(Object.keys(left).map((key) => [key, Number(left[key] || 0) + Number(right[key] || 0)]));
}

function servingPairs(sourceRows) {
  const rows = sourceRows.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/daily-"));
  const pairs = new Map();
  for (const row of rows) {
    const match = row.contentKey.match(/^fallback-hook\/daily-(headline|body)\/(.+)$/u);
    if (!match) continue;
    const [, kind, key] = match;
    const pair = pairs.get(key) || { key };
    pair[kind] = row.body_you;
    pair[`${kind}Status`] = row.review_status;
    pairs.set(key, pair);
  }
  const result = [...pairs.values()].sort((a, b) => a.key.localeCompare(b.key));
  if (result.length !== 68 || result.some((pair) => !pair.headline || !pair.body)) {
    throw new Error(`Expected 68 complete serving pairs; found ${result.length}.`);
  }
  return result;
}

function failedDimensions(result) {
  return Object.entries(result.verdict.dimensions || {}).filter(([, passed]) => !passed).map(([name]) => name);
}

function rankAuditRows(rows, operatingMode) {
  return rows.slice().sort((a, b) => {
    if (operatingMode === "flag-only") {
      return (a.score - b.score) || (b.failedDimensions.length - a.failedDimensions.length) || a.key.localeCompare(b.key);
    }
    return (a.score - b.score) || (a.dimScore - b.dimScore) || a.key.localeCompare(b.key);
  });
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function renderAuditMarkdown(report) {
  const failureNotice = report.operatingMode === "flag-only"
    ? "> **FLAG-ONLY MODE:** Terra failed calibration (gold mean " + report.calibration.goldMean + " < " + report.calibration.acceptance.goldMeanMin + "). Scores of 1 and failed-dimension counts are advisory triage only, never quality verdicts. GR-003 and DG-P1 prohibit automatic approval or serving changes."
    : "> **CALIBRATED ADVISORY MODE:** The numerical gate passed, but GR-003 and DG-P1 still prohibit automatic approval or serving changes.";
  const sections = report.rows.map((row, index) => [
    `### ${index + 1}. ${row.key}`,
    "",
    `- Triage score: ${row.score} (median of ${row.allScores.join(", ")}); passed dimensions: ${row.dimScore}/7`,
    `- Failed dimensions: ${row.failedDimensions.length ? row.failedDimensions.join(", ") : "none"}`,
    `- Judge why: ${row.why || "No explanation returned."}`,
    `- Best line: ${row.best_line || "No line selected."}`,
    "- Status: serving owner-approved text remains unchanged; this finding is advisory only.",
    "",
    `> **Current headline:** ${row.current.headline}`,
    ">",
    `> **Current body:** ${row.current.body}`,
    ...(row.replacementProposal ? [
      "",
      "#### UNAPPROVED engine candidate",
      "",
      "> **Candidate status:** UNAPPROVED. It is not a content row, cannot serve, and changes nothing without explicit owner wording approval.",
      ">",
      `> **Candidate headline:** ${row.replacementProposal.winner.headline}`,
      ">",
      `> **Candidate body:** ${row.replacementProposal.winner.body}`,
      "",
      `- Deterministic lint: ${row.replacementProposal.lint.passed ? "pass" : "fail"}`,
      `- Flag-only judge triage: ${row.replacementProposal.judge.score} (median of ${row.replacementProposal.judge.allScores.join(", ")}); ${row.replacementProposal.judge.dimScore}/7 dimensions passed`,
      `- Candidate failed dimensions: ${row.replacementProposal.failedDimensions.length ? row.replacementProposal.failedDimensions.join(", ") : "none"}`,
      `- Candidate judge why: ${row.replacementProposal.judge.verdict.why || "No explanation returned."}`,
      `- Selection basis: ${row.replacementProposal.selectionBasis}`,
      `- Full packet: \`${row.replacementProposal.packetPath}\``,
      `- All three raw candidates: \`${row.replacementProposal.candidatesPath}\``
    ] : [])
  ].join("\n")).join("\n\n");
  return [
    "# Daily-glance serving voice audit",
    "",
    `Date: ${report.date}`,
    `Source revision: \`${report.sourceRevision}\``,
    `Judge: \`${report.judgeModel}\`, reasoning \`${report.reasoningEffort}\`, rubric \`${report.rubricVersion}\``,
    "",
    failureNotice,
    "",
    "## Summary",
    "",
    `- Serving pairs audited: ${report.rows.length}/68`,
    `- Score-1 flags: ${report.summary.scoreOnes}`,
    `- Pairs with one or more failed dimensions: ${report.summary.withFailedDimensions}`,
    `- Judge responses: ${report.responseCount}`,
    `- Judge usage: ${report.usage.inputTokens} input tokens (${report.usage.cachedInputTokens} cached), ${report.usage.outputTokens} output tokens (${report.usage.reasoningTokens} reasoning)`,
    `- Estimated Step 1 calibration cost: $${Number(report.calibration.estimatedCostUsd || 0).toFixed(6)}`,
    `- Estimated Step 2 cost: $${report.estimatedCostUsd.toFixed(6)}`,
    ...(report.candidateGeneration ? [
      `- Bottom-five writer responses: ${report.candidateGeneration.writerResponses} (Sol xhigh)`,
      `- Bottom-five judge responses: ${report.candidateGeneration.judgeResponses} (Terra low, flag-only)`,
      `- Estimated Step 4 writer cost: $${report.candidateGeneration.writerCostUsd.toFixed(6)}`,
      `- Estimated Step 4 judge cost: $${report.candidateGeneration.judgeCostUsd.toFixed(6)}`,
      `- Estimated Step 4 total: $${report.candidateGeneration.totalCostUsd.toFixed(6)}`
    ] : []),
    `- Estimated all-call total: $${(Number(report.calibration.estimatedCostUsd || 0) + report.estimatedCostUsd + Number(report.candidateGeneration?.totalCostUsd || 0)).toFixed(6)}`,
    "- Ordering: lowest triage score first, then most failed dimensions. In flag-only mode this is a reading queue, not a quality ranking.",
    "",
    "## Ranked flags",
    "",
    sections,
    ""
  ].join("\n");
}

async function writerCall(config, modelInput) {
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "WRITER",
    request: {
      model: config.routing.model,
      input: modelInput,
      reasoning: { effort: config.routing.reasoningEffort },
      max_output_tokens: config.routing.maxOutputTokens
    }
  });
  if (!response.ok) throw new Error(`writer http ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  return {
    responseId: payload.id || null,
    status: payload.status || null,
    raw: outputText(payload),
    usage: normalizeUsage(payload.usage)
  };
}

function candidateRank(left, right, operatingMode) {
  const lintDelta = Number(right.lint.passed) - Number(left.lint.passed);
  if (lintDelta) return lintDelta;
  if (operatingMode === "flag-only") {
    const scoreOneDelta = Number(left.judge.score === 1) - Number(right.judge.score === 1);
    if (scoreOneDelta) return scoreOneDelta;
  }
  return (right.judge.dimScore - left.judge.dimScore)
    || (right.judge.score - left.judge.score)
    || (left.sample - right.sample);
}

async function generateBottomFive(report) {
  const selectedKeys = report.rows.slice(0, 5).map((row) => row.key);
  const config = scheduledCandidateConfig(selectedKeys);
  fs.mkdirSync(candidateDir, { recursive: true });

  const prepared = config.keys.map((target) => {
    const packet = buildPacket(target.key, config);
    const modelInput = renderModelInput(packet);
    const selfLint = packetLint(packet, modelInput, config);
    if (!selfLint.passed) throw new Error(`Packet self-lint failed for ${target.key}; refusing to bill.`);
    const slug = target.key.replace(/\//gu, "-");
    writeFile(path.join(candidateDir, `${slug}.packet.json`), JSON.stringify(packet, null, 2));
    writeFile(path.join(candidateDir, `${slug}.packet-lint.json`), JSON.stringify(selfLint, null, 2));
    return { key: target.key, slug, packet, modelInput, selfLint };
  });
  process.stdout.write(`packet self-lint passed for ${prepared.length}/5 bottom-five keys\n`);

  const proposals = [];
  for (const item of prepared) {
    const writers = await Promise.all(Array.from({ length: 3 }, () => writerCall(config, item.modelInput)));
    const candidates = await Promise.all(writers.map(async (writer, index) => {
      let candidate = null;
      let parseError = null;
      try { candidate = parseOutput(writer.raw); } catch (error) { parseError = error.message; }
      const lint = candidate
        ? lintOutput(candidate, item.key, config)
        : { passed: false, findings: [{ id: "unparseable", reason: parseError || "Unparseable writer output." }] };
      const judge = candidate
        ? await judgeCandidate(candidate, item.key, 3)
        : { score: 1, allScores: [1, 1, 1], dimScore: 0, verdict: { dimensions: {}, why: "Writer output was unparseable." }, usage: emptyUsage(), estimatedCostUsd: 0 };
      process.stdout.write(`candidate ${item.key} ${index + 1}/3 lint=${lint.passed} triage=${judge.score} (${judge.dimScore}/7)\n`);
      return {
        sample: index + 1,
        candidate,
        raw: writer.raw,
        parseError,
        writer: {
          model: config.routing.model,
          reasoningEffort: config.routing.reasoningEffort,
          responseId: writer.responseId,
          status: writer.status,
          usage: writer.usage,
          estimatedCostUsd: Number(estimateCost(writer.usage, config).toFixed(6))
        },
        lint,
        judge: {
          ...judge,
          operatingMode: report.operatingMode,
          calibrationFailed: report.calibrationFailed,
          advisoryOnly: true
        },
        status: "UNAPPROVED",
        revisionsMade: 0
      };
    }));
    const ranked = candidates.slice().sort((a, b) => candidateRank(a, b, report.operatingMode));
    const winner = ranked[0];
    const candidatesPath = path.join(candidateDir, `${item.slug}.candidates.json`);
    const winnerPath = path.join(candidateDir, `${item.slug}.winner.json`);
    const modeNotice = report.operatingMode === "flag-only"
      ? "Terra failed calibration. Score-1 and failed-dimension counts are advisory triage only, never quality verdicts."
      : "Judge scores are advisory only and never approve content.";
    writeFile(candidatesPath, JSON.stringify({
      schemaVersion: 1,
      key: item.key,
      status: "UNAPPROVED",
      operatingMode: report.operatingMode,
      calibrationFailed: report.calibrationFailed,
      modeNotice,
      immutableRawOutputs: true,
      revisionsMade: 0,
      candidates
    }, null, 2));
    writeFile(winnerPath, JSON.stringify({
      schemaVersion: 1,
      key: item.key,
      status: "UNAPPROVED",
      operatingMode: report.operatingMode,
      calibrationFailed: report.calibrationFailed,
      modeNotice,
      selectionBasis: "Deterministic output lint first; then flag-only score-1 avoidance and failed-dimension triage. This is not a quality verdict.",
      winner: winner.candidate,
      lint: winner.lint,
      judge: winner.judge
    }, null, 2));
    proposals.push({
      key: item.key,
      winner: winner.candidate,
      lint: winner.lint,
      judge: winner.judge,
      failedDimensions: failedDimensions(winner.judge),
      selectionBasis: "Deterministic lint first, then flag-only advisory signals; no automatic approval.",
      packetPath: path.relative(repoRoot, path.join(candidateDir, `${item.slug}.packet.json`)),
      candidatesPath: path.relative(repoRoot, candidatesPath),
      writerUsage: candidates.reduce((sum, candidate) => addUsage(sum, candidate.writer.usage), emptyUsage()),
      writerCostUsd: candidates.reduce((sum, candidate) => sum + candidate.writer.estimatedCostUsd, 0),
      judgeUsage: candidates.reduce((sum, candidate) => addUsage(sum, candidate.judge.usage), emptyUsage()),
      judgeCostUsd: candidates.reduce((sum, candidate) => sum + candidate.judge.estimatedCostUsd, 0)
    });
  }

  for (const proposal of proposals) {
    const row = report.rows.find((entry) => entry.key === proposal.key);
    row.replacementProposal = proposal;
  }
  const writerUsage = proposals.reduce((sum, proposal) => addUsage(sum, proposal.writerUsage), emptyUsage());
  const judgeUsage = proposals.reduce((sum, proposal) => addUsage(sum, proposal.judgeUsage), emptyUsage());
  const writerCostUsd = proposals.reduce((sum, proposal) => sum + proposal.writerCostUsd, 0);
  const judgeCostUsd = proposals.reduce((sum, proposal) => sum + proposal.judgeCostUsd, 0);
  report.candidateGeneration = {
    status: "UNAPPROVED",
    keys: selectedKeys,
    samplesPerKey: 3,
    writerModel: config.routing.model,
    writerReasoningEffort: config.routing.reasoningEffort,
    writerResponses: selectedKeys.length * 3,
    writerUsage,
    writerCostUsd: Number(writerCostUsd.toFixed(6)),
    judgeModel: JUDGE_MODEL,
    judgeReasoningEffort: JUDGE_REASONING_EFFORT,
    judgeResponses: selectedKeys.length * 3 * 3,
    judgeUsage,
    judgeCostUsd: Number(judgeCostUsd.toFixed(6)),
    totalCostUsd: Number((writerCostUsd + judgeCostUsd).toFixed(6)),
    outputDirectory: path.relative(repoRoot, candidateDir),
    governance: "GR-003 and DG-P1: candidates remain UNAPPROVED and cannot change serving rows or review statuses."
  };
  writeFile(auditJsonPath, JSON.stringify(report, null, 2));
  writeFile(auditMarkdownPath, renderAuditMarkdown(report));
  return report.candidateGeneration;
}

function mechanicalFindings(text) {
  const current = lintTextAgainstBans(text).map((finding) => ({
    source: "current-output-ban",
    id: finding.id,
    match: finding.match,
    reason: finding.reason
  }));
  const machine = MACHINE_ERA_PATTERNS.flatMap((rule) => {
    const match = String(text).match(rule.pattern);
    return match ? [{ source: "machine-era-register", id: rule.id, match: match[0], reason: "Machine-era register pattern." }] : [];
  });
  return [...current, ...machine];
}

function genericCandidateTarget(key) {
  const [group, targetName] = key.split("/");
  const commonOwnerSources = [
    "owner-active:TLDR-Article-Edition-Uranus-Rx-Gemini-2025-OWNER:e001",
    "owner-article:venus-in-virgo-2025:p009",
    "owner-article:mercury-in-taurus-2025:p005",
    "owner-article:virgo-season-2025:p003"
  ];
  if (group === "house") {
    const topic = HOUSE_TOPICS[targetName];
    if (!topic) throw new Error(`No governed house topic for ${key}.`);
    return {
      key,
      register: "topic-fallback",
      emotionalCore: `the Moon placing today's attention on ${topic}`,
      groupGuidance: "Stay inside the supplied house topic and locate one ordinary moment; do not invent an aspect or another house axis.",
      exemplarPolicy: "the approved house/1 pair supplies house-fallback register evidence only",
      matchingExemplarSourceIds: ["daily-glance-house-1-owner-headline", "daily-glance-house-1-owner-body"],
      ownerPassageSourceIds: ["daily-glance-house-1-owner-headline", "daily-glance-house-1-owner-body", ...commonOwnerSources],
      warmthHarvest: { harvest_mode: "none_found", emotionalCore: `daily attention on ${topic}` },
      sceneEvidence: { mode: "invented_allowed", permission: "OV-028", reason: "The schedule-safe compiler found no governed owner scene for this house topic." },
      expectedFactCount: 1,
      specificity: { minimumGroups: 1, cueGroups: [{ id: "house-topic", pattern: `\\b(?:${topic.split(/, /u).join("|")})\\w*\\b` }] },
      facts: [{
        sourcePath: "packages/astro-knowledge/review/daily-glance-fact-boundaries-2026-08-04.md",
        selector: `F4.house.${targetName}`,
        text: topic
      }],
      skeleton: Number(targetName) % 2 ? "consequence-close" : "instruction-first"
    };
  }

  const groupPolicy = GROUPS[group];
  if (!groupPolicy || !TARGET_CUES[targetName]) throw new Error(`No schedule-safe packet profile for ${key}.`);
  const exemplarHead = `daily-glance-${groupPolicy.exemplar}-owner-headline`;
  const exemplarBody = `daily-glance-${groupPolicy.exemplar}-owner-body`;
  const pairFile = targetName === "sun"
    ? "sun-moon.json"
    : ["north-node", "south-node"].includes(targetName)
      ? "moon-nodes.json"
      : `moon-${targetName}.json`;
  const pairPath = `packages/astro-knowledge/data/pairs/${pairFile}`;
  const pair = readJson(path.join(repoRoot, pairPath));
  const pairText = pair.modern[groupPolicy.variant];
  if (!pairText) throw new Error(`Missing ${groupPolicy.variant} pair fact for ${key}.`);
  const facts = [
    { sourcePath: pairPath, selector: `modern.${groupPolicy.variant}`, text: pairText },
    {
      sourcePath: "packages/astro-knowledge/review/daily-glance-fact-boundaries-2026-08-04.md",
      selector: `F2.${group}`,
      ...(group === "soft" ? { match: "includes" } : {}),
      text: groupPolicy.fact
    }
  ];
  if (["north-node", "south-node"].includes(targetName)) {
    const axisText = targetName === "north-node"
      ? "pull toward unfamiliar growth, the field asking for conscious development"
      : "pull of familiar pattern, inherited competence, the comfort zone";
    facts.push({
      sourcePath: "packages/astro-knowledge/review/daily-glance-fact-boundaries-2026-08-04.md",
      selector: `F3.${targetName}`,
      text: axisText
    });
  }

  const sceneSourcePath = "packages/astro-knowledge/sources/authored/sky-aspect-owner-refined-v101.json";
  const sceneRecords = readJson(path.join(repoRoot, sceneSourcePath));
  const aspect = group === "soft" ? null : group;
  const recordId = aspect
    ? (targetName === "sun" ? `sky.sun.${aspect}.moon` : `sky.moon.${aspect}.${targetName}`)
    : null;
  const record = recordId ? sceneRecords[recordId] : null;
  const sceneIsClean = record && mechanicalFindings(`${record.humanMoment} ${record.developmentDetail}`).length === 0;
  const sceneEvidence = sceneIsClean
    ? {
      mode: "owner-five-beat",
      sourceId: `${recordId}#humanMoment+developmentDetail`,
      sourcePath: sceneSourcePath,
      recordId,
      humanMoment: record.humanMoment,
      developmentDetail: record.developmentDetail
    }
    : {
      mode: "invented_allowed",
      permission: "OV-028",
      reason: record ? "The available owner scene collides with a current output ban." : "No governed owner five-beat scene exists for this grouped key."
    };
  return {
    key,
    register: groupPolicy.register,
    emotionalCore: `${pairText} ${groupPolicy.fact}`,
    groupGuidance: groupPolicy.guidance,
    exemplarPolicy: `the approved ${groupPolicy.exemplar.replace("-", "/")} pair supplies ${group}-register evidence only`,
    matchingExemplarSourceIds: [exemplarHead, exemplarBody],
    ownerPassageSourceIds: [exemplarHead, exemplarBody, ...commonOwnerSources],
    warmthHarvest: { harvest_mode: "none_found", emotionalCore: pairText },
    sceneEvidence,
    expectedFactCount: facts.length,
    axisEnd: ["north-node", "south-node"].includes(targetName) ? targetName : null,
    specificity: {
      minimumGroups: 2,
      cueGroups: [
        { id: "group-register", pattern: `\\b(?:${groupPolicy.groupCue})\\w*\\b` },
        { id: "target", pattern: `\\b(?:${TARGET_CUES[targetName]})\\w*\\b` }
      ]
    },
    facts,
    skeleton: group === "opposition" ? "instruction-first" : group === "soft" ? "permission-after-recognition" : "consequence-close"
  };
}

function scheduledCandidateConfig(selectedKeys) {
  const config = readConfig(candidateConfigPath);
  const catalog = new Map(config.keys.map((target) => [target.key, target]));
  return {
    ...config,
    routing: { ...config.routing, writerCalls: selectedKeys.length },
    keys: selectedKeys.map((key) => catalog.get(key) || genericCandidateTarget(key))
  };
}

function buildDodontInventory(sourceRows, calibration) {
  const rows = sourceRows.vocabularyRows
    .filter((row) => row.contentKey.startsWith("fallback-vocab/dodont-"))
    .map((row) => ({ ...row, findings: mechanicalFindings(row.body) }));
  const hitRows = rows.filter((row) => row.findings.length);
  const lines = [
    "# Do/Don't seed vocabulary inventory",
    "",
    `Date: ${dateKey}`,
    `Source: \`${path.relative(repoRoot, sourceRowsPath)}\``,
    "",
    "> These are fragments, so they were not voice-judged. Mechanical screening only: the current output-ban set plus explicit machine-era vocabulary, coaching, balance, and em-dash patterns.",
    calibration.operatingMode === "flag-only"
      ? "> The daily-glance Terra judge also failed calibration and is flag-only; it was not applied to these fragments. No wording or review status was changed."
      : "> The daily-glance judge was not applied to these fragments. No wording or review status was changed.",
    "",
    "## Summary",
    "",
    `- Inventory rows: ${rows.length}`,
    `- Rows with mechanical hits: ${hitRows.length}`,
    `- Rows without hits: ${rows.length - hitRows.length}`,
    "",
    "## Flagged rows",
    "",
    "| Content key | Fragment | Status | Hits |",
    "|---|---|---|---|",
    ...(hitRows.length ? hitRows.map((row) => `| ${markdown(row.contentKey)} | ${markdown(row.body)} | ${markdown(row.review_status)} | ${markdown(row.findings.map((finding) => `${finding.id}: ${finding.match}`).join("; "))} |`) : ["| — | — | — | No mechanical hits. |"]),
    "",
    "## Full inventory",
    "",
    "| Content key | Fragment | Status | Mechanical result |",
    "|---|---|---|---|",
    ...rows.map((row) => `| ${markdown(row.contentKey)} | ${markdown(row.body)} | ${markdown(row.review_status)} | ${row.findings.length ? markdown(row.findings.map((finding) => `${finding.id}: ${finding.match}`).join("; ")) : "clear"} |`),
    ""
  ];
  writeFile(dodontMarkdownPath, lines.join("\n"));
  return { rows: rows.length, hitRows: hitRows.length, path: dodontMarkdownPath };
}

async function runServingAudit(sourceRows, calibration) {
  const pairs = servingPairs(sourceRows);
  let completed = 0;
  const rows = await mapLimit(pairs, 4, async (pair) => {
    const judged = await judgeCandidate({ headline: pair.headline, body: pair.body }, pair.key, 3);
    completed += 1;
    process.stdout.write(`audit ${completed}/68 ${pair.key} -> ${judged.score} (${judged.dimScore}/7)\n`);
    return {
      key: pair.key,
      score: judged.score,
      allScores: judged.allScores,
      dimScore: judged.dimScore,
      failedDimensions: failedDimensions(judged),
      verdict: judged.verdict.verdict || "",
      why: judged.verdict.why || "",
      best_line: judged.verdict.best_line || "",
      current: { headline: pair.headline, body: pair.body },
      statuses: { headline: pair.headlineStatus, body: pair.bodyStatus },
      usage: judged.usage,
      estimatedCostUsd: judged.estimatedCostUsd,
      advisoryOnly: true,
      operatingMode: calibration.operatingMode,
      calibrationFailed: !calibration.passed
    };
  });
  const ranked = rankAuditRows(rows, calibration.operatingMode);
  const usage = ranked.reduce((sum, row) => addUsage(sum, row.usage), emptyUsage());
  const estimatedCostUsd = ranked.reduce((sum, row) => sum + row.estimatedCostUsd, 0);
  const report = {
    schemaVersion: 1,
    date: dateKey,
    sourceRevision: require("child_process").execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
    judgeModel: JUDGE_MODEL,
    reasoningEffort: JUDGE_REASONING_EFFORT,
    rubricVersion: RUBRIC_VERSION,
    operatingMode: calibration.operatingMode,
    calibrationFailed: !calibration.passed,
    calibration: {
      report: calibration.reportPath,
      passed: calibration.passed,
      goldMean: calibration.goldMean,
      negativeMean: calibration.negativeMean,
      negativeScoreThrees: calibration.negativeScoreThrees,
      acceptance: calibration.acceptance,
      responseCount: calibration.responseCount,
      usage: calibration.usage,
      estimatedCostUsd: calibration.estimatedCostUsd
    },
    responseCount: ranked.length * 3,
    usage,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    summary: {
      scoreOnes: ranked.filter((row) => row.score === 1).length,
      withFailedDimensions: ranked.filter((row) => row.failedDimensions.length).length
    },
    rows: ranked
  };
  writeFile(auditJsonPath, JSON.stringify(report, null, 2));
  writeFile(auditMarkdownPath, renderAuditMarkdown(report));
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--authorize-live")) {
    throw new Error("Pass --authorize-live to bill. Owner authorization required.");
  }
  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const resolvedCalibrationReportPath = latestCalibrationReportPath();
  const calibration = readJson(resolvedCalibrationReportPath);
  const durableMode = judgeOperatingMode();
  calibration.reportPath = path.relative(repoRoot, resolvedCalibrationReportPath);
  if (durableMode.permanentlyDemoted) {
    calibration.operatingMode = "flag-only";
    calibration.permanentlyDemoted = true;
  }
  const sourceRows = readJson(sourceRowsPath);
  const audit = args.includes("--from-existing-audit")
    ? readJson(auditJsonPath)
    : await runServingAudit(sourceRows, calibration);
  audit.calibration = {
    ...audit.calibration,
    responseCount: calibration.responseCount,
    usage: calibration.usage,
    estimatedCostUsd: calibration.estimatedCostUsd
  };
  const dodont = buildDodontInventory(sourceRows, calibration);
  process.stdout.write(`audit=${path.relative(repoRoot, auditMarkdownPath)}\n`);
  process.stdout.write(`auditJson=${path.relative(repoRoot, auditJsonPath)}\n`);
  process.stdout.write(`dodont=${path.relative(repoRoot, dodont.path)}\n`);
  process.stdout.write(`mode=${audit.operatingMode} scoreOnes=${audit.summary.scoreOnes} step2CostUsd=${audit.estimatedCostUsd}\n`);
  if (args.includes("--report-only")) {
    writeFile(auditJsonPath, JSON.stringify(audit, null, 2));
    writeFile(auditMarkdownPath, renderAuditMarkdown(audit));
  } else if (!args.includes("--audit-only")) {
    const candidates = await generateBottomFive(audit);
    process.stdout.write(`candidates=${candidates.outputDirectory}\n`);
    process.stdout.write(`step4CostUsd=${candidates.totalCostUsd}\n`);
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
}

module.exports = { buildDodontInventory, generateBottomFive, mechanicalFindings, rankAuditRows, scheduledCandidateConfig, servingPairs };
